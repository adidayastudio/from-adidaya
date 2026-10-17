"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import SetupDashboard from "./SetupDashboard";
import StructureView from "./structure/StructureView";
import EmploymentView from "./employment/EmploymentView";
import SkillsView from "./skills/SkillsView";
import PerformanceRulesView from "./performance/PerformanceRulesView";
import AccessView from "./access/AccessView";
import DataControlView from "./data/DataControlView";

type SetupSection =
    | "structure"
    | "employment"
    | "skills"
    | "performance"
    | "access"
    | "data";

export default function PeopleSetup() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const currentTab = searchParams.get("tab") as SetupSection | null;

    const handleNavigate = (tab: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("tab", tab);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleBack = () => {
        const params = new URLSearchParams(searchParams);
        params.delete("tab");
        router.push(`${pathname}?${params.toString()}`);
    };

    const renderContent = () => {
        switch (currentTab) {
            case "structure": return <StructureView onBack={handleBack} />;
            case "employment": return <EmploymentView onBack={handleBack} />;
            case "skills": return <SkillsView onBack={handleBack} />;
            case "performance": return <PerformanceRulesView onBack={handleBack} />;
            case "access": return <AccessView onBack={handleBack} />;
            case "data": return <DataControlView onBack={handleBack} />;
            default: return null;
        }
    };

    if (!currentTab) {
        return <SetupDashboard onNavigate={handleNavigate} />;
    }

    return renderContent();
}
