"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { Database, Archive, Lock, FileText } from "lucide-react";
import ArchiveList from "./ArchiveList";
import LockDataPanel from "./LockDataPanel";
import AuditLogTable from "./AuditLogTable";

const TABS: SetupTab[] = [
    { id: "archive", label: "Archive", component: ArchiveList, icon: Archive },
    { id: "lock", label: "Lock Data", component: LockDataPanel, icon: Lock },
    { id: "audit", label: "Audit Log", component: AuditLogTable, icon: FileText }
];

export default function DataControlView({ onBack }: { onBack: () => void }) {
    return (
        <SetupPageLayout
            title="Data Control"
            description="Manage data lifecycle, protection, and audit trails."
            icon={Database}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
