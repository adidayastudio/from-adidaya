"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Download, Share2, Edit, FileText, BookOpen, ClipboardList, Scale, Video, Image, FolderOpen, Presentation, Table, FileSpreadsheet, ExternalLink, ChevronRight, Play, Check, Circle, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import clsx from "clsx";

// Types
type KnowledgeType = string;
type KnowledgeItem = {
    id: string;
    title: string;
    type: KnowledgeType;
    category: "documentation" | "templates" | "references";
    department: string;
    lastUpdated: string;
    isFavorite: boolean;
    format?: string;
    content?: string;
    chapters?: { id: string; title: string; content: string }[];
    checklistItems?: { id: string; text: string; required: boolean }[];
    workflowSteps?: { id: string; title: string; description: string; decision?: { yes: string; no: string } }[];
    fileUrl?: string;
    fileSize?: string;
    videoUrl?: string;
    videoDuration?: string;
};

// Comprehensive Mock Data for ALL types
const MOCK_KNOWLEDGE: KnowledgeItem[] = [
    // =========== SOP ===========
    {
        id: "sop-1",
        title: "Design Review Process",
        type: "SOP",
        category: "documentation",
        department: "DESIGN",
        lastUpdated: "2025-12-15",
        isFavorite: true,
        format: "document",
        chapters: [
            { id: "1", title: "Purpose & Scope", content: "This SOP establishes the standard process for conducting design reviews on all Adidaya interior design projects. It applies to all design team members, project managers, and stakeholders involved in the review process." },
            { id: "2", title: "Preparation Phase", content: "Before the review meeting:\n• Finalize all design documents (floor plans, 3D renders, material boards)\n• Upload to project folder in Drive minimum 2 days before meeting\n• Send calendar invite to all stakeholders\n• Prepare presentation deck with project context" },
            { id: "3", title: "Review Meeting", content: "During the review:\n• Lead designer presents design intent (15 min)\n• Walkthrough of floor plans and renders (20 min)\n• Material and FF&E discussion (15 min)\n• Open Q&A and feedback collection (20 min)\n• Document all feedback in meeting notes" },
            { id: "4", title: "Revision Process", content: "After feedback collection:\n• Categorize feedback as Critical/Major/Minor\n• Create revision task list in project tracker\n• Assign revisions to team members\n• Set deadline (typically 3-5 working days)\n• Update design documents accordingly" },
            { id: "5", title: "Final Approval", content: "Approval workflow:\n1. Submit revised designs to Project Manager\n2. PM reviews and forwards to client\n3. Client provides written approval or additional feedback\n4. Obtain signed Design Approval Form\n5. Archive approved designs in final folder" },
        ]
    },
    // =========== WORKFLOW ===========
    {
        id: "workflow-1",
        title: "Invoice Processing Workflow",
        type: "WORKFLOW",
        category: "documentation",
        department: "FINANCE",
        lastUpdated: "2025-12-08",
        isFavorite: true,
        format: "document",
        workflowSteps: [
            { id: "1", title: "Receive Invoice", description: "Invoice received via email or physical mail. Log in Invoice Register spreadsheet with date received." },
            { id: "2", title: "Initial Verification", description: "Check invoice completeness: vendor name, amount, due date, PO number, description of goods/services.", decision: { yes: "Proceed to coding", no: "Return to vendor for correction" } },
            { id: "3", title: "Cost Center Coding", description: "Assign appropriate cost center and GL account based on expense type. Refer to Chart of Accounts." },
            { id: "4", title: "Manager Approval", description: "Route to Department Manager for approval. Threshold: under 10jt = Department Head, 10-50jt = Director, >50jt = CEO.", decision: { yes: "Approved for payment", no: "Return with rejection reason" } },
            { id: "5", title: "Payment Scheduling", description: "Add to payment batch based on due date and payment terms. Standard payment cycle: every Friday." },
            { id: "6", title: "Payment Execution", description: "Process payment via bank transfer. Record payment reference in accounting system." },
            { id: "7", title: "Filing & Archive", description: "Scan and upload to digital archive. File physical copy in vendor folder. Retain for 5 years." },
        ]
    },
    // =========== GUIDELINE ===========
    {
        id: "guideline-1",
        title: "Brand Guidelines",
        type: "GUIDELINE",
        category: "documentation",
        department: "DESIGN",
        lastUpdated: "2025-11-20",
        isFavorite: true,
        format: "document",
        chapters: [
            { id: "1", title: "Brand Overview", content: "Adidaya represents premium interior design excellence. Our brand embodies sophistication, attention to detail, and timeless elegance. Every touchpoint must reflect these core values." },
            { id: "2", title: "Logo Usage", content: "Primary logo: Use on white or light backgrounds.\nReversed logo: Use on dark backgrounds.\nMinimum size: 30mm width for print, 120px for digital.\nClear space: Maintain minimum 1x logo height on all sides.\nNever stretch, rotate, or alter logo proportions." },
            { id: "3", title: "Color Palette", content: "Primary Colors:\n• Brand Red: #C41E3A (Pantone 200C)\n• Charcoal: #2D2D2D\n• Pure White: #FFFFFF\n\nSecondary Colors:\n• Warm Gold: #C9A962\n• Soft Grey: #F5F5F5\n\nUsage: Primary red for accents and CTAs. Charcoal for text. White for backgrounds." },
            { id: "4", title: "Typography", content: "Headlines: Playfair Display (Bold)\nBody Text: Inter (Regular/Medium)\nAccent: Inter (SemiBold)\n\nWeb sizes: H1: 48px, H2: 36px, H3: 24px, Body: 16px\nLine height: 1.5 for body, 1.2 for headlines" },
            { id: "5", title: "Photography Style", content: "Interior photography guidelines:\n• Natural lighting preferred\n• Warm color temperature\n• Include lifestyle elements (books, plants)\n• Shoot at eye level or slightly elevated\n• Post-processing: subtle contrast, warm tones" },
        ]
    },
    // =========== POLICY ===========
    {
        id: "policy-1",
        title: "Employee Leave Policy",
        type: "POLICY",
        category: "documentation",
        department: "HR",
        lastUpdated: "2025-12-01",
        isFavorite: false,
        format: "document",
        chapters: [
            { id: "1", title: "Annual Leave", content: "All permanent employees are entitled to 12 working days of annual leave per year. Leave accrues monthly at 1 day/month. Maximum carryover: 5 days to next year. Unused leave beyond carryover limit will be forfeited." },
            { id: "2", title: "Sick Leave", content: "Employees are entitled to 14 days sick leave per year with medical certificate. For absences >2 consecutive days, doctor's note required. Hospitalization leave: additional 60 days with supporting documents." },
            { id: "3", title: "Leave Request Process", content: "Submit leave request via HR system minimum:\n• 3 days in advance for 1-2 day leave\n• 2 weeks in advance for 3+ days\n• 1 month for leave >1 week\n\nApproval required from direct supervisor and HR." },
            { id: "4", title: "Special Leave", content: "Marriage: 3 days\nPaternity: 2 days\nBereavement (immediate family): 3 days\nBereavement (extended family): 1 day\nReligious holidays: As per company calendar" },
        ]
    },
    // =========== STANDARD ===========
    {
        id: "standard-1",
        title: "Material Quality Standard",
        type: "STANDARD",
        category: "documentation",
        department: "OPERATION",
        lastUpdated: "2025-11-28",
        isFavorite: false,
        format: "document",
        chapters: [
            { id: "1", title: "Wood Materials", content: "Acceptable grades: A or B grade only.\nMoisture content: 8-12% for indoor use.\nNo visible knots >10mm, no cracks >50mm.\nMust include mill certificate and origin documentation." },
            { id: "2", title: "Stone & Marble", content: "Minimum thickness: 20mm for flooring, 15mm for walls.\nPolish level: 85+ gloss units for polished finish.\nColor variation: Maximum 15% within same batch.\nNo hairline cracks or fossils in visible areas." },
            { id: "3", title: "Metal Finishes", content: "Powder coating: Minimum 60 microns thickness.\nPVD coating: Must include warranty certificate.\nAnodizing: Grade AA25 minimum.\nAll metal work must pass salt spray test (500 hours)." },
            { id: "4", title: "Fabric & Upholstery", content: "Martindale abrasion: Minimum 25,000 cycles for residential, 40,000 for commercial.\nFire rating: BS 5852 compliant.\nColorfastness: Grade 4+ for light exposure.\nPilling resistance: Grade 3+ minimum." },
        ]
    },
    // =========== CHECKLIST ===========
    {
        id: "checklist-1",
        title: "Project Handover Checklist",
        type: "CHECKLIST",
        category: "documentation",
        department: "CONSTRUCTION",
        lastUpdated: "2025-12-10",
        isFavorite: false,
        format: "document",
        checklistItems: [
            { id: "1", text: "All punch list items completed and signed off", required: true },
            { id: "2", text: "Final cleaning completed (deep clean)", required: true },
            { id: "3", text: "All MEP systems tested and commissioned", required: true },
            { id: "4", text: "As-built drawings submitted", required: true },
            { id: "5", text: "O&M manuals for all equipment provided", required: true },
            { id: "6", text: "Warranty certificates collected and organized", required: true },
            { id: "7", text: "Keys and access cards handed over", required: true },
            { id: "8", text: "Client walkthrough completed", required: true },
            { id: "9", text: "Defects liability period explained to client", required: true },
            { id: "10", text: "Final invoice reconciliation completed", required: true },
            { id: "11", text: "Project photo documentation archived", required: false },
            { id: "12", text: "Team debrief meeting scheduled", required: false },
            { id: "13", text: "Client satisfaction survey sent", required: false },
        ]
    },
    // =========== TEMPLATE_PPT ===========
    {
        id: "template-ppt-1",
        title: "Project Presentation Template",
        type: "TEMPLATE_PPT",
        category: "templates",
        department: "DESIGN",
        lastUpdated: "2025-12-12",
        isFavorite: false,
        format: "presentation",
        fileSize: "15.2 MB",
        content: "Professional PowerPoint template for client presentations. Includes cover slide, project overview, design concept, floor plans, 3D renders, material board, timeline, and thank you slides. Brand-compliant with Adidaya colors and typography."
    },
    // =========== TEMPLATE_RAB ===========
    {
        id: "template-rab-1",
        title: "RAB Template - Residential",
        type: "TEMPLATE_RAB",
        category: "templates",
        department: "CONSTRUCTION",
        lastUpdated: "2025-12-05",
        isFavorite: true,
        format: "spreadsheet",
        fileSize: "2.8 MB",
        content: "Comprehensive budget template for residential projects. Includes categories: Civil Works, MEP, Finishing, FF&E, Soft Furnishing, Art & Accessories. Pre-loaded with common unit prices. Auto-calculates totals, contingency (10%), and tax."
    },
    // =========== TEMPLATE_DRAWING ===========
    {
        id: "template-drawing-1",
        title: "CAD Drawing Template",
        type: "TEMPLATE_DRAWING",
        category: "templates",
        department: "DESIGN",
        lastUpdated: "2025-11-25",
        isFavorite: false,
        format: "document",
        fileSize: "4.5 MB",
        content: "AutoCAD template with Adidaya title block, layer standards, dimension styles, and hatching patterns. Includes floor plan, ceiling plan, elevation, and section sheet layouts. A1 and A3 formats available."
    },
    // =========== TEMPLATE_CONTRACT ===========
    {
        id: "template-contract-1",
        title: "Contractor Agreement Template",
        type: "TEMPLATE_CONTRACT",
        category: "templates",
        department: "OPERATION",
        lastUpdated: "2025-11-18",
        isFavorite: false,
        format: "document",
        fileSize: "245 KB",
        content: "Standard contract template for engaging subcontractors. Includes scope of work, payment terms, timeline, quality standards, defects liability, insurance requirements, and termination clauses. Reviewed by legal team."
    },
    // =========== TEMPLATE_REPORT ===========
    {
        id: "template-report-1",
        title: "Monthly Progress Report Template",
        type: "TEMPLATE_REPORT",
        category: "templates",
        department: "CONSTRUCTION",
        lastUpdated: "2025-11-10",
        isFavorite: false,
        format: "document",
        fileSize: "1.2 MB",
        content: "Word template for monthly site progress reports. Sections: Executive Summary, Work Completed, Work in Progress, Issues & Delays, Financial Status, Next Month Plan, Photo Documentation. Formatted for client submission."
    },
    // =========== VIDEO ===========
    {
        id: "video-1",
        title: "Site Inspection Tutorial",
        type: "VIDEO",
        category: "references",
        department: "CONSTRUCTION",
        lastUpdated: "2025-12-14",
        isFavorite: true,
        format: "video",
        videoDuration: "12:34",
        content: "Step-by-step video guide on conducting site inspections. Covers safety protocols, what to check, how to document issues, and proper reporting format. Includes real examples from past projects."
    },
    // =========== DESIGN_REF ===========
    {
        id: "designref-1",
        title: "Modern Kitchen Design References",
        type: "DESIGN_REF",
        category: "references",
        department: "DESIGN",
        lastUpdated: "2025-12-08",
        isFavorite: false,
        format: "pdf",
        fileSize: "45 MB",
        content: "Curated collection of 50+ modern kitchen designs. Categories include minimalist, industrial, scandinavian, and luxury styles. Each example includes material specifications and brand references."
    },
    // =========== MATERIAL_CATALOG ===========
    {
        id: "material-1",
        title: "Marble & Stone Catalog 2025",
        type: "MATERIAL_CATALOG",
        category: "references",
        department: "DESIGN",
        lastUpdated: "2025-12-01",
        isFavorite: true,
        format: "pdf",
        fileSize: "120 MB",
        content: "Complete catalog from approved marble suppliers. Includes Carrara, Calacatta, Statuario, and local variants. Each stone shows origin, pricing tier, lead time, and recommended applications."
    },
    // =========== VENDOR_LIST ===========
    {
        id: "vendor-1",
        title: "Approved Vendor List 2025",
        type: "VENDOR_LIST",
        category: "references",
        department: "OPERATION",
        lastUpdated: "2025-11-22",
        isFavorite: false,
        format: "spreadsheet",
        fileSize: "850 KB",
        content: "Master list of approved vendors by category: Furniture, Lighting, Flooring, Wall Finishes, Accessories. Includes contact, payment terms, warranty, and quality rating. Updated quarterly."
    },
    // =========== PRICE_REF ===========
    {
        id: "price-1",
        title: "Material Price Guide Q4 2025",
        type: "PRICE_REF",
        category: "references",
        department: "FINANCE",
        lastUpdated: "2025-11-15",
        isFavorite: false,
        format: "spreadsheet",
        fileSize: "1.5 MB",
        content: "Updated unit prices for common materials and labor. Categories: Flooring, Wall, Ceiling, Carpentry, MEP, Painting. Includes price ranges (low-mid-high) and supplier references."
    },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
    SOP: <FileText className="w-5 h-5" />,
    WORKFLOW: <BookOpen className="w-5 h-5" />,
    GUIDELINE: <FileText className="w-5 h-5" />,
    POLICY: <Scale className="w-5 h-5" />,
    STANDARD: <Scale className="w-5 h-5" />,
    CHECKLIST: <ClipboardList className="w-5 h-5" />,
    TEMPLATE_PPT: <Presentation className="w-5 h-5" />,
    TEMPLATE_RAB: <Table className="w-5 h-5" />,
    TEMPLATE_DRAWING: <FolderOpen className="w-5 h-5" />,
    TEMPLATE_CONTRACT: <FileText className="w-5 h-5" />,
    TEMPLATE_REPORT: <FileSpreadsheet className="w-5 h-5" />,
    VIDEO: <Video className="w-5 h-5" />,
    PHOTO: <Image className="w-5 h-5" />,
    DESIGN_REF: <Image className="w-5 h-5" />,
    MATERIAL_CATALOG: <FolderOpen className="w-5 h-5" />,
    VENDOR_LIST: <ClipboardList className="w-5 h-5" />,
    PRICE_REF: <FileSpreadsheet className="w-5 h-5" />,
};

const TYPE_LABEL: Record<string, string> = {
    SOP: "SOP", WORKFLOW: "Workflow", GUIDELINE: "Guideline", POLICY: "Policy",
    STANDARD: "Standard", CHECKLIST: "Checklist", TEMPLATE_PPT: "PPT Template",
    TEMPLATE_RAB: "RAB Template", TEMPLATE_DRAWING: "Drawing Template",
    TEMPLATE_CONTRACT: "Contract Template", TEMPLATE_REPORT: "Report Template",
    VIDEO: "Video", PHOTO: "Photo", DESIGN_REF: "Design Ref",
    MATERIAL_CATALOG: "Material Catalog", VENDOR_LIST: "Vendor List", PRICE_REF: "Price Ref",
};

const DEPT_LABEL: Record<string, string> = {
    DESIGN: "Design", CONSTRUCTION: "Construction", FINANCE: "Finance", HR: "HR", OPERATION: "Operation",
};

export default function LearnDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeChapter, setActiveChapter] = useState<string>("1");
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

    const item = MOCK_KNOWLEDGE.find(k => k.id === params.id);

    useEffect(() => {
        if (item) {
            setIsFavorite(item.isFavorite);
            if (item.chapters?.length) setActiveChapter(item.chapters[0].id);
        }
    }, [item]);

    if (!item) {
        return (
            <div className="min-h-screen bg-neutral-50 p-6">
                <div className="text-center py-20">
                    <div className="text-neutral-400 text-lg">Knowledge item not found</div>
                    <Button variant="secondary" className="mt-4" onClick={() => router.push("/frame/learn")}>
                        Back to Learn
                    </Button>
                </div>
            </div>
        );
    }

    const isFile = item.category === "templates" || (item.category === "references" && item.type !== "VIDEO");
    const isVideo = item.type === "VIDEO";
    const isChecklist = item.type === "CHECKLIST" && item.checklistItems;
    const isWorkflow = item.type === "WORKFLOW" && item.workflowSteps;
    const hasChapters = item.chapters && item.chapters.length > 0 && !isChecklist && !isWorkflow;
    const currentChapter = item.chapters?.find(c => c.id === activeChapter);

    const relatedItems = MOCK_KNOWLEDGE.filter(k => k.department === item.department && k.id !== item.id).slice(0, 3);

    const toggleCheck = (id: string) => {
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Frame" }, { label: "Learn", href: "/frame/learn" }, { label: item.title }]} />

            <PageWrapper
                sidebar={
                    <DetailSidebar
                        item={item}
                        activeChapter={activeChapter}
                        onChapterChange={setActiveChapter}
                        relatedItems={relatedItems}
                        onBack={() => router.push("/frame/learn")}
                        onItemClick={(id) => router.push(`/frame/learn/${id}`)}
                    />
                }
            >
                <div className="space-y-6">
                    {/* HEADER */}
                    <div className="bg-white rounded-xl border border-neutral-100 p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500">
                                    {TYPE_ICON[item.type]}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-neutral-900">{item.title}</h1>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                                        <span className="font-medium text-neutral-700">{TYPE_LABEL[item.type]}</span>
                                        <span>•</span>
                                        <span>{DEPT_LABEL[item.department]}</span>
                                        <span>•</span>
                                        <span>Updated {new Date(item.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                        {item.fileSize && <><span>•</span><span>{item.fileSize}</span></>}
                                        {item.videoDuration && <><span>•</span><span>{item.videoDuration}</span></>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsFavorite(!isFavorite)} className={clsx("p-2 rounded-lg transition-colors", isFavorite ? "bg-yellow-100 text-yellow-600" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200")}>
                                    <Star className={clsx("w-4 h-4", isFavorite && "fill-yellow-500")} />
                                </button>
                                <button className="p-2 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"><Share2 className="w-4 h-4" /></button>
                                <button className="p-2 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"><Edit className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT */}
                    <div className="bg-white rounded-xl border border-neutral-100 p-6">
                        {isVideo ? (
                            <div className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <button className="relative z-10 w-16 h-16 rounded-full bg-white/90 flex items-center justify-center text-neutral-900 hover:bg-white transition-colors shadow-xl">
                                    <Play className="w-6 h-6 ml-1" />
                                </button>
                                <div className="absolute bottom-4 left-4 text-white z-10">
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <p className="text-xs text-white/70">{item.videoDuration} • Video Tutorial</p>
                                </div>
                            </div>
                        ) : isFile ? (
                            <div className="py-8">
                                <div className="flex items-start gap-6">
                                    <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 flex-shrink-0">
                                        {TYPE_ICON[item.type]}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">{item.title}</h3>
                                        <p className="text-sm text-neutral-600 mb-4">{item.content}</p>
                                        <div className="flex items-center gap-3">
                                            <Button variant="secondary" size="sm" icon={<ExternalLink className="w-4 h-4" />}>Preview</Button>
                                            <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>Download</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : isChecklist ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-neutral-900">Checklist Items</h3>
                                    <span className="text-sm text-neutral-500">{checkedItems.size}/{item.checklistItems!.length} completed</span>
                                </div>
                                {item.checklistItems!.map((ci) => (
                                    <div
                                        key={ci.id}
                                        onClick={() => toggleCheck(ci.id)}
                                        className={clsx("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all", checkedItems.has(ci.id) ? "bg-green-50 border-green-200" : "bg-white border-neutral-100 hover:border-neutral-200")}
                                    >
                                        <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5", checkedItems.has(ci.id) ? "bg-green-500 text-white" : "border-2 border-neutral-300")}>
                                            {checkedItems.has(ci.id) && <Check className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1">
                                            <span className={clsx("text-sm", checkedItems.has(ci.id) ? "text-neutral-500 line-through" : "text-neutral-900")}>{ci.text}</span>
                                            {ci.required && <span className="ml-2 text-[10px] font-medium text-red-500">Required</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : isWorkflow ? (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Workflow Steps</h3>
                                {item.workflowSteps!.map((step, idx) => (
                                    <div key={step.id} className="relative pl-8">
                                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                        {idx < item.workflowSteps!.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-neutral-200" />}
                                        <div className="bg-neutral-50 rounded-lg p-4 ml-2">
                                            <h4 className="font-semibold text-neutral-900 mb-1">{step.title}</h4>
                                            <p className="text-sm text-neutral-600">{step.description}</p>
                                            {step.decision && (
                                                <div className="mt-3 flex gap-2">
                                                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">✓ {step.decision.yes}</span>
                                                    <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">✗ {step.decision.no}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : hasChapters ? (
                            <div className="prose prose-sm max-w-none">
                                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{currentChapter?.title}</h2>
                                <div className="text-neutral-700 leading-relaxed whitespace-pre-line">{currentChapter?.content}</div>
                                <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-100 not-prose">
                                    {item.chapters!.findIndex(c => c.id === activeChapter) > 0 ? (
                                        <button onClick={() => { const idx = item.chapters!.findIndex(c => c.id === activeChapter); if (idx > 0) setActiveChapter(item.chapters![idx - 1].id); }} className="text-sm text-neutral-500 hover:text-neutral-900">← Previous</button>
                                    ) : <div />}
                                    {item.chapters!.findIndex(c => c.id === activeChapter) < item.chapters!.length - 1 && (
                                        <button onClick={() => { const idx = item.chapters!.findIndex(c => c.id === activeChapter); if (idx < item.chapters!.length - 1) setActiveChapter(item.chapters![idx + 1].id); }} className="text-sm text-red-600 font-medium hover:text-red-700">Next →</button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-neutral-400">No content available</div>
                        )}
                    </div>

                    {!isFile && (
                        <div className="flex justify-end">
                            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export as PDF</Button>
                        </div>
                    )}
                </div>
            </PageWrapper>
        </div>
    );
}

function DetailSidebar({ item, activeChapter, onChapterChange, relatedItems, onBack, onItemClick }: { item: KnowledgeItem; activeChapter: string; onChapterChange: (id: string) => void; relatedItems: KnowledgeItem[]; onBack: () => void; onItemClick: (id: string) => void; }) {
    const hasChapters = item.chapters && item.chapters.length > 0 && item.type !== "CHECKLIST" && item.type !== "WORKFLOW";

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
                <ArrowLeft className="w-4 h-4" />Back to Learn
            </button>

            {hasChapters && (
                <div className="space-y-2">
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Contents</div>
                    <div className="space-y-0.5">
                        {item.chapters!.map((chapter, idx) => (
                            <button key={chapter.id} onClick={() => onChapterChange(chapter.id)} className={clsx("w-full text-left rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2", activeChapter === chapter.id ? "text-red-600 bg-red-50 font-medium" : "text-neutral-600 hover:bg-neutral-50")}>
                                <span className="text-[10px] text-neutral-400 w-4">{idx + 1}.</span>
                                <span className="truncate">{chapter.title}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {relatedItems.length > 0 && (
                <>
                    <div className="border-t border-neutral-100" />
                    <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Related</div>
                        <div className="space-y-1">
                            {relatedItems.map(related => (
                                <button key={related.id} onClick={() => onItemClick(related.id)} className="w-full text-left rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center justify-between group">
                                    <span className="truncate">{related.title}</span>
                                    <ChevronRight className="w-3 h-3 text-neutral-300 group-hover:text-neutral-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
