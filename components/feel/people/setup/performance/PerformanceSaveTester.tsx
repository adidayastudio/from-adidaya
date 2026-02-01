"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function PerformanceSaveTester() {
    const [status, setStatus] = useState("idle");
    const [result, setResult] = useState<any>(null);

    const testSave = async () => {
        setStatus("saving");
        setResult(null);
        try {
            const supabase = createClient();
            const payload = {
                // detailed payload to match real scenario
                weight_attendance: 25,
                weight_task_completion: 25,
                weight_task_quality: 25,
                weight_peer_review: 25,
                period_type: 'monthly',
                snapshot_day_trigger: '1',
                effective_start_date: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            console.log("TESTER: Starting insert...", payload);

            // Promise.race to detect timeout
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout (5s)")), 5000));
            const request = supabase.from('performance_rules').insert([payload]).select().single();

            const data = await Promise.race([request, timeout]);

            console.log("TESTER: Success", data);
            setStatus("success");
            setResult(data);
        } catch (error: any) {
            console.error("TESTER: Error", error);
            setStatus("error");
            setResult(error.message || error);
        }
    };

    return (
        <div className="p-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg mb-4 text-black">
            <h3 className="font-bold">DEBUG: Database Connection Tester</h3>
            <p className="mb-2 text-sm">Use this to verify if the database is accepting connections.</p>
            <button
                onClick={testSave}
                disabled={status === 'saving'}
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {status === 'saving' ? 'Saving...' : 'Test Save Rule'}
            </button>
            <div className="mt-2 text-xs font-mono bg-white p-2 rounded border overflow-auto max-h-40">
                Status: {status}
                <br />
                Result: {JSON.stringify(result, null, 2)}
            </div>
        </div>
    );
}
