import { useState, useEffect } from "react";
import { ProjectReport, ReportStatus } from "@/types/project";
import { Button } from "@/shared/ui/primitives/button/button";
import { Plus, FileText, Calendar, Cloud, Users, MoreHorizontal, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import clsx from "clsx";
import ReportForm from "./reports/ReportForm";
import { PopoverRoot as Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface TrackingReportsTabProps {
    isActive?: boolean;
}

export default function TrackingReportsTab({ isActive }: TrackingReportsTabProps) {
    const params = useParams();
    const projectId = params.projectId as string;

    const [reports, setReports] = useState<ProjectReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<ProjectReport | null>(null);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("project_reports")
                .select("*")
                .eq("project_id", projectId)
                .order("report_date", { ascending: false });

            if (error) throw error;
            // Map snake_case to camelCase manually if needed, or rely on naming convention match
            // Supabase returns snake_case by default, types are camelCase. 
            // We need to map it.
            const mappedReports: ProjectReport[] = (data || []).map(r => ({
                id: r.id,
                projectId: r.project_id,
                title: r.title,
                reportDate: r.report_date,
                progress: r.progress,
                status: r.status,
                manpowerCount: r.manpower_count,
                weatherCondition: r.weather_condition,
                content: r.content,
                createdBy: r.created_by,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }));

            setReports(mappedReports);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchReports();
        }
    }, [projectId]);

    const handleCreateClick = () => {
        setEditingReport(null);
        setIsFormOpen(true);
    };

    const handleEditClick = (report: ProjectReport) => {
        setEditingReport(report);
        setIsFormOpen(true);
    };

    const handleFormClose = (shouldRefresh: boolean) => {
        setIsFormOpen(false);
        setEditingReport(null);
        if (shouldRefresh) {
            fetchReports();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;
        try {
            const { error } = await supabase.from("project_reports").delete().eq("id", id);
            if (error) throw error;
            fetchReports();
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Field Reports</h3>
                    <p className="text-sm text-neutral-500">Manual progress updates and site logs.</p>
                </div>
                <Button onClick={handleCreateClick} className="gap-2">
                    <Plus className="w-4 h-4" /> New Report
                </Button>
            </div>

            {reports.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-neutral-300 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6 text-neutral-400" />
                    </div>
                    <h4 className="text-neutral-900 font-medium mb-1">No reports yet</h4>
                    <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-4">Start tracking progress by creating your first field report.</p>
                    <Button variant="secondary" onClick={handleCreateClick}>Create Report</Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((report) => (
                        <div key={report.id} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-neutral-900">{report.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(report.reportDate), "MMM dd, yyyy")}
                                            <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                                            <span>{report.progress}% Progress</span>
                                        </div>
                                    </div>
                                </div>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className="p-1 text-neutral-400 hover:text-neutral-900 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-40 p-1">
                                        <button onClick={() => handleEditClick(report)} className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md">Edit</button>
                                        <button onClick={() => handleDelete(report.id)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-neutral-50 rounded-md">Delete</button>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="pl-[52px]">
                                {report.content && (
                                    <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{report.content}</p>
                                )}

                                <div className="flex items-center gap-4">
                                    <StatusBadge status={report.status} />

                                    {report.manpowerCount !== undefined && (
                                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 px-2.5 py-1 rounded-full border border-neutral-100">
                                            <Users className="w-3.5 h-3.5" />
                                            {report.manpowerCount} Workers
                                        </div>
                                    )}

                                    {report.weatherCondition && (
                                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 px-2.5 py-1 rounded-full border border-neutral-100">
                                            <Cloud className="w-3.5 h-3.5" />
                                            {report.weatherCondition}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isFormOpen && (
                <ReportForm
                    projectId={projectId}
                    initialData={editingReport || undefined}
                    onClose={handleFormClose}
                />
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: ReportStatus }) {
    const styles = {
        "on-track": "bg-green-50 text-green-700 border-green-200",
        "delayed": "bg-amber-50 text-amber-700 border-amber-200",
        "critical": "bg-red-50 text-red-700 border-red-200",
        "completed": "bg-blue-50 text-blue-700 border-blue-200",
    };

    const labels = {
        "on-track": "On Track",
        "delayed": "Delayed",
        "critical": "Critical",
        "completed": "Completed"
    };

    return (
        <span className={clsx("text-xs font-medium px-2.5 py-0.5 rounded-full border", styles[status])}>
            {labels[status]}
        </span>
    );
}
