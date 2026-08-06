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
import { supabase } from "@/lib/supabaseClient";

import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";

import { buildRABFromWBS } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-from-wbs";
import { buildRABEstimates, EstimateValues } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-estimates-builder";

import RABDetailDrawer from "@/components/flow/projects/project-detail/setup/rab/ballpark/RABDetailDrawer";
import { exportRABToExcel } from "@/lib/flow/rab-excel";
import { generateRABPDFHTML } from "@/lib/flow/rab-pdf";

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // RAB STATUS (Logic similar to WBS)
  const [rabStatus, setRabStatus] = useState<RABStatus>("draft"); // draft -> saved -> submitted

  const [context, setContext] = useState<RABContext>({
    buildingClass: ((project?.meta as any)?.rabClass || project?.rabClass || "B") as any,
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
    const rawArea = (project.meta as any)?.buildingArea || (project as any).buildingArea;
    if (rawArea) {
      const num = parseInt(String(rawArea).replace(/\D/g, ""));
      if (!isNaN(num)) area = num;
    }

    setContext(prev => ({
      ...prev,
      buildingClass: ((project.meta as any)?.rabClass || project.rabClass || "B") as any,
      area: area,
      province: project.province || "DKI Jakarta",
      city: project.city || "Jakarta Selatan"
    }));

    const meta = project.meta as any;
    if (meta) {
      if (meta.priceOverrides) setPriceOverrides(meta.priceOverrides);
      if (meta.estimateValues) setEstimateValues(meta.estimateValues);
      if (meta.adjustmentFactor !== undefined) setAdjustmentFactor(meta.adjustmentFactor);
      if (meta.rabStatus) setRabStatus(meta.rabStatus);
    }
  }, [project]);

  // 🔥 SOURCE OF TRUTH: PRICE OVERRIDE (LEAF PER m²)
  const [priceOverrides, setPriceOverrides] =
    useState<Record<string, number>>({});

  // 🔥 SOURCE OF TRUTH: ESTIMATES (Volume, Unit, Price)
  const [estimateValues, setEstimateValues] = useState<EstimateValues>({});

  const [dbWbsItems, setDbWbsItems] = useState<any[]>([]);
  const [isLoadingWBS, setIsLoadingWBS] = useState(true);

  // Fetch WBS dynamically from DB matching workspace
  useEffect(() => {
    if (!project?.workspace_id) return;
    
    async function fetchWbs() {
      try {
        setIsLoadingWBS(true);
        const { data, error } = await supabase
          .from("work_breakdown_structure")
          .select("*")
          .eq("workspace_id", project.workspace_id);
          
        if (error) throw error;
        
        const dbWbs = data || [];
        if (dbWbs.length > 0) {
          const compareWBSCodes = (a: string, b: string): number => {
            const partsA = a.split('.');
            const partsB = b.split('.');
            const minLen = Math.min(partsA.length, partsB.length);
            for (let i = 0; i < minLen; i++) {
              const partA = partsA[i];
              const partB = partsB[i];
              const numA = parseInt(partA);
              const numB = parseInt(partB);
              const isNumA = !isNaN(numA);
              const isNumB = !isNaN(numB);
              if (isNumA && isNumB) {
                if (numA !== numB) return numA - numB;
              } else if (partA !== partB) {
                return partA.localeCompare(partB, undefined, { numeric: true, sensitivity: 'base' });
              }
            }
            return partsA.length - partsB.length;
          };

          const idMap = new Map<string, any>();
          dbWbs.forEach((item: any) => {
            idMap.set(item.id, {
              ...item,
              nameEn: item.name || "",
              nameId: item.description || "",
              children: []
            });
          });

          const rootsList: any[] = [];
          dbWbs.forEach((item: any) => {
            const node = idMap.get(item.id);
            if (item.parent_id && idMap.has(item.parent_id)) {
              idMap.get(item.parent_id).children.push(node);
            } else {
              rootsList.push(node);
            }
          });

          const sortNodes = (list: any[]) => {
            list.sort((a, b) => compareWBSCodes(a.code, b.code));
            list.forEach(node => {
              if (node.children) sortNodes(node.children);
            });
          };

          sortNodes(rootsList);

          const ORDER_MAP: Record<string, number> = { S: 1, A: 2, M: 3, I: 4, L: 5 };
          rootsList.sort((a, b) => {
            const prefixA = a.code.split('.')[0];
            const prefixB = b.code.split('.')[0];
            const orderA = ORDER_MAP[prefixA] ?? 999;
            const orderB = ORDER_MAP[prefixB] ?? 999;
            return orderA - orderB;
          });

          setDbWbsItems(rootsList);
        }
      } catch (err) {
        console.error("Error fetching project WBS:", err);
      } finally {
        setIsLoadingWBS(false);
      }
    }
    
    fetchWbs();
  }, [project?.workspace_id, refreshTrigger]);

  const activeWBS = useMemo(() => {
    return dbWbsItems.length > 0 ? dbWbsItems : WBS_BALLPARK;
  }, [dbWbsItems]);



  /* ===== RESET LOGIC ===== */
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Detail Drawer State
  const [selectedDetailItem, setSelectedDetailItem] = useState<RABItem | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"BOQ" | "AHSP">("BOQ");

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
      wbs: activeWBS,
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
  }, [activeWBS, context.buildingClass, context.rf, context.df, priceOverrides, adjustmentFactor]);

  // 2. Build RAB Tree (Estimates)
  const rabTreeEstimates = useMemo(() => {
    const wbsEstimates = dbWbsItems.length > 0
      ? activeWBS 
      : buildEstimatesFromBallpark(activeWBS, RAW_WBS_ESTIMATES_DELTA);
    return buildRABEstimates(wbsEstimates, estimateValues, {
      rabClass: context.buildingClass,
      rf: context.rf,
      df: context.df,
      adjustmentFactor: adjustmentFactor
    });
  }, [estimateValues, activeWBS, dbWbsItems.length, context.buildingClass, context.rf, context.df, adjustmentFactor]);

  // 3. Build RAB Tree (Detail Mode - Deep L4/L5)
  const rabTreeDetail = useMemo(() => {
    const wbsDetail = dbWbsItems.length > 0
      ? activeWBS 
      : buildDetailFromEstimates(buildEstimatesFromBallpark(activeWBS, RAW_WBS_ESTIMATES_DELTA));

    return buildRABEstimates(wbsDetail, estimateValues, {
      rabClass: context.buildingClass,
      rf: context.rf,
      df: context.df,
      adjustmentFactor: adjustmentFactor
    });
  }, [estimateValues, activeWBS, dbWbsItems.length, context.buildingClass, context.rf, context.df, adjustmentFactor]);

  // ACTIVE TREE
  const activeTree = useMemo(() => {
    if (activeMode === "BALLPARK") return rabTreeBallpark;
    if (activeMode === "DETAIL" && activeView === "BREAKDOWN") return rabTreeDetail;
    return rabTreeEstimates;
  }, [activeMode, activeView, rabTreeBallpark, rabTreeEstimates, rabTreeDetail]);

  // Keep selectedDetailItem in sync with tree updates (like when ahsp_id is assigned/unassigned)
  useEffect(() => {
    if (!selectedDetailItem) return;
    
    const findItemInTree = (nodes: RABItem[], code: string): RABItem | null => {
      for (const node of nodes) {
        if (node.code === code) return node;
        if (node.children) {
          const found = findItemInTree(node.children, code);
          if (found) return found;
        }
      }
      return null;
    };
    
    const updatedItem = findItemInTree(activeTree, selectedDetailItem.code);
    if (updatedItem) {
      setSelectedDetailItem(updatedItem);
    }
  }, [activeTree, selectedDetailItem?.code]);

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
  const saveRABToDb = async (status: RABStatus) => {
    if (!project) return;
    try {
      const updatedMeta = {
        ...(project.meta || {}),
        priceOverrides,
        estimateValues,
        adjustmentFactor,
        rabStatus: status,
      };

      const { error } = await supabase
        .from("projects")
        .update({
          meta: updatedMeta
        })
        .eq("id", project.id);

      if (error) throw error;
      setRabStatus(status);
      alert(`✅ RAB ${status === "submitted" ? "submitted" : "saved"} successfully!`);
    } catch (err: any) {
      console.error("Error saving RAB:", err);
      alert("❌ Failed to save RAB: " + err.message);
    }
  };

  const saveDraft = () => saveRABToDb("saved");
  const saveChanges = () => saveRABToDb("saved");
  const submitRAB = () => saveRABToDb("submitted");
  const addRevision = () => saveRABToDb("saved");

  const handleExportExcel = () => {
    if (!project) return;
    const ctx = {
      projectName: project.project_name || "Proyek Tanpa Nama",
      projectNo: project.project_number || "-",
      projectCode: project.project_code || "-",
      buildingClass: context.buildingClass,
      area: safeArea,
      province: context.province,
      city: context.city,
      rf: context.rf,
      df: context.df,
      adjustmentFactor: adjustmentFactor
    };
    exportRABToExcel(
      activeTree,
      ctx,
      activeMode,
      `RAB_${project.project_code || "Project"}_${activeMode}.xlsx`
    );
  };

  const handleExportPDF = async () => {
    if (!project) return;
    try {
      const ctx = {
        projectName: project.project_name || "Proyek Tanpa Nama",
        projectNo: project.project_number || "-",
        projectCode: project.project_code || "-",
        buildingClass: context.buildingClass,
        area: safeArea,
        province: context.province,
        city: context.city,
        rf: context.rf,
        df: context.df,
        adjustmentFactor: adjustmentFactor,
        status: rabStatus
      };

      const htmlContent = generateRABPDFHTML(
        activeTree,
        ctx,
        totalProjectCost,
        activeMode
      );

      const response = await fetch("/api/flow/reports/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ html: htmlContent })
      });

      if (!response.ok) throw new Error("Gagal mengekspor PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RAB_${project.project_code || "Project"}_${activeMode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengunduh PDF: " + err.message);
    }
  };

  // Derived check for read-only vs editable mode
  // If status is submitted, we are in "Read Only" until "Add Revision" is clicked.
  // Actually, UI just disables Inputs if needed? But for now, just buttons flip status.
  const isEditing = rabStatus !== "submitted";

  // === CONDITIONAL RETURNS (must be after all hooks) ===
  if (isLoading || (project?.workspace_id && isLoadingWBS)) {
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
    <>
      <PageWrapper sidebar={<ProjectDetailSidebar />} isTransparent={true}>
        <div className="space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500 px-4 md:px-0">
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

              <div className="pb-2 flex items-center gap-2 relative">
                <div className="relative">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Export
                  </Button>
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                      <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-150">
                        <button
                          onClick={() => { handleExportExcel(); setShowExportMenu(false); }}
                          className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-50 text-neutral-700 font-medium"
                        >
                          Excel (.xlsx)
                        </button>
                        <button
                          onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                          className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-50 text-neutral-700 font-medium"
                        >
                          PDF (.pdf)
                        </button>
                      </div>
                    </>
                  )}
                </div>

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
                  onSelect={(item, tab) => {
                    setSelectedDetailItem(item);
                    setActiveDrawerTab(tab || "BOQ");
                  }}
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
        initialTab={activeDrawerTab}
        onApply={handleDetailApply}
        onApplyVolume={handleDetailApplyVolume}
        onReloadWbs={() => setRefreshTrigger(prev => prev + 1)}
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
    </>
  );
}
