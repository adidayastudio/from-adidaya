"use client";

import { Briefcase, MapPin, Users, MoreVertical, Plus } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import { toast } from "react-hot-toast";

import { CAREER_JOBS } from "@/components/feel/career/data";

export default function WebsiteCareerPage() {
    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Careers</h1>
                        <p className="text-sm text-neutral-500 mt-1">Post job openings, manage applications, and update requirements.</p>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => toast.success("Add Job clicked")}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Add New
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CAREER_JOBS.map(job => (
                    <div key={job.id} className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={clsx(
                                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    job.status === "Active" ? "bg-green-50 text-green-700" :
                                        job.status === "Closed" ? "bg-red-50 text-red-700" :
                                            "bg-neutral-100 text-neutral-500"
                                )}>
                                    {job.status}
                                </span>
                                <button className="text-neutral-400 hover:text-neutral-900">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-neutral-900 mb-1">{job.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-neutral-500 mb-4">
                            <span>{job.department}</span>
                            <span>•</span>
                            <span>{job.type}</span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                <MapPin className="w-3.5 h-3.5" />
                                {job.location}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs font-medium text-brand-red cursor-pointer hover:underline">
                                <Users className="w-3.5 h-3.5" />
                                {job.applicants} Candidates
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
