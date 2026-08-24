import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import { handleWorkspacePrompt } from "../lib/stream/adidaya-intelligence";

const testQueries = [
    "Crew JPF ada berapa?",
    "Siapa saja crew JPF?",
    "Daily log siapa yang belum diisi?",
    "Payroll JPF minggu ini berapa?",
    "Kenapa payroll JPF naik minggu ini?",
    "Crew JPF aman gak?",
    "Ada yang aneh gak minggu ini?"
];

async function run() {
    console.log("=== RUNNING FULL CREW INTELLIGENCE INTEGRATION TESTS ===");
    for (const query of testQueries) {
        console.log(`\n\nUser Question: "${query}"`);
        try {
            const result = await handleWorkspacePrompt(query, "crew");
            console.log("AI Event: ", result.aiEvent);
            console.log("AI Response:\n", result.aiText);
            if (result.attachment) {
                console.log("Structured Attachment (keys only):", Object.keys(result.attachment));
            }
        } catch (e: any) {
            console.error("Query Error:", e.message || e);
        }
    }
    console.log("\n=== Integration tests completed ===");
}

run();
