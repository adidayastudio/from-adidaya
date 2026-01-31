"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { LayoutTemplate, Users, Building2, Layers, ShieldCheck } from "lucide-react";
import DepartmentsTable from "./DepartmentsTable";
import PositionsTable from "./PositionsTable";
import LevelsTable from "./LevelsTable";
import SystemRolesTable from "./SystemRolesTable";

const TABS: SetupTab[] = [
    { id: "departments", label: "Departments", component: DepartmentsTable, icon: Building2 },
    { id: "positions", label: "Positions", component: PositionsTable, icon: Users },
    { id: "levels", label: "Levels", component: LevelsTable, icon: Layers },
    { id: "system-role", label: "System Role", component: SystemRolesTable, icon: ShieldCheck }
];

export default function StructureView({ onBack }: { onBack: () => void }) {
    return (
        <SetupPageLayout
            title="Organization Structure"
            description="Manage departments, positions, levels, and system roles."
            icon={LayoutTemplate}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
