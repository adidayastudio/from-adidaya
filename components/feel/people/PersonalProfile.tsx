"use client";

import { useState, useEffect } from "react";
import { Person } from "./types";
import { Briefcase, Calendar, Star, Settings, User, MapPin, Hash, Mail } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import SkillsManagerModal from "./modals/SkillsManagerModal";
import StatusUpdateModal from "./modals/StatusUpdateModal";
import { PeopleSkill, PeopleAvailability } from "@/lib/types/people-types";
import { fetchPeopleSkills, fetchPeopleAvailability } from "@/lib/api/people";

export default function PersonalProfile({ person }: { person: Person }) {
    const [skills, setSkills] = useState<PeopleSkill[]>([]);
    const [availability, setAvailability] = useState<PeopleAvailability | null>(null);
    const [isSkillsModalOpen, setSkillsModalOpen] = useState(false);
    const [isStatusModalOpen, setStatusModalOpen] = useState(false);

    useEffect(() => {
        if (person.id) {
            refreshData();
        }
    }, [person.id]);

    const refreshData = () => {
        fetchPeopleSkills(person.id).then(setSkills);
        fetchPeopleAvailability(person.id).then(setAvailability);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'available': return "text-emerald-600 bg-emerald-50 border-emerald-100";
            case 'normal': return "text-blue-600 bg-blue-50 border-blue-100";
            case 'overloaded': return "text-red-600 bg-red-50 border-red-100";
            default: return "text-neutral-600 bg-neutral-50 border-neutral-100";
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* HEADER: IDENTITY & AVAILABILITY */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-6">

                {/* Avatar & Name */}
                <div className="flex-1 flex gap-5">
                    <div className="w-24 h-24 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-3xl font-bold text-neutral-400 shrink-0 overflow-hidden">
                        {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                        ) : (
                            person.initials
                        )}
                    </div>

                    <div className="space-y-2 py-1">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{person.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-neutral-600">{person.title}</span>
                                <span className="text-neutral-300">•</span>
                                <span className="text-sm text-neutral-500">{person.department}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge>{person.role}</Badge>
                            <Badge variant={person.type === "Full Time" ? "blue" : "neutral"}>{person.type}</Badge>
                            <span className={clsx(
                                "text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1.5",
                                person.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-neutral-50 text-neutral-600 border-neutral-100"
                            )}>
                                <span className={clsx("w-1.5 h-1.5 rounded-full", person.status === "Active" ? "bg-emerald-500" : "bg-neutral-400")} />
                                {person.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Availability Status Card */}
                <div
                    onClick={() => setStatusModalOpen(true)}
                    className={clsx(
                        "w-full md:w-64 cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md active:scale-95 group",
                        getStatusColor(availability?.workload_status || 'normal')
                    )}
                >
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="text-[10px] uppercase font-bold tracking-wider opacity-70">Current Status</div>
                            <div className="text-lg font-bold capitalize flex items-center gap-2">
                                {availability?.workload_status || 'Normal'}
                            </div>
                        </div>
                        <Settings className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="mt-3 pt-3 border-t border-black/5 text-xs opacity-80 leading-relaxed">
                        {availability?.notes ? (
                            <span className="line-clamp-2">"{availability.notes}"</span>
                        ) : (
                            <span className="italic opacity-70">No status note set.</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* LEFT COL: WORK INFO */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">Work Info</h3>

                        <div className="space-y-4">
                            <InfoRow icon={Calendar} label="Joined Date" value={person.joinedAt} />
                            <InfoRow icon={Mail} label="Email" value={person.email} />
                            <InfoRow icon={Hash} label="Employee ID" value={person.id} />

                            <div className="pt-4 border-t border-neutral-100">
                                <div className="text-xs text-neutral-400 uppercase font-bold mb-2">Reporting Line</div>
                                <div className="flex items-center gap-3 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-500">
                                        M
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-neutral-900">Manager Name</div>
                                        <div className="text-[10px] text-neutral-500">Direct Supervisor (Mock)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">Active Projects</h3>
                        {/* Mock Projects */}
                        <div className="space-y-2">
                            <ProjectTag code="PRJ-001" name="Precision Gym" role="Lead" />
                            <ProjectTag code="PRJ-004" name="Padel JPF" role="Member" />
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: SKILLS & CAPABILITY */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900">Skills & Capability</h3>
                                <p className="text-sm text-neutral-500">Technical and soft skills tracked for your role.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setSkillsModalOpen(true)}>
                                Manage Skills
                            </Button>
                        </div>

                        {skills.length === 0 ? (
                            <div className="text-center py-12 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                                    <Star className="w-6 h-6" />
                                </div>
                                <p className="text-neutral-900 font-medium mb-1">No skills listed yet</p>
                                <p className="text-neutral-500 text-sm mb-4">Add your capabilities to help match you with projects.</p>
                                <Button variant="secondary" size="sm" onClick={() => setSkillsModalOpen(true)}>Add Skill</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {skills.map((skill) => (
                                    <div key={skill.id} className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/30 flex items-center justify-between hover:border-blue-100 transition-colors">
                                        <div>
                                            <div className="font-semibold text-neutral-900">{skill.skill_name}</div>
                                            <div className="text-xs text-neutral-500 capitalize">{skill.skill_level}</div>
                                        </div>
                                        <SkillLevelIndicator level={skill.skill_level} />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-neutral-100">
                            <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">Career Preferences</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                                    <div className="text-xs text-neutral-400 mb-1">Preferred Role</div>
                                    <div className="text-sm font-medium text-neutral-700">Senior Architect</div>
                                </div>
                                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                                    <div className="text-xs text-neutral-400 mb-1">Interest Area</div>
                                    <div className="text-sm font-medium text-neutral-700">Sustainable Design, Project Management</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* MODALS */}
            <SkillsManagerModal
                isOpen={isSkillsModalOpen}
                onClose={() => setSkillsModalOpen(false)}
                userId={person.id}
                onUpdate={refreshData}
            />

            <StatusUpdateModal
                isOpen={isStatusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                userId={person.id}
                currentStatus={availability}
                onUpdate={refreshData}
            />
        </div>
    );
}

// -- HELPER COMPONENTS --

function Badge({ children, variant = "neutral" }: { children: React.ReactNode, variant?: "neutral" | "blue" | "green" }) {
    const styles = {
        neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        green: "bg-emerald-50 text-emerald-700 border-emerald-100"
    };

    return (
        <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-md border capitalize", styles[variant])}>
            {children}
        </span>
    );
}

function InfoRow({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">{label}</div>
                <div className="text-sm font-medium text-neutral-900 truncate max-w-[180px]" title={value}>{value}</div>
            </div>
        </div>
    );
}

function ProjectTag({ code, name, role }: any) {
    return (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <div>
                    <div className="text-xs font-bold text-neutral-900">{code}</div>
                    <div className="text-[10px] text-neutral-500">{name}</div>
                </div>
            </div>
            <div className="text-[10px] font-medium text-neutral-400 bg-white px-1.5 py-0.5 rounded border border-neutral-100">{role}</div>
        </div>
    );
}

function SkillLevelIndicator({ level }: { level: string }) {
    const dots = level === "expert" ? 4 : level === "advanced" ? 3 : level === "intermediate" ? 2 : 1;
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className={clsx("w-1.5 h-4 rounded-sm", i <= dots ? "bg-blue-500" : "bg-neutral-200")} />
            ))}
        </div>
    );
}
