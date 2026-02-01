"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Tabs } from "@/shared/ui/layout/Tabs";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Input } from "@/shared/ui/primitives/input/input";
import { Download, Save, Plus, Send, RotateCcw } from "lucide-react";

import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";

import { buildRABFromWBS } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-from-wbs";
import { buildRABEstimates, EstimateValues } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-estimates-builder";

import RABDetailDrawer from "@/components/flow/projects/project-detail/setup/rab/ballpark/RABDetailDrawer";

import RABSummaryTable from "@/components/flow/projects/project-detail/setup/rab/ballpark/RABSummaryTable";
import RABDetailSummaryTable from "@/components/flow/projects/project-detail/setup/rab/ballpark/RABDetailSummaryTable";
import RABBreakdownTable from "@/components/flow/projects/project-detail/setup/rab/ballpark/RABBreakdownTable";

import { getNodeTotalPerM2 } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-utils";
import { getLocationFactor as getLocationFactorList } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-factors";
import { useProject } from "@/components/flow/project-context";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

import type { RABItem } from "@/components/flow/projects/project-detail/setup/rab/ballpark/types/rab.types";

// Reuse Confirm Modal from WBS
import { ConfirmModal } from "@/components/flow/projects/project-detail/setup/wbs/WBSModals";

/* ================= TYPES ================= */

type RABMode = "BALLPARK" | "ESTIMATES" | "DETAIL";
type RABView = "SUMMARY" | "BREAKDOWN";
type RABStatus = "draft" | "saved" | "submitted";

type RABContext = {
  buildingClass: "A" | "B" | "C" | "D";
  area: number;
  province: string;
  city: string;
  rf: number;
  df: number;
};

type LocationFactor = {
  province: string;
  city?: string;
  regionalFactor: number;
  difficultyFactor: number;
};

type SelectOption = { label: string; value: string };

/* ================= TABS ================= */

const RAB_TABS = [
  { key: "BALLPARK", label: "Ballpark" },
  { key: "ESTIMATES", label: "Estimates" },
  { key: "DETAIL", label: "Detail" },
] satisfies { key: RABMode; label: string }[];

/* ================= LOCATION HELPERS ================= */

function resolveLocationFactor(
  list: LocationFactor[],
  province: string,
  city: string
) {
  const cityRow = list.find(
    (r) => r.province === province && (r.city ?? "") === city
  );
  if (cityRow)
    return { rf: cityRow.regionalFactor, df: cityRow.difficultyFactor };

  const provRow = list.find(
    (r) => r.province === province && (!r.city || r.city.trim() === "")
  );
  if (provRow)
    return { rf: provRow.regionalFactor, df: provRow.difficultyFactor };

  return { rf: 1, df: 1 };
}

function buildProvinceOptions(list: LocationFactor[]): SelectOption[] {
  const set = new Set<string>();
  list.forEach((r) => set.add(r.province));
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((p) => ({ label: p, value: p }));
}

function buildCityOptions(
  list: LocationFactor[],
  province: string
): SelectOption[] {
  return list
    .filter(
      (r) =>
        r.province === province &&
        !!r.city &&
        r.city.trim() !== ""
    )
    .map((r) => ({ label: r.city!, value: r.city! }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/* ================= PRICE OVERRIDE ================= */

function applyPriceOverrides(
  tree: RABItem[],
  overrides: Record<string, number>
): RABItem[] {
  function walk(node: RABItem): RABItem {
    const children = node.children ?? [];

    if (children.length === 0) {
      const v = overrides[node.code];
      return {
        ...node,
        unitPrice: Number.isFinite(v) ? v : node.unitPrice,
        children: [],
      };
    }

    return {
      ...node,
      children: children.map(walk),
    };
  }

  return tree.map(walk);
}

/* ================= PAGE ================= */

export default function ProjectSetupRABPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, isLoading, error } = useProject();

  const [activeMode, setActiveMode] = useState<RABMode>("BALLPARK");
  const [activeView, setActiveView] = useState<RABView>("SUMMARY");

  // RAB STATUS (Logic similar to WBS)
  const [rabStatus, setRabStatus] = useState<RABStatus>("draft"); // draft -> saved -> submitted

  const [context, setContext] = useState<RABContext>({
    buildingClass: (project?.rabClass as any) || "B",
    area: 1200,
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
    rf: 1,
    df: 1,
  });

  // Slider for Price Adjustment (default 100%)
  const [adjustmentFactor, setAdjustmentFactor] = useState(100);

  // Initialize from Project Data
  useEffect(() => {
    if (!project) return;

    // Parse area "1,500 m2" -> 1500
    let area = 1200;
    if (project.buildingArea) {
      const num = parseInt(project.buildingArea.replace(/\D/g, ""));
      if (!isNaN(num)) area = num;
    }

    setContext(prev => ({
      ...prev,
      buildingClass: (project.rabClass || "B") as any,
      area: area,
      province: project.province || "DKI Jakarta",
      city: project.city || "Jakarta Selatan"
    }));
  }, [project]);

  // 🔥 SOURCE OF TRUTH: PRICE OVERRIDE (LEAF PER m²)
  const [priceOverrides, setPriceOverrides] =
    useState<Record<string, number>>({});

  // 🔥 SOURCE OF TRUTH: ESTIMATES (Volume, Unit, Price)
  const [estimateValues, setEstimateValues] = useState<EstimateValues>({});



  /* ===== RESET LOGIC ===== */
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Detail Drawer State
  const [selectedDetailItem, setSelectedDetailItem] = useState<RABItem | null>(null);

  // Check if modified
  const isPristine =
    Object.keys(priceOverrides).length === 0 &&
    Object.keys(estimateValues).length === 0 &&
    adjustmentFactor === 100;

  function onResetActive() {
    setShowResetConfirm(true);
  }

  function doReset() {
    setPriceOverrides({});
    setEstimateValues({});
    setAdjustmentFactor(100);
    setRabStatus("draft");
  }

  /* ===== LOCATION LIST (STATIC) ===== */
  const locationList = useMemo(() => {
    return (getLocationFactorList as LocationFactor[]) ?? [];
  }, []);

  /* ===== OPTIONS (DERIVED FROM DATA) ===== */
  const provinceOptions = useMemo(
    () => buildProvinceOptions(locationList),
    [locationList]
  );

  const cityOptions = useMemo(
    () => buildCityOptions(locationList, context.province),
    [locationList, context.province]
  );

  // ensure selected city exists (or fallback)
  useEffect(() => {
    if (!context.province) return;

    // If city is empty, that's allowed (Province level). Do NOT auto-pick.
    if (!context.city || context.city.trim() === "") return;

    // if current city not valid for province, reset to empty
    const stillValid = cityOptions.some((c) => c.value === context.city);

    if (stillValid) return;

    // Reset to empty if invalid for new province
    setContext((c) => ({ ...c, city: "" }));
  }, [context.province, cityOptions, context.city]);

  /* ===== LEVEL (DERIVED) ===== */
  const derivedLevel = useMemo(() => {
    if (context.buildingClass === "A") return "Luxury";
    if (context.buildingClass === "B") return "Premium";
    if (context.buildingClass === "C") return "Standard";
    return "Basic";
  }, [context.buildingClass]);

  /* ===== LOCATION FACTORS (RF/DF) ===== */
  useEffect(() => {
    const f = resolveLocationFactor(
      locationList,
      context.province,
      context.city
    );

    setContext((c) =>
      c.rf === f.rf && c.df === f.df ? c : { ...c, rf: f.rf, df: f.df }
    );
  }, [locationList, context.province, context.city]);

  /* ===== SAFE AREA ===== */
  const safeArea = useMemo(() => {
    const a = Number(context.area);
    return Number.isFinite(a) ? Math.max(0, a) : 0;
  }, [context.area]);

  /* ===== BUILD RAB TREES ===== */

  // 1. BALLPARK TREE (Per m²)
  const rabTreeBallpark = useMemo(() => {
    const baseTree = buildRABFromWBS({
      wbs: WBS_BALLPARK,
      rabClass: context.buildingClass,
      rf: context.rf,
      df: context.df,
    });

    // Apply Adjustment Slider (Factor) recursively
    const adjustedTree = baseTree.map(function applyFactor(node: RABItem): RABItem {
      const adjustedPrice = Math.round(node.unitPrice * (adjustmentFactor / 100));
      return {
        ...node,
        unitPrice: adjustedPrice,
        children: node.children?.map(applyFactor)
      };
    });

    return applyPriceOverrides(adjustedTree, priceOverrides);
  }, [context.buildingClass, context.rf, context.df, priceOverrides, adjustmentFactor]);

  // 2. Build RAB Tree (Estimates)
  const rabTreeEstimates = useMemo(() => {
    // Build base WBS Estimates tree
    const wbsEstimates = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
    // Convert to RAB items with user values + Context Factors
    return buildRABEstimates(wbsEstimates, estimateValues, {
      rabClass: context.buildingClass,
      rf: context.rf,
      df: context.df,
      adjustmentFactor: adjustmentFactor
    });
  }, [estimateValues, context.buildingClass, context.rf, context.df, adjustmentFactor]);

  // 3. Build RAB Tree (Detail Mode - Deep L4/L5)
  const rabTreeDetail = useMemo(() => {
    // Start with WBS Estimates
    const wbsEstimates = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
    // Extend to Detail (L4/L5) matching WBS Detail view
    const wbsDetail = buildDetailFromEstimates(wbsEstimates);

    // Map to RAB Items
    // Note: Deep items won't have default prices in wbsDetail, so they rely on estimateValues or default to 0
    return buildRABEstimates(wbsDetail, estimateValues, {
      rabClass: context.buildingClass,
      rf: context.rf,
      df: context.df,
      adjustmentFactor: adjustmentFactor
    });
  }, [estimateValues, context.buildingClass, context.rf, context.df, adjustmentFactor]);

  // ACTIVE TREE
  const activeTree = useMemo(() => {
    if (activeMode === "BALLPARK") return rabTreeBallpark;
    if (activeMode === "DETAIL" && activeView === "BREAKDOWN") return rabTreeDetail;
    return rabTreeEstimates;
  }, [activeMode, activeView, rabTreeBallpark, rabTreeEstimates, rabTreeDetail]);

  /* ===== TOTAL PROJECT COST ===== */
  const totalProjectCost = useMemo(() => {
    if (activeMode === "BALLPARK") {
      return Math.round(
        rabTreeBallpark.reduce(
          (sum, item) => sum + getNodeTotalPerM2(item) * safeArea,
          0
        )
      );
    }
    // ESTIMATES
    return Math.round(
      activeTree.reduce((sum, item) => sum + (item.total || 0), 0)
    );
  }, [activeMode, rabTreeBallpark, activeTree, safeArea]);

  /* ===== HANDLERS ===== */
  function onChangeMode(next: RABMode) {
    setActiveMode(next);
    setActiveView("SUMMARY");
  }

  function onPriceCommit(code: string, value: number) {
    if (!Number.isFinite(value) || value < 0) return;
    setPriceOverrides((p) => ({ ...p, [code]: value }));
  }

  function onEstimateCommit(code: string, value: { volume: number; unit: string; unitPrice: number }) {
    setEstimateValues(prev => ({
      ...prev,
      [code]: value
    }));
  }

  function handleDetailApply(price: number) {
    if (!selectedDetailItem) return;

    // Create new estimate value merging existing with new price
    const currentEst = estimateValues[selectedDetailItem.code] || {
      volume: selectedDetailItem.volume || 0,
      unit: selectedDetailItem.unit || "ls",
      unitPrice: 0
    };

    onEstimateCommit(selectedDetailItem.code, {
      ...currentEst,
      unitPrice: price
    });

    // Close Drawer
    setSelectedDetailItem(null);
  }

  // Action Handlers
  const saveDraft = () => setRabStatus("saved");
  const saveChanges = () => setRabStatus("saved");
  const submitRAB = () => setRabStatus("submitted"); // Locks editing via isEditing check (if needed)
  const addRevision = () => setRabStatus("saved"); // Unlocks

  // Derived check for read-only vs editable mode
  // If status is submitted, we are in "Read Only" until "Add Revision" is clicked.
  // Actually, UI just disables Inputs if needed? But for now, just buttons flip status.
  const isEditing = rabStatus !== "submitted";

  // === CONDITIONAL RETURNS (must be after all hooks) ===
  if (isLoading) {
    return <GlobalLoading />;
  }

  if (error || !project) {
    return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">{error || "Project not found."}</div>;
  }

  const projectForHeader = {
    id: project.id,
    projectNo: project.project_number,
    code: project.project_code,
    name: project.project_name,
    status: project.status as any,
    progress: (project.meta as any)?.progress ?? 0,
    type: (project.meta as any)?.type ?? "design-build",
    stage: "sd" as any,
    rabClass: (project.meta as any)?.rabClass,
    buildingArea: (project.meta as any)?.buildingArea,
    province: (project.location as any)?.province,
    city: (project.location as any)?.city,
  };

  const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

  function handleDetailApplyVolume(volume: number) {
    if (!selectedDetailItem) return;

    // Create new estimate value merging existing with new volume
    const currentEst = estimateValues[selectedDetailItem.code] || {
      volume: 0,
      unit: selectedDetailItem.unit || "ls",
      unitPrice: selectedDetailItem.unitPrice || 0
    };

    onEstimateCommit(selectedDetailItem.code, {
      ...currentEst,
      volume: volume
    });

    // We do NOT close the drawer here, user might want to edit AHSP next
    // But maybe give feedback? For now, just update.
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb
        items={[
          { label: "Flow" },
          { label: "Projects", href: "/flow/projects" },
          { label: breadcrumbLabel, href: `/flow/projects/${projectId}` },
          { label: "Setup" },
          { label: "RAB" },
        ]}
      />

      <PageWrapper sidebar={<ProjectDetailSidebar />}>
        <div className="space-y-6">
          <ProjectDetailHeader project={projectForHeader as any} />

          {/* ===== HEADER + ACTIONS ===== */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">Cost Estimation (RAB)</h2>
            </div>

            {/* Tabs + Actions Row */}
            <div className="flex items-end justify-between border-b border-neutral-200 mb-6">
              <Tabs
                value={activeMode}
                onChange={onChangeMode}
                items={RAB_TABS}
                className="gap-6"
              />

              <div className="pb-2 flex items-center gap-2">
                <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>
                  Export
                </Button>

                {/* Button Flow: Save Draft > Save Changes > Submit RAB > Add Revision */}
                {rabStatus === "draft" && (
                  <Button size="sm" variant="secondary" onClick={saveDraft} icon={<Save className="w-4 h-4" />}>
                    Save Draft
                  </Button>
                )}
                {rabStatus === "saved" && (
                  <Button size="sm" variant="secondary" onClick={saveChanges} icon={<Save className="w-4 h-4" />}>
                    Save Changes
                  </Button>
                )}
                {rabStatus === "saved" && (
                  <Button size="sm" onClick={submitRAB} icon={<Send className="w-4 h-4" />}>
                    Submit RAB
                  </Button>
                )}
                {rabStatus === "submitted" && (
                  <Button size="sm" onClick={addRevision} icon={<Plus className="w-4 h-4" />}>
                    Add Revision
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">

            {/* ===== CONTEXT BAR ===== */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-neutral-50 p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500">Class</span>
                  <Select
                    value={context.buildingClass}
                    options={[
                      { label: "A", value: "A" },
                      { label: "B", value: "B" },
                      { label: "C", value: "C" },
                      { label: "D", value: "D" },
                    ]}
                    selectSize="sm"
                    onChange={(val) =>
                      setContext((c) => ({
                        ...c,
                        buildingClass: val as "A" | "B" | "C",
                      }))
                    }
                    disabled={!isEditing}
                  />

                  <span className="text-xs text-neutral-500">Level</span>
                  <Select
                    value={derivedLevel}
                    options={[
                      { label: "Luxury", value: "Luxury" },
                      { label: "Premium", value: "Premium" },
                      { label: "Standard", value: "Standard" },
                      { label: "Basic", value: "Basic" },
                    ]}
                    selectSize="sm"
                    disabled
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Area</span>
                  <Input
                    type="number"
                    inputSize="sm"
                    value={context.area}
                    onChange={(e) =>
                      setContext((c) => ({
                        ...c,
                        area: Number(e.target.value),
                      }))
                    }
                    className="w-28"
                    disabled={!isEditing}
                  />
                  <span className="text-xs text-neutral-400">m²</span>
                </div>

                <div className="flex items-center gap-2 border-l pl-4">
                  <span className="text-xs text-neutral-500">Price Adjustment</span>
                  <div className="flex items-center gap-2 w-32">
                    <Input
                      type="range"
                      min={85}
                      max={115}
                      step={1}
                      value={adjustmentFactor}
                      onChange={(e) => setAdjustmentFactor(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-neutral-900"
                      disabled={!isEditing}
                    />
                    <span className="text-xs w-8 text-right font-medium">{adjustmentFactor}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Location</span>

                  <Select
                    value={context.province}
                    options={provinceOptions}
                    selectSize="sm"
                    onChange={(val) =>
                      setContext((c) => ({
                        ...c,
                        province: val,
                        city: "",
                      }))
                    }
                    disabled={!isEditing}
                  />


                  <Select
                    value={context.city}
                    options={cityOptions}
                    selectSize="sm"
                    disabled={cityOptions.length === 0 || !isEditing}
                    onChange={(val) =>
                      setContext((c) => ({
                        ...c,
                        city: val,
                      }))
                    }
                  />

                </div>
              </div>

              <div className="flex overflow-hidden rounded-md border">
                <button
                  onClick={() => setActiveView("SUMMARY")}
                  className={`px-4 py-2 text-xs ${activeView === "SUMMARY"
                    ? "bg-neutral-900 text-white"
                    : "bg-white"
                    }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveView("BREAKDOWN")}
                  className={`border-l px-4 py-2 text-xs ${activeView === "BREAKDOWN"
                    ? "bg-neutral-900 text-white"
                    : "bg-white"
                    }`}
                >
                  Breakdown
                </button>
              </div>
            </div>

            {/* ===== CONTENT ===== */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* BALLPARK / ESTIMATES SUMMARY */}
              {activeView === "SUMMARY" && activeMode !== "DETAIL" && (
                <RABSummaryTable items={activeTree} area={safeArea} mode={activeMode} />
              )}

              {/* DETAIL SUMMARY (L0 + L1) */}
              {activeView === "SUMMARY" && activeMode === "DETAIL" && (
                <RABDetailSummaryTable items={rabTreeEstimates} />
              )}

              {/* BREAKDOWN (ALL MODES) */}
              {activeView === "BREAKDOWN" && (
                <RABBreakdownTable
                  items={activeTree}
                  total={totalProjectCost}
                  area={safeArea}
                  mode={activeMode}
                  onPriceCommit={isEditing ? onPriceCommit : undefined}
                  onEstimateCommit={isEditing ? onEstimateCommit : undefined}
                  onSelect={(item) => setSelectedDetailItem(item)}
                />
              )}
            </div>

            {/* RESET TO BASELINE */}
            {!isPristine && isEditing && (
              <div className="pt-4">
                <button
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1.5"
                  onClick={onResetActive}
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to baseline
                </button>
              </div>
            )}

          </div>
        </div>
      </PageWrapper>

      <RABDetailDrawer
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        item={selectedDetailItem}
        onApply={handleDetailApply}
        onApplyVolume={handleDetailApplyVolume}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={doReset}
        title="Reset to Baseline"
        message="This will discard all your changes (overrides, estimates) and reset prices to default. This action cannot be undone."
        confirmLabel="Reset"
        confirmVariant="danger"
      />
    </div>
  );
}
