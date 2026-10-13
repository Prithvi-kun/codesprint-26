# scratch/generate_complete_questions.py
import re
import json

with open('scratch/pdf_raw_text.txt', 'r', encoding='utf-8') as f:
    raw_text = f.read()

# Remove page header artifacts
cleaned = re.sub(r'=== PAGE \d+ ===\s*CodeSprint 2026 - Question Bank\s*Page \d+', '', raw_text)

TABLE_METADATA = [
    { "num": 1, "name": "Slots: Bug Bounty", "game_type": "SLOTS", "desc": "Fix intentionally broken programs." },
    { "num": 2, "name": "Roulette: Output Oracle", "game_type": "ROULETTE", "desc": "Predict the exact output string." },
    { "num": 3, "name": "Blackjack: Code Relay", "game_type": "BLACKJACK", "desc": "Collaborative code relay problem." },
    { "num": 4, "name": "Craps: Debug Detective", "game_type": "CRAPS", "desc": "Find the defect and fix it. Includes 3 clues." },
    { "num": 5, "name": "Poker: Cipher Crack", "game_type": "POKER", "desc": "Decoding chains and cryptography." },
    { "num": 6, "name": "Baccarat: SQL Heist", "game_type": "BACCARAT", "desc": "Multiple choice SQL challenges." },
    { "num": 7, "name": "Dice: Stack Attack", "game_type": "DICE", "desc": "Stack-based algorithmic problems." },
    { "num": 8, "name": "High Card: Complexity Clash", "game_type": "HIGHCARD", "desc": "Pattern printing challenges." },
    { "num": 9, "name": "Coin Flip: Algorithm Auction", "game_type": "COINFLIP", "desc": "Algorithms with three-clue ladder." },
    { "num": 10, "name": "The Vault: DSA", "game_type": "VAULT", "desc": "Clean technical data structures & algorithms." }
]

table_splits = re.split(r'(Table \d+:[^\n]+)', cleaned)

all_questions = []

def extract_section(text, start_label, stop_labels):
    pos = text.find(start_label)
    if pos == -1:
        return ""
    start_pos = pos + len(start_label)
    end_pos = len(text)
    for stop in stop_labels:
        sp = text.find(stop, start_pos)
        if sp != -1 and sp < end_pos:
            end_pos = sp
    return text[start_pos:end_pos].strip()

# Iterate through tables
for t_idx, t_meta in enumerate(TABLE_METADATA):
    t_num = t_meta["num"]
    t_header = f"Table {t_num}:"
    
    # Find matching table split
    tbody = ""
    for s_idx in range(1, len(table_splits), 2):
        if table_splits[s_idx].startswith(t_header):
            tbody = table_splits[s_idx + 1]
            break
            
    if not tbody:
        print(f"Warning: could not find body for {t_header}")
        continue
        
    if t_num == 6: # Baccarat (SQL Heist)
        raw_qs = re.findall(r'(Q\d+\..*?)(?=(?:Q\d+\.|\Z))', tbody, re.DOTALL)
        for q_idx, q_str in enumerate(raw_qs):
            num = q_idx + 1
            diff = "STANDARD" if num <= 10 else "HIGH"
            
            # Extract prompt, options A, B, C, D, and correct answer
            lines = [l.strip() for l in q_str.strip().split('\n') if l.strip()]
            q_line = lines[0]
            
            # Find options
            opt_A = extract_section(q_str, "A)", ["B)", "Correct answer:"])
            opt_B = extract_section(q_str, "B)", ["C)", "Correct answer:"])
            opt_C = extract_section(q_str, "C)", ["D)", "Correct answer:"])
            opt_D = extract_section(q_str, "D)", ["Correct answer:"])
            
            ans_match = re.search(r'Correct answer:\s*([A-D])', q_str)
            correct_letter = ans_match.group(1) if ans_match else "A"
            
            # Determine prompt
            prompt_match = re.search(r'Q\d+\.\s*(?:Q:\s*)?(.*?)(?=(?:A\)|$))', q_str, re.DOTALL)
            prompt = prompt_match.group(1).strip() if prompt_match else q_line
            prompt = re.sub(r'\s+', ' ', prompt)
            
            options_list = [f"A) {opt_A}", f"B) {opt_B}", f"C) {opt_C}", f"D) {opt_D}"]
            correct_val = {"A": opt_A, "B": opt_B, "C": opt_C, "D": opt_D}.get(correct_letter, opt_A)
            
            q_obj = {
                "id": f"table_{t_num}_q{num}",
                "table_number": t_num,
                "table_name": t_meta["name"],
                "game_type": t_meta["game_type"],
                "difficulty": diff,
                "title": f"Table 6: Baccarat - Q{num} ({diff.capitalize()})",
                "description": f"Multiple-Choice SQL Challenge: {prompt}",
                "starter": "-- Choose the correct query by typing the query or option letter below\n",
                "options": options_list,
                "expected_output": correct_val,
                "correct_option": correct_letter,
                "test_cases": [
                    { "input": correct_letter, "expected": correct_val }
                ]
            }
            all_questions.append(q_obj)
            
    else: # Tables 1-5, 7-10
        raw_qs = re.findall(r'((?:S\d+ \(Standard\)|H\d+ \(High Roller\))\..*?)(?=(?:S\d+ \(Standard\)|H\d+ \(High Roller\))\..*?|\Z)', tbody, re.DOTALL)
        for q_idx, q_str in enumerate(raw_qs):
            is_standard = "Standard" in q_str[:30]
            diff = "STANDARD" if is_standard else "HIGH"
            prefix = "S" if is_standard else "H"
            q_num = (q_idx % 10) + 1
            
            # Header line and problem statement
            head_match = re.match(r'(?:S|H)\d+\s*\((?:Standard|High Roller)\)\.\s*(.*?)(?=(?:Python solution|C solution|$))', q_str, re.DOTALL)
            desc = head_match.group(1).strip() if head_match else ""
            desc = re.sub(r'\s+', ' ', desc)
            
            py_sol = extract_section(q_str, "Python solution", ["C solution", "Clue 1", "Expected output", "Sample output", "Worked example", "Worked result", "Complexity"])
            c_sol = extract_section(q_str, "C solution", ["Clue 1", "Expected output", "Sample output", "Worked example", "Worked result", "Complexity"])
            
            # Clues (for Craps and Coin Flip)
            clue1 = extract_section(q_str, "Clue 1", ["Clue 2"])
            clue2 = extract_section(q_str, "Clue 2", ["Clue 3"])
            clue3 = extract_section(q_str, "Clue 3", ["S", "H", "Python", "C", "Expected", "Complexity"])
            
            clues_list = []
            if clue1:
                # remove prefix like '(reveals about 10% of the approach):'
                clue1_clean = re.sub(r'^\([^)]+\):\s*', '', clue1).strip()
                clue2_clean = re.sub(r'^\([^)]+\):\s*', '', clue2).strip()
                clue3_clean = re.sub(r'^\([^)]+\):\s*', '', clue3).strip()
                clues_list = [clue1_clean, clue2_clean, clue3_clean]
                
            # Expected output or Worked Example
            exp_out = extract_section(q_str, "Expected output", ["S", "H", "Python", "C", "Clue", "Complexity"])
            if not exp_out:
                exp_out = extract_section(q_str, "Sample output", ["S", "H", "Python", "C", "Clue", "Complexity"])
            if not exp_out:
                exp_out = extract_section(q_str, "Worked example / expected result", ["S", "H", "Python", "C", "Clue", "Complexity"])
            if not exp_out:
                exp_out = extract_section(q_str, "Worked result / test vector", ["S", "H", "Python", "C", "Clue", "Complexity"])

            # Clean exp_out
            exp_out = exp_out.strip() if exp_out else None
            
            # Build starter code
            starter_code = "# Write your solution here\n"
            if py_sol:
                # Find def func(...) or class ...
                func_match = re.search(r'(def\s+[a-zA-Z0-9_]+\s*\([^)]*\):)', py_sol)
                class_match = re.search(r'(class\s+[a-zA-Z0-9_]+(?:\([^)]*\))?:)', py_sol)
                
                if t_num == 1 or t_num == 4: # Bug bounty / Debug Detective
                    # Look for buggy code in description
                    bug_match = re.search(r'(?:Buggy code:|uses)\s*(?:def\s+.*)', desc)
                    if bug_match:
                        starter_code = f"# Buggy code to fix:\n# {bug_match.group(0)}\n\n"
                    if func_match:
                        starter_code += f"{func_match.group(1)}\n    # Fix the bug and return the result\n    pass\n"
                    else:
                        starter_code += "# Fix the implementation\npass\n"
                elif t_num == 2: # Roulette: Output Oracle
                    starter_code = f"# Trace the code below and type the EXACT output string:\n\n{py_sol}\n"
                elif func_match:
                    starter_code = f"{func_match.group(1)}\n    # Implement solution\n    pass\n"
                elif class_match:
                    starter_code = f"{class_match.group(1)}\n    # Implement class\n    pass\n"
                else:
                    starter_code = py_sol
                    
            test_cases = []
            if exp_out:
                test_cases.append({ "input": "Standard Run", "expected": exp_out })
            else:
                test_cases.append({ "input": "Sample", "expected": "Passed" })

            q_obj = {
                "id": f"table_{t_num}_{prefix.lower()}{q_num}",
                "table_number": t_num,
                "table_name": t_meta["name"],
                "game_type": t_meta["game_type"],
                "difficulty": diff,
                "title": f"Table {t_num}: {t_meta['name'].split(':')[0]} - {prefix}{q_num} ({diff.capitalize()})",
                "description": desc,
                "starter": starter_code,
                "solution_python": py_sol,
                "solution_c": c_sol,
                "test_cases": test_cases
            }
            
            if clues_list:
                q_obj["clues"] = clues_list
            if exp_out:
                q_obj["expected_output"] = exp_out
                
            all_questions.append(q_obj)

print("Parsed total questions from PDF:", len(all_questions))
# Add Final Round Question
final_q = {
    "id": "table_final_round",
    "table_number": 11,
    "table_name": "Final Showdown: Sliding Window Maximum",
    "game_type": "FINAL",
    "difficulty": "STANDARD",
    "title": "Final Round: LeetCode 239 - Sliding Window Maximum (Hard)",
    "description": "You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position.\n\nReturn the max sliding window.\n\nExample 1:\nInput: nums = [1,3,-1,-3,5,3,6,7], k = 3\nOutput: [3,3,5,5,6,7]\nExplanation: \nWindow position                Max\n---------------               -----\n[1  3  -1] -3  5  3  6  7       3\n 1 [3  -1  -3] 5  3  6  7       3\n 1  3 [-1  -3  5] 3  6  7       5\n 1  3  -1 [-3  5  3] 6  7       5\n 1  3  -1  -3 [5  3  6] 7       6\n 1  3  -1  -3  5 [3  6  7]      7\n\nExample 2:\nInput: nums = [1], k = 1\nOutput: [1]\n\nConstraints:\n1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\n1 <= k <= nums.length",
    "starter": "from collections import deque\n\ndef max_sliding_window(nums, k):\n    # Return the max sliding window array\n    pass\n",
    "solution_python": "from collections import deque\n\ndef max_sliding_window(nums, k):\n    d = deque()\n    out = []\n    for i, n in enumerate(nums):\n        while d and nums[d[-1]] < n:\n            d.pop()\n        d.append(i)\n        if d[0] <= i - k:\n            d.popleft()\n        if i >= k - 1:\n            out.append(nums[d[0]])\n    return out\n",
    "test_cases": [
        { "input": "nums = [1, 2, 3, 4, 5], k = 2", "expected": "[2, 3, 4, 5]" },
        { "input": "nums = [7, 4, 9, 2], k = 1", "expected": "[7, 4, 9, 2]" },
        { "input": "nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3", "expected": "[3, 3, 5, 5, 6, 7]" },
        { "input": "nums = [-7, -8, -7, -5, -6, -4], k = 3", "expected": "[-7, -5, -5, -4]" },
        { "input": "nums = [1], k = 1", "expected": "[1]" },
        { "input": "nums = [9, 11], k = 2", "expected": "[11]" }
    ]
}
all_questions.append(final_q)

print("Total questions with Final Round:", len(all_questions))

with open('questions_all_tables_complete.json', 'w', encoding='utf-8') as f:
    json.dump(all_questions, f, indent=2)

print("Saved complete JSON to questions_all_tables_complete.json")
