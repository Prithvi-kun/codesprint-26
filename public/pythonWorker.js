// This is required to load standard python packages from Pyodide
importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js");

async function loadPyodideAndPackages() {
    self.pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
    });
}
let pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
    // Make sure loading is complete
    await pyodideReadyPromise;

    const { code, testCases, functionName } = event.data;

    try {
        // Set the global variables in Pyodide
        self.pyodide.globals.set("__USER_CODE__", code || "");
        self.pyodide.globals.set("__TEST_CASES_JSON__", JSON.stringify(testCases || []));
        self.pyodide.globals.set("__FUNCTION_NAME__", functionName || "");

        const runnerScript = `
import sys
import io
import ast
import json

_stdout = io.StringIO()
_stderr = io.StringIO()
sys.stdout = _stdout
sys.stderr = _stderr

_user_code = __USER_CODE__
_raw_cases = json.loads(__TEST_CASES_JSON__)
_function_name = __FUNCTION_NAME__.strip()

_env = {'__name__': '__main__'}
_eval_val = None
_exec_error = None

try:
    tree = ast.parse(_user_code)
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        exec_body = tree.body[:-1]
        last_expr = tree.body[-1].value
        if exec_body:
            exec(compile(ast.Module(body=exec_body, type_ignores=[]), '<user_code>', 'exec'), _env)
        _eval_val = eval(compile(ast.Expression(body=last_expr), '<user_code>', 'eval'), _env)
    else:
        exec(compile(tree, '<user_code>', 'exec'), _env)
except Exception as e:
    _exec_error = str(e)

_stdout_str = _stdout.getvalue()
_stderr_str = _stderr.getvalue()

_test_results = []
_all_passed = True if _raw_cases and len(_raw_cases) > 0 else False

if _exec_error is None and _raw_cases:
    # Determine the function name to call
    _func_to_call = _function_name if _function_name else None
    if not _func_to_call:
        _funcs = [k for k, v in _env.items() if callable(v) and not k.startswith('_') and k not in ('sys', 'io', 'ast', 'json')]
        _func_to_call = _funcs[-1] if _funcs else None

    for tc in _raw_cases:
        raw_input = str(tc.get('input', '')).strip()
        expected = str(tc.get('expected', '')).strip()

        # If _func_to_call exists and raw_input does NOT already start with f"{_func_to_call}(":
        if _func_to_call and not raw_input.startswith(f"{_func_to_call}("):
            eval_target = f"{_func_to_call}({raw_input})"
        else:
            eval_target = raw_input

        try:
            res = eval(eval_target, _env)
            actual_str = str(res).strip()
            
            # Match check: compare string representations (normalize boolean, None, quotes)
            passed = (actual_str == expected) or (repr(res).strip() == expected)
            if not passed:
                passed = actual_str.lower() == expected.lower()

            if not passed:
                _all_passed = False

            _test_results.append({
                'input': raw_input,
                'call': eval_target,
                'expected': expected,
                'actual': actual_str,
                'passed': passed
            })
        except Exception as te:
            _all_passed = False
            _test_results.append({
                'input': raw_input,
                'call': eval_target,
                'expected': expected,
                'actual': f"Error: {str(te)}",
                'passed': False
            })

_runner_output = json.dumps({
    'stdout': _stdout_str,
    'stderr': _stderr_str,
    'evalResult': repr(_eval_val) if _eval_val is not None else None,
    'execError': _exec_error,
    'testResults': _test_results,
    'allPassed': _all_passed
})
`;

        await self.pyodide.runPythonAsync(runnerScript);
        const resultJsonStr = self.pyodide.globals.get("_runner_output");
        const parsed = JSON.parse(resultJsonStr);

        if (parsed.execError) {
            self.postMessage({
                error: parsed.execError,
                stdout: parsed.stdout,
                stderr: parsed.stderr,
                testResults: parsed.testResults || [],
                allPassed: false
            });
        } else {
            self.postMessage({
                stdout: parsed.stdout,
                stderr: parsed.stderr,
                evalResult: parsed.evalResult,
                testResults: parsed.testResults,
                allPassed: parsed.allPassed
            });
        }

    } catch (error) {
        // This catches syntax errors, exceptions thrown by asserts in hidden tests, etc.
        self.postMessage({ error: error.message });
    }
};
