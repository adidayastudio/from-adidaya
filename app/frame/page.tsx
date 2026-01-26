"use client";

import CategoryHub from "@/components/layout/CategoryHub";
import { Globe, Share2, GraduationCap } from "lucide-react";

export default function FrameRootPage() {
    const apps = [
        {
            label: "Website",
            href: "/frame/website",
            icon: Globe,
            color: "text-orange-500",
            snippet: "Front-facing portfolio and content management.",
            count: 0
        },
        {
            label: "Social",
            href: "/frame/social",
            icon: Share2,
            color: "text-orange-500",
            snippet: "Coordinate and manage digital presence.",
            count: 0
        },
        {
            label: "Learn",
            href: "/frame/learn",
            icon: GraduationCap,
            color: "text-orange-500",
            snippet: "Internal training and knowledge base.",
            count: 1
        },
    ];

    return (
        <CategoryHub
            category="FRAME"
            title="Identity & Growth"
            description="The external image and internal knowledge of Adidaya."
            apps={apps}
        />
    );
}
