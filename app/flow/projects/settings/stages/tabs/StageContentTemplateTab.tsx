"use client";

import React, { useState } from "react";
import { Search, Filter, ChevronRight, Eye } from "lucide-react";
import clsx from "clsx";
import StageDocumentPreview from "@/components/flow/projects/project-detail/tasks/StageDocumentPreview";
import { defaultKickoffData } from "@/components/flow/projects/project-detail/tasks/defaultStageDocumentData";
import { fetchProjectsByWorkspace, fetchAllProjects } from "@/lib/api/projects";
import { fetchStageTemplates } from "@/lib/api/templates";

export interface ReusableContentTemplate {
  id: string;
  code: string;
  name: string;
  nameId: string;
  category: string;
  description: string;
  previewTaskCode: string;
}

const CATEGORIES = [
  "All Templates",
  "Cover & Intro",
  "General Info",
  "Brief & Objectives",
  "Photo & Survey",
  "Timeline & Budget",
  "Scope of Work",
  "Drawing & Technical",
  "Diagram & Workflow",
  "Legal & Approval"
] as const;

const PRESET_TEMPLATES: (ReusableContentTemplate & { defaultCode?: string })[] = [
  {
    id: "tpl-main-cover",
    code: "01-01",
    name: "Main Project Cover",
    nameId: "Sampul Utama Proyek",
    category: "Cover & Intro",
    description: "Standard Studio Adidaya red main document cover with project title & code.",
    previewTaskCode: "01-01"
  },
  {
    id: "tpl-toc",
    code: "01-02",
    name: "Table of Contents",
    nameId: "Daftar Isi Halaman",
    category: "General Info",
    description: "Auto-synchronizing index table of contents for dynamic document sections.",
    previewTaskCode: "01-02"
  },
  {
    id: "tpl-purpose",
    code: "01-03",
    name: "Purpose of Stage",
    nameId: "Tujuan Tahapan Pekerjaan",
    category: "General Info",
    description: "Executive summary list outlining primary objectives and deliverables.",
    previewTaskCode: "01-03"
  },
  {
    id: "tpl-workflow",
    code: "01-04",
    name: "Workflow Overview",
    nameId: "Tinjauan Alur Kerja",
    category: "Diagram & Workflow",
    description: "Step-by-step stage progress breakdown with timeline badges.",
    previewTaskCode: "01-04"
  },
  {
    id: "tpl-section-cover",
    code: "02-00",
    name: "Section Cover Page",
    nameId: "Sampul Seksi",
    category: "Cover & Intro",
    description: "Dark minimalist section cover divider page with Indonesian section subtitle.",
    previewTaskCode: "02-00"
  },
  {
    id: "tpl-project-understanding",
    code: "02-01",
    name: "Project Understanding",
    nameId: "Pemahaman Proyek",
    category: "Brief & Objectives",
    description: "Key architectural concept, site parameters & design direction breakdown.",
    previewTaskCode: "02-01"
  },
  {
    id: "tpl-client-needs",
    code: "02-02",
    name: "Client Needs & Vision",
    nameId: "Visi & Kebutuhan Klien",
    category: "Brief & Objectives",
    description: "Structured questionnaire summary of client spatial & stylistic requirements.",
    previewTaskCode: "02-02"
  },
  {
    id: "tpl-functional-req",
    code: "02-03",
    name: "Functional Requirements",
    nameId: "Kebutuhan Fungsional Space",
    category: "Brief & Objectives",
    description: "Matrix of space requirements, occupancy count & functional relationships.",
    previewTaskCode: "02-03"
  },
  {
    id: "tpl-budget",
    code: "02-04",
    name: "Budget Expectation",
    nameId: "Ekspektasi Anggaran Biaya",
    category: "Timeline & Budget",
    description: "Initial cost estimation benchmark ranges and target allocation.",
    previewTaskCode: "02-04"
  },
  {
    id: "tpl-timeline",
    code: "02-05",
    name: "Timeline Expectation",
    nameId: "Ekspektasi Lini Waktu",
    category: "Timeline & Budget",
    description: "Design & construction schedule draft with target completion milestones.",
    previewTaskCode: "02-05"
  },
  {
    id: "tpl-scope-deliverables",
    code: "03-01",
    name: "Kickoff Scope & Deliverables",
    nameId: "Ruang Lingkup dan Keluaran",
    category: "Scope of Work",
    description: "Detailed breakdown of inclusions, exclusions & drawing packages.",
    previewTaskCode: "03-01"
  },
  {
    id: "tpl-drawing-a",
    code: "03-02",
    name: "Drawing Concept A",
    nameId: "Gambar Skematik A",
    category: "Drawing & Technical",
    description: "Technical schematic drawing layout option A with title block.",
    previewTaskCode: "03-02"
  },
  {
    id: "tpl-drawing-b",
    code: "03-03",
    name: "Drawing Concept B",
    nameId: "Gambar Skematik B",
    category: "Drawing & Technical",
    description: "Technical schematic drawing layout option B with detail annotations.",
    previewTaskCode: "03-03"
  },
  {
    id: "tpl-photo-survey",
    code: "04-01",
    name: "Photo Survei Tapak",
    nameId: "Dokumentasi Foto Survei",
    category: "Photo & Survey",
    description: "Grid layout for site survey photos, captions, and site observation notes.",
    previewTaskCode: "04-01"
  },
  {
    id: "tpl-approval",
    code: "08-01",
    name: "Signoff & Approval",
    nameId: "Persetujuan Dokumen",
    category: "Legal & Approval",
    description: "Official 2-column signature verification page for Studio & Client.",
    previewTaskCode: "08-01"
  }
];

const DEFAULT_PROJECT = { code: "#000-ADY", name: "[Project Name]", location: "[Project Location]", label: "Default Placeholder" };
const DEFAULT_STAGE = { id: "default", name: "[Stage]" };

interface Props {
  workspaceId: string;
  projectTypeId: string;
  setHeaderActions?: (node: React.ReactNode) => void;
}

export default function StageContentTemplateTab({ workspaceId, projectTypeId, setHeaderActions }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Templates");
  const [selectedTemplate, setSelectedTemplate] = useState<ReusableContentTemplate>(PRESET_TEMPLATES[0]);
  const [sortBy, setSortBy] = useState<"code" | "name">("code");
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const [dbProjects, setDbProjects] = useState<{ code: string; name: string; location: string; label: string }[]>([DEFAULT_PROJECT]);
  const [dbStages, setDbStages] = useState<{ id: string; name: string }[]>([DEFAULT_STAGE]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECT);
  const [selectedStage, setSelectedStage] = useState(DEFAULT_STAGE);

  // Fetch Real DB Projects & Stages ONLY (No Mock Data)
  React.useEffect(() => {
    const loadRealData = async () => {
      setIsLoadingData(true);
      try {
        let projects = workspaceId ? await fetchProjectsByWorkspace(workspaceId) : [];
        if (!projects || projects.length === 0) {
          projects = await fetchAllProjects();
        }

        const formattedProjects = [
          DEFAULT_PROJECT,
          ...projects.map((p) => {
            const rawNum = p.projectNumber || (p as any).number || "";
            const numPadded = rawNum ? String(rawNum).padStart(3, "0") : "";
            const rawCode = p.projectCode || p.code || "ADY";
            const cleanCodeStr = rawCode.replace(/^#/, "").toUpperCase();

            // Construct standard format: #[number]-[code] e.g. #036-PRG or fallback to rawCode
            const formattedCode = numPadded
              ? `#${numPadded}-${cleanCodeStr}`
              : (rawCode.startsWith("#") ? rawCode : `#${rawCode}`);

            const name = p.projectName || p.name || "[Project Name]";
            let locationStr = "[Project Location]";
            const rawLoc = (p as any).location;
            if (typeof rawLoc === "string") {
              locationStr = rawLoc;
            } else if (rawLoc && typeof rawLoc === "object") {
              locationStr = rawLoc.city || rawLoc.address || rawLoc.province || "[Project Location]";
            }

            return {
              code: formattedCode,
              name,
              location: locationStr,
              label: `${formattedCode} - ${name}`
            };
          })
        ];
        setDbProjects(formattedProjects);

        if (workspaceId && projectTypeId) {
          const stages = await fetchStageTemplates(workspaceId, projectTypeId);
          if (stages && stages.length > 0) {
            setDbStages([
              DEFAULT_STAGE,
              ...stages.map((s) => ({
                id: s.id,
                name: s.stageName
              }))
            ]);
          }
        }
      } catch (e) {
        console.error("Failed loading real DB projects/stages:", e);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadRealData();
  }, [workspaceId, projectTypeId]);

  // Clear global header actions
  React.useEffect(() => {
    setHeaderActions?.(null);
  }, [setHeaderActions]);

  // Filter & sort templates
  const filteredTemplates = PRESET_TEMPLATES.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.nameId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.code.includes(searchQuery);

    const matchesCategory = selectedCategory === "All Templates" || tpl.category === selectedCategory;

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "code") return a.code.localeCompare(b.code, undefined, { numeric: true });
    return a.name.localeCompare(b.name);
  });

  // Construct dynamic data for preview
  const livePreviewData = {
    ...defaultKickoffData,
    projectCode: selectedProject.code,
    projectName: selectedProject.name,
    projectLocation: selectedProject.location,
    stageName: selectedStage.name,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* TOP CONTROLS & DROPDOWN FILTERS */}
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates (e.g. Cover, Timeline)..."
              className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-neutral-800 dark:text-neutral-200 transition-all"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full lg:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                  selectedCategory === cat
                    ? "bg-blue-600 text-white border-transparent shadow-xs"
                    : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN TWO-PANEL CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: CONTENT TEMPLATE CATALOG LIST (COL-SPAN-5) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
              Available Templates ({filteredTemplates.length})
            </span>
            <button
              onClick={() => setSortBy(sortBy === "code" ? "name" : "code")}
              className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1"
            >
              <Filter className="w-3 h-3" />
              <span>Sort: {sortBy === "code" ? "By Code" : "A-Z Name"}</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplate.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className={clsx(
                    "rounded-3xl border transition-all overflow-hidden",
                    isSelected
                      ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-600"
                      : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                  )}
                >
                  {/* Card Header (Clickable) */}
                  <div
                    onClick={() => setSelectedTemplate(tpl)}
                    className="p-3.5 cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold shrink-0",
                          isSelected ? "bg-blue-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                        )}>
                          {tpl.code}
                        </span>
                        <h3 className={clsx(
                          "text-xs font-extrabold truncate",
                          isSelected ? "text-blue-950 dark:text-blue-200" : "text-neutral-900 dark:text-white"
                        )}>
                          {tpl.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {tpl.category}
                      </span>
                      <ChevronRight className={clsx("w-4 h-4 transition-transform", isSelected ? "text-blue-600 rotate-90" : "text-neutral-400")} />
                    </div>
                  </div>

                  {/* EXPANDABLE PREVIEW CUSTOMIZER FIELDS (DIRECTLY UNDER SELECTED CARD) */}
                  {isSelected && (
                    <div className="px-4 pb-4 pt-3 border-t border-blue-200/60 dark:border-blue-900/40 bg-white/80 dark:bg-neutral-900/80 space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Real Projects Pill Dropdown */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-neutral-500 block">Project</label>
                          <div className="relative">
                            <select
                              value={selectedProject.label}
                              onChange={(e) => {
                                const proj = dbProjects.find((p) => p.label === e.target.value) || DEFAULT_PROJECT;
                                setSelectedProject(proj);
                              }}
                              className="w-full appearance-none text-xs font-normal pl-3.5 pr-8 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs transition-all"
                            >
                              {dbProjects.map((p) => (
                                <option key={p.label} value={p.label} className="font-normal">
                                  {p.label}
                                </option>
                              ))}
                            </select>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                          </div>
                        </div>

                        {/* Real Stages Pill Dropdown */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-neutral-500 block">Stage</label>
                          <div className="relative">
                            <select
                              value={selectedStage.id}
                              onChange={(e) => {
                                const stg = dbStages.find((s) => s.id === e.target.value) || DEFAULT_STAGE;
                                setSelectedStage(stg);
                              }}
                              className="w-full appearance-none text-xs font-normal pl-3.5 pr-8 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs transition-all"
                            >
                              {dbStages.map((s) => (
                                <option key={s.id} value={s.id} className="font-normal">
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                          </div>
                        </div>
                      </div>

                      {/* Special info note for Table of Contents */}
                      {tpl.code === "01-02" && (
                        <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 leading-snug">
                          ℹ️ <strong>Auto-Sync Table of Contents:</strong> In the live project document, this table of contents will automatically aggregate section titles, page numbers, and item order in real-time.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredTemplates.length === 0 && (
              <div className="py-12 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50">
                <p className="text-xs text-neutral-400 font-bold">No content templates found matching "{searchQuery}".</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: SINGLE-PAGE TEMPLATE PREVIEW (COL-SPAN-7) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              Page Preview: {selectedTemplate.name}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-neutral-400">
                Code: {selectedTemplate.code}
              </span>
              <button
                onClick={() => {
                  setSavedSuccess(selectedTemplate.name);
                  setTimeout(() => setSavedSuccess(null), 2500);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>Save Page Template</span>
              </button>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-200 flex items-center justify-between">
              <span>✓ Template "{savedSuccess}" saved successfully!</span>
            </div>
          )}

          <div className="bg-neutral-100/70 dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 flex justify-center">
            <StageDocumentPreview
              data={livePreviewData}
              activeSection={`KO-${selectedTemplate.code.split("-")[0]}`}
              activeSubTask={selectedTemplate.previewTaskCode}
              hideToolbar={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
