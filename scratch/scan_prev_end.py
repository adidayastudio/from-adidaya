import json

transcript_path = "/Users/manustravo/.gemini/antigravity-ide/brain/74e291bc-8602-40a2-9753-7daa42f8d333/.system_generated/logs/transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            step_index = data.get("step_index")
            if 560 <= step_index <= 589:
                print(f"\nStep {step_index}: {data.get('type')}")
                if "tool_calls" in data:
                    for call in data["tool_calls"]:
                        print(f"  Tool: {call.get('name')}")
                        # Print TargetFile if matches
                        tf = call.get("args", {}).get("TargetFile", "")
                        if tf:
                            print(f"    TargetFile: {tf}")
                if data.get("type") == "PLANNER_RESPONSE":
                    for call in data.get("tool_calls", []):
                        print(f"  Planner Tool: {call.get('name')}")
                        tf = call.get("args", {}).get("TargetFile", "")
                        if tf:
                            print(f"    TargetFile: {tf}")
        except Exception as e:
            continue
