"use client";

import { useMemo, useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { Tabs } from "@/shared/ui/layout/Tabs";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { useProject } from "@/components/flow/project-context";
import { Download, Save, Send, Plus, RotateCcw } from "lucide-react";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

import type {
  WBSMode,
  WBSView,
} from "@/components/flow/projects/project-detail/setup/wbs/data/wbs.types";

import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { WBS_ADDONS } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs.addons";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import WBSList from "@/components/flow/projects/project-detail/setup/wbs/WBSList";
import { AddDisciplineModal, ConfirmModal } from "@/components/flow/projects/project-detail/setup/wbs/WBSModals";
import {
  addChildById,
  addRootDiscipline,
  getMaxDepth,
  pruneToDepth,
  removeById,
  updateById,
  uid,
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

  // Trees per mode
  const [ballparkTree, setBallparkTree] = useState(() => WBS_BALLPARK);
  const [estimatesTree, setEstimatesTree] = useState<any[]>([]);
  const [detailTree, setDetailTree] = useState<any[]>([]);

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

  // ALL HOOKS MUST BE BEFORE CONDITIONAL RETURNS
  // ballparkWithAddons is now just ballparkTree (addons are inserted into tree directly)
  const ballparkWithAddons = useMemo(() => ballparkTree, [ballparkTree]);

  // Helper to add/remove addon from tree
  const toggleAddon = (addonCode: "I" | "L") => {
    const addon = WBS_ADDONS.find(a => a.code === addonCode);
    if (!addon) return;

    const hasAddon = ballparkTree.some(item => item.code === addonCode);

    if (hasAddon) {
      // Remove addon
      setBallparkTree(prev => prev.filter(item => item.code !== addonCode));
      setEnabledAddons(prev => prev.filter(c => c !== addonCode));
    } else {
      // Add addon right after SAM (at index 3) or after existing addons
      const SAM_COUNT = 3;
      // Find insert position: after SAM, after any existing I/L
      let insertIdx = SAM_COUNT;
      for (let i = SAM_COUNT; i < ballparkTree.length; i++) {
        if (["I", "L"].includes(ballparkTree[i].code || "")) {
          insertIdx = i + 1;
        } else {
          break;
        }
      }

      const newTree = [...ballparkTree];
      newTree.splice(insertIdx, 0, addon);
      setBallparkTree(newTree);
      setEnabledAddons(prev => [...prev, addonCode]);
    }
    markEdited();
  };

  // Auto-inherit estimates from ballpark if empty
  const computedEstimatesTree = useMemo(() => {
    if (estimatesTree.length === 0) {
      return buildEstimatesFromBallpark(ballparkWithAddons, RAW_WBS_ESTIMATES_DELTA);
    }
    return estimatesTree;
  }, [ballparkWithAddons, estimatesTree]);

  // Build Detail from Estimates + detail extensions (level 3-4)
  const computedDetailTree = useMemo(() => {
    if (detailTree.length === 0) {
      return buildDetailFromEstimates(computedEstimatesTree);
    }
    return detailTree;
  }, [computedEstimatesTree, detailTree]);

  // Get active tree based on mode
  const rawActiveTree = useMemo(() => {
    if (activeMode === "BALLPARK") return ballparkWithAddons;
    if (activeMode === "ESTIMATES") return computedEstimatesTree;
    return computedDetailTree;
  }, [activeMode, ballparkWithAddons, computedEstimatesTree, computedDetailTree]);

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

  // Get setter for current mode
  function getTreeSetter() {
    if (activeMode === "BALLPARK") return setBallparkTree;
    if (activeMode === "ESTIMATES") return setEstimatesTree;
    return setDetailTree;
  }

  // Mark as edited
  function markEdited() {
    if (currentEditState === "pristine") {
      setEditState(prev => ({ ...prev, [activeMode]: "draft" }));
    }
  }

  // CRUD handlers
  const onUpdateItem = (id: string, patch: Partial<{ nameEn: string; nameId?: string }>) => {
    markEdited();
    const setter = getTreeSetter();
    setter((prev: any[]) => updateById(prev.length ? prev : rawActiveTree, id, patch as any));
  };

  const onAddChild = (parentId: string, level: number) => {
    if (activeMode === "BALLPARK" && level >= 1) return;
    markEdited();
    const newItem = {
      id: uid("wbs"),
      code: "NEW",
      nameEn: "New Work",
      nameId: "Pekerjaan Baru",
      children: [],
    };
    const setter = getTreeSetter();
    setter((prev: any[]) => addChildById(prev.length ? prev : rawActiveTree, parentId, newItem as any));
  };

  const onAddSibling = (siblingId: string, position: "above" | "below") => {
    markEdited();
    const setter = getTreeSetter();
    setter((prev: any[]) => {
      const tree = prev.length ? prev : rawActiveTree;
      return addSiblingToTree(tree, siblingId, position);
    });
  };

  const onRemove = (id: string) => {
    markEdited();
    const setter = getTreeSetter();
    setter((prev: any[]) => removeById(prev.length ? prev : rawActiveTree, id));
  };

  const onReorder = (parentId: string | null, fromIndex: number, toIndex: number) => {
    // SAM items are at indices 0,1,2 - they cannot be moved and nothing can be moved before/between them
    const SAM_COUNT = 3; // S, A, M

    const setter = getTreeSetter();
    setter((prev: any[]) => {
      const tree = prev.length ? prev : rawActiveTree;

      if (!parentId) {
        // Root level reorder
        // Don't allow moving SAM items
        if (fromIndex < SAM_COUNT) return tree;
        // Don't allow dropping into SAM positions (must be >= SAM_COUNT)
        if (toIndex < SAM_COUNT) toIndex = SAM_COUNT;

        // If same position after adjustment, no change
        if (fromIndex === toIndex) return tree;

        markEdited();
        const newTree = [...tree];
        const [moved] = newTree.splice(fromIndex, 1);
        newTree.splice(toIndex, 0, moved);
        return renumberTree(newTree);
      }

      markEdited();
      return reorderChildren(tree, parentId, fromIndex, toIndex);
    });
  };

  // Add discipline
  const onAddDiscipline = (code: string, nameEn: string, nameId?: string) => {
    markEdited();
    setBallparkTree((prev) => addRootDiscipline(prev, { code, nameEn, nameId, children: [] }));
  };

  // Reset handler
  const onResetActive = () => {
    setShowResetConfirm(true);
  };

  const doReset = () => {
    if (activeMode === "BALLPARK") {
      setEnabledAddons([]);
      setBallparkTree(WBS_BALLPARK);
    } else if (activeMode === "ESTIMATES") {
      setEstimatesTree([]);
    } else {
      setDetailTree([]);
    }
    setEditState(prev => ({ ...prev, [activeMode]: "pristine" }));
  };

  // Save Draft
  const saveDraft = () => {
    setEditState(prev => ({ ...prev, [activeMode]: "saved" }));
    console.log("Draft saved");
  };

  // Save Changes
  const saveChanges = () => {
    setEditState(prev => ({ ...prev, [activeMode]: "saved" }));
    console.log("Changes saved");
  };

  // Submit WBS
  const submitWBS = () => {
    setEditState(prev => ({ ...prev, [activeMode]: "submitted" }));
    console.log("WBS submitted");
  };

  // Add revision
  function addRevision() {
    const modeRevCount = modeRevisions.length + 1;
    const currentTree = activeMode === "BALLPARK" ? ballparkWithAddons
      : activeMode === "ESTIMATES" ? computedEstimatesTree
        : computedDetailTree;

    const rev: Revision = {
      id: uid("rev"),
      label: `${activeMode} Rev ${modeRevCount}`,
      createdAt: Date.now(),
      mode: activeMode,
      tree: currentTree,
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

    if (rev.mode === "BALLPARK") {
      setBallparkTree(rev.tree);
    } else if (rev.mode === "ESTIMATES") {
      setEstimatesTree(rev.tree);
    } else {
      setDetailTree(rev.tree);
    }
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
  if (isLoading) {
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
    <div className="min-h-screen bg-neutral-50 p-6">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm">
        <span className="text-neutral-500">Flow</span>
        <span className="mx-2 text-neutral-400">|</span>
        <span className="text-neutral-500">Projects</span>
        <span className="mx-2 text-neutral-400">|</span>
        <span className="text-neutral-500">Setup</span>
        <span className="mx-2 text-neutral-400">|</span>
        <span className="font-medium text-neutral-900">WBS</span>
      </div>

      <PageWrapper sidebar={<ProjectDetailSidebar />}>
        <div className="space-y-6">
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
                {currentEditState === "saved" && (
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
                <div className="flex items-center gap-2">
                  <button
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 ${enabledAddons.includes("I") ? "bg-neutral-100" : ""}`}
                    onClick={() => toggleAddon("I")}
                  >
                    {enabledAddons.includes("I") ? "✓ " : "+ "}Interior
                  </button>
                  <button
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 ${enabledAddons.includes("L") ? "bg-neutral-100" : ""}`}
                    onClick={() => toggleAddon("L")}
                  >
                    {enabledAddons.includes("L") ? "✓ " : "+ "}Landscape
                  </button>
                  <button
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
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
              />
            </div>

            {/* Reset Link */}
            {currentEditState !== "pristine" && (
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
        existingCodes={ballparkTree.map(item => item.code).filter((c): c is string => !!c)}
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
    </div>
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
      code: "NEW",
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
