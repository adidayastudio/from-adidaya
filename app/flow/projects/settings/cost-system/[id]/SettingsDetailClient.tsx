"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, FileCog, Loader2 } from "lucide-react";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Correct import for App Router
import CostSystemTabs from "../components/CostSystemTabs";
import { Button } from "@/shared/ui/primitives/button/button";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { fetchCostTemplate, upsertCostTemplate, CostTemplate, CostTemplateRule } from "@/lib/api/cost-system";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";

// Tabs Content
import GeneralTab from "../components/tabs/GeneralTab";
import StageWBSTab from "../components/tabs/StageWBSTab";
import ComponentsTab from "../components/tabs/ComponentsTab";
import FactorsTab from "../components/tabs/FactorsTab";
import ValidationTab from "../components/tabs/ValidationTab";

// Default Initial State
const INITIAL_TEMPLATE: CostTemplate = {
    id: "new",
    workspaceId: "",
    name: "New Cost Template",
    description: "",
    type: "general",
    currency: "IDR",
    defaultResetBehavior: "stage",
    defaultDisciplines: [],
    unitConfig: {
        length: "m",
        area: "m2",
        volume: "m3",
        weight: "kg",
        quantity: "unit"
    },
    isActive: true
};

export default function SettingsDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("general");
    const [isLoading, setIsLoading] = useState(id !== "new");
    const [isSaving, setIsSaving] = useState(false);

    // Central State
    const [templateData, setTemplateData] = useState<CostTemplate>(INITIAL_TEMPLATE);
    const [rulesData, setRulesData] = useState<Record<string, any>>({
        stage_wbs: {},
        components: {},
        factors: {},
        validation: {}
    });

    useEffect(() => {
        async function load() {
            if (id === "new") {
                const wsId = await fetchDefaultWorkspaceId();
                if (!wsId) {
                    console.error("No default workspace found in 'workspaces' table.");
                }
                setTemplateData(prev => ({ ...prev, workspaceId: wsId || "" }));
                return;
            }

            try {
                const data = await fetchCostTemplate(id);
                if (data) {
                    setTemplateData(data);
                    // Hydrate rules
                    const rulesMap: Record<string, any> = {};
                    data.rules?.forEach(r => rulesMap[r.ruleType] = r.config);
                    setRulesData(prev => ({ ...prev, ...rulesMap }));
                }
            } catch (error) {
                console.error("Failed to load template", error);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [id]);

    const handleSave = async () => {
        // Validation with Retry Logic
        let currentWorkspaceId = templateData.workspaceId;

        if (!currentWorkspaceId) {
            console.log("Workspace ID missing, retrying fetch...");
            const fetchedId = await fetchDefaultWorkspaceId();
            if (fetchedId) {
                currentWorkspaceId = fetchedId;
                setTemplateData(prev => ({ ...prev, workspaceId: fetchedId }));
            }
        }

        if (!currentWorkspaceId) {
            alert("CRITICAL ERROR: No Workspace found in database.\n\nPlease run migration '012_ensure_workspace.sql' to fix this.");
            return;
        }

        setIsSaving(true);
        console.log("Saving template data:", { ...templateData, workspaceId: currentWorkspaceId });

        try {
            // Transform rulesData map back to array
            const rulesArray: CostTemplateRule[] = Object.entries(rulesData).map(([type, config]) => ({
                ruleType: type as any,
                config
            }));

            // Use currentWorkspaceId ensures we have the latest
            const dataToSave = { ...templateData, workspaceId: currentWorkspaceId };

            const savedId = await upsertCostTemplate(dataToSave, rulesArray);

            if (savedId && id === "new") {
                // Redirect to the new ID url
                router.replace(`/flow/projects/settings/cost-system/${savedId}`);
            } else {
                alert("Changes saved successfully!");
            }
        } catch (error: any) {
            console.error("Failed to save full error:", error);
            alert(`Failed to save: ${error.message || "Unknown error"}. Check console.`);
        } finally {
            setIsSaving(false);
        }
    };

    // Updaters
    const updateTemplate = (patch: Partial<CostTemplate>) => {
        setTemplateData(prev => ({ ...prev, ...patch }));
    };

    const updateRule = (type: string, config: any) => {
        setRulesData(prev => ({ ...prev, [type]: config }));
    };

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <GlobalLoading />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "Cost System", href: "/flow/projects/settings/cost-system" },
                { label: templateData.name || "Template Detail" }
            ]} />

            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/flow/projects/settings/cost-system">
                                <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                                    Back
                                </Button>
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                                    <FileCog className="w-5 h-5 text-neutral-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-neutral-900">
                                        {templateData.name}
                                    </h1>
                                    <p className="text-sm text-neutral-500">
                                        Cost System Rules Engine
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button
                            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            className="bg-brand-red hover:bg-red-700 text-white"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>

                    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm min-h-[600px]">
                        <div className="px-6 pt-2">
                            <CostSystemTabs activeTab={activeTab} onTabChange={setActiveTab} />
                        </div>

                        <div className="p-6 pt-0">
                            {activeTab === "general" && (
                                <GeneralTab
                                    data={templateData}
                                    onChange={updateTemplate}
                                />
                            )}
                            {activeTab === "stage-wbs" && (
                                <StageWBSTab
                                    config={rulesData.stage_wbs}
                                    onChange={(c: any) => updateRule('stage_wbs', c)}
                                />
                            )}
                            {activeTab === "components" && (
                                <ComponentsTab
                                    config={rulesData.components}
                                    onChange={(c: any) => updateRule('components', c)}
                                />
                            )}
                            {activeTab === "factors" && (
                                <FactorsTab
                                    config={rulesData.factors}
                                    onChange={(c: any) => updateRule('factors', c)}
                                />
                            )}
                            {activeTab === "validation" && (
                                <ValidationTab
                                    config={rulesData.validation}
                                    onChange={(c: any) => updateRule('validation', c)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
