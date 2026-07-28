import json

transcript_path = "/Users/manustravo/.gemini/antigravity-ide/brain/74e291bc-8602-40a2-9753-7daa42f8d333/.system_generated/logs/transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            step_index = data.get("step_index")
            if step_index == 568 and data.get("type") == "PLANNER_RESPONSE":
                tool_calls = data.get("tool_calls", [])
                for call in tool_calls:
                    print("Tool Name:", call.get("name"))
                    args = call.get("args", {})
                    with open("/Users/manustravo/.gemini/antigravity-ide/brain/74e291bc-8602-40a2-9753-7daa42f8d333/scratch/step_568_args.json", "w") as out:
                        json.dump(args, out, indent=2)
                    print("Wrote Step 568 args to scratch/step_568_args.json")
        except Exception as e:
            continue
