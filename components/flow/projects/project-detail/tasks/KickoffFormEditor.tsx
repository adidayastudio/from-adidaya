"use client";

import React, { useState } from "react";
import { KickoffDocumentData } from "./types";
import { defaultKickoffData } from "./defaultKickoffData";
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

type Props = {
  data: KickoffDocumentData;
  onChange: (newData: KickoffDocumentData) => void;
  activeSection?: string;
  onSectionChange?: (secId: string) => void;
};

export default function KickoffFormEditor({ data, onChange, activeSection, onSectionChange }: Props) {
  const [internalSection, setInternalSection] = useState<string>("cover");
  const currentSection = activeSection || internalSection;

  const handleSectionChange = (secId: string) => {
    if (onSectionChange) {
      onSectionChange(secId);
    } else {
      setInternalSection(secId);
    }
  };

  const updateField = <K extends keyof KickoffDocumentData>(field: K, value: KickoffDocumentData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const handleResetDefaults = () => {
    if (confirm("Reset seluruh data inputan ke template default Adidaya Studio?")) {
      onChange(defaultKickoffData);
    }
  };

  const sections = [
    { id: "cover", label: "01-01 Cover & Metadata", icon: FileText },
    { id: "purpose", label: "01-02 Tujuan (Purpose)", icon: Target },
    { id: "understanding", label: "01-03 Pemahaman Proyek", icon: BookOpen },
    { id: "goals", label: "01-04 Tujuan Spesifik Proyek", icon: Sparkles },
    { id: "scope", label: "01-05 Scope of Work", icon: CheckSquare },
    { id: "workflow", label: "01-06 Workflow & Schedule", icon: Layers },
    { id: "inputs", label: "01-07 Data Dibutuhkan", icon: Calendar },
    { id: "roles", label: "01-08 Tim & Komunikasi", icon: Users },
    { id: "nextSteps", label: "01-09 Langkah Berikutnya", icon: CheckSquare },
    { id: "approval", label: "01-10 Persetujuan & Sign", icon: FileText },
  ];

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-black/[0.05] dark:border-white/[0.05] p-5 shadow-sm space-y-6 max-h-[85vh] overflow-y-auto">
      {/* HEADER & RESET BUTTON */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">Form Editor KO-01</h3>
          <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Isi data template dokumen Kickoff di bawah ini</p>
        </div>
        <button
          onClick={handleResetDefaults}
          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Auto-fill Template</span>
        </button>
      </div>

      {/* SECTION ACCORDION SELECTOR (Only if not controlled from top) */}
      {!activeSection && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 hide-scrollbar">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => handleSectionChange(sec.id)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0",
                currentSection === sec.id
                  ? "bg-brand-red text-white shadow-xs"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
              )}
            >
              <sec.icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* SECTION CONTENT EDITOR */}
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* 1. COVER & METADATA */}
        {currentSection === "cover" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-01 Cover & Project Information</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Project Code</label>
                <input
                  type="text"
                  value={data.projectCode}
                  onChange={(e) => updateField("projectCode", e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Version Pill</label>
                <input
                  type="text"
                  value={data.version}
                  onChange={(e) => updateField("version", e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Project Name (Judul)</label>
              <input
                type="text"
                value={data.projectName}
                onChange={(e) => updateField("projectName", e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Location (Lokasi)</label>
              <input
                type="text"
                value={data.projectLocation}
                onChange={(e) => updateField("projectLocation", e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700"
              />
            </div>
          </div>
        )}

        {/* 2. PURPOSE OF KICKOFF */}
        {activeSection === "purpose" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-02 Purpose of Kickoff Items</h4>
              <button
                onClick={() => {
                  const newItem = {
                    id: `p-${Date.now()}`,
                    en: "New purpose item",
                    idText: "Tujuan baru",
                  };
                  updateField("purposeList", [...data.purposeList, newItem]);
                }}
                className="text-xs font-bold text-brand-red flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Item Baru
              </button>
            </div>

            {data.purposeList.map((item, idx) => (
              <div key={item.id} className="p-3.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400">Poin #{idx + 1}</span>
                  <button
                    onClick={() => updateField("purposeList", data.purposeList.filter((p) => p.id !== item.id))}
                    className="text-neutral-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={item.en}
                  placeholder="English text..."
                  onChange={(e) => {
                    const updated = [...data.purposeList];
                    updated[idx].en = e.target.value;
                    updateField("purposeList", updated);
                  }}
                  className="w-full text-xs font-bold p-2 bg-white dark:bg-neutral-900 border rounded-lg"
                />
                <input
                  type="text"
                  value={item.idText}
                  placeholder="Bahasa Indonesia..."
                  onChange={(e) => {
                    const updated = [...data.purposeList];
                    updated[idx].idText = e.target.value;
                    updateField("purposeList", updated);
                  }}
                  className="w-full text-xs italic p-2 bg-white dark:bg-neutral-900 border rounded-lg text-neutral-600"
                />
              </div>
            ))}
          </div>
        )}

        {/* 3. PROJECT UNDERSTANDING */}
        {activeSection === "understanding" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-03 Project Understanding Narrative</h4>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Pengantar Narasi (English)</label>
              <textarea
                value={data.understandingIntroEn}
                onChange={(e) => updateField("understandingIntroEn", e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Pengantar Narasi (Bahasa Indonesia)</label>
              <textarea
                value={data.understandingIntroId}
                onChange={(e) => updateField("understandingIntroId", e.target.value)}
                rows={3}
                className="w-full text-xs italic p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600"
              />
            </div>

            <div className="pt-2 space-y-3">
              <h5 className="text-xs font-extrabold text-neutral-900 dark:text-white">3 Red Bar Highlight Cards</h5>
              {data.understandingCards.map((card, idx) => (
                <div key={card.id} className="p-3 bg-red-50/50 dark:bg-neutral-800 rounded-xl border border-red-100 dark:border-neutral-700 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={card.titleEn}
                      onChange={(e) => {
                        const updated = [...data.understandingCards];
                        updated[idx].titleEn = e.target.value;
                        updateField("understandingCards", updated);
                      }}
                      className="text-xs font-bold p-1.5 bg-white dark:bg-neutral-900 border rounded"
                    />
                    <input
                      type="text"
                      value={card.titleId}
                      onChange={(e) => {
                        const updated = [...data.understandingCards];
                        updated[idx].titleId = e.target.value;
                        updateField("understandingCards", updated);
                      }}
                      className="text-xs italic p-1.5 bg-white dark:bg-neutral-900 border rounded text-neutral-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={card.descEn}
                    onChange={(e) => {
                      const updated = [...data.understandingCards];
                      updated[idx].descEn = e.target.value;
                      updateField("understandingCards", updated);
                    }}
                    className="w-full text-xs font-medium p-1.5 bg-white dark:bg-neutral-900 border rounded"
                  />
                  <input
                    type="text"
                    value={card.descId}
                    onChange={(e) => {
                      const updated = [...data.understandingCards];
                      updated[idx].descId = e.target.value;
                      updateField("understandingCards", updated);
                    }}
                    className="w-full text-xs italic p-1.5 bg-white dark:bg-neutral-900 border rounded text-neutral-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. GOALS */}
        {activeSection === "goals" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-04 Specific Project Goals</h4>

            {data.goalsList.map((item, idx) => (
              <div key={item.id} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                <span className="text-xs font-bold text-neutral-400">Goal #{idx + 1}</span>
                <input
                  type="text"
                  value={item.en}
                  onChange={(e) => {
                    const updated = [...data.goalsList];
                    updated[idx].en = e.target.value;
                    updateField("goalsList", updated);
                  }}
                  className="w-full text-xs font-bold p-2 bg-white dark:bg-neutral-900 border rounded-lg"
                />
                <input
                  type="text"
                  value={item.idText}
                  onChange={(e) => {
                    const updated = [...data.goalsList];
                    updated[idx].idText = e.target.value;
                    updateField("goalsList", updated);
                  }}
                  className="w-full text-xs italic p-2 bg-white dark:bg-neutral-900 border rounded-lg text-neutral-600"
                />
              </div>
            ))}
          </div>
        )}

        {/* 5. SCOPE OF WORK (CHECKLISTS) */}
        {activeSection === "scope" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-05 Scope Checklist by Category</h4>

            {data.scopeCategories.map((cat, cIdx) => (
              <div key={cat.id} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => {
                    const updated = [...data.scopeCategories];
                    updated[cIdx].name = e.target.value;
                    updateField("scopeCategories", updated);
                  }}
                  className="text-xs font-extrabold text-brand-red bg-white dark:bg-neutral-900 p-2 rounded-lg border uppercase tracking-wider w-full"
                />

                <div className="space-y-2">
                  {cat.items.map((item, iIdx) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-black/[0.04]">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => {
                          const updated = [...data.scopeCategories];
                          updated[cIdx].items[iIdx].checked = e.target.checked;
                          updateField("scopeCategories", updated);
                        }}
                        className="w-4 h-4 rounded text-brand-red cursor-pointer"
                      />
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.titleEn}
                          onChange={(e) => {
                            const updated = [...data.scopeCategories];
                            updated[cIdx].items[iIdx].titleEn = e.target.value;
                            updateField("scopeCategories", updated);
                          }}
                          className="text-xs font-bold p-1 border rounded"
                        />
                        <input
                          type="text"
                          value={item.titleId}
                          onChange={(e) => {
                            const updated = [...data.scopeCategories];
                            updated[cIdx].items[iIdx].titleId = e.target.value;
                            updateField("scopeCategories", updated);
                          }}
                          className="text-xs italic p-1 border rounded text-neutral-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. WORKFLOW & SCHEDULE */}
        {activeSection === "workflow" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-06 Workflow Stages & Durations</h4>

            {data.workflowSteps.map((step, idx) => (
              <div key={step.id} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={step.stageName}
                    onChange={(e) => {
                      const updated = [...data.workflowSteps];
                      updated[idx].stageName = e.target.value;
                      updateField("workflowSteps", updated);
                    }}
                    className="text-xs font-extrabold p-2 bg-white dark:bg-neutral-900 border rounded-lg"
                  />
                  <input
                    type="text"
                    value={step.duration}
                    onChange={(e) => {
                      const updated = [...data.workflowSteps];
                      updated[idx].duration = e.target.value;
                      updateField("workflowSteps", updated);
                    }}
                    className="text-xs font-semibold p-2 bg-white dark:bg-neutral-900 border rounded-lg text-neutral-600"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 7. REQUIRED INPUTS */}
        {activeSection === "inputs" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-07 Required Client Data</h4>

            {data.requiredInputs.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => {
                    const updated = [...data.requiredInputs];
                    updated[idx].checked = e.target.checked;
                    updateField("requiredInputs", updated);
                  }}
                  className="w-4 h-4 rounded text-brand-red cursor-pointer"
                />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={item.titleEn}
                    onChange={(e) => {
                      const updated = [...data.requiredInputs];
                      updated[idx].titleEn = e.target.value;
                      updateField("requiredInputs", updated);
                    }}
                    className="text-xs font-bold p-1 border rounded bg-white dark:bg-neutral-900"
                  />
                  <input
                    type="text"
                    value={item.titleId}
                    onChange={(e) => {
                      const updated = [...data.requiredInputs];
                      updated[idx].titleId = e.target.value;
                      updateField("requiredInputs", updated);
                    }}
                    className="text-xs italic p-1 border rounded bg-white dark:bg-neutral-900 text-neutral-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 8. ROLES & COMMUNICATION */}
        {activeSection === "roles" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-08 Communication & Roles</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Communication Tools</label>
                <input
                  type="text"
                  value={data.communicationTools}
                  onChange={(e) => updateField("communicationTools", e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Meeting Frequency</label>
                <input
                  type="text"
                  value={data.meetingFrequency}
                  onChange={(e) => updateField("meetingFrequency", e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* 9. NEXT STEPS */}
        {activeSection === "nextSteps" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-09 Action Plan / Next Steps</h4>

            {data.nextSteps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-3 p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200">
                <input
                  type="checkbox"
                  checked={step.checked}
                  onChange={(e) => {
                    const updated = [...data.nextSteps];
                    updated[idx].checked = e.target.checked;
                    updateField("nextSteps", updated);
                  }}
                  className="w-4 h-4 rounded text-brand-red cursor-pointer"
                />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={step.titleEn}
                    onChange={(e) => {
                      const updated = [...data.nextSteps];
                      updated[idx].titleEn = e.target.value;
                      updateField("nextSteps", updated);
                    }}
                    className="text-xs font-bold p-1 border rounded bg-white dark:bg-neutral-900"
                  />
                  <input
                    type="text"
                    value={step.titleId}
                    onChange={(e) => {
                      const updated = [...data.nextSteps];
                      updated[idx].titleId = e.target.value;
                      updateField("nextSteps", updated);
                    }}
                    className="text-xs italic p-1 border rounded bg-white dark:bg-neutral-900 text-neutral-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 10. APPROVAL & SIGNATURES */}
        {activeSection === "approval" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">01-10 Signatures & Approval Setup</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Adidaya Signee Name</label>
                <input
                  type="text"
                  value={data.studioSigneeName}
                  onChange={(e) => updateField("studioSigneeName", e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Client Signee Name</label>
                <input
                  type="text"
                  value={data.clientSigneeName}
                  onChange={(e) => updateField("clientSigneeName", e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Sign Date</label>
              <input
                type="date"
                value={data.signDate}
                onChange={(e) => updateField("signDate", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
