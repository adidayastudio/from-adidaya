"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, AlertTriangle, Info, CheckCircle, Circle, Save, RotateCcw } from "lucide-react";
import { SortableTable, Column } from "../../general/components/SortableTable";
import { Button } from "@/shared/ui/primitives/button/button";
import { fetchProjectTypes, ProjectTypeTemplate, fetchStageTemplates, bulkUpdateStageTemplates, createStageTemplate, updateStageTemplate, deleteStageTemplate, StageTemplate } from "@/lib/api/templates";
import { ModalConfirm } from "@/shared/ui/modal";

const TOTAL_WEIGHT = 100;

interface Props {
    workspaceId: string;
    headerContent?: React.ReactNode;
    setHeaderActions?: (node: React.ReactNode) => void;
}

interface ScopeStageConfig extends StageTemplate {
    isEnabled: boolean;
    currentWeight: number;
    codeNumber?: string;
    codeAbbr?: string;
}

export default function StageScopeTab({ workspaceId, headerContent, setHeaderActions }: Props) {
    const [projectTypes, setProjectTypes] = useState<ProjectTypeTemplate[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    const [scopeStages, setScopeStages] = useState<ScopeStageConfig[]>([]);
    const [baseWeights, setBaseWeights] = useState<Record<string, number>>({}); // Source of Truth from Stage List
    const [isLoading, setIsLoading] = useState(true);

    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

    const totalCurrentWeight = scopeStages.reduce((sum, s) => sum + (s.currentWeight || 0), 0);
    // Allow slight float error
    const isWeightValid = Math.abs(totalCurrentWeight - TOTAL_WEIGHT) < 0.1;

    const handleResetToStandard = () => {
        setIsResetConfirmOpen(true);
    };

    // Helper: Recalculate Weights based on Base Weights and Active Status
    // Formula: defaultWeight(stage) / activeDefaultWeightSum * 100
    const recalculateWeights = (stages: ScopeStageConfig[], bases: Record<string, number>) => {
        const enabledStages = stages.filter(s => s.isEnabled);

        // Calculate Sum of Default Weights for ACTIVE stages
        const activeDefaultSum = enabledStages.reduce((sum, s) => sum + (bases[s.id] || 0), 0);

        return stages.map(s => {
            if (!s.isEnabled) {
                return { ...s, currentWeight: 0 };
            }

            const base = bases[s.id] || 0;
            let normalized = 0;

            if (activeDefaultSum > 0) {
                normalized = (base / activeDefaultSum) * 100;
            } else if (enabledStages.length > 0) {
                // Fallback if sum is 0 (e.g. all defaults are 0) but there are enabled stages
                normalized = 100 / enabledStages.length;
            } else {
                // No enabled stages
                normalized = 0;
            }

            return { ...s, currentWeight: normalized };
        });
    };

    const confirmReset = async () => {
        // Reset Logic: 
        // 1. Identify Master Scope (BLD) as SSOT.
        // 2. Force Sync ALL Metadata (Category, Position, Name) from Master to Current.
        // 3. Apply Weight Distribution based on Default Weights from Master.

        setIsLoading(true);
        try {
            const currentType = projectTypes.find(t => t.projectTypeId === selectedTypeId);
            if (!currentType) return;

            // Identify Master Scope for SSOT (Priority: DNB > BLD > DSN)
            // Goal: Find the list that contains ALL stages to serve as Source of Truth.

            // 1. Try to find "DNB" (Code) or "Design & Build" (Name)
            let masterType = projectTypes.find(t => t.code === "DNB" || (t.name.toLowerCase().includes("design") && t.name.toLowerCase().includes("build")));

            // 2. Fallback to BLD if DNB doesn't exist (Unlikely for standard setup)
            if (!masterType) {
                masterType = projectTypes.find(t => t.code === "BLD" || (t.name.toLowerCase().includes("build") && !t.name.toLowerCase().includes("design")));
            }

            // If current IS the master, we still proceed to self-sync (reload)
            const isSelfMaster = masterType?.projectTypeId === selectedTypeId;

            let bases: Record<string, number> = {};

            if (masterType && !isSelfMaster) {
                const [currentStages, masterStages] = await Promise.all([
                    fetchStageTemplates(workspaceId, selectedTypeId, { includeInactive: true }),
                    fetchStageTemplates(workspaceId, masterType.projectTypeId, { includeInactive: true })
                ]);

                // HARD SYNC: Master (DNB) -> Current (DSN/BLD)
                const syncPromises = masterStages.map(async (master) => {
                    const existing = currentStages.find(c => c.stageCode === master.stageCode);

                    if (existing) {
                        if (
                            existing.category !== master.category ||
                            existing.position !== master.position ||
                            existing.stageName !== master.stageName ||
                            existing.weightDefault !== master.weightDefault // Force sync default weight too
                        ) {
                            await updateStageTemplate(existing.id, workspaceId, {
                                category: master.category,
                                position: master.position,
                                stageName: master.stageName,
                                stageNameId: master.stageNameId,
                                description: master.description,
                                displayCode: master.displayCode,
                                weightDefault: master.weightDefault
                            });
                        }
                        bases[existing.id] = master.weightDefault;
                        return;
                    } else {
                        await createStageTemplate(workspaceId, {
                            ...master,
                            id: undefined,
                            projectTypeId: selectedTypeId, // Explicitly set target type
                            isActive: false,
                            weightDefault: master.weightDefault,
                            createdAt: undefined, updatedAt: undefined
                        } as any);
                    }
                });

                await Promise.all(syncPromises);
            } else {
                // Self-Master or No Master found: Load own defaults
                const stages = await fetchStageTemplates(workspaceId, selectedTypeId, { includeInactive: true });
                stages.forEach(s => { bases[s.id] = s.weightDefault || 0; });
            }

            // Reload Everything (Clean Slate after Sync)
            const freshStages = await fetchStageTemplates(workspaceId, selectedTypeId, { includeInactive: true });

            // Re-populate 'bases'
            freshStages.forEach(s => { bases[s.id] = s.weightDefault || 0; });
            setBaseWeights(bases);

            // Redefine Active Sets
            // Note: If DNB is Master, DSN is subset of DNB.
            // But we must respect the Stage Code.
            const DEFINITIONS: Record<string, string[]> = {
                "DSN": ["KO", "SD", "DD", "ED", "HO"],
                "BLD": ["KO", "PC", "CN", "HO"],
                "DNB": ["KO", "SD", "DD", "ED", "PC", "CN", "HO"]
            };

            let activeSet: string[] = [];
            const code = currentType.code || "";
            const name = currentType.name.toLowerCase();

            if (code === "DSN" || (name.includes("design") && !name.includes("build"))) { activeSet = DEFINITIONS["DSN"]; }
            else if (code === "BLD" || (name.includes("build") && !name.includes("design"))) { activeSet = DEFINITIONS["BLD"]; }
            else { activeSet = DEFINITIONS["DNB"]; }

            // Initialize Scope Config
            let newScopeStages = freshStages.map(s => {
                // Fallback to splitting stageCode if abbr is missing, or just using CODE
                const [num, abbr] = (s.displayCode || "").split("-");
                const codeAbbr = abbr || s.stageCode || "CODE";

                // Fuzzy match for active set (in case of slight code variations)
                // We check if codeAbbr is in the set
                const shouldBeActive = activeSet.includes(codeAbbr);

                return {
                    ...s,
                    isEnabled: shouldBeActive,
                    currentWeight: 0,
                    codeNumber: num || "00", // Ensure string
                    codeAbbr: codeAbbr
                } as ScopeStageConfig; // Cast to ensure type compatibility
            });

            // Recalculate Weights
            newScopeStages = recalculateWeights(newScopeStages, bases);

            // Recalculate Numbers & Sort
            newScopeStages = recalculateNumbers(newScopeStages);

            setScopeStages(newScopeStages);
            setIsSuccessOpen(true);

        } catch (error) {
            console.error(error);
            alert("Failed to reset.");
        } finally {
            setIsLoading(false);
            setIsResetConfirmOpen(false);
        }
    };

    // Load Project Types (Scopes)
    useEffect(() => {
        const loadTypes = async () => {
            const types = await fetchProjectTypes(workspaceId);

            // Custom Sort: DNB | DSN | BLD
            const sortedTypes = types.sort((a, b) => {
                const nameA = a.code || a.name.toUpperCase();
                const nameB = b.code || b.name.toUpperCase();

                // Specific order map
                const order: Record<string, number> = { "DNB": 1, "DSN": 2, "BLD": 3 };

                const valA = order[nameA] || 99;
                const valB = order[nameB] || 99;

                return valA - valB;
            });

            setProjectTypes(sortedTypes);
            if (sortedTypes.length > 0) setSelectedTypeId(sortedTypes[0].projectTypeId);
        };
        loadTypes();
    }, [workspaceId]);

    const isSyncing = useRef(false);

    // Load Stages and merge with configuration for selected scope
    // AUTO-SYNC IMPLEMENTATION:
    // When loading a Scope (e.g. DSN), we must ensure it matches the Master List (DNB/BLD).
    // If stages were added/removed in Master, we reflect that here automatically.
    useEffect(() => {
        if (!selectedTypeId) return;

        const loadContent = async () => {
            if (isSyncing.current) return;
            isSyncing.current = true;
            setIsLoading(true);

            try {
                // 1. Identify Master Scope for SSOT
                // (Reusing logic from confirmReset)
                let masterType = projectTypes.find(t => t.code === "DNB" || (t.name.toLowerCase().includes("design") && t.name.toLowerCase().includes("build")));
                if (!masterType) {
                    masterType = projectTypes.find(t => t.code === "BLD" || (t.name.toLowerCase().includes("build") && !t.name.toLowerCase().includes("design")));
                }

                const isSelfMaster = masterType?.projectTypeId === selectedTypeId;

                // Fetch Current Stages
                let currentStages = await fetchStageTemplates(workspaceId, selectedTypeId, { includeInactive: true });

                // PRE-CLEANUP: Deduplicate in Current Scope
                // If race conditions caused duplicates previously, we clean them now.
                const seenCodes = new Set<string>();
                const duplicatesToDelete: string[] = [];
                currentStages.forEach(s => {
                    const code = (s.stageCode || "").trim().toUpperCase();
                    if (seenCodes.has(code)) {
                        duplicatesToDelete.push(s.id);
                    } else {
                        seenCodes.add(code);
                    }
                });

                if (duplicatesToDelete.length > 0) {
                    await Promise.all(duplicatesToDelete.map(id => deleteStageTemplate(id, workspaceId)));
                    // Reload after cleanup
                    currentStages = await fetchStageTemplates(workspaceId, selectedTypeId, { includeInactive: true });
                }

                // 2. Perform Auto-Sync if we have a distinct Master
                if (masterType && !isSelfMaster) {
                    const masterStages = await fetchStageTemplates(workspaceId, masterType.projectTypeId, { includeInactive: true });
                    let hasChanges = false;

                    const syncPromises = masterStages.map(async (master) => {
                        const existing = currentStages.find(c => c.stageCode === master.stageCode);

                        if (existing) {
                            // Update Metadata if changed (Name, Category, Position)
                            // We do NOT update weights or active status automatically on load (persisting user config),
                            // UNLESS it's a critical metadata fix. 
                            // Actually, users want "Stage List" changes to propagate.
                            // If I rename a stage in List, it should rename in Scope.
                            if (
                                existing.category !== master.category ||
                                existing.position !== master.position ||
                                existing.stageName !== master.stageName ||
                                existing.displayCode !== master.displayCode
                            ) {
                                await updateStageTemplate(existing.id, workspaceId, {
                                    stageName: master.stageName,
                                    stageNameId: master.stageNameId,
                                    category: master.category,
                                    position: master.position,
                                    displayCode: master.displayCode,
                                    // Preserve existing Scope-specific settings
                                    weightDefault: existing.weightDefault,
                                    isActive: existing.isActive
                                });
                                hasChanges = true;
                            }
                        } else {
                            // CREATE Missing Stage (Added in Master)
                            await createStageTemplate(workspaceId, {
                                ...master,
                                id: undefined,
                                projectTypeId: selectedTypeId,
                                isActive: false, // Default to Disabled for safety? Or check DEFINITIONS?
                                // Let's default to false, user can enable.
                                weightDefault: master.weightDefault, // Carry over default weight
                                createdAt: undefined, updatedAt: undefined
                            } as any);
                            hasChanges = true;
                        }
                    });

                    // Handle Deletions (Stages in Current but NOT in Master)
                    const deletePromises = currentStages
                        .filter(c => !masterStages.find(m => m.stageCode === c.stageCode))
                        .map(async (orphan) => {
                            await deleteStageTemplate(orphan.id, workspaceId);
                        });

                    await Promise.all([...syncPromises, ...deletePromises]);

                    if (deletePromises.length > 0) hasChanges = true;

                    // Reload if we made changes
                    if (hasChanges) {
                        currentStages = await fetchStageTemplates(workspaceId, selectedTypeId, { includeInactive: true });
                    }
                }

                // 3. Establish Base Weights (Source of Truth)
                const bases: Record<string, number> = {};
                // If we have a Master, should we use Master's defaults as Base?
                // Rule: "Scope weight is calculated... using Default Weight".
                // If we synced, currentStages has the default weights.
                // However, existing.weightDefault was PRESERVED above.
                // If Master changed the Default Weight, we didn't sync it above.
                // Should we?
                // User requirement: "Stage List is SSOT".
                // So if Stage List changes 5% -> 10%, Scope should calculate based on 10%.
                // So YES, we should use Master's weights as 'bases'.

                if (masterType && !isSelfMaster) {
                    // Fetch master again just to be sure we have the latest defaults?
                    // We already fetched them. Let's use that if possible.
                    // Refetching is safer.
                    const masterStages = await fetchStageTemplates(workspaceId, masterType.projectTypeId, { includeInactive: true });
                    masterStages.forEach(m => {
                        // Map by Code because IDs differ
                        // We need to map Current Stage ID -> Master Weight
                        const current = currentStages.find(c => c.stageCode === m.stageCode);
                        if (current) bases[current.id] = m.weightDefault || 0;
                    });
                } else {
                    currentStages.forEach(s => { bases[s.id] = s.weightDefault || 0; });
                }

                setBaseWeights(bases);

                // 4. Initialize Config
                let initialized: ScopeStageConfig[] = currentStages.map(s => {
                    const [num, abbr] = (s.displayCode || "").split("-");
                    return {
                        ...s,
                        isEnabled: s.isActive,
                        currentWeight: 0,
                        codeNumber: num || "00",
                        codeAbbr: abbr || s.stageCode || "CODE"
                    } as ScopeStageConfig;
                });

                // 5. Apply Formula
                initialized = recalculateWeights(initialized, bases);

                // 6. Numbering
                initialized = recalculateNumbers(initialized);

                setScopeStages(initialized);

            } catch (error) {
                console.error("Failed to load stages", error);
            } finally {
                setIsLoading(false);
                isSyncing.current = false;
            }
        };

        loadContent();
    }, [selectedTypeId, workspaceId]);

    // Helper: Recalculate Numbers based on Active Status and List Order
    const recalculateNumbers = (stages: ScopeStageConfig[]): ScopeStageConfig[] => {
        // First, ensure they are sorted by POSITION (Fixed Waterfall Order)
        // We do not trust the current array order if DnD was used previously.
        const sorted = [...stages].sort((a, b) => (a.position - b.position));

        let activeCounter = 1;
        return sorted.map((stage) => {
            const isEnabled = stage.isEnabled;
            const newNum = isEnabled ? activeCounter++ : 0;
            const numStr = newNum === 0 ? "00" : newNum.toString().padStart(2, '0');

            return {
                ...stage,
                codeNumber: numStr,
                displayCode: `${numStr}-${stage.codeAbbr}`,
                // Position is preserved from DB/Template, never changed by UI here
            };
        });
    };

    // Note: DnD is disabled to enforce strict "Waterfall" order as requested.
    // "urutannya 04-ED, 00-PC, 00-CN dan daiakhir 05-HO" implies fixed structure.

    const handleToggleStage = (stageId: string) => {
        setScopeStages(prev => {
            // 1. Toggle State
            const nextStages = prev.map(s =>
                s.id === stageId ? { ...s, isEnabled: !s.isEnabled } : s
            );

            // 2. Recalculate Weights (Strict Distribution)
            const distributedStages = recalculateWeights(nextStages, baseWeights);

            // 3. Recalculate Numbers
            return recalculateNumbers(distributedStages);
        });
    };

    const handleWeightChange = (stageId: string, newWeight: number) => {
        if (newWeight < 0 || newWeight > TOTAL_WEIGHT) return;

        setScopeStages(prev => {
            // Manual Override: This is tricky with Strict Distribution.
            // If user manually types a weight, they are breaking the "Default Ratio".
            // We behave like before: scale others to fit.
            // Note: This effectively changes the 'Base Ratio' implicitly for this session.

            const targetStage = prev.find(s => s.id === stageId);
            if (!targetStage || !targetStage.isEnabled) return prev;

            // Standard proportional adjustment for manual override
            const remaining = TOTAL_WEIGHT - newWeight;
            const others = prev.filter(s => s.isEnabled && s.id !== stageId);
            const totalOthers = others.reduce((sum, s) => sum + s.currentWeight, 0);

            return prev.map(s => {
                if (s.id === stageId) return { ...s, currentWeight: newWeight };
                if (!s.isEnabled) return s;

                let adjusted = 0;
                if (totalOthers > 0) {
                    adjusted = (s.currentWeight / totalOthers) * remaining;
                } else if (others.length > 0) {
                    adjusted = remaining / others.length;
                }
                return { ...s, currentWeight: adjusted };
            });
        });
    };

    // Save Function
    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Map UI ScopeStageConfig back to DB structure
            // We use the same 'update' logic, effectively saving the "Scope Configuration"
            const stagesToSave: StageTemplate[] = scopeStages.map(s => ({
                id: s.id, // Important to keep ID
                workspaceId: s.workspaceId,
                projectTypeId: s.projectTypeId,
                stageCode: s.stageCode, // Use original code
                stageName: s.stageName,
                stageNameId: s.stageNameId,
                displayCode: s.displayCode, // Save the dynamic code
                position: s.position, // Save the dynamic position
                weightDefault: parseFloat(s.currentWeight.toFixed(2)), // Save calculated weight
                isActive: s.isEnabled, // Save enabled status
                category: s.category,
                description: s.description,
                rules: s.rules,
                lockable: s.lockable,
                createdAt: s.createdAt!, // Keep dates if present
                updatedAt: new Date().toISOString()
            }));

            // Use bulkUpdate to ensure consistency
            const success = await bulkUpdateStageTemplates(workspaceId, selectedTypeId, stagesToSave);

            if (success) {
                alert("Configuration saved successfully!");
            } else {
                alert("Failed to save configuration.");
            }
        } catch (error) {
            console.error("Error saving stages:", error);
            alert("An error occurred while saving.");
        } finally {
            setIsLoading(false);
        }
    };

    // Header Actions
    useEffect(() => {
        if (setHeaderActions) {
            setHeaderActions(
                <div className="flex items-center gap-3">
                    {/* Scope/Project Type Selector */}
                    {projectTypes.length > 0 && (
                        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full">
                            {projectTypes.map((type) => (
                                <button
                                    key={type.projectTypeId}
                                    onClick={() => setSelectedTypeId(type.projectTypeId)}
                                    className={`
                                        px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap
                                        ${selectedTypeId === type.projectTypeId
                                            ? "bg-white text-neutral-900 shadow-sm"
                                            : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"}
                                    `}
                                >
                                    {type.code || type.name}
                                </button>
                            ))}
                        </div>
                    )}



                    <Button
                        variant="secondary"
                        onClick={handleResetToStandard}
                        icon={<RotateCcw className="w-3 h-3" />}
                        className="text-xs h-8 rounded-full"
                    >
                        Reset Defaults
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isLoading || !isWeightValid} // Disable if weights invalid
                        icon={isLoading ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                        className={`
                            h-8 text-xs shadow-sm transition-all rounded-full border-none
                            ${isWeightValid
                                ? "!bg-red-600 !hover:bg-red-700 !text-white"
                                : "!bg-neutral-300 !text-neutral-600 cursor-not-allowed"}
                        `}
                    >
                        {isLoading ? "Saving..." : "Save Scope"}
                    </Button>
                </div>
            );
        }
    }, [setHeaderActions, projectTypes, selectedTypeId, isLoading, isWeightValid, handleSave, handleResetToStandard]);



    const columns: Column<ScopeStageConfig>[] = [
        {
            key: "codeAbbr",
            header: "CODE",
            width: "140px",
            render: (item) => (
                <span className={`font-mono text-sm font-bold px-2 py-1 rounded ${item.isEnabled ? "text-neutral-600 bg-neutral-100" : "text-neutral-300 bg-neutral-50"}`}>
                    {item.codeNumber}-{item.codeAbbr}
                </span>
            )
        },
        {
            key: "stageName",
            header: "NAME (EN)",
            width: "250px",
            render: (item) => (
                <span className={`font-medium ${item.isEnabled ? "text-neutral-900" : "text-neutral-400"}`}>
                    {item.stageName}
                </span>
            )
        },
        {
            key: "stageNameId",
            header: "NAME (ID)",
            width: "250px",
            render: (item) => (
                <span className={`italic ${item.isEnabled ? "text-neutral-500" : "text-neutral-300"}`}>
                    {item.stageNameId || "-"}
                </span>
            )
        },
        {
            key: "category",
            header: "CATEGORY",
            width: "200px",
            render: (item) => {
                let colorClass = "bg-neutral-100 text-neutral-600";

                // If disabled, we might want to gray it out, OR keep specific color but muted?
                // User said "match stage list". Stage list items are always enabled/valid mostly.
                // In Scope tab, "disabled" means "not in scope".
                // Let's use the explicit logic from StageListTab for the colors, 
                // but maybe apply opacity if disabled? 
                // StageListTab logic uses exact string matches.

                if (!item.category) colorClass = "bg-neutral-100 text-neutral-600 border-neutral-100";
                else {
                    const cat = item.category.toLowerCase();
                    if (cat.includes('design')) colorClass = "bg-purple-50 text-purple-700 border-purple-100";
                    else if (cat.includes('construct') || cat.includes('build')) colorClass = "bg-orange-50 text-orange-700 border-orange-100";
                    else if (cat.includes('tender') || cat.includes('procurement')) colorClass = "bg-blue-50 text-blue-700 border-blue-100";
                    else if (cat.includes('handover') || cat.includes('close')) colorClass = "bg-green-50 text-green-700 border-green-100";
                    else colorClass = "bg-neutral-100 text-neutral-600 border-neutral-100"; // General
                }

                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${colorClass} ${!item.isEnabled ? "opacity-50 grayscale" : ""}`}>
                        {item.category || "General"}
                    </span>
                );
            }
        },
        {
            key: "currentWeight",
            header: "WEIGHT %",
            width: "120px",
            render: (item) => (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        disabled={!item.isEnabled}
                        // Remove parseFloat to keep trailing zeros (e.g. "12.50")
                        value={item.isEnabled ? item.currentWeight.toFixed(2) : "0.00"}
                        onChange={(e) => handleWeightChange(item.id, Number(e.target.value))}
                        onBlur={(e) => handleWeightChange(item.id, Number(Number(e.target.value).toFixed(2)))}
                        className={`
                            w-full text-right pr-6 py-1 rounded border-transparent bg-transparent hover:bg-neutral-50 focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200 transition-all font-mono
                            ${!item.isEnabled ? "text-neutral-300 cursor-not-allowed" : "text-neutral-900"}
                            ${item.isEnabled && isWeightValid ? "text-neutral-900" : ""}
                            ${item.isEnabled && !isWeightValid ? "text-red-600 font-bold" : ""}
                        `}
                    />
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${!item.isEnabled ? "text-neutral-300" : "text-neutral-400"}`}>%</span>
                </div>
            )
        },
        {
            key: "isEnabled",
            header: "",
            width: "50px",
            render: (item) => (
                <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStage(item.id); }}
                    className={`
                        w-6 h-6 rounded-full flex items-center justify-center transition-all
                        ${item.isEnabled
                            ? "bg-neutral-900 text-white shadow-sm hover:bg-neutral-800"
                            : "bg-white border-2 border-neutral-200 text-transparent hover:border-neutral-300"}
                    `}
                >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <ModalConfirm
                open={isResetConfirmOpen}
                onOpenChange={setIsResetConfirmOpen}
                title="Reset Scope Configuration"
                description={`Are you sure you want to reset the confirmation for this scope to the standard defaults? This will overwrite your current weight settings.`}
                confirmLabel="Reset Config"
                cancelLabel="Cancel"
                status="danger"
                onConfirm={confirmReset}
            />
            <ModalConfirm
                open={isSuccessOpen}
                onOpenChange={setIsSuccessOpen}
                title="Configuration Reset"
                description="The scope configuration has been reset to defaults. Click 'Save Config' to persist these changes."
                confirmLabel="OK"
                status="success"
                onConfirm={() => setIsSuccessOpen(false)}
            />

            {/* Top Bar: Tabs and Action Area */}
            <div>{headerContent}</div>

            <SortableTable
                data={scopeStages}
                columns={columns}
                isLoading={isLoading}
                // onReorder={handleReorder} // Disabled for fixed Waterfall sorting
                onRowClick={(item) => handleToggleStage(item.id)}
                emptyMessage="No stages available. Please add stages in the Stage List tab first."
            />
        </div>
    );
}
