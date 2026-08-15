"use client";

import React, { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { useProject } from "@/components/flow/project-context";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";
import KickoffFormEditor from "@/components/flow/projects/project-detail/tasks/KickoffFormEditor";
import KickoffDocumentPreview from "@/components/flow/projects/project-detail/tasks/KickoffDocumentPreview";
import { defaultKickoffData } from "@/components/flow/projects/project-detail/tasks/defaultKickoffData";
import { KickoffDocumentData } from "@/components/flow/projects/project-detail/tasks/types";
import { KO_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data";
import { updateProject } from "@/lib/api/projects";
import {
  ArrowLeft,
  Download,
  Save,
  Check,
  SlidersHorizontal,
  Eye,
  FileText,
  Target,
  BookOpen,
  Sparkles,
  CheckSquare,
  Layers,
  Calendar,
  Users,
} from "lucide-react";
import clsx from "clsx";

function TasksEditorPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = (params?.projectId || params?.id) as string;
  const stage = searchParams.get("stage") || "01-KO";

  const { project, isLoading, error } = useProject();
  const [activeSection, setActiveSection] = React.useState<string>("KO-01");
  const [activeSubTask, setActiveSubTask] = React.useState<string>("01-01");
  const [mobileTab, setMobileTab] = React.useState<"editor" | "preview">("editor");
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [saveToast, setSaveToast] = React.useState<boolean>(false);

  const projectForHeader = project ? mapProjectToHeader(project) : null;

  // State for Kickoff report data with localStorage persistence
  const [kickoffData, setKickoffData] = React.useState<KickoffDocumentData>(() => {
    if (typeof window !== "undefined" && projectId) {
      const saved = localStorage.getItem(`kickoff_data_${projectId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved kickoff data", e);
        }
      }
    }
    const num = projectForHeader?.projectNo || (project as any)?.project_number || "898";
    const code = projectForHeader?.code || project?.project_code || "TED";
    const formattedCode = `#${num}-${code}`;
    return {
      ...defaultKickoffData,
      projectName: project?.project_name || defaultKickoffData.projectName,
      projectCode: formattedCode,
      projectLocation: (project?.meta as any)?.location || (project?.location as any)?.city || defaultKickoffData.projectLocation,
    };
  });

  // Load saved kickoff data from Supabase project meta or localStorage
  const isLoadedRef = React.useRef(false);

  React.useEffect(() => {
    if (project && !isLoadedRef.current) {
      isLoadedRef.current = true;
      const metaKickoff = (project.meta as any)?.kickoff_document_data;
      let loadedData = metaKickoff;

      if (!loadedData && typeof window !== "undefined" && projectId) {
        const savedLocal = localStorage.getItem(`kickoff_data_${projectId}`);
        if (savedLocal) {
          try {
            loadedData = JSON.parse(savedLocal);
          } catch (e) {
            console.error(e);
          }
        }
      }

      const headerObj = mapProjectToHeader(project);
      const num = headerObj.projectNo || (project as any).project_number || "898";
      const code = headerObj.code || project.project_code || "TED";
      const formattedCode = `#${num}-${code}`;

      if (loadedData) {
        // Sanitize & migrate scopeCategories & workflowSteps durations if old structure is present
        const hasOldCategories = loadedData.scopeCategories?.some(
          (c: any) => c.name === "STRUCTURE AND MEP SYSTEMS" || c.name === "PROCUREMENT AND CONSTRUCTION"
        );
        const finalCategories = hasOldCategories ? defaultKickoffData.scopeCategories : (loadedData.scopeCategories || defaultKickoffData.scopeCategories);

        const cleanWorkflowSteps = (loadedData.workflowSteps || defaultKickoffData.workflowSteps).map((step: any, idx: number) => {
          let dur = step.duration || "";
          if (dur.includes("w |") || dur.includes("mg")) {
            const numMatch = dur.match(/^([0-9\-]+)/);
            const num = numMatch ? numMatch[1] : "1";
            dur = `${num} week${num !== "1" ? "s" : ""}`;
          } else if (dur.includes("m |") || dur.includes("bln")) {
            const numMatch = dur.match(/^([0-9\-]+)/);
            const num = numMatch ? numMatch[1] : "1";
            dur = `${num} month${num !== "1" ? "s" : ""}`;
          }
          return { ...step, duration: dur };
        });

        setKickoffData({
          ...loadedData,
          scopeCategories: finalCategories,
          workflowSteps: cleanWorkflowSteps,
          projectName: project.project_name || loadedData.projectName,
          projectCode: formattedCode,
        });
      } else {
        setKickoffData((prev) => ({
          ...prev,
          projectName: project.project_name || prev.projectName,
          projectCode: formattedCode,
          projectLocation: (project.meta as any)?.location || (project.location as any)?.city || prev.projectLocation,
        }));
      }
    }
  }, [project, projectId]);

  // Save Kickoff Data to Supabase database (and local backup)
  const handleSaveData = async () => {
    try {
      setIsSaving(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(`kickoff_data_${projectId}`, JSON.stringify(kickoffData));
      }

      // Persist to Supabase Database (projects.meta.kickoff_document_data)
      if (project?.id) {
        const existingMeta = (project.meta as Record<string, any>) || {};
        const updatedMeta = {
          ...existingMeta,
          kickoff_document_data: kickoffData,
        };
        await updateProject(project.id, { meta: updatedMeta });
      }

      setIsSaving(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (err) {
      setIsSaving(false);
      console.error("Save error:", err);
    }
  };

  if (isLoading) {
    return <GlobalLoading />;
  }

  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">
        {error || "Project not found."}
      </div>
    );
  }

  const breadcrumbLabel = `${project.project_number || (project as any).projectNo || '898'} - ${project.project_code} - ${project.project_name}`;

  const kickoffSections = KO_SECTIONS.map((sec, idx) => ({
    id: sec.code,
    code: String(idx + 1).padStart(2, "0"),
    label: `${String(idx + 1).padStart(2, "0")} ${sec.title}`,
  }));

  return (
    <StandardPageWrapper
      breadcrumbItems={[
        { label: "Flow" },
        { label: "Projects", href: "/flow/projects" },
        { label: breadcrumbLabel, href: `/flow/projects/${projectId}/tasks` },
        { label: "Tasks & Deliverables", href: `/flow/projects/${projectId}/tasks` },
        { label: `Editor Stage ${stage}` },
      ]}
      sidebar={<ProjectDetailSidebar />}
      isTransparent
    >
      <div className="space-y-6 max-w-4xl mx-auto px-4 lg:px-0 animate-in fade-in duration-500 pb-12">
        <ProjectDetailHeader project={projectForHeader as any} />

        <div className="space-y-4">
          {/* BARIS 1: TANPA BOX (BACK ICON + BADGE PILL STAGE TITLE, RIGHT GRAY ICON EXPORT BUTTON) */}
          <div className="flex items-center justify-between gap-4 py-1 px-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/flow/projects/${projectId}/tasks`)}
                className="p-2.5 rounded-xl bg-white/70 dark:bg-neutral-900/60 backdrop-blur-2xl text-neutral-800 dark:text-neutral-200 hover:bg-white border border-white/60 dark:border-white/10 transition-all shrink-0 shadow-2xs"
                title="Kembali ke Tasks & Deliverables"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-black font-mono shadow-2xs">
                  {stage}
                </span>
                <h3 className="text-base font-black text-neutral-900 dark:text-white tracking-tight">
                  Kickoff
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const previewElement = document.querySelector(".printable-document");
                    if (!previewElement) {
                      alert("Document preview element not found");
                      return;
                    }

                    // Clone element and remove non-printable labels like HALAMAN 1, HALAMAN 2
                    const clone = previewElement.cloneNode(true) as HTMLElement;
                    clone.querySelectorAll(".no-print").forEach((el) => el.remove());

                    const htmlContent = `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                            body { font-family: 'Inter', sans-serif; background: #ffffff; color: #111827; margin: 0; padding: 0; }
                            .text-brand-red { color: #D91011 !important; }
                            .bg-brand-red { background-color: #D91011 !important; }
                            .border-brand-red { border-color: #D91011 !important; }
                            .no-print { display: none !important; }
                          </style>
                        </head>
                        <body class="p-0">
                          ${clone.outerHTML}
                        </body>
                      </html>
                    `;

                    const res = await fetch("/api/flow/reports/export-pdf", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ html: htmlContent }),
                    });

                    if (!res.ok) {
                      window.print();
                      return;
                    }

                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Kickoff_Report_${kickoffData.projectCode.replace("#", "")}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error("Puppeteer PDF Export error:", err);
                    window.print();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-neutral-900/60 backdrop-blur-2xl text-neutral-800 dark:text-neutral-200 hover:bg-white border border-white/60 dark:border-white/10 font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-2xs"
                title="Export / Cetak Document PDF"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              {/* SAVE BUTTON (PLACED TO THE RIGHT OF EXPORT BUTTON) */}
              <button
                onClick={handleSaveData}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                title="Save Kickoff Data to Database"
              >
                {saveToast ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className={`w-4 h-4 ${isSaving ? "animate-spin" : ""}`} />
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                  </>
                )}
              </button>

              {/* MOBILE VIEW TOGGLE */}
              <div className="lg:hidden flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full text-xs">
                <button
                  onClick={() => setMobileTab("editor")}
                  className={clsx(
                    "px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1",
                    mobileTab === "editor" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
                <button
                  onClick={() => setMobileTab("preview")}
                  className={clsx(
                    "px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1",
                    mobileTab === "preview" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          </div>

          {/* BARIS 2: DENGAN BOX GLASSY (LEVEL-2 SECTIONS PILLS) */}
          {stage === "01-KO" && (
            <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-2xl p-2 rounded-2xl border border-white/60 dark:border-white/10 shadow-2xs overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 min-w-max">
                {kickoffSections.map((sec) => {
                  const isActive = activeSection === sec.id || activeSection === `KO-${sec.id}`;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveSection(sec.id);
                        setActiveSubTask(`${sec.id.replace('KO-', '')}-01`);
                      }}
                      className={clsx(
                        "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0",
                        isActive
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-white"
                      )}
                    >
                      <span className="font-mono text-[11px] opacity-75">{sec.code}</span>
                      <span>{sec.label.replace(/^[0-9]{2}\s*/, "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SPLIT SCREEN EDITOR & REPORT PREVIEW FOR SELECTED STAGE */}
          {stage === "01-KO" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-12">
              {/* LEFT PANEL: FORM EDITOR (COL-SPAN-5) */}
              <div className={clsx("lg:col-span-5", mobileTab === "preview" && "hidden lg:block")}>
                <KickoffFormEditor
                  data={kickoffData}
                  onChange={setKickoffData}
                  activeSection={activeSection}
                  onSectionChange={setActiveSection}
                  onActiveTaskChange={setActiveSubTask}
                />
              </div>

              {/* RIGHT PANEL: LIVE REPORT PREVIEW (COL-SPAN-7) */}
              <div className={clsx("lg:col-span-7", mobileTab === "editor" && "hidden lg:block")}>
                <KickoffDocumentPreview
                  data={kickoffData}
                  activeSection={activeSection}
                  activeSubTask={activeSubTask}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl p-12 rounded-2xl border border-white/40 dark:border-white/10 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                <FileText className="w-7 h-7 text-brand-red" />
              </div>
              <h4 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                Form Editor Stage {stage} dalam Pengembangan
              </h4>
              <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                Template editor untuk stage ini akan menyesuaikan dengan format deliverable standar Adidaya Studio berikutnya. Silakan buka stage <strong>01-KO Kickoff</strong> untuk mencoba Form Editor & Live Report Preview 12 Halaman.
              </p>
              <button
                onClick={() => router.push(`/flow/projects/${projectId}/tasks/editor?stage=01-KO`)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-xs"
              >
                Buka Editor 01-KO Kickoff
              </button>
            </div>
          )}
        </div>
      </div>
    </StandardPageWrapper>
  );
}

export default function ProjectTasksEditorPage() {
  return (
    <Suspense fallback={<GlobalLoading />}>
      <TasksEditorPageInner />
    </Suspense>
  );
}
