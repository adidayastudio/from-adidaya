"use client";

import { useState } from "react";

export default function BackfillPhotosPage() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runBackfill = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/backfill-photos", { method: "POST" });
            const data = await res.json();
            setResult(data);
        } catch (err: any) {
            setResult({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 40, fontFamily: "monospace", maxWidth: 600 }}>
            <h1 style={{ fontSize: 20, marginBottom: 16 }}>📸 Backfill Attendance Photos</h1>
            <p style={{ marginBottom: 16, color: "#666" }}>
                Scans Storage bucket and updates attendance_records with photo URLs.
            </p>
            <button
                onClick={runBackfill}
                disabled={loading}
                style={{
                    padding: "12px 24px",
                    background: loading ? "#ccc" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 14,
                    fontWeight: 700,
                }}
            >
                {loading ? "Running..." : "Run Backfill"}
            </button>

            {result && (
                <pre style={{
                    marginTop: 20,
                    padding: 16,
                    background: "#f5f5f5",
                    borderRadius: 8,
                    overflow: "auto",
                    fontSize: 12,
                    lineHeight: 1.5,
                }}>
                    {JSON.stringify(result, null, 2)}
                </pre>
            )}
        </div>
    );
}
