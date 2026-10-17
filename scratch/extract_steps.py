import json

transcript_path = "/Users/manustravo/.gemini/antigravity-ide/brain/74e291bc-8602-40a2-9753-7daa42f8d333/.system_generated/logs/transcript_full.jsonl"

print("Extracting tool calls for steps 317, 327, 337...")

steps_to_find = [317, 327, 337]

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            step_index = data.get("step_index")
            if step_index in steps_to_find and data.get("type") == "PLANNER_RESPONSE":
                print(f"\n--- STEP {step_index} ---")
                tool_calls = data.get("tool_calls", [])
                for call in tool_calls:
                    print(f"Tool: {call.get('name')}")
                    # Print arguments
                    args = call.get("args", {})
                    for k, v in args.items():
                        if k in ["ReplacementContent", "ReplacementChunks"]:
                            # Format nicely
                            print(f"{k}:")
                            print(json.dumps(v, indent=2)[:2000])
                        else:
                            print(f"{k}: {v}")
        except Exception as e:
            continue
