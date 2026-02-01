"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { LayoutTemplate, Users, Building2, Layers } from "lucide-react";
import DepartmentsTable from "./DepartmentsTable";
import PositionsTable from "./PositionsTable";
import LevelsTable from "./LevelsTable";

const TABS: SetupTab[] = [
    { id: "departments", label: "Departments", component: DepartmentsTable, icon: Building2, domain: 'People', subDomain: 'Departments' },
    { id: "positions", label: "Positions", component: PositionsTable, icon: Users, domain: 'People', subDomain: 'Positions' },
    { id: "levels", label: "Levels", component: LevelsTable, icon: Layers, domain: 'People', subDomain: 'Levels' }
];

export default function StructureView({ onBack }: { onBack: () => void }) {
    return (
        <SetupPageLayout
            title="Organization Structure"
            description="Manage departments, positions, teams, and reporting lines."
            icon={LayoutTemplate}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
