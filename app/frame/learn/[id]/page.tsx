"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Download, Share2, Edit, Pencil, FileText, BookOpen, ClipboardList, Scale, Video, Image, FolderOpen, Presentation, Table, FileSpreadsheet, ExternalLink, ChevronRight, Play, Check, Circle, AlertTriangle, ChevronLeft, Share, MoreVertical, Trash2, Maximize2, ZoomIn, ZoomOut, X as CloseIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";
import KnowledgeDrawer from "@/components/frame/learn/KnowledgeDrawer";
import { TYPE_LABEL, DEPT_LABEL } from "@/components/frame/learn/types";
import JSZip from "jszip";

const supabase = createClient();

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
    files?: { name: string; file_url: string }[];
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


export default function LearnDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [isFavorite, setIsFavorite] = useState(false);
    const [showEditDrawer, setShowEditDrawer] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeChapter, setActiveChapter] = useState<string>("0");
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [item, setItem] = useState<KnowledgeItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [relatedItems, setRelatedItems] = useState<KnowledgeItem[]>([]);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [expandedAsset, setExpandedAsset] = useState<number | null>(0);
    const [zoomAssetIndex, setZoomAssetIndex] = useState<number>(-1);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchItem = async () => {
            if (!params.id) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('knowledge_items')
                    .select('*')
                    .eq('id', params.id as string)
                    .single();

                if (error) throw error;
                if (data) {
                    const mappedItem: KnowledgeItem = {
                        id: data.id,
                        title: data.title,
                        type: data.type,
                        category: data.category as any,
                        department: data.department,
                        lastUpdated: data.created_at,
                        isFavorite: false, // Need actual favorite logic later
                        content: data.description || "",
                        fileUrl: data.file_url,
                        chapters: data.metadata?.chapters,
                        checklistItems: data.metadata?.checklistItems,
                        workflowSteps: data.metadata?.workflowSteps,
                        files: data.metadata?.files || (data.file_url ? [{ name: data.title || "Asset Document", file_url: data.file_url }] : []),
                    };
                    setItem(mappedItem);
                    setIsFavorite(data.is_favorite || false);

                    // Fetch related
                    const { data: related } = await supabase
                        .from('knowledge_items')
                        .select('*')
                        .eq('department', data.department)
                        .neq('id', data.id)
                        .limit(3);

                    if (related) {
                        setRelatedItems(related.map((r: any): KnowledgeItem => ({
                            id: r.id,
                            title: r.title,
                            type: r.type,
                            category: r.category as any,
                            department: r.department,
                            lastUpdated: r.created_at,
                            isFavorite: r.is_favorite || false,
                            content: r.description || "",
                            fileUrl: r.file_url,
                            chapters: r.metadata?.chapters,
                            checklistItems: r.metadata?.checklistItems,
                            workflowSteps: r.metadata?.workflowSteps,
                            files: r.metadata?.files || (r.file_url ? [{ name: r.title || "Asset Document", file_url: r.file_url }] : []),
                        })));
                    }
                }
            } catch (err) {
                console.error("Error fetching knowledge item:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchItem();
    }, [params.id]);

    const toggleFavorite = async () => {
        if (!item) return;
        const newState = !isFavorite;
        setIsFavorite(newState);
        try {
            const { error } = await supabase
                .from('knowledge_items')
                .update({ is_favorite: newState })
                .eq('id', item.id);
            if (error) throw error;
        } catch (err) {
            console.error("Error toggling favorite:", err);
            setIsFavorite(!newState); // revert
        }
    };

    const handleShare = async () => {
        if (!item) return;
        try {
            const shareUrl = `${window.location.origin}/frame/learn/${item.id}?shared=true`;
            await navigator.clipboard.writeText(shareUrl);
            alert("Link copied to clipboard!");
        } catch (err) {
            alert("Failed to copy link");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
            </div>
        );
    }

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
    const currentChapter = item.chapters?.find((c, idx) => idx.toString() === activeChapter);

    const handleDownload = async (url?: string, filename?: string) => {
        const downloadUrl = url || item?.fileUrl;
        const downloadName = filename || item?.title || "download";
        if (!downloadUrl) return;
        try {
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = downloadName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(downloadUrl, '_blank');
        }
    };


    const toggleCheck = (id: string) => {
        setCheckedItems((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const isShared = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get("shared") === "true" : false;

    // --- Mobile Top Bar (matches Learn browse page toolbar style) ---
    const mobileTopBar = !isShared ? (
        <div className={clsx(
            "md:hidden fixed top-0 left-0 right-0 z-50 pt-12 pointer-events-none"
        )}>
            {/* Background Mask */}
            <div className={clsx(
                "absolute inset-0 bg-white/60 transition-all duration-500 pointer-events-none",
                scrolled ? "opacity-100" : "opacity-0"
            )} style={{
                maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                backdropFilter: scrolled ? 'blur(16px)' : 'none',
                height: '80px'
            }} />

            <div className="flex items-center justify-between px-5 pointer-events-auto relative z-10 pb-2">
                {/* Back button - wrapped in pill like browse page */}
                <div className={clsx(
                    "p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                    scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                )}>
                    <button
                        onClick={() => router.push("/frame/learn")}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                    </button>
                </div>

                {/* Centered Title */}
                <div className={clsx(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-gray-900 text-[18px] transition-opacity duration-300",
                    scrolled ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                    {item.title.length > 20 ? item.title.substring(0, 20) + "…" : item.title}
                </div>

                {/* Right toolbar - pill with action buttons (fav → share → edit) */}
                <div className={clsx(
                    "flex items-center gap-1 p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                    scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                )}>
                    <button
                        onClick={toggleFavorite}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200",
                            isFavorite ? "text-yellow-500" : "text-gray-700"
                        )}
                    >
                        <Star className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={handleShare}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-90 transition-all duration-200"
                    >
                        <Share className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={() => setShowEditDrawer(true)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-90 transition-all duration-200"
                    >
                        <Pencil className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    // --- Page content (used in both shared and normal views) ---
    const pageContent = (
        <div className="space-y-5">
            <KnowledgeDrawer
                isOpen={showEditDrawer}
                onClose={() => setShowEditDrawer(false)}
                mode="edit"
                initialData={item}
                onSuccess={(data) => {
                    if (data?.deleted) router.push("/frame/learn");
                    else window.location.reload();
                }}
            />

            {/* Header — flat, no card wrapper */}
            <div>
                <h1 className="text-[28px] font-bold text-neutral-900 leading-tight tracking-tight mb-3">{item.title}</h1>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full font-semibold text-[12px] capitalize">{DEPT_LABEL[item.department]?.toLowerCase()}</span>
                    <span className="text-neutral-400 text-[12px]">•</span>
                    <span className="text-[12px] font-medium text-neutral-500 capitalize">{item.category}</span>
                    <span className="text-neutral-400 text-[12px]">•</span>
                    <span className="text-[12px] font-medium text-neutral-500 capitalize">{TYPE_LABEL[item.type]?.toLowerCase()}</span>
                </div>
            </div>

            {/* Description — plain text, no box */}
            {item.content && (
                <p className="text-[15px] text-neutral-600 leading-relaxed">{item.content}</p>
            )}

            {/* Assets / Preview */}
            {(item.files && item.files.length > 0) ? (
                <div className="space-y-3">
                    <h3 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">Assets ({item.files.length})</h3>
                    {item.files.map((asset, idx) => {
                        const isExpanded = expandedAsset === idx;
                        return (
                            <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-black/[0.05]">
                                {/* Asset header row */}
                                <div
                                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 active:scale-[0.99] transition-all duration-200"
                                    onClick={() => setExpandedAsset(isExpanded ? null : idx)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileText size={16} className="text-neutral-400 shrink-0" />
                                        <span className="font-medium text-[14px] text-neutral-900 truncate">{asset.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(asset.file_url, asset.name); }}
                                            className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all duration-200 active:scale-90"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <div className="w-8 h-8 flex items-center justify-center text-neutral-400">
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded preview */}
                                {isExpanded && (
                                    <div className="px-4 pb-4">
                                        <div className="relative aspect-[3/4] md:aspect-video bg-neutral-50 rounded-xl overflow-hidden border border-black/[0.04] group">
                                            <AssetPreview url={asset.file_url} title={asset.name} />
                                            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setZoomAssetIndex(idx); setShowZoomModal(true); }}
                                                    className="w-9 h-9 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all duration-200 active:scale-90"
                                                >
                                                    <Maximize2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : item.fileUrl && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">Preview</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setZoomAssetIndex(-1); setShowZoomModal(true); }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-all duration-200 active:scale-90 text-neutral-500"
                            >
                                <Maximize2 size={14} />
                            </button>
                            <button
                                onClick={() => handleDownload()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-full text-[12px] font-bold flex items-center gap-2 hover:bg-blue-700 transition-all duration-200 active:scale-90"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download
                            </button>
                        </div>
                    </div>

                    <div className="relative aspect-[3/4] md:aspect-video bg-neutral-50 rounded-2xl overflow-hidden border border-black/[0.05] group">
                        <AssetPreview url={item.fileUrl} title={item.title} />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <p className="text-white text-xs font-medium opacity-80">Click full screen for better view</p>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTEXTUAL CONTENT */}
            {((isVideo && !item.fileUrl) || isChecklist || isWorkflow || hasChapters || (!item.fileUrl && !item.content && !isChecklist && !isWorkflow && !hasChapters)) && (
                <div className="bg-white rounded-xl border border-neutral-100 p-6">
                    {(isVideo && !item.fileUrl) ? (
                        <div className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                            <button className="relative z-10 w-16 h-16 rounded-full bg-white/90 flex items-center justify-center text-neutral-900 shadow-xl active:scale-90 transition-all duration-200 hover:bg-white inline-flex">
                                <Play className="w-6 h-6 ml-1" />
                            </button>
                        </div>
                    ) : isChecklist ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-neutral-900">Checklist Items</h3>
                                <span className="text-sm text-neutral-500">{checkedItems.size}/{item.checklistItems!.length} completed</span>
                            </div>
                            {item.checklistItems!.map((ci, idx) => (
                                <div key={idx} onClick={() => toggleCheck(idx.toString())} className={clsx("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all", checkedItems.has(idx.toString()) ? "bg-green-50 border-green-200" : "bg-white border-neutral-100 hover:border-neutral-200")}>
                                    <div className={clsx("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5", checkedItems.has(idx.toString()) ? "bg-green-500 text-white" : "border-2 border-neutral-300")}>
                                        {checkedItems.has(idx.toString()) && <Check className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1">
                                        <span className={clsx("text-sm", checkedItems.has(idx.toString()) ? "text-neutral-500 line-through" : "text-neutral-900")}>{ci.text}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : isWorkflow ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Workflow Steps</h3>
                            {item.workflowSteps!.map((step, idx) => (
                                <div key={idx} className="relative pl-8">
                                    <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                    {idx < item.workflowSteps!.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-neutral-200" />}
                                    <div className="bg-neutral-50 rounded-lg p-4 ml-2">
                                        <h4 className="font-semibold text-neutral-900 mb-1">{step.title}</h4>
                                        <p className="text-sm text-neutral-600">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : hasChapters ? (
                        <div className="prose prose-sm max-w-none">
                            <h2 className="text-lg font-semibold text-neutral-900 mb-4">{currentChapter?.title}</h2>
                            <div className="text-neutral-700 leading-relaxed whitespace-pre-line">{currentChapter?.content}</div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-neutral-400">No content available</div>
                    )}
                </div>
            )}
            {/* Related Items - Mobile only (desktop shows in sidebar) */}
            {!isShared && relatedItems.length > 0 && (
                <div className="md:hidden space-y-3 mt-2">
                    <h3 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">Related</h3>
                    <div className="space-y-2">
                        {relatedItems.map(related => (
                            <button
                                key={related.id}
                                onClick={() => router.push(`/frame/learn/${related.id}`)}
                                className="w-full text-left bg-white rounded-2xl px-4 py-3.5 border border-black/[0.05] flex items-center justify-between group hover:bg-neutral-50 active:scale-[0.98] transition-all duration-200"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <FileText size={16} className="text-neutral-400 shrink-0" />
                                    <span className="font-medium text-[14px] text-neutral-900 truncate">{related.title}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // --- Shared view: minimal wrapper covering the whole screen ---
    if (isShared) {
        return (
            <div className="min-h-[100dvh] bg-neutral-100 flex flex-col fixed inset-0 z-[99999]">
                {/* Header for shared view - glassy like Learn toolbar */}
                <div className="sticky top-0 z-10 pointer-events-none">
                    <div className={clsx(
                        "absolute inset-0 transition-all duration-500 pointer-events-none",
                        scrolled ? "bg-white/60 opacity-100" : "bg-white opacity-100"
                    )} style={{
                        maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                        backdropFilter: scrolled ? 'blur(16px)' : 'none',
                    }} />
                    <div className="flex items-center justify-between px-5 py-4 pointer-events-auto relative z-10">
                        <div className="flex items-center gap-2.5">
                            <img src="/logo-adidaya-red.svg" alt="Adidaya" className="w-6 h-6" />
                            <span className="font-bold text-[17px] text-neutral-900 tracking-tight">Adidaya</span>
                        </div>
                        {(item.fileUrl || (item.files && item.files.length > 0)) && (
                            <button
                                onClick={async () => {
                                    const files = item.files && item.files.length > 0 ? item.files : (item.fileUrl ? [{ file_url: item.fileUrl, name: item.title || 'download' }] : []);
                                    if (files.length === 0) return;
                                    if (files.length === 1) {
                                        handleDownload(files[0].file_url, files[0].name);
                                    } else {
                                        try {
                                            const zip = new JSZip();
                                            for (const file of files) {
                                                const response = await fetch(file.file_url);
                                                const blob = await response.blob();
                                                const ext = file.name.includes('.') ? '' : '.bin';
                                                zip.file(file.name + ext, blob);
                                            }
                                            const zipBlob = await zip.generateAsync({ type: 'blob' });
                                            const url = window.URL.createObjectURL(zipBlob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `${item.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'download'}_assets.zip`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            document.body.removeChild(a);
                                        } catch (err) {
                                            console.error('Zip download failed:', err);
                                            for (const file of files) {
                                                handleDownload(file.file_url, file.name);
                                            }
                                        }
                                    }
                                }}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-full text-[13px] font-bold flex items-center gap-2 hover:bg-blue-700 transition-all duration-200 active:scale-90"
                            >
                                <Download className="w-4 h-4" />
                                Download{item.files && item.files.length > 1 ? ` (${item.files.length})` : ''}
                            </button>
                        )}
                    </div>
                </div>

                <div
                    className="flex-1 overflow-y-auto pt-6 px-4 pb-12"
                    onScroll={(e) => {
                        const target = e.target as HTMLDivElement;
                        setScrolled(target.scrollTop > 10);
                    }}
                >
                    {pageContent}
                </div>

                {/* Zoom Modal */}
                {showZoomModal && (
                    <div className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent pb-8">
                            <h3 className="text-white font-medium text-sm drop-shadow-md">
                                {zoomAssetIndex >= 0 && item.files
                                    ? item.files[zoomAssetIndex].name
                                    : item.title}
                            </h3>
                            <button
                                onClick={() => { setShowZoomModal(false); setZoomLevel(1); }}
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white flex items-center justify-center transition-all duration-200 active:scale-90"
                            >
                                <CloseIcon size={20} />
                            </button>
                        </div>
                        <div className="w-full h-full p-4 md:p-12 flex items-center justify-center">
                            <div className="w-full h-full max-w-5xl rounded-lg overflow-hidden relative shadow-2xl ring-1 ring-white/10">
                                <AssetPreview
                                    url={zoomAssetIndex >= 0 && item.files ? item.files[zoomAssetIndex].file_url : (item.fileUrl || "")}
                                    title={item.title}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- Normal view ---
    return (
        <>
            {mobileTopBar}

            <div className="min-h-screen bg-neutral-50">
                <Breadcrumb items={[{ label: "Frame" }, { label: "Learn", href: "/frame/learn" }, { label: item.title }]} />

                <PageWrapper
                    sidebar={
                        <div className="hidden md:block">
                            <DetailSidebar
                                item={item}
                                activeChapter={activeChapter}
                                onChapterChange={setActiveChapter}
                                relatedItems={relatedItems}
                                onBack={() => router.push("/frame/learn")}
                                onItemClick={(id: string) => router.push(`/frame/learn/${id}`)}
                                canManage={true}
                                onEdit={() => setShowEditDrawer(true)}
                            />
                        </div>
                    }
                >
                    <div className="pt-28 pb-32 lg:pt-0 lg:pb-4">
                        {pageContent}
                    </div>
                </PageWrapper>

                {/* ZOOM MODAL */}
                {showZoomModal && (item.fileUrl || (item.files && item.files.length > 0)) && (
                    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-white">
                                <h2 className="text-lg font-bold">
                                    {zoomAssetIndex >= 0 && item.files && item.files[zoomAssetIndex] ? item.files[zoomAssetIndex].name : item.title}
                                </h2>
                                <p className="text-white/50 text-xs">Premium Asset Preview</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 rounded-full px-4 py-2 flex items-center gap-4 text-white border border-white/10">
                                    <button onClick={() => setZoomLevel(prev => Math.max(0.2, prev - 0.2))}><ZoomOut size={18} /></button>
                                    <span className="text-sm font-mono w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                                    <button onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.2))}><ZoomIn size={18} /></button>
                                </div>
                                <button
                                    onClick={() => { setShowZoomModal(false); setZoomLevel(1); }}
                                    className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/10 active:scale-95 transition-all"
                                >
                                    <CloseIcon size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center">
                            <div
                                style={{
                                    transform: `scale(${zoomLevel})`,
                                    transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                className="origin-center"
                            >
                                <AssetPreview
                                    url={zoomAssetIndex >= 0 && item.files && item.files[zoomAssetIndex] ? item.files[zoomAssetIndex].file_url : item.fileUrl || ""}
                                    title={zoomAssetIndex >= 0 && item.files && item.files[zoomAssetIndex] ? item.files[zoomAssetIndex].name : item.title}
                                    isZoomed
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile sidebar overlay - render empty to prevent PageWrapper from rendering it */}
        </>
    );
}

function AssetPreview({ url, title, isZoomed = false }: { url: string; title: string; isZoomed?: boolean }) {
    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i);
    const isPDF = url.match(/\.(pdf)$/i);

    if (isImage) {
        return (
            <img
                src={url}
                alt={title}
                className={clsx(
                    "w-full h-full object-contain",
                    !isZoomed && "pointer-events-none"
                )}
            />
        );
    }

    if (isPDF) {
        return (
            <iframe
                src={`${url}#toolbar=0&view=FitH`}
                className="w-full h-full border-none"
                title={title}
            />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-12 text-center text-neutral-400 gap-4">
            <FileText size={48} strokeWidth={1} />
            <div>
                <p className="text-sm font-bold text-neutral-600">Asset type not previewable</p>
                <p className="text-xs">Click Download for full access</p>
            </div>
        </div>
    );
}

function DetailSidebar({ item, activeChapter, onChapterChange, relatedItems, onBack, onItemClick, canManage, onEdit }: { item: KnowledgeItem; activeChapter: string; onChapterChange: (id: string) => void; relatedItems: KnowledgeItem[]; onBack: () => void; onItemClick: (id: string) => void; canManage?: boolean; onEdit?: () => void; }) {
    const hasChapters = item.chapters && item.chapters.length > 0 && item.type !== "CHECKLIST" && item.type !== "WORKFLOW";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                {canManage && (
                    <button
                        onClick={onEdit}
                        className="w-10 h-10 bg-white border border-black/5 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-50 shadow-sm active:scale-95 transition-all"
                    >
                        <Edit className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                )}
            </div>

            {hasChapters && (
                <div className="space-y-2">
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Contents</div>
                    <div className="space-y-0.5">
                        {item.chapters!.map((chapter, idx) => (
                            <button key={idx} onClick={() => onChapterChange(idx.toString())} className={clsx("w-full text-left rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2", activeChapter === idx.toString() ? "text-red-600 bg-red-50 font-medium" : "text-neutral-600 hover:bg-neutral-50")}>
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
