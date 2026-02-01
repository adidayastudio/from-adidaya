"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { Database, ShieldCheck, Lock, History, FileText } from "lucide-react";
import OverviewTab from "./OverviewTab";
import ProtectionTab from "./ProtectionTab";
import LifecycleTab from "./LifecycleTab";
import AuditLogTab from "./AuditLogTab";

const TABS: SetupTab[] = [
    { id: "overview", label: "Status Overview", component: OverviewTab, icon: ShieldCheck },
    { id: "protection", label: "Governance Lock", component: ProtectionTab, icon: Lock },
    { id: "archive", label: "Data Archive", component: LifecycleTab, icon: History },
    { id: "audit", label: "Audit Log", component: AuditLogTab, icon: FileText }
];

export default function DataControlView({ onBack }: { onBack: () => void }) {
    return (
        <SetupPageLayout
            title="Data Control"
            description="Global governance layer for configuration safety and data lifecycle."
            icon={Database}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
