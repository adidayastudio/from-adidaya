"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import toast, { Toaster } from "react-hot-toast";

export default function ClockPage() {
    const [loading, setLoading] = useState(false);
    const [lastLog, setLastLog] = useState<{ type: "IN" | "OUT"; timestamp: string } | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchLastLog();
    }, []);

    const fetchLastLog = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("attendance_logs")
            .select("type, timestamp")
            .eq("user_id", user.id)
            .order("timestamp", { ascending: false })
            .limit(1)
            .single();

        if (data) {
            setLastLog(data);
        }
    };

    const handleClock = async (type: "IN" | "OUT") => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("User not found");
                return;
            }

            const { error } = await supabase
                .from("attendance_logs")
                .insert({
                    user_id: user.id,
                    type,
                    timestamp: new Date().toISOString()
                });

            if (error) throw error;

            toast.success(`Successfully Clocked ${type}`);
            await fetchLastLog();
        } catch (err: any) {
            toast.error(err.message || "Failed to record attendance");
        } finally {
            setLoading(false);
        }
    };

    const currentTime = new Date();

    return (
        <div className="min-h-screen bg-neutral-50 p-6 flex flex-col items-center">
            <Toaster position="bottom-center" />

            <div className="w-full max-w-md">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-8"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Dashboard
                </Link>

                <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden">
                    <div className="p-8 text-center border-b border-neutral-100">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
                            <Clock className="w-8 h-8" />
                        </div>
                        <h1 className="text-xl font-bold text-neutral-900">Attendance Clock</h1>
                        <p className="text-neutral-500 text-sm mt-1">{format(currentTime, "EEEE, d MMMM yyyy")}</p>
                    </div>

                    <div className="p-8 space-y-4">
                        <button
                            onClick={() => handleClock("IN")}
                            disabled={loading}
                            className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            CLOCK IN
                        </button>

                        <button
                            onClick={() => handleClock("OUT")}
                            disabled={loading}
                            className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            CLOCK OUT
                        </button>
                    </div>

                    {lastLog && (
                        <div className="px-8 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-sm">
                            <span className="text-neutral-500">Last Activity:</span>
                            <span className="font-medium text-neutral-900 flex items-center gap-1">
                                {lastLog.type === "IN" ? "Clocked In" : "Clocked Out"}
                                <span className="text-neutral-400 mx-1">•</span>
                                {format(new Date(lastLog.timestamp), "HH:mm")}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
