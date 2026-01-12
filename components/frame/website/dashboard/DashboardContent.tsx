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
            className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm hover:border-neutral-200 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
        >
            <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                {icon}
            </div>
            <h3 className="font-semibold text-neutral-900 mb-1 group-hover:text-red-600 transition-colors">{title}</h3>
            <p className="text-sm text-neutral-500 mb-4 line-clamp-2 flex-grow">{description}</p>
            <div className="flex items-center text-sm font-medium text-neutral-500 group-hover:text-red-600 transition-colors duration-300">
                Manage <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
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
                <h2 className="text-lg font-bold text-neutral-900">Quick Actions</h2>
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
