"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Person } from "./types";
import { Settings, Shield, User, Briefcase, Star, ChartBar, Lock } from "lucide-react";
import clsx from "clsx";
import { Tabs } from "@/shared/ui/layout/Tabs";
import { fetchPeopleAvailability, fetchPersonDetails } from "@/lib/api/people";
import { PeopleAvailability } from "@/lib/types/people-types";
import StatusUpdateModal from "./modals/StatusUpdateModal";

// Sub-components
import ProfileTab from "./profile/ProfileTab";
import EmploymentTab from "./profile/EmploymentTab";
import SkillsTab from "./profile/SkillsTab";
import PerformanceTab from "./profile/PerformanceTab";
import AccessTab from "./profile/AccessTab";
import AccountTab from "./profile/AccountTab";

export default function PersonalProfile({ person, isMe = false, onUpdate }: { person: Person, isMe?: boolean, onUpdate?: () => void }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // State to hold enriched person data (history, kpi, etc.)
    // We initialize with 'person' which has the basic info
    const [fullPerson, setFullPerson] = useState<Person>(person);

    // Tab State from URL
    const activeTab = searchParams.get("tab") || "account";

    const [availability, setAvailability] = useState<PeopleAvailability | null>(null);
    const [isStatusModalOpen, setStatusModalOpen] = useState(false);

    // System Account Logic
    const isSystem = person.account_type === "system_account";

    // 1. Update fullPerson base when prop changes
    useEffect(() => {
        setFullPerson(prev => ({ ...prev, ...person }));
    }, [person]);

    // 2. Fetch detailed data (History, KPI) on mount or id change
    useEffect(() => {
        if (person.id) {
            fetchPersonDetails(person.id)
                .then(({ history, kpi }) => {
                    setFullPerson(prev => ({
                        ...prev,
                        history: history || [],
                        kpi: kpi || prev.kpi // Keep default if null
                    }));
                })
                .catch(err => console.error("Failed to fetch person details:", err));

            if (!isSystem) {
                fetchPeopleAvailability(person.id)
                    .then(setAvailability)
                    .catch(err => console.error("Failed to fetch availability:", err));
            }
        }
    }, [person.id, isSystem]);

    const setActiveTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const refreshData = () => {
        if (!isSystem) {
            fetchPeopleAvailability(person.id).then(setAvailability);
        }
        // Also refresh details if needed
        if (person.id) {
            fetchPersonDetails(person.id).then(({ history, kpi }) => {
                setFullPerson(prev => ({ ...prev, history, kpi }));
            });
        }
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
        <div className="space-y-6">

            {/* HEADER: IDENTITY & STATUS */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden">
                {/* System Background Decoration */}
                {isSystem && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-100 rounded-bl-full -z-0 opacity-50" />
                )}

                {/* Avatar & Name */}
                <div className="flex-1 flex gap-5 z-10">
                    <div className={clsx(
                        "w-24 h-24 rounded-2xl border flex items-center justify-center text-3xl font-bold shrink-0 overflow-hidden shadow-sm",
                        isSystem ? "bg-neutral-200 border-neutral-300 text-neutral-500" : "bg-neutral-100 border-neutral-200 text-neutral-400"
                    )}>
                        {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                        ) : (
                            person.initials
                        )}
                    </div>

                    <div className="space-y-2 py-1">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{person.name}</h1>
                                {isSystem && (
                                    <span className="bg-neutral-100 text-neutral-500 border border-neutral-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> System Account
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-neutral-600">{person.title}</span>
                                <span className="text-neutral-300">•</span>
                                <span className="text-sm text-neutral-500">{person.department}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant={isSystem ? "neutral" : "blue"}>{person.role}</Badge>
                            {!isSystem && <Badge variant={person.type === "Full Time" ? "blue" : "neutral"}>{person.type}</Badge>}
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

                {/* Status Card (Human Only) */}
                {!isSystem && (
                    <div
                        onClick={() => setStatusModalOpen(true)}
                        className={clsx(
                            "w-full md:w-64 cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md active:scale-95 group relative z-10 bg-white",
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
                )}
            </div>

            {/* TABS NAVIGATION */}
            <div
                className="hidden lg:block border-b border-neutral-200 overflow-x-auto scrollbar-hide sticky top-0 z-20 bg-white transition-all"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <Tabs
                    value={activeTab}
                    onChange={setActiveTab}
                    className="min-w-max px-4 md:px-0"
                    activeColor="blue"
                    items={[
                        { key: "account", label: <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Account</div> },
                        { key: "profile", label: <div className="flex items-center gap-2"><User className="w-4 h-4" /> Profile</div> },
                        { key: "employment", label: <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Employment</div> },
                        { key: "skills", label: <div className="flex items-center gap-2"><Star className="w-4 h-4" /> Skills</div> },
                        ...(!isSystem ? [{ key: "performance", label: <div className="flex items-center gap-2"><ChartBar className="w-4 h-4" /> Performance</div> }] : []),
                        { key: "access", label: <div className="flex items-center gap-2"><Lock className="w-4 h-4" /> Access</div> },
                    ]}
                />
            </div>

            {/* TAB CONTENT */}
            <div className="min-h-[400px]">
                {activeTab === "account" && <AccountTab person={fullPerson} isMe={isMe} onUpdate={onUpdate} />}
                {activeTab === "profile" && <ProfileTab person={fullPerson} isSystem={isSystem} isMe={isMe} onUpdate={onUpdate} />}
                {activeTab === "employment" && <EmploymentTab person={fullPerson} isSystem={isSystem} isMe={isMe} onUpdate={onUpdate} />}
                {activeTab === "skills" && <SkillsTab person={fullPerson} isSystem={isSystem} isMe={isMe} />}
                {activeTab === "performance" && <PerformanceTab person={fullPerson} isSystem={isSystem} isMe={isMe} />}
                {activeTab === "access" && <AccessTab person={fullPerson} isMe={isMe} />}
            </div>

            {/* Modals */}
            <StatusUpdateModal
                isOpen={isStatusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                userId={person.id}
                currentStatus={availability} // Pass null or object
                onUpdate={refreshData}
            />

        </div >
    );
}

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

