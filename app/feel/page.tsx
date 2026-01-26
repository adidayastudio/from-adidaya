"use client";

import CategoryHub from "@/components/layout/CategoryHub";
import { Users, Clock, Briefcase, HardHat, Sparkles, Calendar } from "lucide-react";

export default function FeelRootPage() {
    const apps = [
        {
            label: "People",
            href: "/feel/people",
            icon: Users,
            color: "text-blue-500",
            snippet: "Employee database and team structures.",
            count: 0
        },
        {
            label: "Clock",
            href: "/feel/clock",
            icon: Clock,
            color: "text-blue-500",
            snippet: "Time tracking and attendance logs.",
            count: 0
        },
        {
            label: "Crew",
            href: "/feel/crew",
            icon: HardHat,
            color: "text-blue-500",
            snippet: "Site workers and daily timesheets.",
            count: 1
        },
        {
            label: "Calendar",
            href: "/feel/calendar",
            icon: Calendar,
            color: "text-blue-500",
            snippet: "Schedules and project timelines.",
            count: 0
        },
        {
            label: "Career",
            href: "/feel/career",
            icon: Briefcase,
            color: "text-blue-500",
            snippet: "Growth paths and performance reviews.",
            count: 0
        },
        {
            label: "Culture",
            href: "/feel/culture",
            icon: Sparkles,
            color: "text-blue-500",
            snippet: "Internal activities and core values.",
            count: 0
        },
    ];

    return (
        <CategoryHub
            category="FEEL"
            title="People & Culture"
            description="The heart of Adidaya. Manage your team, time, and growth."
            apps={apps}
        />
    );
}
