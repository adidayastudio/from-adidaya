"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { Tabs } from "@/shared/ui/layout/Tabs";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { useProject } from "@/components/flow/project-context";
import { Download, Save, Send, Plus, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { SaveStatusBadge, SaveFloatingToast } from "@/components/flow/projects/project-detail/setup/common/SaveStatusBadge";

import type {
  WBSMode,
  WBSView,
} from "@/components/flow/projects/project-detail/setup/wbs/data/wbs.types";

import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { WBS_ADDONS } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs.addons";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildWBSTree, ensureMultiBuildingWBS, mergeWBSTrees } from "@/lib/flow/mappers/wbs-tree";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";
import WBSList from "@/components/flow/projects/project-detail/setup/wbs/WBSList";
import { AddDisciplineModal, ConfirmModal, DeleteWithDataModal } from "@/components/flow/projects/project-detail/setup/wbs/WBSModals";
import { StageCardsOverview } from "@/components/flow/projects/project-detail/setup/common/StageCardsOverview";
import { exportWBSToExcel, generateWBSPDFHTML } from "@/lib/flow/wbs-export";


import { CreateVersionModal } from "@/components/flow/projects/project-detail/setup/common/CreateVersionModal";
import type { WBSStage, ProjectVersion, StageSummary } from "@/lib/flow/types/versioning.types";
import { ArrowLeft, GitBranch, Plus as PlusIcon } from "lucide-react";

import {
  addChildById,
  addRootDiscipline,
  getMaxDepth,
  pruneToDepth,
  removeById,
  updateById,
  uid,
  indentNodeById,
  outdentNodeById,
  duplicateNodeById,
  moveNodeDirectionById,
} from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-tree";

const WBS_TABS = [
  { key: "BALLPARK", label: "Ballpark" },
  { key: "ESTIMATES", label: "Estimates" },
  { key: "DETAIL", label: "Detail" },
] satisfies { key: WBSMode; label: string }[];

type Revision = {
  id: string;
  label: string;
  createdAt: number;
  mode: WBSMode;
  tree: any;
  enabledAddons: ("I" | "L")[];
};

type EditState = "pristine" | "draft" | "saved" | "submitted";

export default function ProjectSetupWBSPage() {
  const { project, isLoading, error } = useProject();

  const [pageViewMode, setPageViewMode] = useState<"OVERVIEW" | "EDITOR">("OVERVIEW");
  const [activeMode, setActiveMode] = useState<WBSMode>("BALLPARK");
  const [activeView, setActiveView] = useState<WBSView>("SUMMARY");
  const [enabledAddons, setEnabledAddons] = useState<("I" | "L")[]>([]);
  const [createModalStage, setCreateModalStage] = useState<WBSStage | null>(null);

  // Version management with persistence
  const [versions, setVersions] = useState<ProjectVersion[]>(() => {
    if (typeof window !== "undefined" && project?.id) {
      try {
        const saved = localStorage.getItem(`project_wbs_versions_${project.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: "v-ballpark-1",
        projectId: project?.id || "",
        moduleType: "wbs",
        stage: "BALLPARK",
        versionCode: "v1.0",
        name: "Initial Baseline",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },
      {
        id: "v-estimates-1",
        projectId: project?.id || "",
        moduleType: "wbs",
        stage: "ESTIMATES",
        versionCode: "v1.0",
        name: "Approval Klien",
        sourceVersionId: "v-ballpark-1",
        sourceVersionName: "v1.0 - Initial Baseline",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },
      {
        id: "v-detail-1",
        projectId: project?.id || "",
        moduleType: "wbs",
        stage: "DETAIL",
        versionCode: "v1.0",
        name: "Work Breakdown Detail",
        sourceVersionId: "v-estimates-1",
        sourceVersionName: "v1.0 - Approval Klien",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },
    ];
  });

  // Sync versions to localStorage when project is loaded or versions change
  useEffect(() => {
    if (typeof window !== "undefined" && project?.id && versions.length > 0) {
      try {
        localStorage.setItem(`project_wbs_versions_${project.id}`, JSON.stringify(versions));
      } catch (e) {
        console.error("Failed to sync versions to localStorage", e);
      }
    }
  }, [versions, project?.id]);

  // Single unified tree state for all WBS levels
  const [fullWbsTree, setFullWbsTree] = useState<any[]>(() => {
    return buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));
  });

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

    if (typeof window !== "undefined" && project?.id) {
      try {
        localStorage.setItem(`project_wbs_versions_${project.id}`, JSON.stringify(nextVersions));
      } catch (e) {}
    }

    if (project?.id) {
      try {
        const { data: dbProj } = await supabase.from("projects").select("meta").eq("id", project.id).single();
        const currentMeta = dbProj?.meta || project?.meta || {};
        const updatedMeta = { ...currentMeta, wbsVersions: nextVersions };
        await supabase.from("projects").update({ meta: updatedMeta }).eq("id", project.id);
      } catch (err) {
        console.error("Error persisting version update to Supabase DB:", err);
      }
    }
  };



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

    const calcTotalCost = (nodes: any[]): number => {
      let total = 0;
      if (!Array.isArray(nodes)) return 0;
      for (const n of nodes) {
        if (!n) continue;
        if (!n.children || n.children.length === 0) {
          const qty = n.quantity ?? n.volume ?? 0;
          const price = n.unitPrice ?? n.unit_price ?? 0;
          total += qty * price;
        } else {
          total += calcTotalCost(n.children);
        }
      }
      return total;
    };

    const totalCost = calcTotalCost(fullWbsTree);
    const leafCount = countLeafs(fullWbsTree);

    return {
      BALLPARK: {
        stage: "BALLPARK",
        activeVersion: ballparkVers.find((v) => v.isActive) || ballparkVers[0],
        availableVersions: ballparkVers,
        itemCount: fullWbsTree.length,
        totalCost: totalCost > 0 ? totalCost : 1250000000,
      },
      ESTIMATES: {
        stage: "ESTIMATES",
        activeVersion: estimatesVers.find((v) => v.isActive) || estimatesVers[0],
        availableVersions: estimatesVers,
        itemCount: leafCount || 42,
        totalCost: totalCost > 0 ? totalCost : 1180000000,
      },
      DETAIL: {
        stage: "DETAIL",
        activeVersion: detailVers.find((v) => v.isActive) || detailVers[0],
        availableVersions: detailVers,
        itemCount: leafCount || 186,
        totalCost: totalCost > 0 ? totalCost : 1195000000,
      },
    };
  }, [versions, fullWbsTree]);

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
      moduleType: "wbs",
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

    setVersions((prev) => {
      const updated = [
        ...prev.map((v) => (v.stage === createModalStage ? { ...v, isActive: false } : v)),
        newVer,
      ];

      if (project?.id) {
        supabase.from("projects").update({
          meta: { ...(project.meta || {}), wbsVersions: updated }
        }).eq("id", project.id).then();
      }

      return updated;
    });
  };


function applyEstimateValuesToWBS(tree: any[], estimateValues: Record<string, any>): any[] {
  if (!estimateValues || Object.keys(estimateValues).length === 0) return tree;

  const getEstimateValueForNode = (code: string): any => {
    if (!code) return undefined;
    if (estimateValues[code]) return estimateValues[code];
    const withoutMass = code.replace(/^[A-Z]\./, "");
    if (estimateValues[withoutMass]) return estimateValues[withoutMass];
    const withoutDiscipline = code.replace(/^[A-Z]\./, "");
    if (estimateValues[withoutDiscipline]) return estimateValues[withoutDiscipline];
    const strippedBoth = code.replace(/^[A-Z]\.([A-Z]\.)?/, "");
    if (estimateValues[strippedBoth]) return estimateValues[strippedBoth];
    const numMatch = code.match(/\d+(\.\d+)*/);
    if (numMatch && estimateValues[numMatch[0]]) return estimateValues[numMatch[0]];
    return undefined;
  };

  const walk = (nodes: any[]): any[] => {
    return nodes.map((node) => {
      const code = node.code || "";
      const ev = getEstimateValueForNode(code);

      const updatedNode = { ...node };

      if (ev) {
        if (ev.volume !== undefined && ev.volume !== null) {
          updatedNode.volume = ev.volume;
          updatedNode.quantity = ev.volume;
        }
        if (ev.unit) updatedNode.unit = ev.unit;
        if (ev.unitPrice !== undefined && ev.unitPrice !== null) {
          updatedNode.unitPrice = ev.unitPrice;
        }
      }

      if (node.children && node.children.length > 0) {
        updatedNode.children = walk(node.children);
      }

      return updatedNode;
    });
  };

  return walk(tree);
}

  // Auto-generate multi-building WBS tree when project specs are loaded
  useEffect(() => {
    if (!project) return;

    const savedValues = (project.meta as any)?.estimateValues || {};
    const count = project.building_mass_count || (project.meta as any)?.buildingMassCount || (Array.isArray(project.building_masses) ? project.building_masses.length : 1);
    let masses = project.building_masses || (project.meta as any)?.buildingMasses || [];

    if (!Array.isArray(masses)) masses = [];

    let initialTree: any[] = [];

    if (masses.length > 0) {
      const baseDetail = buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));

      initialTree = masses.map((mass: any, idx: number) => {
        const prefix = mass.code;
        const massTitle = `${prefix}. ${mass.name}`;

        const prefixChildren = (nodes: any[]): any[] => {
          return nodes.map((node) => ({
            ...node,
            id: `node-${prefix}-${node.code}-${node.id || idx}`,
            code: node.code.startsWith(`${prefix}.`) ? node.code : `${prefix}.${node.code}`,
            children: node.children ? prefixChildren(node.children) : undefined,
          }));
        };

        return {
          id: `mass-${prefix}-${idx}`,
          code: prefix,
          nameEn: massTitle,
          nameId: massTitle,
          children: prefixChildren(baseDetail),
        };
      });
    } else {
      initialTree = buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));
    }

    if (savedValues && Object.keys(savedValues).length > 0) {
      initialTree = applyEstimateValuesToWBS(initialTree, savedValues);
    }

    setFullWbsTree(initialTree);
  }, [project]);


  // History state for Undo / Redo
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Helper to push state onto history stack
  const setTreeWithHistory = (updateFnOrNewTree: any) => {
    markEdited();
    setFullWbsTree((prevTree) => {
      const nextTree = typeof updateFnOrNewTree === "function" ? updateFnOrNewTree(prevTree) : updateFnOrNewTree;
      if (nextTree === prevTree) return prevTree;

      setHistory((prevHistory) => {
        const sliced = prevHistory.slice(0, historyIndex + 1);
        if (sliced.length === 0) {
          const newHist = [prevTree, nextTree];
          setHistoryIndex(1);
          return newHist;
        }
        const newHist = [...sliced, nextTree];
        setHistoryIndex(newHist.length - 1);
        return newHist;
      });

      scheduleSave(nextTree);
      return nextTree;
    });
  };


  const handleUndo = () => {
    if (historyIndex > 0 && history[historyIndex - 1]) {
      const prevStep = history[historyIndex - 1];
      setHistoryIndex((idx) => idx - 1);
      setFullWbsTree(prevStep);
      markEdited();
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      const nextStep = history[historyIndex + 1];
      setHistoryIndex((idx) => idx + 1);
      setFullWbsTree(nextStep);
      markEdited();
    }
  };

  // Keyboard shortcut listener (Cmd+Z / Ctrl+Z for Undo, Cmd+Shift+Z / Ctrl+Y for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex]);

  // Revisions per mode
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);

  // Edit state per mode
  const [editState, setEditState] = useState<Record<WBSMode, EditState>>({
    BALLPARK: "pristine",
    ESTIMATES: "pristine",
    DETAIL: "pristine",
  });

  // Modals & Menus
  const [showAddDiscipline, setShowAddDiscipline] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportExcel = () => {
    if (!activeTree || activeTree.length === 0 || !project) return;
    const activeVer = stageSummaries[activeMode]?.activeVersion;
    const ctx = {
      projectName: project.project_name || "Proyek Tanpa Nama",
      projectNo: project.project_number || "-",
      projectCode: project.project_code || "-",
      stage: `${activeMode} WBS`,
      versionName: activeVer?.name || "Initial Baseline",
      versionCode: activeVer?.versionCode || "v1.0",
      province: (project.location as any)?.province || project.province,
      city: (project.location as any)?.city || project.city,
    };
    const cleanVer = activeVer ? `${activeVer.versionCode}_${activeVer.name.replace(/[^a-zA-Z0-9_-]/g, "_")}` : "v1.0";
    const filename = `${project.project_code || "Project"}_WBS_${activeMode}_${cleanVer}.xlsx`;

    exportWBSToExcel(activeTree, ctx, filename);
  };

  const handleExportPDF = async () => {
    if (!activeTree || activeTree.length === 0 || !project) return;
    const activeVer = stageSummaries[activeMode]?.activeVersion;
    const ctx = {
      projectName: project.project_name || "Proyek Tanpa Nama",
      projectNo: project.project_number || "-",
      projectCode: project.project_code || "-",
      stage: `${activeMode} WBS`,
      versionName: activeVer?.name || "Initial Baseline",
      versionCode: activeVer?.versionCode || "v1.0",
      province: (project.location as any)?.province || project.province,
      city: (project.location as any)?.city || project.city,
      status: currentEditState === "submitted" ? "Submitted" : "Baseline",
    };

    const htmlContent = generateWBSPDFHTML(activeTree, ctx);
    const cleanVer = activeVer ? `${activeVer.versionCode}_${activeVer.name.replace(/[^a-zA-Z0-9_-]/g, "_")}` : "v1.0";
    const fileName = `${project.project_code || "Project"}_WBS_${activeMode}_${cleanVer}.pdf`;

    try {
      const response = await fetch("/api/flow/reports/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlContent }),
      });

      if (!response.ok) throw new Error("Gagal mengekspor PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Direct PDF download fallback to window print:", err);
      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
      }
    }
  };




  const [isLoadingWBS, setIsLoadingWBS] = useState(true);

  // Load WBS from database on mount / project change
  useEffect(() => {
    if (!project?.id) return;
    
    async function loadWBS() {
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
        const defaultTree = buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));
        const dbTree = buildWBSTree(rawWbs);
        const baseTree = dbTree.length > 0 ? dbTree : defaultTree;
        const fullTree = ensureMultiBuildingWBS(baseTree, project);

        const { data: dbProj } = await supabase
          .from("projects")
          .select("meta")
          .eq("id", project.id)
          .single();

        const activeMeta = dbProj?.meta || project?.meta;
        if (activeMeta && (activeMeta as any).wbsVersions && Array.isArray((activeMeta as any).wbsVersions) && (activeMeta as any).wbsVersions.length > 0) {
          setVersions((activeMeta as any).wbsVersions);
          if (typeof window !== "undefined") {
            localStorage.setItem(`project_wbs_versions_${project.id}`, JSON.stringify((activeMeta as any).wbsVersions));
          }
        }

        setFullWbsTree(fullTree);
        setHistory([fullTree]);
        setHistoryIndex(0);


      } catch (err) {
        console.error("Error loading project WBS:", err);
      } finally {
        setIsLoadingWBS(false);
      }
    }
    
    loadWBS();
  }, [project?.id, project?.building_mass_count, project?.building_masses]);

  const DISCIPLINE_ADDONS: { code: "A" | "M" | "I" | "L"; label: string }[] = [
    { code: "A", label: "Architecture" },
    { code: "M", label: "MEP" },
    { code: "I", label: "Interior" },
    { code: "L", label: "Landscape" },
  ];

  // Helper to add/remove discipline addon from tree
  const toggleDiscipline = (disciplineCode: "A" | "M" | "I" | "L") => {
    setFullWbsTree((prev) => {
      const isMulti = prev.some((r) => r.children && r.children.some((c: any) => c.code.includes(".")));

      if (!isMulti) {
        const hasDiscipline = prev.some((item) => item.code === disciplineCode);
        if (hasDiscipline) {
          return prev.filter((item) => item.code !== disciplineCode);
        } else {
          const defaultFullTree = buildDetailFromEstimates(
            buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA)
          );
          const defaultNode = defaultFullTree.find((item) => item.code === disciplineCode);
          if (!defaultNode) return prev;
          const ORDER_MAP: Record<string, number> = { S: 1, A: 2, M: 3, I: 4, L: 5 };
          const newTree = [...prev, defaultNode];
          newTree.sort((a, b) => (ORDER_MAP[a.code] ?? 999) - (ORDER_MAP[b.code] ?? 999));
          return newTree;
        }
      }

      // Multi-building tree: toggle discipline inside each building mass
      const hasDiscipline = prev.some((mass) =>
        mass.children?.some((child: any) => {
          const sub = child.code.replace(/^[A-Z]\./, "");
          return sub === disciplineCode;
        })
      );

      if (hasDiscipline) {
        return prev.map((mass) => ({
          ...mass,
          children: mass.children?.filter((child: any) => {
            const sub = child.code.replace(/^[A-Z]\./, "");
            return sub !== disciplineCode;
          }),
        }));
      } else {
        const defaultFullTree = buildDetailFromEstimates(
          buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA)
        );
        const defaultNode = defaultFullTree.find((item) => item.code === disciplineCode);
        if (!defaultNode) return prev;

        return prev.map((mass) => {
          const prefix = mass.code;
          const prefixChildren = (nodes: any[]): any[] => {
            return nodes.map((node) => ({
              ...node,
              id: `node-${prefix}-${node.code}-${Math.random()}`,
              code: node.code.startsWith(`${prefix}.`) ? node.code : `${prefix}.${node.code}`,
              children: node.children ? prefixChildren(node.children) : undefined,
            }));
          };

          const newChild = {
            ...defaultNode,
            id: `node-${prefix}-${defaultNode.code}-${Math.random()}`,
            code: `${prefix}.${defaultNode.code}`,
            children: defaultNode.children ? prefixChildren(defaultNode.children) : undefined,
          };

          const existingChildren = mass.children || [];
          const ORDER_MAP: Record<string, number> = { S: 1, A: 2, M: 3, I: 4, L: 5 };
          const updatedChildren = [...existingChildren, newChild];
          updatedChildren.sort((a, b) => {
            const subA = a.code.replace(/^[A-Z]\./, "");
            const subB = b.code.replace(/^[A-Z]\./, "");
            return (ORDER_MAP[subA] ?? 999) - (ORDER_MAP[subB] ?? 999);
          });

          return {
            ...mass,
            children: updatedChildren,
          };
        });
      }
    });
    markEdited();
  };

  const computedEstimatesTree = useMemo(() => ensureMultiBuildingWBS(fullWbsTree, project), [fullWbsTree, project]);
  const computedDetailTree = useMemo(() => ensureMultiBuildingWBS(fullWbsTree, project), [fullWbsTree, project]);
  const rawActiveTree = useMemo(() => {
    const multi = ensureMultiBuildingWBS(fullWbsTree, project);
    const savedValues = (project?.meta as any)?.estimateValues || {};
    if (savedValues && Object.keys(savedValues).length > 0) {
      return applyEstimateValuesToWBS(multi, savedValues);
    }
    return multi;
  }, [fullWbsTree, project]);


  // Apply view depth pruning
  const activeTree = useMemo(() => {
    const maxDepth = getMaxDepth(activeMode, activeView);
    return pruneToDepth(rawActiveTree, maxDepth);
  }, [rawActiveTree, activeMode, activeView]);

  // Get current mode's revisions
  const modeRevisions = useMemo(() =>
    revisions.filter(r => r.mode === activeMode),
    [revisions, activeMode]
  );

  const selectedRev = revisions.find((r) => r.id === activeRevisionId);
  const currentEditState = editState[activeMode];

  // Mode change handler
  function onChangeMode(next: WBSMode) {
    setActiveMode(next);
    const firstRevOfMode = revisions.find(r => r.mode === next);
    setActiveRevisionId(firstRevOfMode?.id || null);
  }

  // Mark as edited
  function markEdited() {
    if (currentEditState === "pristine") {
      setEditState(prev => ({ ...prev, [activeMode]: "draft" }));
    }
  }

  // CRUD handlers
  const onUpdateItem = (id: string, patch: Partial<{ nameEn: string; nameId?: string }>) => {
    setTreeWithHistory((prev: any[]) => updateById(prev, id, patch as any));
  };

  const onAddChild = (parentId: string, level: number) => {
    if (activeMode === "BALLPARK" && level >= 1) return;
    const newItem = {
      id: uid("wbs"),
      code: "NEW",
      nameEn: "New Work",
      nameId: "Pekerjaan Baru",
      children: [],
    };
    setTreeWithHistory((prev: any[]) => addChildById(prev, parentId, newItem as any));
  };

  const onAddSibling = (siblingId: string, position: "above" | "below") => {
    setTreeWithHistory((prev: any[]) => addSiblingToTree(prev, siblingId, position));
  };

  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: string;
    code: string;
    name: string;
    volume: number;
    unit: string;
    unitPrice: number;
  } | null>(null);

  const findNodeWithData = (nodes: any[], targetId: string): any | null => {
    for (const node of nodes) {
      if (!node) continue;
      if (node.id === targetId || node.code === targetId) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeWithData(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const hasDataInSubtree = (node: any): { hasData: boolean; volume: number; unitPrice: number } => {
    let vol = node?.volume ?? node?.quantity ?? 0;
    let price = node?.unitPrice ?? node?.unit_price ?? 0;

    if (vol > 0 || price > 0) {
      return { hasData: true, volume: vol, unitPrice: price };
    }

    if (node?.children && node.children.length > 0) {
      for (const child of node.children) {
        const sub = hasDataInSubtree(child);
        if (sub.hasData) return sub;
      }
    }

    return { hasData: false, volume: 0, unitPrice: 0 };
  };

  const onRemove = (id: string) => {
    const targetNode = findNodeWithData(fullWbsTree, id);
    if (targetNode) {
      const dataCheck = hasDataInSubtree(targetNode);
      if (dataCheck.hasData) {
        setDeleteCandidate({
          id,
          code: targetNode.code || "ITEM",
          name: targetNode.nameEn || targetNode.title || "Unnamed",
          volume: dataCheck.volume,
          unit: targetNode.unit || "m³",
          unitPrice: dataCheck.unitPrice,
        });
        return;
      }
    }
    setTreeWithHistory((prev: any[]) => removeById(prev, id));
  };


  const onIndent = (id: string) => {
    setTreeWithHistory((prev: any[]) => indentNodeById(prev, id));
  };

  const onOutdent = (id: string) => {
    setTreeWithHistory((prev: any[]) => outdentNodeById(prev, id));
  };

  const onDuplicate = (id: string) => {
    setTreeWithHistory((prev: any[]) => duplicateNodeById(prev, id));
  };

  const onMoveDirection = (id: string, direction: "up" | "down") => {
    setTreeWithHistory((prev: any[]) => moveNodeDirectionById(prev, id, direction));
  };

  const onReorder = (parentId: string | null, fromIndex: number, toIndex: number) => {
    const SAM_COUNT = 3; // S, A, M

    setTreeWithHistory((prev: any[]) => {
      if (!parentId) {
        if (fromIndex < SAM_COUNT) return prev;
        if (toIndex < SAM_COUNT) toIndex = SAM_COUNT;
        if (fromIndex === toIndex) return prev;

        const newTree = [...prev];
        const [moved] = newTree.splice(fromIndex, 1);
        newTree.splice(toIndex, 0, moved);
        return renumberTree(newTree);
      }

      return reorderChildren(prev, parentId, fromIndex, toIndex);
    });
  };

  // Add discipline
  const onAddDiscipline = (code: string, nameEn: string, nameId?: string) => {
    setTreeWithHistory((prev) => addRootDiscipline(prev, { code, nameEn, nameId, children: [] }));
  };

  // Reset handler
  const onResetActive = () => {
    setShowResetConfirm(true);
  };

  const doReset = () => {
    setEnabledAddons([]);
    setFullWbsTree(buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA)));
    setEditState({
      BALLPARK: "draft",
      ESTIMATES: "draft",
      DETAIL: "draft"
    });
  };

  const saveTreeToDb = useCallback(async (treeToSave: any[]) => {
    if (!project?.id) return;
    
    // Assign consistent UUIDs so in-memory state matches DB IDs
    const prepareTreeWithUuids = (nodes: any[]): any[] => {
      return nodes.map(node => {
        const isUuid = node.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.id);
        const validId = isUuid ? node.id : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : uid("wbs"));
        node.id = validId;
        return {
          ...node,
          id: validId,
          children: node.children ? prepareTreeWithUuids(node.children) : []
        };
      });
    };


    const treeWithUuids = prepareTreeWithUuids(treeToSave);
    const rowsToInsert: any[] = [];
    const currentMetaEst = (project?.meta as any)?.estimateValues || {};
    const currentPriceOverrides = (project?.meta as any)?.priceOverrides || {};

    const traverseAndPrepare = (item: any, parentDbId: string | null = null, indentLevel: number = 0, pos: number = 0) => {
      const code = item.code || "NO-CODE";
      const title = item.nameEn || item.name || "Unnamed";
      const titleEn = item.nameId || item.description || null;
      const notes = item.notes || null;

      const fallbackQty = currentMetaEst[code]?.volume;
      const qtyToSave = (item.quantity !== undefined && item.quantity !== null && item.quantity !== 0)
        ? item.quantity
        : (item.volume !== undefined && item.volume !== null && item.volume !== 0)
        ? item.volume
        : fallbackQty ?? null;

      const fallbackPrice = currentMetaEst[code]?.unitPrice ?? currentPriceOverrides[code];
      const priceToSave = (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== 0)
        ? item.unitPrice
        : (item.unit_price !== undefined && item.unit_price !== null && item.unit_price !== 0)
        ? item.unit_price
        : fallbackPrice ?? null;

      const unitToSave = item.unit || currentMetaEst[code]?.unit || null;

      // Store in metadata map (do NOT include unit_price in project_wbs_items because column does not exist on project_wbs_items)
      if (priceToSave !== undefined && priceToSave !== null && priceToSave > 0) {
        (item as any)._metaPrice = priceToSave;
      }

      rowsToInsert.push({
        id: item.id,
        project_id: project.id,
        wbs_code: code,
        title: title,
        title_en: titleEn,
        level: indentLevel,
        position: pos,
        parent_id: parentDbId,
        is_leaf: !item.children || item.children.length === 0,
        notes: notes,
        unit: unitToSave,
        quantity: qtyToSave,
        ahsp_id: item.ahsp_id || null,
        _priceToSave: priceToSave,
      });

      const children = item.children || [];
      for (let i = 0; i < children.length; i++) {
        traverseAndPrepare(children[i], item.id, indentLevel + 1, i + 1);
      }
    };

    for (let i = 0; i < treeWithUuids.length; i++) {
      traverseAndPrepare(treeWithUuids[i], null, 0, i + 1);
    }

    // Clean payload for project_wbs_items and guarantee unique wbs_code per project
    const seenCodes = new Set<string>();
    const dbPayload = rowsToInsert.map(({ _priceToSave, ...rest }) => {
      let baseCode = rest.wbs_code || "WBS";
      let uniqueCode = baseCode;
      let counter = 1;
      while (seenCodes.has(uniqueCode)) {
        uniqueCode = `${baseCode}_${counter}`;
        counter++;
      }
      seenCodes.add(uniqueCode);
      return { ...rest, wbs_code: uniqueCode };
    });

    // To prevent PostgreSQL 'project_wbs_code_ux' unique constraint collision when node codes shift/re-order,
    // check if any existing item in DB has a code collision with a different ID
    const { data: existingDbRows } = await supabase
      .from("project_wbs_items")
      .select("id, wbs_code")
      .eq("project_id", project.id);

    if (existingDbRows && existingDbRows.length > 0) {
      const dbCodeMap = new Map(existingDbRows.map(r => [r.wbs_code, r.id]));
      const hasCodeCollision = dbPayload.some(row => {
        const existingId = dbCodeMap.get(row.wbs_code);
        return existingId && existingId !== row.id;
      });

      if (hasCodeCollision) {
        // Temporarily set wbs_code to temporary strings to clear unique constraint conflicts
        const tempUpdates = existingDbRows.map(r => ({
          id: r.id,
          project_id: project.id,
          wbs_code: `__TEMP_${r.id}`,
        }));
        await supabase.from("project_wbs_items").upsert(tempUpdates, { onConflict: "id" });
      }
    }

    // Upsert rows to project_wbs_items without wiping whole table
    const { error: upsertError } = await supabase
      .from("project_wbs_items")
      .upsert(dbPayload, { onConflict: "id" });

    if (upsertError) throw upsertError;


    // Sync back estimateValues and priceOverrides into project.meta so RAB prices are NEVER lost
    const updatedEstimateValues = { ...currentMetaEst };
    const updatedPriceOverrides = { ...currentPriceOverrides };

    rowsToInsert.forEach((row) => {
      if (row.wbs_code) {
        const p = row._priceToSave;
        if (p !== undefined && p !== null && p > 0) {
          const existing = updatedEstimateValues[row.wbs_code] || {};
          updatedEstimateValues[row.wbs_code] = {
            ...existing,
            volume: row.quantity ?? existing.volume ?? 0,
            unit: row.unit ?? existing.unit ?? "ls",
            unitPrice: p,
          };
          updatedPriceOverrides[row.wbs_code] = p;
        }
      }
    });

    const { data: dbProj } = await supabase.from("projects").select("meta").eq("id", project.id).single();
    const currentDbMeta = dbProj?.meta || project?.meta || {};

    await supabase
      .from("projects")
      .update({ meta: { ...currentDbMeta, estimateValues: updatedEstimateValues, priceOverrides: updatedPriceOverrides, wbsVersions: versions } })
      .eq("id", project.id);





    // Remove deleted nodes
    const activeIds = rowsToInsert.map((r) => r.id);
    if (activeIds.length > 0) {
      const { data: dbItems } = await supabase
        .from("project_wbs_items")
        .select("id")
        .eq("project_id", project.id);

      if (dbItems) {
        const deletedIds = dbItems.map((d) => d.id).filter((id) => !activeIds.includes(id));
        if (deletedIds.length > 0) {
          await supabase.from("project_wbs_items").delete().in("id", deletedIds);
        }
      }
    }
  }, [project?.id, project?.meta]);

  const { status: autoSaveStatus, errorMessage: autoSaveError, scheduleSave, triggerImmediateSave } = useAutoSave({
    onSave: saveTreeToDb,
    delayMs: 1500,
  });

  // Save Draft
  const saveDraft = async () => {
    setEditState(prev => ({ ...prev, [activeMode]: "saved" }));
    await triggerImmediateSave(fullWbsTree);
  };

  // Save Changes
  const saveChanges = async () => {
    setEditState(prev => ({ ...prev, [activeMode]: "saved" }));
    await triggerImmediateSave(fullWbsTree);
  };

  // Submit WBS
  const submitWBS = async () => {
    setEditState(prev => ({ ...prev, [activeMode]: "submitted" }));
    await triggerImmediateSave(fullWbsTree);
  };


  // Add revision
  function addRevision() {
    const modeRevCount = modeRevisions.length + 1;
    const rev: Revision = {
      id: uid("rev"),
      label: `${activeMode} Rev ${modeRevCount}`,
      createdAt: Date.now(),
      mode: activeMode,
      tree: fullWbsTree,
      enabledAddons,
    };
    setRevisions((prev) => [...prev, rev]);
    setActiveRevisionId(rev.id);
    setEditState(prev => ({ ...prev, [activeMode]: "pristine" }));
  }

  // Restore revision
  function restoreRevision(revId: string) {
    const rev = revisions.find((r) => r.id === revId);
    if (!rev) return;

    setFullWbsTree(rev.tree);
    setEnabledAddons(rev.enabledAddons);
    setActiveRevisionId(rev.id);
    setEditState(prev => ({ ...prev, [activeMode]: "pristine" }));
  }

  // Revision options
  const revisionOptions = modeRevisions.slice().reverse().map(r => ({
    label: r.label,
    value: r.id
  }));

  // === CONDITIONAL RETURNS (must be after all hooks) ===
  if (isLoading || (project?.workspace_id && isLoadingWBS)) {
    return <GlobalLoading />;
  }

  if (error || !project) {
    return <div className="p-12 text-center text-neutral-500">{error || "Project not found"}</div>;
  }

  // Map DB project to component prop format
  const projectForHeader = {
    id: project.id,
    projectNo: project.project_number,
    code: project.project_code,
    name: project.project_name,
    status: project.status as any,
    progress: (project.meta as any)?.progress ?? 0,
    type: (project.meta as any)?.type ?? "design-build",
    stage: "sd" as any,
  };

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
                      Work Breakdown Structure
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Select a planning stage or active version below to open the WBS editor
                    </p>
                  </div>

                  <SaveStatusBadge
                    status={autoSaveStatus}
                    errorMessage={autoSaveError}
                    onRetry={() => triggerImmediateSave(fullWbsTree)}
                  />
                </div>

                <StageCardsOverview
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
                  {/* LEFT: [<] Ballpark WBS [v1.0] */}
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
                        {activeMode.toLowerCase()} WBS
                      </h2>
                      {stageSummaries[activeMode]?.activeVersion && (
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          {stageSummaries[activeMode].activeVersion.versionCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: Export, Submit WBS */}
                  <div className="flex items-center gap-2 relative">
                    <SaveStatusBadge status={autoSaveStatus} errorMessage={autoSaveError} onRetry={() => triggerImmediateSave(fullWbsTree)} />

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

                    {/* Button Flow: Save Draft > Save Changes > Submit WBS > Add Revision */}
                    {currentEditState === "draft" && (
                      <Button size="sm" variant="secondary" onClick={saveDraft} icon={<Save className="w-4 h-4" />}>
                        Save Draft
                      </Button>
                    )}
                    {currentEditState === "saved" && (
                      <Button size="sm" variant="secondary" onClick={saveChanges} icon={<Save className="w-4 h-4" />}>
                        Save Changes
                      </Button>
                    )}
                    {currentEditState !== "submitted" && (
                      <button
                        onClick={submitWBS}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-2xs transition-all border-0 outline-none shrink-0"
                      >
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span className="leading-none">Submit WBS</span>
                      </button>
                    )}



                    {currentEditState === "submitted" && (
                      <Button size="sm" onClick={addRevision} icon={<Plus className="w-4 h-4" />}>
                        Add Revision
                      </Button>
                    )}

                    {modeRevisions.length > 0 && (
                      <Select
                        value={activeRevisionId || ""}
                        onChange={(val: string) => restoreRevision(val)}
                        options={revisionOptions}
                        selectSize="sm"
                      />
                    )}
                  </div>
                </div>

                {/* WBS Content */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <WBSList
                    items={activeTree}
                    view={activeView}
                    mode={activeMode}
                    activeView={activeView}
                    onViewChange={(v) => setActiveView(v)}
                    statusLabel={
                      currentEditState === "pristine" ? "Ready" :
                      currentEditState === "draft" ? "Draft" :
                      currentEditState === "saved" ? "Saved" :
                      currentEditState === "submitted" ? "Submitted" : undefined
                    }
                    onUpdateItem={onUpdateItem}
                    onAddChild={onAddChild}
                    onAddSibling={onAddSibling}
                    onRemove={onRemove}
                    onReorder={onReorder}
                    onIndent={onIndent}
                    onOutdent={onOutdent}
                    onDuplicate={onDuplicate}
                    onMoveDirection={onMoveDirection}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={historyIndex > 0}
                    canRedo={historyIndex < history.length - 1}
                  />

                </div>

                {/* Bottom Footer Area: Reset Link + Discipline Filter Addon Chips */}
                <div className="pt-4 mt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Left: Reset Link */}
                  {currentEditState !== "submitted" ? (
                    <button
                      className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1.5"
                      onClick={onResetActive}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to baseline
                    </button>
                  ) : <div />}

                  {/* Right: Addon buttons for Ballpark */}
                  {activeMode === "BALLPARK" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {DISCIPLINE_ADDONS.map((disc) => {
                        const isPresent = fullWbsTree.some(item => item.code === disc.code);
                        return (
                          <button
                            key={disc.code}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 ${isPresent ? "bg-neutral-100 text-neutral-900 font-semibold border-neutral-300" : "bg-white text-neutral-600"}`}
                            onClick={() => toggleDiscipline(disc.code)}
                          >
                            {isPresent ? "✓ " : "+ "}{disc.label}
                          </button>
                        );
                      })}
                      <button
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 bg-white text-neutral-600"
                        onClick={() => setShowAddDiscipline(true)}
                      >
                        + Other
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>

      {/* Modals */}
      <AddDisciplineModal
        isOpen={showAddDiscipline}
        onClose={() => setShowAddDiscipline(false)}
        onAdd={onAddDiscipline}
        existingCodes={fullWbsTree.map(item => item.code).filter((c): c is string => !!c)}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={doReset}
        title="Reset to Baseline"
        message="This will discard all your changes and reset to the original template. This action cannot be undone."
        confirmLabel="Reset"
        confirmVariant="danger"
      />

      {deleteCandidate && (
        <DeleteWithDataModal
          isOpen={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={() => {
            setTreeWithHistory((prev: any[]) => removeById(prev, deleteCandidate.id));
            setDeleteCandidate(null);
          }}
          itemCode={deleteCandidate.code}
          itemName={deleteCandidate.name}
          volume={deleteCandidate.volume}
          unit={deleteCandidate.unit}
          unitPrice={deleteCandidate.unitPrice}
        />
      )}

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

      <SaveFloatingToast status={autoSaveStatus} errorMessage={autoSaveError} onRetry={() => triggerImmediateSave(fullWbsTree)} />

    </>


  );
}

// SAM codes that should never be renamed
const FIXED_CODES = ["S", "A", "M"];

// Helper: Renumber tree codes sequentially but preserve SAM codes
function renumberTree(items: any[], prefix = ""): any[] {
  if (!items || !Array.isArray(items)) return [];

  // For root level (no prefix), preserve SAM codes
  if (!prefix) {
    return items
      .filter(item => item != null)
      .map((item, idx) => {
        if (!item) return null;
        // Preserve SAM codes, don't rename them
        const keepOriginalCode = FIXED_CODES.includes(item.code);
        const newCode = keepOriginalCode ? item.code : item.code; // Keep original code at root level
        return {
          ...item,
          code: newCode,
          children: item.children ? renumberChildren(item.children, item.code) : []
        };
      })
      .filter(Boolean);
  }

  // For children, renumber normally
  return renumberChildren(items, prefix);
}

// Helper: Renumber children (not root level)
function renumberChildren(items: any[], prefix: string): any[] {
  if (!items || !Array.isArray(items)) return [];
  return items
    .filter(item => item != null)
    .map((item, idx) => {
      if (!item) return null;
      const newCode = `${prefix}.${idx + 1}`;
      return {
        ...item,
        code: newCode,
        children: item.children ? renumberChildren(item.children, newCode) : []
      };
    })
    .filter(Boolean);
}

// Helper: Reorder children of a specific parent
function reorderChildren(tree: any[], parentId: string, fromIndex: number, toIndex: number): any[] {
  if (!tree || !Array.isArray(tree)) return [];
  return tree.map(item => {
    if (!item) return item;
    if (item.id === parentId && item.children) {
      const newChildren = [...item.children].filter(Boolean);
      if (fromIndex < 0 || fromIndex >= newChildren.length) return item;
      if (toIndex < 0) toIndex = 0;
      if (toIndex > newChildren.length) toIndex = newChildren.length;

      const [moved] = newChildren.splice(fromIndex, 1);
      if (moved) {
        newChildren.splice(toIndex, 0, moved);
      }
      return { ...item, children: renumberChildren(newChildren, item.code) };
    }
    if (item.children) {
      return { ...item, children: reorderChildren(item.children, parentId, fromIndex, toIndex) };
    }
    return item;
  }).filter(Boolean);
}

// Helper: Add sibling above or below a specified item in the tree
function addSiblingToTree(tree: any[], siblingId: string, position: "above" | "below"): any[] {
  if (!tree || !Array.isArray(tree)) return [];

  // Try to find sibling in current level
  const siblingIdx = tree.findIndex(item => item && (item.id === siblingId || item.code === siblingId));

  if (siblingIdx !== -1) {
    // Found at this level - insert new item
    const newItem = {
      id: `wbs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: `X.${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      nameEn: "New Work Item",
      nameId: "Item Pekerjaan Baru",
      children: []
    };


    const newTree = [...tree];
    const insertIdx = position === "above" ? siblingIdx : siblingIdx + 1;
    newTree.splice(insertIdx, 0, newItem);

    // Don't renumber root level (preserve SAM codes)
    return newTree;
  }

  // Not found at this level - search in children
  return tree.map(item => {
    if (!item) return item;
    if (item.children && item.children.length > 0) {
      const childIdx = item.children.findIndex((c: any) => c && (c.id === siblingId || c.code === siblingId));

      if (childIdx !== -1) {
        // Found in this item's children
        const newItem = {
          id: `wbs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          code: "NEW",
          nameEn: "New Work Item",
          nameId: "Item Pekerjaan Baru",
          children: []
        };

        const newChildren = [...item.children];
        const insertIdx = position === "above" ? childIdx : childIdx + 1;
        newChildren.splice(insertIdx, 0, newItem);

        return { ...item, children: renumberChildren(newChildren, item.code) };
      }

      // Recurse into children
      return { ...item, children: addSiblingToTree(item.children, siblingId, position) };
    }
    return item;
  });
}
