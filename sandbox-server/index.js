const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const { writeFileSync, mkdirSync, rmSync } = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ─── CONFIGURATION ───────────────────────────────────────────────
const PORT = 9000;
const MAX_CONCURRENT = 5;       // Max containers running at once
const TIMEOUT_MS = 30000;       // 30 second execution timeout
const MAX_OUTPUT_BYTES = 50000; // 50KB max output

// ─── LANGUAGE DEFINITIONS ────────────────────────────────────────
const LANGUAGES = {
  python: {
    image: 'python:3.11-slim',
    fileName: 'main.py',
    cmd: (f) => ['python', f],
  },
  javascript: {
    image: 'node:20-slim',
    fileName: 'main.js',
    cmd: (f) => ['node', f],
  },
  c: {
    image: 'gcc:13',
    fileName: 'main.c',
    cmd: (f) => ['sh', '-c', `gcc -o /tmp/a.out ${f} -lm && /tmp/a.out`],
  },
  cpp: {
    image: 'gcc:13',
    fileName: 'main.cpp',
    cmd: (f) => ['sh', '-c', `g++ -o /tmp/a.out ${f} -lm && /tmp/a.out`],
  },
  java: {
    image: 'eclipse-temurin:17-jdk-jammy',
    fileName: 'Main.java',
    cmd: (f) => ['sh', '-c', `cp ${f} /tmp/Main.java && javac /tmp/Main.java && java -cp /tmp Main`],
  },
};

// ─── JOB QUEUE ───────────────────────────────────────────────────
let runningJobs = 0;
const jobQueue = [];

function processQueue() {
  while (runningJobs < MAX_CONCURRENT && jobQueue.length > 0) {
    const job = jobQueue.shift();
    runningJobs++;
    executeInDocker(job.language, job.code, job.stdin)
      .then((result) => job.resolve(result))
      .catch((err) => job.reject(err))
      .finally(() => {
        runningJobs--;
        processQueue();
      });
  }
}

function enqueueJob(language, code, stdin) {
  return new Promise((resolve, reject) => {
    jobQueue.push({ language, code, stdin, resolve, reject });
    processQueue();
  });
}

// ─── DOCKER EXECUTION ───────────────────────────────────────────
function executeInDocker(language, code, stdin = '') {
  return new Promise((resolve) => {
    const langConfig = LANGUAGES[language];
    if (!langConfig) {
      return resolve({ success: false, error: `Unsupported language: ${language}` });
    }

    // Create a unique temp directory for this execution
    const jobId = crypto.randomBytes(8).toString('hex');
    const tmpDir = path.join(__dirname, 'tmp', jobId);
    mkdirSync(tmpDir, { recursive: true });

    // Write the code file
    const codeFile = path.join(tmpDir, langConfig.fileName);
    writeFileSync(codeFile, code, 'utf-8');

    // Write stdin file if provided
    const stdinFile = path.join(tmpDir, 'stdin.txt');
    writeFileSync(stdinFile, stdin || '', 'utf-8');

    // Build docker run command args
    const containerFile = `/sandbox/${langConfig.fileName}`;
    const cmdParts = langConfig.cmd(containerFile);

    const dockerArgs = [
      'run', '--rm',
      '--network', 'none',            // No internet access for sandboxed code
      '--memory', '128m',             // Max 128MB RAM per container
      '--cpus', '0.5',                // Max half a CPU core per container
      '--pids-limit', '64',           // Prevent fork bombs
      '-v', `${tmpDir}:/sandbox:ro`,  // Mount code as read-only
      '-w', '/sandbox',
      langConfig.image,
      ...cmdParts,
    ];

    // If there is stdin, pipe it
    const child = execFile('docker', dockerArgs, {
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      // Clean up temp files
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

      if (error) {
        if (error.killed || error.signal === 'SIGTERM') {
          return resolve({
            success: false,
            stdout: stdout || '',
            stderr: '',
            error: `⏰ Execution timed out (${TIMEOUT_MS / 1000}s limit).`,
          });
        }
        return resolve({
          success: false,
          stdout: stdout || '',
          stderr: stderr || '',
          error: stderr || error.message,
        });
      }

      resolve({
        success: true,
        stdout: stdout || '',
        stderr: stderr || '',
        error: null,
      });
    });

    // Send stdin if provided
    if (stdin && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }
  });
}

// ─── API ROUTES ──────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Codesprint-26 Sandbox',
    queue: jobQueue.length,
    running: runningJobs,
    languages: Object.keys(LANGUAGES),
  });
});

// List supported languages
app.get('/languages', (req, res) => {
  res.json(Object.keys(LANGUAGES));
});

// Execute code
app.post('/execute', async (req, res) => {
  const { language, code, stdin } = req.body;

  if (!language || !code) {
    return res.status(400).json({ success: false, error: 'Missing "language" or "code" in request body.' });
  }

  if (!LANGUAGES[language]) {
    return res.status(400).json({
      success: false,
      error: `Unsupported language: "${language}". Supported: ${Object.keys(LANGUAGES).join(', ')}`,
    });
  }

  console.log(`[QUEUE] Job received: ${language} | Queue: ${jobQueue.length} | Running: ${runningJobs}`);

  try {
    const result = await enqueueJob(language, code, stdin || '');
    console.log(`[DONE] ${language} | Success: ${result.success}`);
    res.json(result);
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// ─── START SERVER ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎰 ═══════════════════════════════════════════════`);
  console.log(`   CODESPRINT-26 SANDBOX ENGINE`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   Max Concurrent: ${MAX_CONCURRENT}`);
  console.log(`   Timeout: ${TIMEOUT_MS / 1000}s`);
  console.log(`   Languages: ${Object.keys(LANGUAGES).join(', ')}`);
  console.log(`🎰 ═══════════════════════════════════════════════\n`);
});
