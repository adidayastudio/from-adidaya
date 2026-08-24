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

  const [activeMode, setActiveMode] = useState<WBSMode>("BALLPARK");
  const [activeView, setActiveView] = useState<WBSView>("SUMMARY");
  const [enabledAddons, setEnabledAddons] = useState<("I" | "L")[]>([]);

  // Single unified tree state for all WBS levels
  const [fullWbsTree, setFullWbsTree] = useState<any[]>(() => {
    return buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));
  });

  // Auto-generate multi-building WBS tree when project specs are loaded
  useEffect(() => {
    if (!project) return;

    const count = project.building_mass_count || 1;
    const masses = project.building_masses || [];

    if (count > 1 && Array.isArray(masses) && masses.length > 0) {
      const baseDetail = buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));

      const multiBuildingTree = masses.map((mass: any, idx: number) => {
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

      setFullWbsTree(multiBuildingTree);
    }
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

  // Modals
  const [showAddDiscipline, setShowAddDiscipline] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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

  const computedEstimatesTree = useMemo(() => fullWbsTree, [fullWbsTree]);
  const computedDetailTree = useMemo(() => fullWbsTree, [fullWbsTree]);
  const rawActiveTree = useMemo(() => fullWbsTree, [fullWbsTree]);

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

    await supabase
      .from("projects")
      .update({ meta: { ...(project.meta || {}), estimateValues: updatedEstimateValues, priceOverrides: updatedPriceOverrides } })
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
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">Work Breakdown Structure</h2>
            </div>

            {/* Tabs + Actions Row */}
            <div className="flex items-end justify-between border-b border-neutral-200 mb-6">
              <Tabs<WBSMode>
                value={activeMode}
                onChange={onChangeMode}
                items={WBS_TABS}
                className="gap-6"
              />
              <div className="pb-2 flex items-center gap-2">
                <SaveStatusBadge status={autoSaveStatus} errorMessage={autoSaveError} onRetry={() => triggerImmediateSave(fullWbsTree)} />

                <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>
                  Export
                </Button>

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
                  <Button size="sm" onClick={submitWBS} icon={<Send className="w-4 h-4" />}>
                    Submit WBS
                  </Button>
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

            {/* Summary/Breakdown Switcher + Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
                  <button
                    onClick={() => setActiveView("SUMMARY")}
                    className={`px-4 py-1.5 text-xs font-medium transition-colors ${activeView === "SUMMARY"
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setActiveView("BREAKDOWN")}
                    className={`px-4 py-1.5 text-xs font-medium border-l border-neutral-200 transition-colors ${activeView === "BREAKDOWN"
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                  >
                    Breakdown
                  </button>
                </div>

                {/* Status */}
                {currentEditState === "pristine" && (
                  <span className="text-xs text-neutral-500 font-medium">● Ready</span>
                )}
                {currentEditState === "draft" && (
                  <span className="text-xs text-amber-600 font-medium">● Draft</span>
                )}
                {currentEditState === "saved" && (
                  <span className="text-xs text-blue-600 font-medium">● Saved</span>
                )}
                {currentEditState === "submitted" && (
                  <span className="text-xs text-green-600 font-medium">● Submitted</span>
                )}
                {modeRevisions.length > 0 && selectedRev?.mode === activeMode && (
                  <span className="text-xs text-orange-600 font-medium">● {selectedRev.label}</span>
                )}
              </div>

              {/* Addon buttons for Ballpark */}
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

            {/* WBS Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <WBSList
                items={activeTree}
                view={activeView}
                mode={activeMode}
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

            {/* Reset Link */}
            {currentEditState !== "submitted" && (
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
