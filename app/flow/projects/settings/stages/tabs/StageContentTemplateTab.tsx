"use client";

import React, { useState } from "react";
import { Search, Filter, ChevronRight, ChevronLeft, Eye } from "lucide-react";
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
  "General Information",
  "Client Brief and Objectives",
  "Scope of Work",
  "Drawings, Diagram, and Image",
  "Budget",
  "Timeline",
  "Misc",
  "Approval"
] as const;

const PRESET_TEMPLATES: (ReusableContentTemplate & { defaultCode?: string })[] = [
  // --- KOP V2 BLANK CANVAS TEMPLATES (00-00-v2-P & 00-00-v2-L) ---
  {
    id: "tpl-kop-v2-p",
    code: "00-00-v2-P",
    name: "Drawing Title Block Kop v2 (Portrait)",
    nameId: "Kop Gambar Arsitektur v2 (Portrait)",
    category: "General Information",
    description: "Portrait blank canvas layout with full architectural drawing Kop Title Block sidebar frame.",
    previewTaskCode: "00-00-v2-P"
  },
  {
    id: "tpl-kop-v2-l",
    code: "00-00-v2-L",
    name: "Drawing Title Block Kop v2 (Landscape)",
    nameId: "Kop Gambar Arsitektur v2 (Landscape)",
    category: "General Information",
    description: "Landscape wide format blank canvas with right-side Kop Title Block sidebar frame.",
    previewTaskCode: "00-00-v2-L"
  },
  // --- SECTION 01 GENERAL INFORMATION PORTRAIT TEMPLATES (01-00-P to 01-04-P) ---
  {
    id: "tpl-main-cover-p",
    code: "01-00-P",
    name: "Main Project Cover (Portrait)",
    nameId: "Sampul Utama Proyek (Portrait)",
    category: "General Information",
    description: "Standard Studio Adidaya red main document cover with project title & code.",
    previewTaskCode: "01-00"
  },
  {
    id: "tpl-section-cover-p",
    code: "01-01-P",
    name: "Section Cover Page (Portrait)",
    nameId: "Sampul Seksi (Portrait)",
    category: "General Information",
    description: "Dark minimalist section cover divider page with Indonesian section subtitle.",
    previewTaskCode: "01-01"
  },
  {
    id: "tpl-toc-p",
    code: "01-02-P",
    name: "Table of Contents (Portrait)",
    nameId: "Daftar Isi Halaman (Portrait)",
    category: "General Information",
    description: "Auto-synchronizing index table of contents for dynamic document sections.",
    previewTaskCode: "01-02"
  },
  {
    id: "tpl-purpose-p",
    code: "01-03-P",
    name: "Purpose of Stage (Portrait)",
    nameId: "Tujuan Tahapan Pekerjaan (Portrait)",
    category: "General Information",
    description: "Executive summary list outlining primary objectives and deliverables.",
    previewTaskCode: "01-03"
  },
  {
    id: "tpl-workflow-p",
    code: "01-04-P",
    name: "Workflow Overview (Portrait)",
    nameId: "Tinjauan Alur Kerja (Portrait)",
    category: "General Information",
    description: "Step-by-step stage progress breakdown with timeline badges.",
    previewTaskCode: "01-04"
  },

  // --- SECTION 01 GENERAL INFORMATION LANDSCAPE TEMPLATES (01-00-L to 01-04-L) ---
  {
    id: "tpl-main-cover-l",
    code: "01-00-L",
    name: "Main Project Cover (Landscape)",
    nameId: "Sampul Utama Proyek (Landscape)",
    category: "General Information",
    description: "Standard Studio Adidaya red main document cover in landscape orientation.",
    previewTaskCode: "01-00"
  },
  {
    id: "tpl-section-cover-l",
    code: "01-01-L",
    name: "Section Cover Page (Landscape)",
    nameId: "Sampul Seksi (Landscape)",
    category: "General Information",
    description: "Dark minimalist section cover divider page in landscape orientation.",
    previewTaskCode: "01-01"
  },
  {
    id: "tpl-toc-l",
    code: "01-02-L",
    name: "Table of Contents (Landscape)",
    nameId: "Daftar Isi Halaman (Landscape)",
    category: "General Information",
    description: "Auto-synchronizing 2-column index table of contents in landscape orientation.",
    previewTaskCode: "01-02"
  },
  {
    id: "tpl-purpose-l",
    code: "01-03-L",
    name: "Purpose of Stage (Landscape)",
    nameId: "Tujuan Tahapan Pekerjaan (Landscape)",
    category: "General Information",
    description: "Executive summary list outlining primary objectives in 2-column landscape layout.",
    previewTaskCode: "01-03"
  },
  {
    id: "tpl-workflow-l",
    code: "01-04-L",
    name: "Workflow Overview (Landscape)",
    nameId: "Tinjauan Alur Kerja (Landscape)",
    category: "General Information",
    description: "Step-by-step stage progress breakdown in 2-column landscape layout.",
    previewTaskCode: "01-04"
  },

  // --- SECTION 01 KOP V2 PORTRAIT TEMPLATES (01-01-V2P to 01-04-V2P) ---
  {
    id: "tpl-section-cover-v2p",
    code: "01-01-V2P",
    name: "Section Cover Page Kop v2 (Portrait)",
    nameId: "Sampul Seksi Kop v2 (Portrait)",
    category: "General Information",
    description: "Section cover page with Kop v2 bottom title block framework in portrait.",
    previewTaskCode: "01-01"
  },
  {
    id: "tpl-toc-v2p",
    code: "01-02-V2P",
    name: "Table of Contents Kop v2 (Portrait)",
    nameId: "Daftar Isi Halaman Kop v2 (Portrait)",
    category: "General Information",
    description: "Auto-synchronizing index table of contents in Kop v2 portrait framework.",
    previewTaskCode: "01-02"
  },
  {
    id: "tpl-purpose-v2p",
    code: "01-03-V2P",
    name: "Purpose of Stage Kop v2 (Portrait)",
    nameId: "Tujuan Tahapan Pekerjaan Kop v2 (Portrait)",
    category: "General Information",
    description: "Executive summary list of objectives in Kop v2 portrait framework.",
    previewTaskCode: "01-03"
  },
  {
    id: "tpl-workflow-v2p",
    code: "01-04-V2P",
    name: "Workflow Overview Kop v2 (Portrait)",
    nameId: "Tinjauan Alur Kerja Kop v2 (Portrait)",
    category: "General Information",
    description: "Step-by-step stage progress breakdown in Kop v2 portrait framework.",
    previewTaskCode: "01-04"
  },

  // --- SECTION 01 KOP V2 LANDSCAPE TEMPLATES (01-01-V2L to 01-04-V2L) ---
  {
    id: "tpl-section-cover-v2l",
    code: "01-01-V2L",
    name: "Section Cover Page Kop v2 (Landscape)",
    nameId: "Sampul Seksi Kop v2 (Landscape)",
    category: "General Information",
    description: "Section cover page with right-side Kop v2 sidebar frame in landscape.",
    previewTaskCode: "01-01"
  },
  {
    id: "tpl-toc-v2l",
    code: "01-02-V2L",
    name: "Table of Contents Kop v2 (Landscape)",
    nameId: "Daftar Isi Halaman Kop v2 (Landscape)",
    category: "General Information",
    description: "Multi-column index table of contents in Kop v2 landscape framework.",
    previewTaskCode: "01-02"
  },
  {
    id: "tpl-purpose-v2l",
    code: "01-03-V2L",
    name: "Purpose of Stage Kop v2 (Landscape)",
    nameId: "Tujuan Tahapan Pekerjaan Kop v2 (Landscape)",
    category: "General Information",
    description: "Executive summary grid of objectives in Kop v2 landscape framework.",
    previewTaskCode: "01-03"
  },
  {
    id: "tpl-workflow-v2l",
    code: "01-04-V2L",
    name: "Workflow Overview Kop v2 (Landscape)",
    nameId: "Tinjauan Alur Kerja Kop v2 (Landscape)",
    category: "General Information",
    description: "Horizontal step-by-step stage progress in Kop v2 landscape framework.",
    previewTaskCode: "01-04"
  },
  // --- SECTION 02 CLIENT BRIEF PORTRAIT TEMPLATES (02-01-P to 02-05-P) ---
  {
    id: "tpl-project-understanding-p",
    code: "02-01-P",
    name: "Project Understanding (Portrait)",
    nameId: "Pemahaman Proyek (Portrait)",
    category: "Client Brief and Objectives",
    description: "Key architectural concept, site parameters & design direction breakdown.",
    previewTaskCode: "02-01"
  },
  {
    id: "tpl-client-needs-p",
    code: "02-02-P",
    name: "Client Needs & Vision (Portrait)",
    nameId: "Visi & Kebutuhan Klien (Portrait)",
    category: "Client Brief and Objectives",
    description: "Structured questionnaire summary of client spatial & stylistic requirements.",
    previewTaskCode: "02-02"
  },
  {
    id: "tpl-functional-req-p",
    code: "02-03-P",
    name: "Functional Requirements (Portrait)",
    nameId: "Kebutuhan Fungsional Space (Portrait)",
    category: "Client Brief and Objectives",
    description: "Matrix of space requirements, occupancy count & functional relationships.",
    previewTaskCode: "02-03"
  },
  {
    id: "tpl-functional-req-matrix-p",
    code: "02-04-P",
    name: "Functional Requirements Matrix (Portrait)",
    nameId: "Matriks Kebutuhan Fungsional (Portrait)",
    category: "Client Brief and Objectives",
    description: "Detailed multi-column matrix table for space requirements, occupancy count & functional relationships.",
    previewTaskCode: "02-04"
  },

  // --- SECTION 02 CLIENT BRIEF LANDSCAPE TEMPLATES (02-01-L to 02-04-L) ---
  {
    id: "tpl-project-understanding-l",
    code: "02-01-L",
    name: "Project Understanding (Landscape)",
    nameId: "Pemahaman Proyek (Landscape)",
    category: "Client Brief and Objectives",
    description: "Landscape 2-column split: left executive summary paragraph, right key concept drivers.",
    previewTaskCode: "02-01"
  },
  {
    id: "tpl-client-needs-l",
    code: "02-02-L",
    name: "Client Needs & Vision (Landscape)",
    nameId: "Visi & Kebutuhan Klien (Landscape)",
    category: "Client Brief and Objectives",
    description: "Landscape wide 2-column flow summary of client vision & requirements.",
    previewTaskCode: "02-02"
  },
  {
    id: "tpl-functional-req-l",
    code: "02-03-L",
    name: "Functional Requirements (Landscape)",
    nameId: "Kebutuhan Fungsional Space (Landscape)",
    category: "Client Brief and Objectives",
    description: "Landscape wide matrix table for space requirements & occupancy count.",
    previewTaskCode: "02-03"
  },
  {
    id: "tpl-functional-req-matrix-l",
    code: "02-04-L",
    name: "Functional Requirements Matrix (Landscape)",
    nameId: "Matriks Kebutuhan Fungsional (Landscape)",
    category: "Client Brief and Objectives",
    description: "Landscape wide 2-3 column matrix grid for space requirements with column count toggle.",
    previewTaskCode: "02-04"
  },
  // --- SECTION 03 SCOPE OF WORK PORTRAIT TEMPLATES (03-01-P to 03-04-P) ---
  {
    id: "tpl-design-scope-p",
    code: "03-01-P",
    name: "Design Scope & Deliverables (Portrait)",
    nameId: "Lingkup Kerja & Keluaran Desain (Portrait)",
    category: "Scope of Work",
    description: "Architectural, structural, and MEP design package checklist & inclusions.",
    previewTaskCode: "03-01"
  },
  {
    id: "tpl-construction-scope-p",
    code: "03-02-P",
    name: "Construction Scope & Deliverables (Portrait)",
    nameId: "Lingkup Kerja & Pelaksanaan Konstruksi (Portrait)",
    category: "Scope of Work",
    description: "Technical working drawings FOR-CON, BoQ, and site supervision scope.",
    previewTaskCode: "03-02"
  },
  {
    id: "tpl-exclusions-p",
    code: "03-03-P",
    name: "Scope Exclusions (Portrait)",
    nameId: "Pengecualian Lingkup Kerja (Portrait)",
    category: "Scope of Work",
    description: "Detailed table of project boundary exclusions and un-scoped services.",
    previewTaskCode: "03-03"
  },
  {
    id: "tpl-assumptions-p",
    code: "03-04-P",
    name: "Project Assumptions (Portrait)",
    nameId: "Asumsi Pekerjaan Proyek (Portrait)",
    category: "Scope of Work",
    description: "Detailed table of site conditions, client responsibilities, and structural assumptions.",
    previewTaskCode: "03-04"
  },

  // --- SECTION 03 SCOPE OF WORK LANDSCAPE TEMPLATES (03-01-L to 03-04-L) ---
  {
    id: "tpl-design-scope-l",
    code: "03-01-L",
    name: "Design Scope & Deliverables (Landscape)",
    nameId: "Lingkup Kerja & Keluaran Desain (Landscape)",
    category: "Scope of Work",
    description: "Landscape wide multi-column layout for design scope & discipline deliverables.",
    previewTaskCode: "03-01"
  },
  {
    id: "tpl-construction-scope-l",
    code: "03-02-L",
    name: "Construction Scope & Deliverables (Landscape)",
    nameId: "Lingkup Kerja & Pelaksanaan Konstruksi (Landscape)",
    category: "Scope of Work",
    description: "Landscape wide multi-column layout for construction deliverables & supervision.",
    previewTaskCode: "03-02"
  },
  {
    id: "tpl-exclusions-l",
    code: "03-03-L",
    name: "Scope Exclusions (Landscape)",
    nameId: "Pengecualian Lingkup Kerja (Landscape)",
    category: "Scope of Work",
    description: "Landscape wide multi-column table for project scope exclusions.",
    previewTaskCode: "03-03"
  },
  {
    id: "tpl-assumptions-l",
    code: "03-04-L",
    name: "Project Assumptions (Landscape)",
    nameId: "Asumsi Pekerjaan Proyek (Landscape)",
    category: "Scope of Work",
    description: "Landscape wide 2-column table for project assumptions & site conditions.",
    previewTaskCode: "03-04"
  },
  // --- SECTION 04 PORTRAIT TEMPLATES (04-01-P to 04-06-P) ---
  {
    id: "tpl-single-image-p",
    code: "04-01-P",
    name: "Single Image (Portrait)",
    nameId: "Gambar Tunggal (Portrait)",
    category: "Drawings, Diagram, and Image",
    description: "Portrait layout with page title and full single drawing image container.",
    previewTaskCode: "04-01"
  },
  {
    id: "tpl-multiple-image-p",
    code: "04-02-P",
    name: "Multiple Image (Portrait)",
    nameId: "Multi Gambar Grid (Portrait)",
    category: "Drawings, Diagram, and Image",
    description: "Portrait grid gallery layout for displaying 4 drawing images or survey photos.",
    previewTaskCode: "04-02-P"
  },
  {
    id: "tpl-image-desc-p",
    code: "04-03-P",
    name: "Image and Desc (Portrait)",
    nameId: "Gambar & Deskripsi (Portrait)",
    category: "Drawings, Diagram, and Image",
    description: "Portrait layout featuring page title, main drawing image, and concise descriptive paragraph.",
    previewTaskCode: "04-03-P"
  },
  {
    id: "tpl-image-points-p",
    code: "04-04-P",
    name: "Image and Point (Portrait)",
    nameId: "Gambar & Poin-Poin (Portrait)",
    category: "Drawings, Diagram, and Image",
    description: "Portrait single drawing layout with key highlight bullet points and technical notes.",
    previewTaskCode: "04-04-P"
  },
  {
    id: "tpl-multiple-image-desc-p",
    code: "04-05-P",
    name: "Multiple Image and Desc (Portrait)",
    nameId: "Multi Gambar & Deskripsi (Portrait)",
    category: "Drawings, Diagram, and Image",
    description: "Portrait 3-image grid combined with brief summary description text.",
    previewTaskCode: "04-05-P"
  },
  {
    id: "tpl-full-image-overlay-p",
    code: "04-06-P",
    name: "Full Bleed Image Overlay (Portrait)",
    nameId: "Gambar Penuh Overlay (Portrait)",
    category: "Drawings, Diagram, and Image",
    description: "Portrait full-page edge-to-edge background image with dark floating title overlay.",
    previewTaskCode: "04-06-P"
  },

  // --- SECTION 04 LANDSCAPE TEMPLATES (04-01-L to 04-05-L) ---
  {
    id: "tpl-single-image-l",
    code: "04-01-L",
    name: "Single Image (Landscape)",
    nameId: "Gambar Tunggal (Landscape)",
    category: "Drawings, Diagram, and Image",
    description: "Landscape wide-format layout with page title and max-width single drawing container.",
    previewTaskCode: "04-01-L"
  },
  {
    id: "tpl-multiple-image-l",
    code: "04-02-L",
    name: "Multiple Image (Landscape)",
    nameId: "Multi Gambar Grid (Landscape)",
    category: "Drawings, Diagram, and Image",
    description: "Landscape multi photo grid with selector (1-3 photos), title, caption, and description.",
    previewTaskCode: "04-02-L"
  },
  {
    id: "tpl-image-desc-l",
    code: "04-03-L",
    name: "Image and Desc (Landscape)",
    nameId: "Gambar & Deskripsi (Landscape)",
    category: "Drawings, Diagram, and Image",
    description: "Landscape 2-column split layout with left image and right narrative description.",
    previewTaskCode: "04-03-L"
  },
  {
    id: "tpl-image-points-l",
    code: "04-04-L",
    name: "Image and Point (Landscape)",
    nameId: "Gambar & Poin-Poin (Landscape)",
    category: "Drawings, Diagram, and Image",
    description: "Landscape 2-column split layout with left image and right technical bullet points.",
    previewTaskCode: "04-04-L"
  },
  {
    id: "tpl-full-image-overlay-l",
    code: "04-05-L",
    name: "Full Bleed Image Overlay (Landscape)",
    nameId: "Gambar Penuh Overlay (Landscape)",
    category: "Drawings, Diagram, and Image",
    description: "Landscape full-page edge-to-edge background image with dark floating title overlay.",
    previewTaskCode: "04-05-L"
  },

  // --- SECTION 04 V2 KOP GAMBAR KERJA PLACEHOLDERS ---
  {
    id: "tpl-v2-single-image-p",
    code: "04-01-V2P",
    name: "Single Image (Kop V2 Gambar Kerja Portrait)",
    nameId: "Gambar Tunggal (Kop V2 Gambar Kerja Portrait)",
    category: "Drawings, Diagram, and Image",
    description: "Standard Working Drawing (Kop Gambar Kerja V2) Portrait single drawing layout [Placeholder].",
    previewTaskCode: "04-01"
  },
  {
    id: "tpl-v2-single-image-l",
    code: "04-07-V2L",
    name: "Single Image (Kop V2 Gambar Kerja Landscape)",
    nameId: "Gambar Tunggal (Kop V2 Gambar Kerja Landscape)",
    category: "Drawings, Diagram, and Image",
    description: "Standard Working Drawing (Kop Gambar Kerja V2) Landscape wide drawing layout [Placeholder].",
    previewTaskCode: "04-07"
  },
  // --- SECTION 05 BUDGET TEMPLATES (05-01-P & 05-01-L) ---
  {
    id: "tpl-budget-p",
    code: "05-01-P",
    name: "Budget Expectation (Portrait)",
    nameId: "Ekspektasi Anggaran Biaya (Portrait)",
    category: "Budget",
    description: "Initial cost estimation benchmark ranges and target allocation.",
    previewTaskCode: "05-01"
  },
  {
    id: "tpl-budget-l",
    code: "05-01-L",
    name: "Budget Expectation (Landscape)",
    nameId: "Ekspektasi Anggaran Biaya (Landscape)",
    category: "Budget",
    description: "Landscape wide format cost estimation benchmark ranges and target allocation table.",
    previewTaskCode: "05-01-L"
  },

  // --- SECTION 06 TIMELINE TEMPLATES (06-01-P & 06-01-L) ---
  {
    id: "tpl-timeline-p",
    code: "06-01-P",
    name: "Timeline Expectation (Portrait)",
    nameId: "Ekspektasi Lini Waktu (Portrait)",
    category: "Timeline",
    description: "Design & construction schedule draft with target completion milestones.",
    previewTaskCode: "06-01"
  },
  {
    id: "tpl-timeline-l",
    code: "06-01-L",
    name: "Timeline Expectation (Landscape)",
    nameId: "Ekspektasi Lini Waktu (Landscape)",
    category: "Timeline",
    description: "Landscape wide format design & construction schedule table.",
    previewTaskCode: "06-01-L"
  },
  {
    id: "tpl-timeline-chart-p",
    code: "06-02-P",
    name: "Visual Timeline Chart (Portrait)",
    nameId: "Grafik Visual Timeline (Portrait)",
    category: "Timeline",
    description: "Portrait 12-month visual timeline Gantt schedule chart.",
    previewTaskCode: "06-02-P"
  },
  {
    id: "tpl-timeline-chart-l",
    code: "06-02-L",
    name: "Visual Timeline Chart (Landscape)",
    nameId: "Grafik Visual Timeline (Landscape)",
    category: "Timeline",
    description: "Landscape wide format 12-month visual timeline Gantt schedule chart.",
    previewTaskCode: "06-02-L"
  },
  // --- SECTION 08 APPROVAL TEMPLATES (08-01-P & 08-01-L) ---
  {
    id: "tpl-approval-p",
    code: "08-01-P",
    name: "Signoff & Approval (Portrait)",
    nameId: "Persetujuan Dokumen (Portrait)",
    category: "Approval",
    description: "Portrait format approval document with declaration text followed by signature blocks below.",
    previewTaskCode: "08-01-P"
  },
  {
    id: "tpl-approval-l",
    code: "08-01-L",
    name: "Signoff & Approval (Landscape)",
    nameId: "Persetujuan Dokumen (Landscape)",
    category: "Approval",
    description: "Landscape 2-column split layout: left declaration text, right signature verification blocks.",
    previewTaskCode: "08-01-L"
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
  const [activeSubPage, setActiveSubPage] = useState<number>(1);
  const [drawingOrientation, setDrawingOrientation] = useState<"portrait" | "landscape">("portrait");
  const [photoCount, setPhotoCount] = useState<number>(3);
  const [matrixColCount, setMatrixColCount] = useState<number>(3);
  const [selectedFormat, setSelectedFormat] = useState<string>("ALL");

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
            const rawCode = p.projectCode || (p as any).code || "ADY";
            const cleanCodeStr = rawCode.replace(/^#/, "").toUpperCase();

            // Construct standard format: #[number]-[code] e.g. #036-PRG or fallback to rawCode
            const formattedCode = numPadded
              ? `#${numPadded}-${cleanCodeStr}`
              : (rawCode.startsWith("#") ? rawCode : `#${rawCode}`);

            const name = p.projectName || (p as any).name || "[Project Name]";
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

    let matchesFormat = true;
    if (selectedFormat === "V1-P") {
      matchesFormat = (tpl.code.endsWith("-P") && !tpl.code.includes("-v2")) || (!tpl.code.endsWith("-L") && !tpl.code.includes("-v2"));
    } else if (selectedFormat === "V1-L") {
      matchesFormat = tpl.code.endsWith("-L") && !tpl.code.includes("-v2");
    } else if (selectedFormat === "V2-P") {
      matchesFormat = tpl.code.includes("-v2-P") || tpl.code.endsWith("-V2P");
    } else if (selectedFormat === "V2-L") {
      matchesFormat = tpl.code.includes("-v2-L") || tpl.code.endsWith("-V2L");
    }

    return matchesSearch && matchesCategory && matchesFormat;
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
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-3 overflow-hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 min-w-0">
          {/* Search Input */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates (e.g. Cover, Timeline)..."
              className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-neutral-800 dark:text-neutral-200 transition-all"
            />
          </div>

          {/* Category & Kop Version Pills (Single Flexible Scrollable Container) */}
          <div className="flex flex-col gap-2 min-w-0 flex-1 overflow-x-auto scrollbar-none">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
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

            {/* Kop Version & Format Pills (Soft Blue Active Styling) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase mr-1 shrink-0">KOP & FORMAT:</span>
              {[
                { id: "ALL", label: "All Formats" },
                { id: "V1-P", label: "V1 · Portrait" },
                { id: "V1-L", label: "V1 · Landscape" },
                { id: "V2-P", label: "V2 (Gambar Kerja) · Portrait" },
                { id: "V2-L", label: "V2 (Gambar Kerja) · Landscape" }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={clsx(
                    "px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold whitespace-nowrap transition-all border shrink-0",
                    selectedFormat === fmt.id
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-2xs font-extrabold"
                      : "bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 hover:text-neutral-800 border-neutral-200 dark:border-neutral-700"
                  )}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
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
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      if (tpl.code.endsWith("-L") || ["04-07", "04-08", "04-09", "04-10", "04-12", "04-13"].includes(tpl.code)) {
                        setDrawingOrientation("landscape");
                      } else {
                        setDrawingOrientation("portrait");
                      }
                    }}
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

                      {/* Special info note for Table of Contents (01-02) */}
                      {tpl.code.startsWith("01-02") && (
                        <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 leading-snug">
                          ℹ️ <strong>Auto-Sync Table of Contents:</strong> In the live project document, this table of contents will automatically aggregate section titles, page numbers, and item order in real-time.
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Purpose of Stage (01-03) */}
                      {tpl.code.startsWith("01-03") && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            {/* Item 01 Sample Entry */}
                            <div className="space-y-1 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-brand-red">01</span>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase">EN</span>
                                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                  Align the initial project vision.
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 pl-4">
                                <span className="text-[9px] font-bold text-neutral-400 uppercase">ID</span>
                                <span className="text-[11px] font-normal italic text-neutral-500">
                                  Menyelaraskan visi awal proyek.
                                </span>
                              </div>
                            </div>

                            {/* Item 02 Sample Entry */}
                            <div className="space-y-1 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 opacity-80">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-brand-red">02</span>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase">EN</span>
                                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                  Define the scope of work and boundaries.
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 pl-4">
                                <span className="text-[9px] font-bold text-neutral-400 uppercase">ID</span>
                                <span className="text-[11px] font-normal italic text-neutral-500">
                                  Menentukan ruang lingkup kerja dan batasannya.
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Workflow Overview (01-04) */}
                      {tpl.code.startsWith("01-04") && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            {/* Workflow Stage Item */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-1.5 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-brand-red text-white">02-SD</span>
                                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Schematic Design</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-mono font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md inline-block">
                                    ⏱ 1-2 weeks
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1 pt-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Initial zoning draft</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Draf zonasi awal</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Project Understanding (02-01) */}
                      {tpl.code.startsWith("02-01") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2.5 text-xs">
                            {/* 1. Main Paragraph Input Type */}
                            <div className="space-y-1 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">1. Main Paragraph</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Precision Gym 23 is an enhanced premium...</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Precision Gym 23 adalah pengembangan...</span>
                                </div>
                              </div>
                            </div>

                            {/* 2. Key Issue Items Input Type */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">2. KEY ISSUES</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold text-brand-red">01</span>
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">TITLE · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">User Flow</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">TITLE · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Alur Pengguna</span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DESC · EN</span>
                                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">User movement must feel smoother...</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DESC · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Alur gerak pengguna harus lebih...</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Client's Needs & Vision (02-02) */}
                      {tpl.code.startsWith("02-02") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2.5 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold text-brand-red">01</span>
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">TITLE · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Spatial Flexibility & Scalability</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">TITLE · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Fleksibilitas & Skalabilitas Ruang</span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DESC · EN</span>
                                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Spaces must accommodate peak training hours...</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DESC · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Area harus dapat menampung jam puncak...</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Sample Input Content ONLY for Functional Requirements (02-03) */}
                      {tpl.code.startsWith("02-03") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">Spatial Program Row</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">FLOOR</span>
                                    <span className="text-xs font-bold text-brand-red">Floor 01</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-neutral-600 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">45 m²</span>
                                    <span className="text-[10px] font-mono font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">15 Pax</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ROOM · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">Lobby & Reception Area</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ROOM · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500 truncate">Area Resepsionis & Lobi</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">NOTE · EN</span>
                                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Includes turnstile & waiting lounge</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">NOTE · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Termasuk turnstile & ruang tunggu</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Budget Expectation (02-04) / Target & Formula */}
                      {(tpl.code === "02-04" || tpl.code.startsWith("02-04")) && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            {/* Header Inputs: Client Ceiling & Area x Price Formula */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">1. Target & Formula</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">CLIENT CEILING</span>
                                  <span className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100">Rp 2.000.000.000</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">AREA (AUTO)</span>
                                  <span className="text-xs font-mono font-bold text-brand-red">450 m²</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">EST. PRICE / M²</span>
                                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">Rp 3.333.333 / m²</span>
                                </div>
                              </div>
                            </div>

                            {/* Discipline Row Input */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">2. Discipline Row</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">CATEGORY</span>
                                    <span className="text-xs font-bold text-brand-red">Structure</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-neutral-600 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded shrink-0">33.3% Weight</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DESC · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Foundation, concrete & steel framework</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DESC · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Pondasi, beton bertulang & rangka baja</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">TARGET BUDGET</span>
                                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">Rp 500.000.000</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Target Timeline & Schedule (02-05) */}
                      {tpl.code.startsWith("02-05") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            {/* Block 1: Table Schedule Input */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">1. Table Schedule Row</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">PHASE</span>
                                    <span className="text-xs font-bold text-brand-red">01. Design Phase</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">SUB-STAGE</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Schematic Design</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DURATION</span>
                                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">4 Weeks (Sep - Oct 2026)</span>
                                </div>
                              </div>
                            </div>

                            {/* Block 2: Gantt Chart Input */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">2. Gantt Chart View Bar</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">BAR LABEL</span>
                                    <span className="text-xs font-bold text-brand-red">02. Procurement & Site Prep</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">SPAN MONTHS</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Dec 2026 – Jan 2027 (2 Mos)</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">COLOR THEME</span>
                                  <span className="text-xs font-mono font-bold text-brand-red">Red Highlight</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Design Scope & Deliverables (03-01) */}
                      {tpl.code.startsWith("03-01") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">Design Scope Item</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DISCIPLINE</span>
                                    <span className="text-xs font-bold text-brand-red">01. Architecture</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">INCLUDED ✓</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ITEM · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Site Plan & Floor Layout Plan</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ITEM · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Rencana Tapak & Denah Tata Letak</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Construction Scope & Deliverables (03-02) */}
                      {tpl.code.startsWith("03-02") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">Execution Scope Item</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">SCOPE</span>
                                    <span className="text-xs font-bold text-brand-red">01. FOR-CON Working Drawings</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">INCLUDED ✓</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ITEM · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Detailed Construction Drawings (FOR-CON)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ITEM · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Gambar Kerja Detail Siap Bangun</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Scope Exclusions (03-03) */}
                      {tpl.code.startsWith("03-03") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">Scope Exclusion Row</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">CATEGORY</span>
                                    <span className="text-xs font-bold text-brand-red">01. Permitting & Legal</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-neutral-600 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded shrink-0">EXCLUDED ✕</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ITEM · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Building Permit (PBG/SLF) Official Fees</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ITEM · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Retribusi Resmi Perizinan Bangunan (PBG)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Project Assumptions (03-04) */}
                      {tpl.code.startsWith("03-04") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">Project Assumption Row</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">CATEGORY</span>
                                    <span className="text-xs font-bold text-brand-red">01. Site & Ground Access</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">ASSUMED ✓</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ITEM · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Site soil has standard minimum bearing capacity of 1.5 kg/cm²</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">ITEM · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Tanah tapak memiliki daya dukung standar min 1.5 kg/cm²</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Functional Requirements Matrix (02-04) */}
                      {(tpl.code === "02-04-P" || tpl.code === "02-04-L") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content & Column Controls
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">Matrix Column Selector (2 - 3 Columns)</span>
                              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">GRID COLUMNS</span>
                                <div className="flex items-center gap-1.5">
                                  {[2, 3].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMatrixColCount(num);
                                      }}
                                      className={clsx(
                                        "text-xs font-mono font-bold w-8 h-8 rounded-full border transition-all cursor-pointer flex items-center justify-center",
                                        matrixColCount === num
                                          ? "bg-brand-red text-white border-brand-red shadow-xs scale-105"
                                          : "text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200"
                                      )}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content ONLY for Section 04 Drawing Templates */}
                      {tpl.code.startsWith("04-") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            {/* Block 1: Drawing Header Titles & Custom Code Badge */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">1. Drawing Header Titles & Code Tag</span>
                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">TITLE (EN)</span>
                                    <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                      {tpl.code === "04-04" || tpl.code === "04-10" ? "Technical Layout & Key Highlights" : "Schematic Design Concept Overview"}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-white bg-neutral-900 px-2 py-0.5 rounded-md shrink-0">
                                    {tpl.code === "04-04" || tpl.code === "04-10" ? "A-02-01" : "CONCEPT-A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">SUBTITLE (ID)</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500 truncate">
                                    {tpl.code === "04-04" || tpl.code === "04-10" ? "Tata Letak Teknis & Poin-Poin Utama" : "Gambaran Konsep Desain Skematik"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Block 2: Image Attachment & Scale (Optional) */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">2. Image Attachment & Scale</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">FILE</span>
                                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">schematic-concept-option-a.png</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">SCALE (OPTIONAL)</span>
                                  <span className="text-[10px] font-mono font-semibold text-neutral-600 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">1 : 100 @ A3</span>
                                </div>
                              </div>
                            </div>

                            {/* Block 3 FOR IMAGE AND DESC TEMPLATES (04-03 & 04-09): Concept Notes / Narrative Text */}
                            {(tpl.code === "04-03" || tpl.code === "04-09") && (
                              <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                                <span className="text-[10px] font-bold text-brand-red uppercase block">3. Concept Notes & Narrative Description</span>
                                <div className="space-y-1 pt-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">HEADING (EN)</span>
                                    <span className="text-xs font-bold text-brand-red">MAIN DESIGN ISSUES & CONCEPT NOTES</span>
                                  </div>
                                  <div className="flex items-start gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0 mt-0.5">DESC (EN)</span>
                                    <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 leading-snug">
                                      This schematic layout emphasizes optimal spatial orientation and natural light...
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0 mt-0.5">DESC (ID)</span>
                                    <span className="text-[10px] font-normal italic text-neutral-500 leading-snug">
                                      Tata letak skematik ini menekankan orientasi ruang optimal...
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Block 3 FOR IMAGE AND POINT TEMPLATES (04-04 & 04-10): Key Technical Highlights Bullet List */}
                            {(tpl.code === "04-04" || tpl.code === "04-10") && (
                              <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                                <span className="text-[10px] font-bold text-brand-red uppercase block">3. Key Technical Highlights (Bullet Points)</span>
                                <div className="space-y-1.5 pt-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">HEADING (EN)</span>
                                    <span className="text-xs font-bold text-brand-red">KEY TECHNICAL HIGHLIGHTS</span>
                                  </div>
                                  <div className="space-y-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1 pl-1">
                                    {[
                                      { num: "01", en: "Cantilevered Living Pavilion (4.5m Projection)", id: "Pavilion Utama Cantilever 4.5 Meter" },
                                      { num: "02", en: "North-South Passive Solar Orientation", id: "Orientasi Pasif Utara-Selatan" }
                                    ].map((pt, pIdx) => (
                                      <div key={pIdx} className="space-y-0.5 text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-mono font-bold text-brand-red shrink-0">{pt.num}</span>
                                          <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">{pt.en}</span>
                                        </div>
                                        <span className="text-[10px] font-normal italic text-neutral-500 block pl-4 truncate">{pt.id}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Block 3 FOR MULTIPLE IMAGE GRID TEMPLATES (04-02-L): Multi Image Grid Items & Photo Count Selector for Landscape */}
                            {tpl.code === "04-02-L" && (
                              <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                                <span className="text-[10px] font-bold text-brand-red uppercase block">3. Multi Image Items & Selector (1 - 3 Items)</span>
                                <div className="space-y-1.5 pt-0.5">
                                  <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">PHOTO COUNT SELECTOR</span>
                                    <div className="flex items-center gap-1.5">
                                      {[1, 2, 3].map((num) => (
                                        <button
                                          key={num}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPhotoCount(num);
                                          }}
                                          className={clsx(
                                            "text-xs font-mono font-bold w-7 h-7 rounded-full border transition-all cursor-pointer flex items-center justify-center",
                                            photoCount === num
                                              ? "bg-brand-red text-white border-brand-red shadow-xs scale-105"
                                              : "text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200"
                                          )}
                                        >
                                          {num}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Block 3 FOR 04-05-P (PORTRAIT MULTIPLE IMAGE & DESC): DYNAMIC SELECTOR (1 - 5 PHOTOS) */}
                            {(tpl.code === "04-05" || tpl.code === "04-05-P") && (
                              <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                                <span className="text-[10px] font-bold text-brand-red uppercase block">3. Multi Image & Desc Selector (1 - 5 Photos)</span>
                                <div className="space-y-1.5 pt-0.5">
                                  <div className="flex items-center justify-between gap-1 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">PHOTOS</span>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((num) => (
                                        <button
                                          key={num}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPhotoCount(num);
                                          }}
                                          className={clsx(
                                            "text-[11px] font-mono font-bold w-6 h-6 rounded-full border transition-all cursor-pointer flex items-center justify-center",
                                            photoCount === num
                                              ? "bg-brand-red text-white border-brand-red shadow-xs scale-105"
                                              : "text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200"
                                          )}
                                        >
                                          {num}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content for 05-01 Budget Expectation */}
                      {tpl.code.startsWith("05-01") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            {/* Header Inputs: Client Ceiling & Area x Price Formula */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">1. Target & Formula</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">CLIENT CEILING</span>
                                  <span className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100">Rp 2.000.000.000</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">AREA (AUTO)</span>
                                  <span className="text-xs font-mono font-bold text-brand-red">450 m²</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">EST. PRICE / M²</span>
                                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">Rp 3.333.333 / m²</span>
                                </div>
                              </div>
                            </div>

                            {/* Discipline Row Input */}
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">2. Discipline Row</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">CATEGORY</span>
                                    <span className="text-xs font-bold text-brand-red">Structure</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-neutral-600 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded shrink-0">33.3% Weight</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DESC · EN</span>
                                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Foundation, concrete & steel framework</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">DESC · ID</span>
                                  <span className="text-[11px] font-normal italic text-neutral-500">Pondasi, beton bertulang & rangka baja</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">TARGET BUDGET</span>
                                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">Rp 500.000.000</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content for 06-01 Timeline Expectation */}
                      {tpl.code.startsWith("06-01") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">1. Milestone Target</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">STAGE</span>
                                  <span className="text-xs font-bold text-brand-red">01. Design Phase</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">TARGET WEEKS</span>
                                  <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">4 Weeks</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sample Input Content for 08-01 Signoff & Approval */}
                      {tpl.code.startsWith("08-01") && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                            Sample Input Content
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="space-y-1.5 p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
                              <span className="text-[10px] font-bold text-brand-red uppercase block">1. Signatory Parties</span>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">STUDIO PRINCIPAL</span>
                                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">ADIDAYA STUDIO</span>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase shrink-0">CLIENT SIGNATURE</span>
                                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">PROJECT OWNER</span>
                                </div>
                              </div>
                            </div>
                          </div>
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
              Page Preview: {selectedTemplate.code} {selectedTemplate.name}
            </span>
            <div className="flex items-center gap-3">

              {/* Multi-Page Navigation Toggle Controls (< >) for templates with multiple pages */}
              {selectedTemplate.code === "02-05" && (
                <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <button
                    onClick={() => setActiveSubPage(Math.max(1, activeSubPage - 1))}
                    disabled={activeSubPage <= 1}
                    className="p-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-neutral-700 dark:text-neutral-300 px-1">
                    {activeSubPage}/2
                  </span>
                  <button
                    onClick={() => setActiveSubPage(Math.min(2, activeSubPage + 1))}
                    disabled={activeSubPage >= 2}
                    className="p-1 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </div>

          <div className="flex justify-center">
            <StageDocumentPreview
              data={{
                ...livePreviewData,
                frameworkVersion: selectedTemplate.code.includes("-v2") || selectedFormat.startsWith("V2") ? "v2" : "v1"
              }}
              activeSection={`KO-${selectedTemplate.code.split("-")[0]}`}
              activeSubTask={
                selectedTemplate.code === "02-05"
                  ? activeSubPage === 2 ? "02-05_p2" : "02-05"
                  : selectedTemplate.previewTaskCode || selectedTemplate.code
              }
              customOrientation={
                selectedTemplate.code.endsWith("-L") || drawingOrientation === "landscape"
                  ? "landscape"
                  : "portrait"
              }
              customPhotoCount={photoCount}
              customMatrixColCount={matrixColCount}
              hideToolbar={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
