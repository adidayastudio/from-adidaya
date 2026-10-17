"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { ArrowLeft, Download, FileText, Save, Sparkles, Loader2 } from "lucide-react";
import { uploadProjectFile, getProjectFileSignedUrl } from "@/lib/api/storage";
import { createProjectDoc } from "@/lib/api/projects";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";

interface DocumentGeneratorProps {
    project: any;
    onClose: () => void;
}

const TEMPLATES = [
    { label: "Client Agreement (CON)", value: "agreement" },
    { label: "Project Kickoff Brief (OTH)", value: "kickoff" },
    { label: "Progress Invoice (INV)", value: "invoice" },
];

export default function DocumentGenerator({ project, onClose }: DocumentGeneratorProps) {
    const [templateType, setTemplateType] = useState("agreement");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form inputs
    const [clientName, setClientName] = useState(project.clientName || "PT. Klien Adidaya");
    const [contractValue, setContractValue] = useState("150,000,000");
    const [dateString, setDateString] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("INV/2026/001");
    const [progressPercent, setProgressPercent] = useState("30");
    const [paymentStages, setPaymentStages] = useState("1. Tahap Kickoff (10%)\n2. Tahap Schematic Design (20%)\n3. Tahap Design Development (40%)\n4. Tahap Handover (30%)");
    
    // Document text content
    const [docTitle, setDocTitle] = useState("");
    const [editorText, setEditorText] = useState("");

    const previewRef = useRef<HTMLDivElement>(null);

    // Set today's date on load
    useEffect(() => {
        const today = new Date();
        const dateStr = today.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        setDateString(dateStr);
    }, []);

    // Regenerate document text when template or inputs change
    useEffect(() => {
        if (templateType === "agreement") {
            setDocTitle(`Perjanjian Kerja Sama Desain - ${project.name}`);
            setEditorText(`SURAT PERJANJIAN KERJA SAMA DESAIN
No: PKS/${new Date().getFullYear()}/${project.code || "ADJ"}

Pada hari ini, ${dateString}, bertempat di Jakarta, kami yang bertanda tangan di bawah ini sepakat untuk menjalin kerja sama desain untuk proyek:

Nama Proyek: ${project.name}
Lokasi Proyek: ${project.address || "Jakarta"}

PIHAK PERTAMA (Penyedia Jasa):
Nama: PT Mahardika Adidaya (Adidaya Studio)
Alamat: Jakarta, Indonesia

PIHAK KEDUA (Pemilik Proyek / Klien):
Nama: ${clientName}

KEDUA BELAH PIHAK sepakat atas ketentuan-ketentuan berikut:

Pasal 1: Nilai Kontrak Kerja Sama
Nilai kontrak disepakati sebesar Rp ${contractValue},- (termasuk pajak jika berlaku).

Pasal 2: Tahapan Pembayaran
Pembayaran akan dilakukan secara bertahap dengan rincian:
${paymentStages}

Pasal 3: Hasil Desain
Pihak Pertama akan menyerahkan output berupa berkas visualisasi 3D, gambar kerja detail (DED), rancangan anggaran biaya (RAB), dan jadwal pelaksanaan proyek.

Demikian surat perjanjian ini dibuat dalam 2 rangkap asli yang memiliki kekuatan hukum yang sama.

Pihak Pertama,                        Pihak Kedua,



( Adidaya Studio )                    ( ${clientName} )`);
        } else if (templateType === "kickoff") {
            setDocTitle(`Project Kickoff Brief - ${project.name}`);
            setEditorText(`ADIDAYA STUDIO - KICKOFF BRIEF LAPORAN AWAL
Tanggal Terbit: ${dateString}

I. INFORMASI PROYEK
Nama Proyek: ${project.name}
Kode Proyek: ${project.projectNo || project.projectNumber || "000"}-${project.code || "ADJ"}
Tipe Layanan: ${project.type || "Design & Build"}

II. DETAIL KLIEN
Nama Klien: ${clientName}
Kontak Utama: ${project.clientContact || "—"}

III. DESKRIPSI RINGKAS & BRIEF RUANG
Proyek pembangunan/renovasi dengan target ruang dan spesifikasi awal sebagai berikut:
- Fungsi Utama: Residensial/Komersial
- Luas Area: ${project.buildingArea || "—"} m2
- Jumlah Lantai: ${project.floors || "—"} Lantai
- Kebutuhan Khusus: Konsep modern kontemporer dengan penekanan pada pencahayaan alami dan material lokal berkelanjutan.

IV. TANGGUNG JAWAB DISIPLIN
1. Arsitektur: Adidaya Studio
2. Interior: Adidaya Studio
3. MEP & Struktur: Tim Konsultan Mitra

Rapat Kickoff telah selesai diselenggarakan untuk menyepakati visi awal desain.`);
        } else if (templateType === "invoice") {
            setDocTitle(`Invoice ${invoiceNo} - ${project.name}`);
            setEditorText(`INVOICE TAGIHAN PROGRESS PROYEK
Adidaya Studio (PT Mahardika Adidaya)

Kepada Yth:
${clientName}
Proyek: ${project.name}

Nomor Invoice: ${invoiceNo}
Tanggal Invoice: ${dateString}
Jatuh Tempo: 14 hari dari tanggal invoice

Rincian Tagihan:
--------------------------------------------------------------------------
Deskripsi Layanan                                        Jumlah (IDR)
--------------------------------------------------------------------------
Termin Tagihan Progress Desain ke-${progressPercent}%
Proyek: ${project.name}                             Rp ${contractValue}

Subtotal: Rp ${contractValue}
Total Tagihan: Rp ${contractValue}

Metode Pembayaran:
Bank Mandiri Cabang Sudirman
No. Rekening: 124-00-9876543-2
Atas Nama: PT Mahardika Adidaya

Mohon mengirimkan bukti transfer setelah pembayaran dilakukan. Terima kasih atas kerja sama Anda.

Hormat Kami,
Adidaya Studio Finance`);
        }
    }, [templateType, clientName, contractValue, dateString, paymentStages, invoiceNo, progressPercent, project.name, project.code, project.address, project.projectNo, project.projectNumber, project.type, project.clientContact, project.buildingArea, project.floors]);

    // Generate PDF Blob
    const generatePdfBlob = async (): Promise<{ blob: Blob; fileName: string } | null> => {
        if (!previewRef.current) return null;
        try {
            const element = previewRef.current;
            const canvas = await html2canvas(element, {
                scale: 2.5, // High resolution
                useCORS: true,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

            const blob = pdf.output("blob");
            
            // Generate clean filename
            const cleanTitle = docTitle.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
            const today = new Date();
            const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const fileName = `${datePrefix}_${project.projectNo || project.projectNumber || "000"}_${project.code || "ADJ"}_${cleanTitle}.pdf`;

            return { blob, fileName };
        } catch (err) {
            console.error("PDF generation failed:", err);
            return null;
        }
    };

    // Download PDF locally
    const handleDownload = async () => {
        setIsGenerating(true);
        const downloadToast = toast.loading("Generating PDF download...");
        try {
            const res = await generatePdfBlob();
            if (res) {
                const url = URL.createObjectURL(res.blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = res.fileName;
                a.click();
                toast.success("PDF downloaded successfully!", { id: downloadToast });
            } else {
                toast.error("Failed to generate PDF.", { id: downloadToast });
            }
        } catch (e) {
            toast.error("Failed to generate PDF.", { id: downloadToast });
        } finally {
            setIsGenerating(false);
        }
    };

    // Save PDF directly to project documents (DB + Storage)
    const handleSaveToProject = async () => {
        setIsSaving(true);
        const saveToast = toast.loading("Generating and saving file to project...");
        try {
            const res = await generatePdfBlob();
            if (!res) {
                throw new Error("Could not compile document PDF.");
            }

            const storagePath = `${project.id}/${res.fileName}`;

            // 1. Upload to Supabase Storage
            const uploadedPath = await uploadProjectFile(new File([res.blob], res.fileName, { type: "application/pdf" }), storagePath);
            if (!uploadedPath) {
                throw new Error("Failed to upload generated file to storage.");
            }

            // 2. Fetch signed URL
            const signedUrl = await getProjectFileSignedUrl(uploadedPath);

            // Determine tag based on template
            let docTypeTag = "OTH";
            if (templateType === "agreement") docTypeTag = "CON";
            if (templateType === "invoice") docTypeTag = "INV";

            // Derive stage: default to SD
            const stageTag = "02-SD";
            
            // Format size
            const sizeStr = `${(res.blob.size / (1024 * 1024)).toFixed(2)} MB`;

            const tags = [docTypeTag, stageTag, "v1", sizeStr];

            // 3. Create document record
            const newDoc = await createProjectDoc({
                projectId: project.id,
                title: docTitle,
                docType: "file",
                url: signedUrl || "",
                storagePath: uploadedPath,
                content: editorText, // Store raw text inside content for future editing
                tags: tags,
                createdBy: undefined
            });

            if (!newDoc) {
                throw new Error("Failed to save document metadata in database.");
            }

            toast.success("Document saved to project successfully!", { id: saveToast });
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to save document to project.", { id: saveToast });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100 animate-in fade-in duration-300">
            {/* Header toolbar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="p-2 bg-white rounded-full border border-neutral-200 text-neutral-600 hover:text-neutral-900 shadow-sm transition-colors"
                        title="Back to Documents"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h3 className="font-bold text-neutral-900 text-lg">Document Generator</h3>
                        <p className="text-xs text-neutral-500">Create legal contracts, kickoff briefs, and invoices in seconds</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleDownload}
                        disabled={isGenerating || isSaving}
                        icon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    >
                        Download PDF
                    </Button>
                    <Button
                        onClick={handleSaveToProject}
                        disabled={isGenerating || isSaving}
                        className="!bg-red-600 hover:!bg-red-700 !text-white"
                        icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    >
                        Save to Project
                    </Button>
                </div>
            </div>

            {/* Editor Workspace Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Form: Inputs */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-neutral-100 space-y-4 shadow-sm">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500">Document Template</label>
                        <Select
                            options={TEMPLATES}
                            value={templateType}
                            onChange={setTemplateType}
                            selectSize="sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500">Document Title</label>
                        <Input
                            inputSize="sm"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                        />
                    </div>

                    <div className="h-px bg-neutral-100" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Template Fields</h4>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500">Client Name</label>
                        <Input
                            inputSize="sm"
                            placeholder="e.g. PT Klien Adidaya"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500">Value (IDR)</label>
                        <Input
                            inputSize="sm"
                            placeholder="e.g. 150,000,000"
                            value={contractValue}
                            onChange={(e) => setContractValue(e.target.value)}
                        />
                    </div>

                    {templateType === "agreement" && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-500">Payment Milestone Rincian</label>
                            <textarea
                                className="w-full text-xs p-2.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-red-500/50 min-h-[100px] font-sans"
                                value={paymentStages}
                                onChange={(e) => setPaymentStages(e.target.value)}
                            />
                        </div>
                    )}

                    {templateType === "invoice" && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-neutral-500">Invoice No</label>
                                <Input
                                    inputSize="sm"
                                    value={invoiceNo}
                                    onChange={(e) => setInvoiceNo(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-neutral-500">Progress %</label>
                                <Input
                                    inputSize="sm"
                                    value={progressPercent}
                                    onChange={(e) => setProgressPercent(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Form: Rich Editable Area + A4 Print Mockup Preview */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-neutral-100 flex items-center justify-between shadow-sm">
                        <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                            Live Editor: You can type and edit the generated template content directly below.
                        </span>
                    </div>

                    {/* Editor split screen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Editor Textarea */}
                        <div className="flex flex-col h-[650px]">
                            <textarea
                                className="w-full flex-1 p-4 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-red-500/50 shadow-sm font-mono text-xs leading-relaxed overflow-y-auto bg-neutral-900 text-neutral-100"
                                value={editorText}
                                onChange={(e) => setEditorText(e.target.value)}
                                placeholder="Edit contract contents here..."
                            />
                        </div>

                        {/* Print Preview Canvas */}
                        <div className="bg-neutral-200 p-4 rounded-2xl border border-neutral-300 shadow-inner flex justify-center items-start overflow-y-auto h-[650px]">
                            <div
                                id="document-preview-a4"
                                ref={previewRef}
                                className="w-[100%] bg-white p-10 shadow-lg text-neutral-800 font-sans text-[9px] leading-relaxed select-none min-h-[590px]"
                                style={{
                                    aspectRatio: "1/1.414", // A4 Aspect Ratio
                                    boxSizing: "border-box"
                                }}
                            >
                                {/* Letterhead style */}
                                <div className="border-b border-neutral-900 pb-4 mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-neutral-900 flex items-center justify-center text-white text-[10px] font-bold">A</div>
                                        <div>
                                            <h1 className="font-extrabold text-[10px] text-neutral-900 tracking-wider">ADIDAYA STUDIO</h1>
                                            <p className="text-[6px] text-neutral-500">PT Mahardika Adidaya · adidayastudio.com</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-[6px] text-neutral-400">
                                        Rukan Graha Cantik Blok B-8, Jakarta Barat<br />
                                        halo@adidayastudio.com · +62 21-5098-9000
                                    </div>
                                </div>

                                {/* Body formatted text */}
                                <div className="whitespace-pre-wrap font-sans text-neutral-800 leading-normal" style={{ fontSize: "8px" }}>
                                    {editorText}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
