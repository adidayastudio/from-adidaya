"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Tabs } from "@/shared/ui/layout/Tabs";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Input } from "@/shared/ui/primitives/input/input";
import { Download, Save, Plus, Send, RotateCcw, Search, Maximize2, Minimize2, Undo2, Redo2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { SaveStatusBadge, SaveFloatingToast } from "@/components/flow/projects/project-detail/setup/common/SaveStatusBadge";
import { StageCardsOverview } from "@/components/flow/projects/project-detail/setup/common/StageCardsOverview";
import { CreateVersionModal } from "@/components/flow/projects/project-detail/setup/common/CreateVersionModal";
import type { WBSStage, ProjectVersion, StageSummary } from "@/lib/flow/types/versioning.types";
import { ArrowLeft, GitBranch, Plus as PlusIcon } from "lucide-react";




import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";
import { buildWBSTree, ensureMultiBuildingWBS, mergeWBSTrees } from "@/lib/flow/mappers/wbs-tree";

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
    area: 1000,
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
    let area = 1000;
    const rawArea = (project.meta as any)?.buildingArea || (project as any).buildingArea;
    if (rawArea) {
      const num = parseInt(String(rawArea).replace(/\D/g, ""));
      if (!isNaN(num) && num > 0) area = num;
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
      if (meta.rabVersions && Array.isArray(meta.rabVersions)) setVersions(meta.rabVersions);
    }

  }, [project]);

  // 🔥 SOURCE OF TRUTH: PRICE OVERRIDE (LEAF PER m²)
  const [priceOverrides, setPriceOverrides] =
    useState<Record<string, number>>({});

  // 🔥 SOURCE OF TRUTH: ESTIMATES (Volume, Unit, Price)
  const [estimateValues, setEstimateValues] = useState<EstimateValues>({});

  const [dbWbsItems, setDbWbsItems] = useState<any[]>([]);
  const [isLoadingWBS, setIsLoadingWBS] = useState(true);

  // Fetch WBS dynamically from DB matching project
  useEffect(() => {
    if (!project?.id) return;
    
    async function fetchWbs() {
      try {
        setIsLoadingWBS(true);
        let allRows: any[] = [];
        let page = 0;
        const pageSize = 1000;
        
        while (true) {
          const { data, error } = await supabase
            .from("project_wbs_items")
            .select("*")
            .eq("project_id", project.id)
            .range(page * pageSize, (page + 1) * pageSize - 1);
            
          if (error || !data || data.length === 0) break;
          allRows.push(...data);
          if (data.length < pageSize) break;
          page++;
        }
        
        const rawWbs = allRows;
        const builtTree = buildWBSTree(rawWbs);
        setDbWbsItems(builtTree);
      } catch (err) {
        console.error("Error fetching project WBS:", err);
      } finally {
        setIsLoadingWBS(false);
      }
    }
    
    fetchWbs();
  }, [project?.id, refreshTrigger]);

  const activeWBS = useMemo(() => {
    const defaultTree = buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));
    const baseTree = dbWbsItems.length > 0 ? dbWbsItems : defaultTree;

    return ensureMultiBuildingWBS(baseTree, project);
  }, [dbWbsItems, project]);



  const [pageViewMode, setPageViewMode] = useState<"OVERVIEW" | "EDITOR">("OVERVIEW");
  const [createModalStage, setCreateModalStage] = useState<WBSStage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandAllState, setExpandAllState] = useState<boolean | null>(null);


  const [versions, setVersions] = useState<ProjectVersion[]>(() => {
    if (typeof window !== "undefined" && projectId) {
      try {
        const saved = localStorage.getItem(`project_rab_versions_${projectId}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: "rab-ballpark-1",
        projectId: projectId || "",
        moduleType: "rab",
        stage: "BALLPARK",
        versionCode: "v1.0",
        name: "Target Ballpark RAB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },
      {
        id: "rab-estimates-1",
        projectId: projectId || "",
        moduleType: "rab",
        stage: "ESTIMATES",
        versionCode: "v1.0",
        name: "Estimates Calculation",
        sourceVersionId: "rab-ballpark-1",
        sourceVersionName: "v1.0 - Target Ballpark RAB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },
      {
        id: "rab-detail-1",
        projectId: projectId || "",
        moduleType: "rab",
        stage: "DETAIL",
        versionCode: "v1.0",
        name: "RAB Rinci Pelaksanaan",
        sourceVersionId: "rab-estimates-1",
        sourceVersionName: "v1.0 - Estimates Calculation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },
    ];
  });

  // Sync versions to localStorage when project is loaded or versions change
  useEffect(() => {
    if (typeof window !== "undefined" && projectId && versions.length > 0) {
      try {
        localStorage.setItem(`project_rab_versions_${projectId}`, JSON.stringify(versions));
      } catch (e) {
        console.error("Failed to sync RAB versions to localStorage", e);
      }
    }
  }, [versions, projectId]);


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

  const canUndo = !isPristine;
  const canRedo = false;
  const undo = () => doReset();
  const redo = () => {};




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
    const wbsEstimates = activeWBS;
    return buildRABEstimates(wbsEstimates, estimateValues, {
      rabClass: context.buildingClass,
      rf: context.rf,
      df: context.df,
      adjustmentFactor: adjustmentFactor
    });
  }, [estimateValues, activeWBS, context.buildingClass, context.rf, context.df, adjustmentFactor]);

  // 3. Build RAB Tree (Detail Mode - Deep L4/L5)
  const rabTreeDetail = useMemo(() => {
    const wbsDetail = activeWBS;

    return buildRABEstimates(wbsDetail, estimateValues, {
      rabClass: context.buildingClass,
      rf: context.rf,
      df: context.df,
      adjustmentFactor: adjustmentFactor
    });
  }, [estimateValues, activeWBS, context.buildingClass, context.rf, context.df, adjustmentFactor]);

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
    if (updatedItem && updatedItem.ahsp_id !== selectedDetailItem.ahsp_id) {
      setSelectedDetailItem(prev => prev ? { ...prev, ahsp_id: updatedItem.ahsp_id || prev.ahsp_id } : null);
    }
  }, [activeTree]);

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

  const stageSummaries = useMemo<Record<WBSStage, StageSummary>>(() => {
    const ballparkVers = versions.filter((v) => v.stage === "BALLPARK");
    const estimatesVers = versions.filter((v) => v.stage === "ESTIMATES");
    const detailVers = versions.filter((v) => v.stage === "DETAIL");

    const countLeafs = (nodes: any[]): number => {
      let count = 0;
      if (!Array.isArray(nodes)) return 0;
      for (const n of nodes) {
        if (!n) continue;
        if (!n.children || n.children.length === 0) count++;
        else count += countLeafs(n.children);
      }
      return count;
    };

    const leafCount = countLeafs(activeTree);

    return {
      BALLPARK: {
        stage: "BALLPARK",
        activeVersion: ballparkVers.find((v) => v.isActive) || ballparkVers[0],
        availableVersions: ballparkVers,
        itemCount: activeTree.length,
        totalCost: totalProjectCost > 0 ? totalProjectCost : 14564000000,
      },
      ESTIMATES: {
        stage: "ESTIMATES",
        activeVersion: estimatesVers.find((v) => v.isActive) || estimatesVers[0],
        availableVersions: estimatesVers,
        itemCount: leafCount || 42,
        totalCost: totalProjectCost > 0 ? totalProjectCost : 14564000000,
      },
      DETAIL: {
        stage: "DETAIL",
        activeVersion: detailVers.find((v) => v.isActive) || detailVers[0],
        availableVersions: detailVers,
        itemCount: leafCount || 156,
        totalCost: totalProjectCost > 0 ? totalProjectCost : 14564000000,
      },
    };
  }, [versions, activeTree, totalProjectCost]);

  const handleUpdateVersionName = async (stage: WBSStage, versionId: string, newName: string) => {
    let nextVersions: ProjectVersion[] = [];
    setVersions((prev) => {
      const targetVer = prev.find((v) => v.id === versionId);
      const targetCode = targetVer?.versionCode;

      nextVersions = prev.map((v) => {
        if (v.id === versionId) {
          return { ...v, name: newName, updatedAt: new Date().toISOString() };
        }
        if (v.sourceVersionId === versionId || (targetCode && v.sourceVersionId === targetCode)) {
          return {
            ...v,
            sourceVersionName: `${targetCode || "v1.0"} - ${newName}`,
            updatedAt: new Date().toISOString(),
          };
        }
        return v;
      });
      return nextVersions;
    });

    const pid = project?.id || projectId;
    if (typeof window !== "undefined" && pid) {
      try {
        localStorage.setItem(`project_rab_versions_${pid}`, JSON.stringify(nextVersions));
      } catch (e) {}
    }

    if (pid) {
      try {
        const { data: dbProj } = await supabase.from("projects").select("meta").eq("id", pid).single();
        const currentMeta = dbProj?.meta || project?.meta || {};
        const updatedMeta = { ...currentMeta, rabVersions: nextVersions };
        await supabase.from("projects").update({ meta: updatedMeta }).eq("id", pid);
      } catch (err) {
        console.error("Error persisting RAB version update to Supabase DB:", err);
      }
    }
  };



  const handleSelectStageFromOverview = (stage: WBSStage) => {
    setActiveMode(stage);
    setPageViewMode("EDITOR");
  };


  const handleChangeActiveVersion = (stage: WBSStage, versionId: string) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.stage === stage) {
          return { ...v, isActive: v.id === versionId };
        }
        return v;
      })
    );
  };

  const handleCreateVersion = (data: {
    versionCode: string;
    name: string;
    description?: string;
    sourceVersionId?: string;
  }) => {
    if (!createModalStage) return;
    const sourceVer = versions.find((v) => v.id === data.sourceVersionId);

    const newVer: ProjectVersion = {
      id: crypto.randomUUID(),
      projectId: project?.id || "",
      moduleType: "rab",
      stage: createModalStage,
      versionCode: data.versionCode,
      name: data.name,
      description: data.description,
      sourceVersionId: data.sourceVersionId,
      sourceVersionName: sourceVer ? `${sourceVer.versionCode} - ${sourceVer.name}` : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };

    setVersions((prev) => [
      ...prev.map((v) => (v.stage === createModalStage ? { ...v, isActive: false } : v)),
      newVer,
    ]);
  };


  const saveRabStateToDb = useCallback(
    async (payload: {
      overrides: Record<string, number>;
      estimates: EstimateValues;
      adjFactor: number;
      status: RABStatus;
    }) => {
      if (!project?.id) return;
      const { overrides, estimates, adjFactor, status } = payload;

      const { data: dbProj } = await supabase.from("projects").select("meta").eq("id", project.id).single();
      const currentDbMeta = (dbProj?.meta || project?.meta || {}) as any;

      const updatedMeta = {
        ...currentDbMeta,
        priceOverrides: { ...(currentDbMeta.priceOverrides || {}), ...overrides },
        estimateValues: { ...(currentDbMeta.estimateValues || {}), ...estimates },
        adjustmentFactor: adjFactor,
        rabStatus: status,
        rabVersions: versions,
      };

      const { error } = await supabase
        .from("projects")
        .update({ meta: updatedMeta })
        .eq("id", project.id);

      if (error) throw error;

      for (const [code, val] of Object.entries(estimates)) {
        if (val && typeof val === "object" && (val.volume !== undefined || val.unit !== undefined)) {
          const stripped = code.replace(/^[A-Z]\./, "");
          const strippedBoth = code.replace(/^[A-Z]\.([SAMIL]\.)?/, "");
          await supabase
            .from("project_wbs_items")
            .update({
              quantity: val.volume ?? null,
              unit: val.unit ?? null,
            })
            .eq("project_id", project.id)
            .in("wbs_code", [code, stripped, strippedBoth]);
        }
      }

      setRabStatus(status);
    },
    [project?.id, project?.meta, versions]
  );

  const { status: autoSaveStatus, errorMessage: autoSaveError, scheduleSave, triggerImmediateSave } = useAutoSave({
    onSave: saveRabStateToDb,
    delayMs: 1500,
  });

  const triggerRabSave = (
    overrides?: Record<string, number>,
    estimates?: EstimateValues,
    adj?: number
  ) => {
    scheduleSave({
      overrides: overrides !== undefined ? overrides : priceOverrides,
      estimates: estimates !== undefined ? estimates : estimateValues,
      adjFactor: adj !== undefined ? adj : adjustmentFactor,
      status: rabStatus,
    });
  };

  /* ===== HANDLERS ===== */
  function onChangeMode(next: RABMode) {
    setActiveMode(next);
    setActiveView("SUMMARY");
  }

  function onPriceCommit(code: string, value: number) {
    if (!Number.isFinite(value) || value < 0) return;
    const strippedCode = code.replace(/^[A-Z]\./, "");
    const strippedBoth = code.replace(/^[A-Z]\.([SAMIL]\.)?/, "");
    const next = {
      ...priceOverrides,
      [code]: value,
      [strippedCode]: value,
      [strippedBoth]: value,
    };
    setPriceOverrides(next);
    triggerRabSave(next, undefined, undefined);
  }

  function onEstimateCommit(code: string, value: { volume: number; unit: string; unitPrice: number }) {
    const strippedCode = code.replace(/^[A-Z]\./, "");
    const strippedBoth = code.replace(/^[A-Z]\.([SAMIL]\.)?/, "");
    const next = {
      ...estimateValues,
      [code]: value,
      [strippedCode]: value,
      [strippedBoth]: value,
    };
    setEstimateValues(next);
    triggerRabSave(undefined, next, undefined);
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

  const saveDraft = () => triggerImmediateSave({ overrides: priceOverrides, estimates: estimateValues, adjFactor: adjustmentFactor, status: "saved" });
  const saveChanges = () => triggerImmediateSave({ overrides: priceOverrides, estimates: estimateValues, adjFactor: adjustmentFactor, status: "saved" });
  const submitRAB = () => triggerImmediateSave({ overrides: priceOverrides, estimates: estimateValues, adjFactor: adjustmentFactor, status: "submitted" });
  const addRevision = () => triggerImmediateSave({ overrides: priceOverrides, estimates: estimateValues, adjFactor: adjustmentFactor, status: "saved" });


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

          <div>
            {pageViewMode === "OVERVIEW" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Cost Estimation (RAB)
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Pilih tahapan atau versi perencanaan anggaran untuk membuka RAB Editor
                    </p>
                  </div>

                  <SaveStatusBadge
                    status={autoSaveStatus}
                    errorMessage={autoSaveError}
                    onRetry={() => triggerImmediateSave({ overrides: priceOverrides, estimates: estimateValues, adjFactor: adjustmentFactor, status: rabStatus })}
                  />
                </div>

                <StageCardsOverview
                  moduleType="rab"
                  summaries={stageSummaries}
                  onSelectStage={handleSelectStageFromOverview}
                  onChangeActiveVersion={handleChangeActiveVersion}
                  onCreateNewVersion={(stg) => setCreateModalStage(stg)}
                  onUpdateVersionName={handleUpdateVersionName}
                />
              </div>
            ) : (
              <div>
                {/* Top Editor Bar: Clean Compact Single Row */}
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3.5 mb-5">
                  {/* LEFT: [<] Detail RAB [v1.0] */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPageViewMode("OVERVIEW")}
                      className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 transition-colors shadow-2xs"
                      title="Back to Stage Overview"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                    </button>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-neutral-900 dark:text-white capitalize">
                        {activeMode.toLowerCase()} RAB
                      </h2>
                      {stageSummaries[activeMode]?.activeVersion && (
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          {stageSummaries[activeMode].activeVersion.versionCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: Export, Submit RAB */}
                  <div className="flex items-center gap-2 relative">
                    <SaveStatusBadge status={autoSaveStatus} errorMessage={autoSaveError} onRetry={() => triggerImmediateSave({ overrides: priceOverrides, estimates: estimateValues, adjFactor: adjustmentFactor, status: rabStatus })} />

                    {/* Export Dropdown Menu */}
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
                          <div className="absolute right-0 top-full mt-1.5 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden py-1 min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-150">
                            <button
                              onClick={() => { handleExportExcel(); setShowExportMenu(false); }}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-medium transition-colors"
                            >
                              Excel (.xlsx)
                            </button>
                            <button
                              onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-medium transition-colors"
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
                    {rabStatus !== "submitted" && (
                      <button
                        onClick={submitRAB}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-2xs transition-all border-0 outline-none shrink-0"
                      >
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span className="leading-none">Submit RAB</span>
                      </button>
                    )}
                    {rabStatus === "submitted" && (
                      <Button size="sm" onClick={addRevision} icon={<Plus className="w-4 h-4" />}>
                        Add Revision
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {pageViewMode === "EDITOR" && (
            <div className="space-y-4">


            {/* ===== CARD 1: CONTEXT PARAMETERS BAR ===== */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xs">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500 font-medium">Class</span>
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

                  <span className="text-xs text-neutral-500 font-medium">Level</span>
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
                  <span className="text-xs text-neutral-500 font-medium">Area</span>
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

                <div className="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-800 pl-4">
                  <span className="text-xs text-neutral-500 font-medium">Price Adjustment</span>
                  <div className="flex items-center gap-2 w-44">
                    <Input
                      type="range"
                      min={50}
                      max={150}
                      step={1}
                      value={adjustmentFactor}
                      onChange={(e) => setAdjustmentFactor(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 dark:bg-neutral-700 accent-blue-600"
                      disabled={!isEditing}
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Input
                        type="number"
                        min={50}
                        max={200}
                        value={adjustmentFactor}
                        onChange={(e) => setAdjustmentFactor(Math.max(1, Math.min(200, Number(e.target.value))))}
                        className="w-14 h-7 text-center text-xs font-semibold px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                        disabled={!isEditing}
                      />
                      <span className="text-xs font-semibold text-neutral-500">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-medium">Location</span>
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
            </div>

            {/* ===== CARD 2: TOOLBAR CONTROLS BAR (LIKE WBS) ===== */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-2xs">
              {/* Left: Summary / Breakdown Pill */}
              <div className="flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full">
                <button
                  onClick={() => setActiveView("SUMMARY")}
                  className={`px-4 py-1 text-xs font-semibold rounded-full transition-all ${
                    activeView === "SUMMARY"
                      ? "bg-blue-600 text-white shadow-2xs font-bold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveView("BREAKDOWN")}
                  className={`px-4 py-1 text-xs font-semibold rounded-full transition-all ${
                    activeView === "BREAKDOWN"
                      ? "bg-blue-600 text-white shadow-2xs font-bold"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  Breakdown
                </button>
              </div>


              {/* Right: Search, Undo/Redo, Expand/Collapse */}
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search RAB item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 sm:w-60 h-8 pl-8 pr-3 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder:text-neutral-400 shadow-2xs transition-all"
                  />
                </div>

                {/* Undo / Redo */}
                <div className="flex items-center border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-full p-0.5 shadow-2xs shrink-0">
                  <button
                    disabled={!canUndo}
                    onClick={undo}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Undo"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3 bg-neutral-200 dark:bg-neutral-700" />
                  <button
                    disabled={!canRedo}
                    onClick={redo}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Redo"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expand / Collapse All */}
                <button
                  type="button"
                  onClick={() => setExpandAllState(true)}
                  className="px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1 transition-colors shadow-2xs shrink-0"
                  title="Expand All"
                >
                  <Maximize2 className="w-3 h-3 text-neutral-500 shrink-0" />
                  <span className="leading-none">Expand All</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandAllState(false)}
                  className="px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1 transition-colors shadow-2xs shrink-0"
                  title="Collapse All"
                >
                  <Minimize2 className="w-3 h-3 text-neutral-500 shrink-0" />
                  <span className="leading-none">Collapse All</span>
                </button>
              </div>
            </div>


            {/* ===== CONTENT ===== */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* BALLPARK / ESTIMATES SUMMARY */}
              {activeView === "SUMMARY" && activeMode !== "DETAIL" && (
                <RABSummaryTable items={activeTree} area={safeArea} mode={activeMode} buildingMasses={project?.building_masses} />
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
                  searchQuery={searchQuery}
                  expandAllState={expandAllState}
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
        )}
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

      {createModalStage && (
        <CreateVersionModal
          isOpen={!!createModalStage}
          onClose={() => setCreateModalStage(null)}
          stage={createModalStage}
          existingVersions={stageSummaries[createModalStage]?.availableVersions || []}
          allStageVersions={versions}
          onCreateVersion={handleCreateVersion}
        />
      )}

      <SaveFloatingToast status={autoSaveStatus} errorMessage={autoSaveError} onRetry={() => triggerImmediateSave({ overrides: priceOverrides, estimates: estimateValues, adjFactor: adjustmentFactor, status: rabStatus })} />

    </>

  );
}
