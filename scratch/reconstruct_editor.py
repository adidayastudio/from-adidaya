import json
import os

transcript_path = "/Users/manustravo/.gemini/antigravity-ide/brain/74e291bc-8602-40a2-9753-7daa42f8d333/.system_generated/logs/transcript_full.jsonl"
target_file = "/Users/manustravo/MANUSTRAVO/Work/007-ADIDAYA-WEBSITE/from-adidaya/app/flow/reports/editor/page.tsx"

print("Reconstructing editor/page.tsx up to step 337...")

steps = []
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            step_index = data.get("step_index")
            if step_index > 337:
                continue
            if data.get("type") == "PLANNER_RESPONSE":
                tool_calls = data.get("tool_calls", [])
                for call in tool_calls:
                    name = call.get("name")
                    if name in ["write_to_file", "replace_file_content", "multi_replace_file_content"]:
                        args = call.get("args", {})
                        if "editor/page.tsx" in args.get("TargetFile", ""):
                            steps.append({
                                "step_index": step_index,
                                "name": name,
                                "args": args
                            })
        except Exception as e:
            continue

steps.sort(key=lambda s: s["step_index"])
print(f"Found {len(steps)} steps up to step 337.")

content = steps[0]["args"]["CodeContent"]
print(f"Starting with base write_to_file from step {steps[0]['step_index']}")

for step in steps[1:]:
    idx = step["step_index"]
    name = step["name"]
    args = step["args"]
    print(f"Applying step {idx}: {name}")
    
    if name == "replace_file_content":
        target = args["TargetContent"]
        replacement = args["ReplacementContent"]
        if target in content:
            content = content.replace(target, replacement, 1)
        else:
            print(f"Warning: TargetContent not found in step {idx}!")
            
    elif name == "multi_replace_file_content":
        chunks = args.get("ReplacementChunks", [])
        for chunk in chunks:
            target = chunk["TargetContent"]
            replacement = chunk["ReplacementContent"]
            if target in content:
                content = content.replace(target, replacement, 1)
            else:
                print(f"Warning: TargetContent in chunk not found in step {idx}!")

with open(target_file, "w", encoding="utf-8") as out:
    out.write(content)

print(f"Reconstruction completed up to step 337! Wrote to {target_file}")
