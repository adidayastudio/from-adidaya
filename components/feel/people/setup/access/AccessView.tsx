"use client";

import SetupPageLayout, { SetupTab } from "../SetupPageLayout";
import { Shield, ShieldCheck, CheckCircle2, Eye, FastForward, Info } from "lucide-react";
import SystemRolesTab from "./SystemRolesTab";
import CapabilitiesTab from "./CapabilitiesTab";
import VisibilityTab from "./VisibilityTab";
import ApprovalsTab from "./ApprovalsTab";
import EffectiveAccessTab from "./EffectiveAccessTab";

const TABS: SetupTab[] = [
    { id: "roles", label: "System Roles", component: SystemRolesTab, icon: ShieldCheck, domain: 'Access', subDomain: 'System Roles' },
    { id: "capabilities", label: "Capabilities", component: CapabilitiesTab, icon: CheckCircle2, domain: 'Access', subDomain: 'Capabilities' },
    { id: "visibility", label: "Data Visibility", component: VisibilityTab, icon: Eye, domain: 'Access', subDomain: 'Data Visibility' },
    { id: "approvals", label: "Approval Authority", component: ApprovalsTab, icon: FastForward, domain: 'Access', subDomain: 'Approval Authority' },
    { id: "effective", label: "Effective Access", component: EffectiveAccessTab, icon: Info }
];

interface AccessViewProps {
    onBack: () => void;
}

export default function AccessView({ onBack }: AccessViewProps) {
    return (
        <SetupPageLayout
            title="Access & Visibility"
            description="Configure what each role can see and do in the system."
            icon={Shield}
            tabs={TABS}
            onBack={onBack}
        />
    );
}
