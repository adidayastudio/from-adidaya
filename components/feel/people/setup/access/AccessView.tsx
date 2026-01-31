"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { Shield, Eye } from "lucide-react";
import RolePermissionsMatrix from "./RolePermissionsMatrix";
import DataVisibilityForm from "./DataVisibilityForm";

const TABS: SetupTab[] = [
    { id: "permissions", label: "Role Permissions", component: RolePermissionsMatrix, icon: Shield },
    { id: "visibility", label: "Data Visibility", component: DataVisibilityForm, icon: Eye }
];

export default function AccessView({ onBack }: { onBack: () => void }) {
    return (
        <SetupPageLayout
            title="Access & Visibility"
            description="Control who can see and do what in the People module."
            icon={Shield}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
