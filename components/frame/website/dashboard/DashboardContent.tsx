"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, FileText, Users, Newspaper, User, Image, ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

interface QuickActionProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    colorClass: string; // e.g. "text-purple-600 bg-purple-50"
}

function QuickActionCard({ title, description, icon, href, colorClass }: QuickActionProps) {
    const router = useRouter();

    return (
        <div
            onClick={() => router.push(href)}
            className="group relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-sm p-5 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-900 transition-all cursor-pointer flex flex-col h-full shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-black/5 active:scale-[0.98] duration-300"
        >
            <div className={`w-10 h-10 rounded-xl ${colorClass.replace('bg-', 'bg-').replace('text-', 'text-')} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm`}>
                {icon}
            </div>
            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-white mb-1 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mb-4 line-clamp-2 leading-relaxed flex-grow">{description}</p>
            <div className="flex items-center text-[11px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                Manage 
                <div className="ml-auto w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:translate-x-1 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                </div>
            </div>
        </div>
    );
}

export default function DashboardContent({ role }: { role: string }) {
    const router = useRouter();

    return (
        <div className="space-y-8">
            {/* Quick Actions Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-[19px] font-bold text-neutral-900 dark:text-white tracking-tight">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <QuickActionCard
                    title="Projects"
                    description="Manage portfolio projects, case studies, and gallery images."
                    icon={<FileText className="w-5 h-5" />}
                    href="/frame/website/projects"
                    colorClass="text-purple-600 bg-purple-50"
                />
                <QuickActionCard
                    title="Insights"
                    description="Publish company news, blog posts, and industry insights."
                    icon={<Newspaper className="w-5 h-5" />}
                    href="/frame/website/insight"
                    colorClass="text-orange-600 bg-orange-50"
                />
                <QuickActionCard
                    title="Careers"
                    description="Post job openings, manage applications, and update requirements."
                    icon={<Briefcase className="w-5 h-5" />}
                    href="/frame/website/career"
                    colorClass="text-blue-600 bg-blue-50"
                />
                <QuickActionCard
                    title="People & Team"
                    description="Update team profiles, leadership structure, and bios."
                    icon={<Users className="w-5 h-5" />}
                    href="/frame/website/people"
                    colorClass="text-green-600 bg-green-50"
                />
                <QuickActionCard
                    title="Hero Image"
                    description="Update the main homepage hero section and banner images."
                    icon={<Image className="w-5 h-5" />}
                    href="/frame/website/home-hero"
                    colorClass="text-pink-600 bg-pink-50"
                />
                <QuickActionCard
                    title="Company Profile"
                    description="Edit company vision, mission, and general settings."
                    icon={<User className="w-5 h-5" />}
                    href="/frame/website/profile"
                    colorClass="text-neutral-600 bg-neutral-100"
                />
            </div>
        </div>
    );
}
