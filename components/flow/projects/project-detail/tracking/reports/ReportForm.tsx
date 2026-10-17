import { useState } from "react";
import { ProjectReport, ReportStatus } from "@/types/project";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { ModalRoot, ModalHeader, ModalFooter } from "@/shared/ui/modal";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

interface ReportFormProps {
    projectId: string;
    initialData?: ProjectReport;
    onClose: (shouldRefresh: boolean) => void;
}

export default function ReportForm({ projectId, initialData, onClose }: ReportFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState(initialData?.title || "");
    const [reportDate, setReportDate] = useState(initialData?.reportDate || new Date().toISOString().split('T')[0]);
    const [progress, setProgress] = useState(initialData?.progress?.toString() || "0");
    const [status, setStatus] = useState<ReportStatus>(initialData?.status || "on-track");
    const [manpowerCount, setManpowerCount] = useState(initialData?.manpowerCount?.toString() || "");
    const [weatherCondition, setWeatherCondition] = useState(initialData?.weatherCondition || "");
    const [content, setContent] = useState(initialData?.content || "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                project_id: projectId,
                title,
                report_date: reportDate,
                progress: parseFloat(progress) || 0,
                status,
                manpower_count: manpowerCount ? parseInt(manpowerCount) : null,
                weather_condition: weatherCondition || null,
                content: content || null,
                updated_at: new Date().toISOString(),
            };

            const { data: { user } } = await supabase.auth.getUser();

            if (!initialData) {
                // Insert
                const { error } = await supabase.from("project_reports").insert({
                    ...payload,
                    created_by: user?.id
                });
                if (error) throw error;
            } else {
                // Update
                const { error } = await supabase.from("project_reports").update(payload).eq("id", initialData.id);
                if (error) throw error;
            }

            onClose(true);
        } catch (error) {
            console.error("Error saving report:", error);
            alert("Failed to save report. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalRoot open={true} onOpenChange={(open) => !open && onClose(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                <ModalHeader
                    title={initialData ? "Edit Field Report" : "New Field Report"}
                    subtitle="Track daily progress, manpower, and site conditions."
                    onClose={() => onClose(false)}
                />

                <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-5">
                        <Input
                            label="Title *"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Weekly Report 5"
                            required
                        />
                        <Input
                            label="Date *"
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <Select
                            label="Status *"
                            value={status}
                            onChange={(val) => setStatus(val as ReportStatus)}
                            options={[
                                { value: "on-track", label: "On Track" },
                                { value: "delayed", label: "Delayed" },
                                { value: "critical", label: "Critical" },
                                { value: "completed", label: "Completed" },
                            ]}
                            accentColor="blue"
                        />
                        <Input
                            label="Progress (%) *"
                            type="number"
                            min={0}
                            max={100}
                            value={progress}
                            onChange={(e) => setProgress(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <Input
                            label="Manpower Count"
                            type="number"
                            min={0}
                            value={manpowerCount}
                            onChange={(e) => setManpowerCount(e.target.value)}
                            placeholder="e.g. 12"
                        />
                        <Input
                            label="Weather Condition"
                            value={weatherCondition}
                            onChange={(e) => setWeatherCondition(e.target.value)}
                            placeholder="e.g. Sunny, Heavy Rain"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            Report Content
                        </label>
                        <textarea
                            className="w-full min-h-[150px] p-3 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/[0.08] focus:border-blue-500/20 transition-all resize-y"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Describe activities performed, issues encountered, and next steps..."
                        />
                    </div>
                </form>

                <ModalFooter className="border-t border-neutral-100 p-4 bg-neutral-50/50">
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => onClose(false)}>Cancel</Button>
                        <Button onClick={handleSubmit as any} disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Report
                        </Button>
                    </div>
                </ModalFooter>
            </div>
        </ModalRoot>
    );
}
