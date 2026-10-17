import json

transcript_path = "/Users/manustravo/.gemini/antigravity-ide/brain/74e291bc-8602-40a2-9753-7daa42f8d333/.system_generated/logs/transcript_full.jsonl"

print("Searching logs for user messages and planner responses about report edits...")

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            step_index = data.get("step_index")
            content = data.get("content", "")
            
            # Print if user input or planner response contains keywords
            if data.get("type") == "USER_INPUT":
                print(f"\n[Step {step_index}] USER:")
                print(content[:500])
            elif data.get("type") == "PLANNER_RESPONSE":
                # Check if this planner response calls write_to_file/replace on editor/page.tsx
                tool_calls = data.get("tool_calls", [])
                for call in tool_calls:
                    if "editor/page.tsx" in call.get("args", {}).get("TargetFile", ""):
                        print(f"[Step {step_index}] PLANNER calls {call.get('name')}")
        except Exception as e:
            continue
