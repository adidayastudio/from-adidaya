"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { Briefcase, UserCheck, ScrollText, Calendar, Heart } from "lucide-react";
import EmploymentTypesTable from "./EmploymentTypesTable";
import WorkStatusTable from "./WorkStatusTable";
import EmploymentPolicyTable from "./EmploymentPolicyTable";
import WorkScheduleTable from "./WorkScheduleTable";
import LeavePolicyTable from "./LeavePolicyTable";

const TABS: SetupTab[] = [
    { id: "types", label: "Employment Types", component: EmploymentTypesTable, actionLabel: "Add Type", icon: Briefcase },
    { id: "status", label: "Work Status", component: WorkStatusTable, actionLabel: "Add Status", icon: UserCheck },
    { id: "policies", label: "Employment Policy", component: EmploymentPolicyTable, icon: ScrollText },
    { id: "schedule", label: "Work Schedule", component: WorkScheduleTable, actionLabel: "Add Schedule", icon: Calendar },
    { id: "leave", label: "Leave Policy", component: LeavePolicyTable, actionLabel: "Add Policy", icon: Heart }
];

export default function EmploymentView({ onBack }: { onBack: () => void }) {
    return (
        <SetupPageLayout
            title="Employment"
            description="Manage employment types, work status, default policies, schedules, and leave quotas."
            icon={Briefcase}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
