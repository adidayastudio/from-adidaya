import { supabase } from "@/lib/supabaseClient";
import { fetchCrewMembers } from "@/lib/api/crew";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { localParseCrewPrompt, executeCrewQuery, generateCrewResponse } from "./crew-intelligence";
import type { CrewIntelligenceIntent, CrewIntelligenceParams } from "./crew-intelligence";

export interface CrewRoutingContext {
    intent: CrewIntelligenceIntent;
    parameters: CrewIntelligenceParams;
}

export async function handleWorkspacePrompt(
    text: string,
    module: string,
    previousContext?: CrewRoutingContext | null
): Promise<{ aiText: string; attachment: any; aiEvent: string; routingContext?: CrewRoutingContext }> {
    let aiText = `I have received your instruction for ${module}.`;
    let attachment: any = null;
    let aiEvent = "Success";

    const lowerText = text.toLowerCase();

    if (module === "crew") {
        try {
            // 1. Fetch all active crew members to feed crew names to local parser
            const allCrew = await fetchCrewMembers();
            const allCrewNames = allCrew.map((c) => c.name);

            // 2. Parse text locally for routing and parameters (with conversation context)
            const routing = localParseCrewPrompt(text, allCrewNames, previousContext || undefined);

            // 3. Get default workspace ID
            const wsId = await fetchDefaultWorkspaceId();
            if (!wsId) {
                return {
                    aiText: "Workspace ID tidak ditemukan. Harap pastikan workspace aktif telah dikonfigurasi.",
                    attachment: null,
                    aiEvent: "Error"
                };
            }

            // 4. Execute deterministic query
            const queryResult = await executeCrewQuery(routing.intent, routing.parameters, wsId);

            // 5. Generate natural language response
            const responseText = await generateCrewResponse(routing.intent, queryResult, text);

            return {
                aiText: responseText,
                attachment: {
                    ...queryResult,
                    _module: "crew",
                    _intent: routing.intent
                },
                aiEvent: "Intelligence Info",
                routingContext: { intent: routing.intent, parameters: routing.parameters }
            };
        } catch (error: any) {
            console.error("Crew Intelligence Error:", error);
            return {
                aiText: `Maaf, terjadi kesalahan saat memproses data crew: ${error.message || error}`,
                attachment: null,
                aiEvent: "Error"
            };
        }
    } else if (module === "finance") {
        if (lowerText.includes("beli") || lowerText.includes("semen") || lowerText.includes("nota")) {
            return {
                aiText: "Purchase logged automatically.",
                attachment: null,
                aiEvent: "Expense Logged",
            };
        }
    }

    return { aiText, attachment, aiEvent };
}

