import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, X, Pencil, Trash2, Save, ArrowUpDown, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle, Loader2, Play } from "lucide-react";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { useParams } from "next/navigation";
import { ScheduleTable } from "./views/ScheduleTable";
import { ScheduleGantt } from "./views/ScheduleGantt";
import { Button } from "@/shared/ui/primitives/button/button";
import { format } from "date-fns";
import { calculateCPM, ScheduleItem, Dependency } from "@/lib/schedulingEngine";

export default function ScheduleSystem() {
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<"table" | "timeline" | "gantt" | "curve">("table");
    const [items, setItems] = useState<any[]>([]);
    const [calculating, setCalculating] = useState(false);

    const params = useParams();
    const projectId = params?.projectId as string;

    useEffect(() => {
        if (projectId) {
            fetchData();
        }
    }, [projectId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Sync Schedule Items (Ensure they exist)
            await supabase.rpc('sync_project_schedule', { target_project_id: projectId });

            // 2. Fetch Data
            const { data, error } = await supabase
                .from("work_breakdown_structure")
                .select(`
                    *,
                    schedule:project_schedule_items(
                        *,
                        project_id
                    )
                `)
                .order("wbs_code", { ascending: true }); // Note: sorting might be trickier if wbs_code is not perfect

            if (error) throw error;

            // Filter schedule items for THIS project (since WBS might have links to others? No, RLS usually handles, but strict join in Supabase:
            // The left join will return array of schedule items. We need to filter for our project_id.

            const processed = (data || []).map((item: any) => {
                const projectSchedule = Array.isArray(item.schedule)
                    ? item.schedule.find((s: any) => s.project_id === projectId)
                    : (item.schedule?.project_id === projectId ? item.schedule : null);

                return {
                    ...item,
                    schedule: projectSchedule || {}
                };
            });

            setItems(processed);
        } catch (error) {
            console.error("Error fetching schedule data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoSchedule = async () => {
        setCalculating(true);
        try {
            // 1. Prepare Data for Engine
            const engineItems: ScheduleItem[] = items.map(i => ({
                id: i.id, // WBS ID
                duration: i.schedule?.duration_ballpark || i.schedule?.duration_estimates || 1,
                predecessors: [] // Todo after fetching dependencies
            }));

            // Fetch Dependencies (Mock for now or fetch real)
            // For now, let's fetch dependencies from DB
            const { data: depsData } = await supabase
                .from('project_schedule_dependencies')
                .select('*')
                .eq('project_id', projectId);

            const engineDeps: Dependency[] = (depsData || []).map((d: any) => ({
                predecessorId: d.predecessor_wbs_id,
                successorId: d.successor_wbs_id,
                type: d.dependency_type as any,
                lag: d.lag_days
            }));

            // 2. Calculate
            const projectStartDate = new Date(); // Today or Project Start
            const calculatedDates = calculateCPM(engineItems, engineDeps, projectStartDate);

            // 3. Update State (Optimistic) & Save to DB
            const updates = [];
            const newItems = [...items];

            for (const [wbsId, dates] of calculatedDates) {
                // Update Local
                const idx = newItems.findIndex(i => i.id === wbsId);
                if (idx !== -1) {
                    newItems[idx] = {
                        ...newItems[idx],
                        schedule: {
                            ...newItems[idx].schedule,
                            start_date: dates.startDate.toISOString(),
                            end_date: dates.endDate.toISOString()
                        }
                    };
                }

                // Prepare DB Update
                // Note: We need to use UPSERT on unique (project_id, wbs_id)
                updates.push({
                    project_id: projectId,
                    wbs_id: wbsId,
                    start_date: format(dates.startDate, 'yyyy-MM-dd'),
                    end_date: format(dates.endDate, 'yyyy-MM-dd')
                });
            }

            setItems(newItems);

            // Batch Update? Supabase doesn't support massive batch updates easily without RPC or multiple requests.
            // For MVP, loop upsert or check if we can upsert array.
            // Upsert array works if all columns match.
            const { error } = await supabase
                .from('project_schedule_items')
                .upsert(updates, { onConflict: 'project_id,wbs_id' });

            if (error) console.error("Failed to save schedule", error);

        } catch (e) {
            console.error("Auto schedule failed", e);
        } finally {
            setCalculating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[300px] items-center justify-center">
                <GlobalLoading />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-neutral-200 w-fit">
                    <button
                        onClick={() => setView("table")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === "table" ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-700"}`}
                    >
                        Table
                    </button>
                    <div className="w-px h-4 bg-neutral-200 mx-1" />
                    <button
                        onClick={() => setView("gantt")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === "gantt" ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-700"}`}
                    >
                        Gantt
                    </button>
                    <button disabled className="px-3 py-1.5 text-sm font-medium rounded-md text-neutral-300 cursor-not-allowed">Timeline</button>
                    <button disabled className="px-3 py-1.5 text-sm font-medium rounded-md text-neutral-300 cursor-not-allowed">S-Curve</button>
                </div>

                <Button
                    onClick={handleAutoSchedule}
                    disabled={calculating}
                    icon={calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    className="bg-neutral-900 text-white hover:bg-neutral-800"
                >
                    Auto Schedule
                </Button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden min-h-[500px]">
                {view === "table" && <ScheduleTable items={items} onUpdate={fetchData} />}
                {view === "gantt" && <ScheduleGantt items={items} />}
                {view === "timeline" && <div className="p-8 text-center text-neutral-400">Timeline View Coming Soon</div>}
            </div>
        </div>
    );
}
