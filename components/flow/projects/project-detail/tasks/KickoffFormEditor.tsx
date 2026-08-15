"use client";

import React, { useState } from "react";
import { KickoffDocumentData } from "./types";
import { defaultKickoffData } from "./defaultKickoffData";
import { KO_SECTIONS, koTasks } from "../setup/stages/data/ko";
import {
  FileText,
  Target,
  BookOpen,
  CheckSquare,
  Layers,
  Users,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import clsx from "clsx";

function TocCardContent() {
  const [isUpdated, setIsUpdated] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleRefreshToc = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setIsUpdated(true);
    }, 400);
  };

  const tocList = [
    { page: 1, title: "Cover" },
    { page: 2, title: "Table of Contents" },
    { page: 3, title: "Purpose of Kickoff" },
    { page: 4, title: "Kickoff Scope & Deliverables" },
    { page: 5, title: "Workflow Overview" },
    { page: 6, title: "Project Understanding" },
    { page: 7, title: "Required Data & Inputs" },
    { page: 8, title: "Roles & Communication" },
    { page: 9, title: "Next Steps" },
    { page: 10, title: "Document Approval" },
    { page: 11, title: "Signatures" },
    { page: 12, title: "Notes" },
  ];

  return (
    <div className="space-y-3 pt-3">
      {/* STATUS & REFRESH BUTTON ROW */}
      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
            Auto-generate Index
          </span>

          <button
            type="button"
            onClick={handleRefreshToc}
            disabled={isSyncing}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <p className={`text-xs font-semibold ${isUpdated ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
          {isUpdated ? "✓ Table of contents is up to date" : "⚠️ Table of contents changed. Please click refresh."}
        </p>
      </div>

      {/* PREVIEW OF ALL 12 AUTO-GENERATED PAGES */}
      <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/5 dark:border-white/5 space-y-1">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
          Auto-generated Index (12 Pages)
        </span>
        {tocList.map((item) => (
          <div key={item.page} className="flex items-center justify-between text-xs py-1 border-b border-black/[0.03] dark:border-white/[0.03] last:border-none">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {String(item.page).padStart(2, "0")} {item.title}
            </span>
            <span className="font-mono text-xs text-neutral-500 font-bold">
              {item.page}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PurposeCardContent({
  data,
  updateField,
}: {
  data: KickoffDocumentData;
  updateField: <K extends keyof KickoffDocumentData>(field: K, value: KickoffDocumentData[K]) => void;
}) {
  const defaultTemplateItems = [
    {
      id: "p1",
      idText: "Menyelaraskan visi awal proyek.",
      en: "Align the initial project vision.",
    },
    {
      id: "p2",
      idText: "Menentukan ruang lingkup kerja dan batasannya.",
      en: "Define the scope of work and boundaries.",
    },
    {
      id: "p3",
      idText: "Menetapkan ritme komunikasi dan mekanisme revisi.",
      en: "Establish communication rhythm and revision protocol.",
    },
    {
      id: "p4",
      idText: "Mengonfirmasi dokumen dan data yang dibutuhkan untuk memulai desain.",
      en: "Confirm required documents and data for starting the design.",
    },
  ];

  const handleUpdateItem = (index: number, field: "idText" | "en", value: string) => {
    const newList = [...data.purposeList];
    newList[index] = { ...newList[index], [field]: value };
    updateField("purposeList", newList);
  };

  const handleAddItem = () => {
    const newItem = {
      id: `p_${Date.now()}`,
      idText: "",
      en: "",
    };
    updateField("purposeList", [...data.purposeList, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newList = data.purposeList.filter((_, idx) => idx !== index);
    updateField("purposeList", newList);
  };

  const handleResetToTemplate = () => {
    updateField("purposeList", defaultTemplateItems);
  };

  return (
    <div className="space-y-3 pt-3">
      {/* HEADER & TEMPLATE ACTION BUTTONS */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Purpose Items ({data.purposeList.length})
        </span>

        <button
          type="button"
          onClick={handleResetToTemplate}
          className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-[11px] transition-all flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 shadow-2xs shrink-0"
        >
          <RotateCcw className="w-3 h-3 text-neutral-500" />
          <span>Reset Template</span>
        </button>
      </div>

      {/* PURPOSE LIST ITEMS (SIMPLIFIED CLEAN CONTAINERS) */}
      <div className="space-y-3">
        {data.purposeList.map((item, idx) => (
          <div
            key={item.id || idx}
            className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5 relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-extrabold text-neutral-400">
                Item #{idx + 1}
              </span>

              {data.purposeList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-neutral-400 hover:text-red-500 p-0.5 transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 1. EN FIRST */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                EN — Purpose of KO (English)
              </label>
              <textarea
                rows={1}
                value={item.en}
                onChange={(e) => handleUpdateItem(idx, "en", e.target.value)}
                placeholder="Enter English purpose text..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-800 dark:text-neutral-200 resize-none overflow-y-auto max-h-[4.5rem] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 2. ID SECOND */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                ID — Tujuan KO (Indonesian)
              </label>
              <textarea
                rows={1}
                value={item.idText}
                onChange={(e) => handleUpdateItem(idx, "idText", e.target.value)}
                placeholder="Tuliskan tujuan Bahasa Indonesia..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-800 dark:text-neutral-200 resize-none overflow-y-auto max-h-[4.5rem] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ADD NEW PURPOSE ITEM BUTTON (SOLID SOFT BLUE) */}
      <button
        type="button"
        onClick={handleAddItem}
        className="w-full py-2.5 px-3 rounded-xl border border-blue-200/80 dark:border-blue-800/60 hover:border-blue-400 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/80 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Purpose Item</span>
      </button>
    </div>
  );
}

function ScopeCardContent({
  data,
  updateField,
}: {
  data: KickoffDocumentData;
  updateField: <K extends keyof KickoffDocumentData>(field: K, value: KickoffDocumentData[K]) => void;
}) {
  const [newDisciplineName, setNewDisciplineName] = useState<string>("");
  const [isAddingDiscipline, setIsAddingDiscipline] = useState<boolean>(false);
  const [addingSubIndex, setAddingSubIndex] = useState<number | null>(null);
  const [newSubTitleEn, setNewSubTitleEn] = useState<string>("");
  const [newSubTitleId, setNewSubTitleId] = useState<string>("");

  const handleToggleScopeItem = (catIdx: number, itemIdx: number) => {
    const updatedCategories = data.scopeCategories.map((cat, cIdx) => {
      if (cIdx !== catIdx) return cat;
      const updatedItems = cat.items.map((item, iIdx) => {
        if (iIdx !== itemIdx) return item;
        return { ...item, checked: !item.checked };
      });
      return { ...cat, items: updatedItems };
    });
    updateField("scopeCategories", updatedCategories);
  };

  const handleAddDiscipline = () => {
    if (!newDisciplineName.trim()) return;
    const newCategory = {
      id: `sc_${Date.now()}`,
      name: newDisciplineName.trim(),
      items: [],
    };
    updateField("scopeCategories", [...data.scopeCategories, newCategory]);
    setNewDisciplineName("");
    setIsAddingDiscipline(false);
  };

  const handleRemoveDiscipline = (catIdx: number) => {
    const updated = data.scopeCategories.filter((_, idx) => idx !== catIdx);
    updateField("scopeCategories", updated);
  };

  const handleAddSubdiscipline = (catIdx: number) => {
    if (!newSubTitleEn.trim()) return;
    const newItem = {
      id: `sci_${Date.now()}`,
      titleEn: newSubTitleEn.trim(),
      titleId: newSubTitleId.trim() || newSubTitleEn.trim(),
      checked: true,
    };
    const updatedCategories = data.scopeCategories.map((cat, cIdx) => {
      if (cIdx !== catIdx) return cat;
      return { ...cat, items: [...cat.items, newItem] };
    });
    updateField("scopeCategories", updatedCategories);
    setNewSubTitleEn("");
    setNewSubTitleId("");
    setAddingSubIndex(null);
  };

  const handleRemoveSubitem = (catIdx: number, itemIdx: number) => {
    const updatedCategories = data.scopeCategories.map((cat, cIdx) => {
      if (cIdx !== catIdx) return cat;
      return { ...cat, items: cat.items.filter((_, iIdx) => iIdx !== itemIdx) };
    });
    updateField("scopeCategories", updatedCategories);
  };

  return (
    <div className="space-y-4 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
          Check disciplines and subdisciplines included in this project stage:
        </p>
      </div>

      {data.scopeCategories.map((cat, catIdx) => (
        <div key={cat.id || catIdx} className="space-y-2.5 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/50">
          {/* DISCIPLINE BADGE IN GRAY (EDITOR) */}
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 bg-neutral-600 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
              {cat.name}
            </span>

            <button
              type="button"
              onClick={() => handleRemoveDiscipline(catIdx)}
              className="text-neutral-400 hover:text-red-500 p-1 transition-colors"
              title="Remove Discipline"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SUBDISCIPLINE LIST WITH CHECKBOXES */}
          <div className="space-y-1.5 pl-1">
            {cat.items.map((item, itemIdx) => (
              <div key={item.id || itemIdx} className="flex items-center justify-between gap-2 group">
                <label className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 cursor-pointer transition-all flex-1">
                  <input
                    type="checkbox"
                    checked={item.checked ?? true}
                    onChange={() => handleToggleScopeItem(catIdx, itemIdx)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300 dark:border-neutral-600 cursor-pointer shrink-0"
                  />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 block leading-snug">
                      {item.titleEn}
                    </span>
                    <span className="italic text-neutral-500 dark:text-neutral-400 text-[11px] block leading-snug">
                      {item.titleId}
                    </span>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => handleRemoveSubitem(catIdx, itemIdx)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 p-1 transition-all"
                  title="Remove subdiscipline"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* + ADD SUBDISCIPLINE BUTTON (AT THE BOTTOM OF THE LIST) */}
            <button
              type="button"
              onClick={() => setAddingSubIndex(addingSubIndex === catIdx ? null : catIdx)}
              className="mt-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all border border-dashed border-blue-200 dark:border-blue-800/60 w-full justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subdiscipline</span>
            </button>
          </div>

          {/* INLINE FORM ADD SUBDISCIPLINE */}
          {addingSubIndex === catIdx && (
            <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-800 space-y-2 mt-2">
              <input
                type="text"
                value={newSubTitleEn}
                onChange={(e) => setNewSubTitleEn(e.target.value)}
                placeholder="Subdiscipline title (English)..."
                className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-medium"
              />
              <input
                type="text"
                value={newSubTitleId}
                onChange={(e) => setNewSubTitleId(e.target.value)}
                placeholder="Judul subdisiplin (Indonesia)..."
                className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-medium"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddingSubIndex(null)}
                  className="px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSubdiscipline(catIdx)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-2xs"
                >
                  Add Sub
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ADD NEW DISCIPLINE BUTTON */}
      {isAddingDiscipline ? (
        <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
          <label className="text-xs font-bold text-blue-900 dark:text-blue-200 block">Discipline name (e.g. Landscape, Interior)</label>
          <input
            type="text"
            value={newDisciplineName}
            onChange={(e) => setNewDisciplineName(e.target.value)}
            placeholder="Discipline name..."
            className="w-full text-xs p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-900 font-medium"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingDiscipline(false)}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddDiscipline}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs"
            >
              Save Discipline
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingDiscipline(true)}
          className="w-full py-2.5 px-3 rounded-xl border border-blue-200/80 dark:border-blue-800/60 hover:border-blue-400 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/80 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Discipline</span>
        </button>
      )}
    </div>
  );
}

function WorkflowCardContent({
  data,
  updateField,
}: {
  data: KickoffDocumentData;
  updateField: <K extends keyof KickoffDocumentData>(field: K, value: KickoffDocumentData[K]) => void;
}) {
  const [addingItemStepIdx, setAddingItemStepIdx] = useState<number | null>(null);
  const [newItemEn, setNewItemEn] = useState<string>("");
  const [newItemId, setNewItemId] = useState<string>("");

  const handleUpdateDurationValue = (stepIdx: number, numVal: string, unitVal: string) => {
    let formattedDuration = "";
    if (unitVal === "ongoing") {
      formattedDuration = "Ongoing";
    } else if (unitVal === "final") {
      formattedDuration = "Final";
    } else {
      const isPlural = numVal && (parseInt(numVal, 10) > 1 || numVal.includes("-"));
      const unitText = unitVal === "month" ? (isPlural ? "months" : "month") : (isPlural ? "weeks" : "week");
      formattedDuration = numVal ? `${numVal} ${unitText}` : `1 ${unitText}`;
    }
    
    const updated = data.workflowSteps.map((step, sIdx) => {
      if (sIdx !== stepIdx) return step;
      return { ...step, duration: formattedDuration, _numVal: numVal, _unitVal: unitVal };
    });
    updateField("workflowSteps", updated);
  };

  const handleToggleWorkflowItem = (stepIdx: number, itemIdx: number) => {
    const updated = data.workflowSteps.map((step, sIdx) => {
      if (sIdx !== stepIdx) return step;
      const newItems = step.items.map((item, iIdx) => {
        if (iIdx !== itemIdx) return item;
        return { ...item, checked: !(item as any).checked };
      });
      return { ...step, items: newItems };
    });
    updateField("workflowSteps", updated);
  };

  const handleAddWorkflowItem = (stepIdx: number) => {
    if (!newItemEn.trim()) return;
    const newItem = {
      id: `wfi_${Date.now()}`,
      titleEn: newItemEn.trim(),
      titleId: newItemId.trim() || newItemEn.trim(),
      checked: true,
    };
    const updated = data.workflowSteps.map((step, sIdx) => {
      if (sIdx !== stepIdx) return step;
      return { ...step, items: [...step.items, newItem] };
    });
    updateField("workflowSteps", updated);
    setNewItemEn("");
    setNewItemId("");
    setAddingItemStepIdx(null);
  };

  const handleRemoveWorkflowItem = (stepIdx: number, itemIdx: number) => {
    const updated = data.workflowSteps.map((step, sIdx) => {
      if (sIdx !== stepIdx) return step;
      return { ...step, items: step.items.filter((_, iIdx) => iIdx !== itemIdx) };
    });
    updateField("workflowSteps", updated);
  };

  return (
    <div className="space-y-4 pt-3">
      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
        Configure stage durations & deliverables for the workflow overview:
      </p>

      {data.workflowSteps.map((step, stepIdx) => {
        // Extract existing number and unit if possible
        const rawDur = step.duration || "1 week";
        const isOngoing = rawDur.toLowerCase().includes("ongoing");
        const isFinal = rawDur.toLowerCase().includes("final");
        const isMonth = rawDur.includes("month");
        const matchNum = rawDur.match(/^([0-9\-\s]+)/);
        const currentNum = (step as any)._numVal ?? (matchNum ? matchNum[1].trim() : "1");
        const currentUnit = (step as any)._unitVal ?? (isOngoing ? "ongoing" : isFinal ? "final" : isMonth ? "month" : "week");

        return (
          <div key={step.id || stepIdx} className="space-y-2.5 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/50">
            {/* BARIS 1: STAGE BADGE */}
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 bg-neutral-700 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                {step.stageName}
              </span>
            </div>

            {/* BARIS 2: CLEAN INLINE DURATION CONTROL */}
            <div className="flex items-center gap-2 pt-0.5 text-xs">
              <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">Duration:</span>
              <div className="flex items-center gap-1.5">
                {currentUnit !== "ongoing" && currentUnit !== "final" && (
                  <input
                    type="text"
                    value={currentNum}
                    onChange={(e) => handleUpdateDurationValue(stepIdx, e.target.value, currentUnit)}
                    placeholder="1"
                    className="w-12 text-xs px-2.5 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white text-center focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                )}
                <div className="relative inline-flex items-center">
                  <select
                    value={currentUnit}
                    onChange={(e) => handleUpdateDurationValue(stepIdx, currentNum, e.target.value)}
                    className="appearance-none text-xs pl-3 pr-7 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="final">Final</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* DELIVERABLES CHECKBOX LIST */}
            <div className="space-y-1.5 pl-1">
              {step.items.map((item, itemIdx) => (
                <div key={item.id || itemIdx} className="flex items-center justify-between gap-2 group">
                  <label className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 cursor-pointer transition-all flex-1">
                    <input
                      type="checkbox"
                      checked={(item as any).checked ?? true}
                      onChange={() => handleToggleWorkflowItem(stepIdx, itemIdx)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300 dark:border-neutral-600 cursor-pointer shrink-0"
                    />
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 block leading-snug">
                        {item.titleEn}
                      </span>
                      <span className="italic text-neutral-500 dark:text-neutral-400 text-[11px] block leading-snug">
                        {item.titleId}
                      </span>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveWorkflowItem(stepIdx, itemIdx)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 p-1 transition-all"
                    title="Remove deliverable"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* + ADD DELIVERABLE BUTTON */}
              <button
                type="button"
                onClick={() => setAddingItemStepIdx(addingItemStepIdx === stepIdx ? null : stepIdx)}
                className="mt-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all border border-dashed border-blue-200 dark:border-blue-800/60 w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deliverable</span>
              </button>
            </div>

            {/* INLINE FORM FOR NEW DELIVERABLE */}
            {addingItemStepIdx === stepIdx && (
              <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-800 space-y-2 mt-2">
                <input
                  type="text"
                  value={newItemEn}
                  onChange={(e) => setNewItemEn(e.target.value)}
                  placeholder="Deliverable title (English)..."
                  className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-medium"
                />
                <input
                  type="text"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  placeholder="Judul keluaran (Indonesia)..."
                  className="w-full text-xs p-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-medium"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAddingItemStepIdx(null)}
                    className="px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:text-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddWorkflowItem(stepIdx)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-2xs"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProjectUnderstandingCardContent({
  data,
  updateField,
}: {
  data: KickoffDocumentData;
  updateField: <K extends keyof KickoffDocumentData>(field: K, value: KickoffDocumentData[K]) => void;
}) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitleEn, setNewCardTitleEn] = useState("");
  const [newCardTitleId, setNewCardTitleId] = useState("");
  const [newCardDescEn, setNewCardDescEn] = useState("");
  const [newCardDescId, setNewCardDescId] = useState("");

  const handleAddCard = () => {
    if (!newCardTitleEn.trim()) return;
    const newCard = {
      id: `uc_${Date.now()}`,
      titleEn: newCardTitleEn.trim(),
      titleId: newCardTitleId.trim() || newCardTitleEn.trim(),
      descEn: newCardDescEn.trim(),
      descId: newCardDescId.trim() || newCardDescEn.trim(),
    };
    updateField("understandingCards", [...data.understandingCards, newCard]);
    setNewCardTitleEn("");
    setNewCardTitleId("");
    setNewCardDescEn("");
    setNewCardDescId("");
    setIsAddingCard(false);
  };

  const handleRemoveCard = (idx: number) => {
    const updated = data.understandingCards.filter((_, i) => i !== idx);
    updateField("understandingCards", updated);
  };

  const handleUpdateCard = (idx: number, field: "titleEn" | "titleId" | "descEn" | "descId", value: string) => {
    const updated = data.understandingCards.map((card, i) => {
      if (i !== idx) return card;
      return { ...card, [field]: value };
    });
    updateField("understandingCards", updated);
  };

  return (
    <div className="space-y-4 pt-3">
      {/* INTRO PARAGRAPH (EN) */}
      <div>
        <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1 uppercase tracking-wider">
          EN — Project Understanding Intro
        </label>
        <textarea
          rows={3}
          value={data.understandingIntroEn}
          onChange={(e) => updateField("understandingIntroEn", e.target.value)}
          placeholder="Describe the project context in English..."
          className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-800 dark:text-neutral-200 resize-none overflow-y-auto max-h-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* INTRO PARAGRAPH (ID) */}
      <div>
        <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1 uppercase tracking-wider">
          ID — Pemahaman Proyek (Indonesia)
        </label>
        <textarea
          rows={3}
          value={data.understandingIntroId}
          onChange={(e) => updateField("understandingIntroId", e.target.value)}
          placeholder="Tuliskan konteks proyek dalam Bahasa Indonesia..."
          className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-800 dark:text-neutral-200 resize-none overflow-y-auto max-h-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* UNDERSTANDING CARDS */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Focus Cards ({data.understandingCards.length})
        </span>
      </div>

      <div className="space-y-3">
        {data.understandingCards.map((card, idx) => (
          <div
            key={card.id || idx}
            className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5 relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-extrabold text-neutral-400">
                Card #{idx + 1}
              </span>
              {data.understandingCards.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveCard(idx)}
                  className="text-neutral-400 hover:text-red-500 p-0.5 transition-colors"
                  title="Remove card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* TITLE EN */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                EN — Title
              </label>
              <input
                type="text"
                value={card.titleEn}
                onChange={(e) => handleUpdateCard(idx, "titleEn", e.target.value)}
                placeholder="Card title (English)..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* TITLE ID */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                ID — Judul
              </label>
              <input
                type="text"
                value={card.titleId}
                onChange={(e) => handleUpdateCard(idx, "titleId", e.target.value)}
                placeholder="Judul kartu (Indonesia)..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* DESC EN */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                EN — Description
              </label>
              <textarea
                rows={1}
                value={card.descEn}
                onChange={(e) => handleUpdateCard(idx, "descEn", e.target.value)}
                placeholder="Card description (English)..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-800 dark:text-neutral-200 resize-none overflow-y-auto max-h-[4.5rem] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* DESC ID */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                ID — Deskripsi
              </label>
              <textarea
                rows={1}
                value={card.descId}
                onChange={(e) => handleUpdateCard(idx, "descId", e.target.value)}
                placeholder="Deskripsi kartu (Indonesia)..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-800 dark:text-neutral-200 resize-none overflow-y-auto max-h-[4.5rem] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ADD NEW CARD */}
      {isAddingCard ? (
        <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-900 space-y-2">
          <input
            type="text"
            value={newCardTitleEn}
            onChange={(e) => setNewCardTitleEn(e.target.value)}
            placeholder="Card title (English)..."
            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-bold"
          />
          <input
            type="text"
            value={newCardTitleId}
            onChange={(e) => setNewCardTitleId(e.target.value)}
            placeholder="Judul kartu (Indonesia)..."
            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-medium"
          />
          <input
            type="text"
            value={newCardDescEn}
            onChange={(e) => setNewCardDescEn(e.target.value)}
            placeholder="Description (English)..."
            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-medium"
          />
          <input
            type="text"
            value={newCardDescId}
            onChange={(e) => setNewCardDescId(e.target.value)}
            placeholder="Deskripsi (Indonesia)..."
            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-medium"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingCard(false)}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCard}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs"
            >
              Add Card
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingCard(true)}
          className="w-full py-2.5 px-3 rounded-xl border border-blue-200/80 dark:border-blue-800/60 hover:border-blue-400 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/80 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Focus Card</span>
        </button>
      )}
    </div>
  );
}


type Props = {
  data: KickoffDocumentData;
  onChange: (newData: KickoffDocumentData) => void;
  activeSection?: string;
  onSectionChange?: (secId: string) => void;
  onActiveTaskChange?: (taskCode: string) => void;
  customSections?: { code: string; title: string }[];
  customTasks?: any[];
};

function TaskCardItem({
  task,
  data,
  updateField,
  isOpen,
  onToggle,
}: {
  task: any;
  data: KickoffDocumentData;
  updateField: <K extends keyof KickoffDocumentData>(field: K, value: KickoffDocumentData[K]) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onFocus={() => {
        if (!isOpen) onToggle();
      }}
      className="bg-white/90 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs overflow-hidden transition-all"
    >
      {/* CARD HEADER WITH EXPAND/COLLAPSE TOGGLE */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3.5 px-4 flex items-center justify-between gap-2 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-black">
            {task.code}
          </span>
          <h5 className="text-xs font-extrabold text-neutral-900 dark:text-white">
            {task.name}
          </h5>
        </div>

        <div className="text-neutral-400 p-0.5">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* CARD BODY CONTENT */}
      {isOpen && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-black/5 dark:border-white/5">
          {task.name === "Cover" || task.code === "01-01" ? (
            <div className="space-y-3 pt-3">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-2">
                <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                  Auto-Fill Variables
                </span>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                  Cover details below will automatically auto-fill from live project data when documents are generated.
                </p>
              </div>

              <div className="p-3.5 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/5 dark:border-white/5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-500">Project Name</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200 font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                    [Project Name]
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-500">Project Location</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200 font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                    [Project Location]
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-500">Project Code & Number</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200 font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                    #000-ADY
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-500">Version Pill</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200 font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                    v1.YYYY.MM.DD
                  </span>
                </div>
              </div>
            </div>
          ) : task.name === "Table of Contents" || task.code === "01-02" ? (
            <TocCardContent />
          ) : task.name === "Purpose of Kickoff" || task.code === "01-03" ? (
            <PurposeCardContent data={data} updateField={updateField} />
          ) : task.name === "Kickoff Scope & Deliverables" || task.code === "01-04" ? (
            <ScopeCardContent data={data} updateField={updateField} />
          ) : task.name === "Workflow Overview" || task.code === "01-05" ? (
            <WorkflowCardContent data={data} updateField={updateField} />
          ) : task.name === "Project Understanding" || task.code === "01-06" ? (
            <ProjectUnderstandingCardContent data={data} updateField={updateField} />
          ) : (
            <div className="space-y-2 pt-3">
              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Form Input Content</label>
              <input
                type="text"
                defaultValue={`Input data untuk ${task.name}`}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KickoffFormEditor({ data, onChange, activeSection, onSectionChange, onActiveTaskChange, customSections, customTasks }: Props) {
  const [internalSection, setInternalSection] = useState<string>("KO-01");
  const [expandedCardCode, setExpandedCardCode] = useState<string | null>(null);

  const currentSection = activeSection || internalSection;

  const handleSectionChange = (code: string) => {
    setInternalSection(code);
    onSectionChange?.(code);
    setExpandedCardCode(null);
  };

  const updateField = <K extends keyof KickoffDocumentData>(field: K, value: KickoffDocumentData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const sectionsList = customSections || KO_SECTIONS;
  const currentSec = sectionsList.find((s) => s.code === currentSection || s.code === `KO-${currentSection}`) || sectionsList[0];
  
  const currentSecIndex = sectionsList.findIndex((s) => s.code === currentSec?.code);

  const matchedCustomTasks = customTasks && customTasks.length > 0
    ? [...customTasks]
        .filter((t) => {
          if (!currentSec) return false;
          if (t.sectionCode === currentSec.code) return true;
          if (t.sectionId && (currentSec as any)?.id && t.sectionId === (currentSec as any)?.id) return true;
          const cleanSecNum = currentSec.code?.replace(/^[A-Z]{2}-/, "");
          if (cleanSecNum && t.sectionCode && t.sectionCode.replace(/^[A-Z]{2}-/, "") === cleanSecNum) return true;
          // Match by 2-digit prefix (e.g., "02-06" matches section 02)
          const taskSecPrefix = (t.code || "").split("-")[0];
          if (cleanSecNum && taskSecPrefix && taskSecPrefix === cleanSecNum) return true;
          return false;
        })
        .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))
    : [];

  const sectionTasks = matchedCustomTasks.length > 0
    ? matchedCustomTasks.map((t, idx) => {
        const secNum = currentSec?.code?.replace(/^[A-Z]{2}-/, "") || "01";
        const taskNum = String(idx + 1).padStart(2, "0");
        const rawCode = t.code || `${secNum}-${taskNum}`;
        const cleanCode = rawCode.replace(/^[A-Z]{2}-/, "");
        return {
          id: t.id || `task-${idx}`,
          code: cleanCode,
          name: t.taskName || t.name,
          nameId: t.taskNameId || t.nameId || t.taskName || t.name
        };
      })
    : koTasks.filter((t) => t.sectionCode === currentSec?.code).map((t) => ({
        ...t,
        code: t.code.replace(/^[A-Z]{2}-/, "")
      }));

  const handleToggleCard = (taskCode: string) => {
    const isCurrentlyOpen = expandedCardCode === taskCode;
    const newExpandedCode = isCurrentlyOpen ? null : taskCode;
    setExpandedCardCode(newExpandedCode);
    if (onActiveTaskChange) {
      onActiveTaskChange(taskCode);
    }
  };

  return (
    <div className="space-y-3">
      {/* ===== TASK CARDS ===== */}
      <div className="space-y-3 max-h-[82vh] overflow-y-auto pr-1">
        {sectionTasks.map((task) => (
          <TaskCardItem
            key={task.id}
            task={task}
            data={data}
            updateField={updateField}
            isOpen={expandedCardCode === task.code}
            onToggle={() => handleToggleCard(task.code)}
          />
        ))}

        {sectionTasks.length === 0 && (
          <div className="py-8 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50/30 dark:bg-neutral-900/30">
            <p className="text-xs text-neutral-400 font-medium">No tasks configured for this section yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
