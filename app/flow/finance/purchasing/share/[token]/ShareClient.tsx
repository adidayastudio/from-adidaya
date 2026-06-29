"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchVendorPortalByToken, uploadVendorPortalInvoice } from "@/lib/client/finance-api";
import { uploadFinanceFile, getFinanceFileUrl } from "@/lib/api/storage";
import { 
    UploadCloud, 
    FileText, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    ExternalLink, 
    Briefcase, 
    Receipt, 
    DollarSign, 
    ChevronDown, 
    ChevronUp, 
    Loader2, 
    X,
    FileCheck,
    Coins
} from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

interface ShareClientProps {
    token: string;
}

export default function ShareClient({ token }: ShareClientProps) {
    const [portal, setPortal] = useState<any>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Upload state
    const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);
    const [uploadNotes, setUploadNotes] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Collapsed request cards state
    const [expandedRequestIds, setExpandedRequestIds] = useState<string[]>([]);

    const loadPortalData = async () => {
        try {
            const data = await fetchVendorPortalByToken(token);
            setPortal(data.portal);
            
            // Resolve signed URLs for all invoices in requests
            const rawRequests = data.requests || [];
            const resolvedRequests = await Promise.all(
                rawRequests.map(async (req: any) => {
                    if (req.invoices && req.invoices.length > 0) {
                        const resolvedInvoices = await Promise.all(
                            req.invoices.map(async (inv: any) => {
                                if (inv.invoice_url && !inv.invoice_url.startsWith("http")) {
                                    const signedUrl = await getFinanceFileUrl(inv.invoice_url);
                                    return { ...inv, invoice_url: signedUrl || inv.invoice_url };
                                }
                                return inv;
                            })
                        );
                        return { ...req, invoices: resolvedInvoices };
                    }
                    return req;
                })
            );
            
            setRequests(resolvedRequests);
            // Expand all by default initially
            if (resolvedRequests.length > 0) {
                setExpandedRequestIds(resolvedRequests.map((r: any) => r.id));
            }
        } catch (err: any) {
            console.error("Error loading vendor portal data:", err);
            setError(err.message || "Failed to load vendor portal. Please check the link or contact your project administrator.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPortalData();
    }, [token]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
        }
    };

    const toggleExpand = (id: string) => {
        if (expandedRequestIds.includes(id)) {
            setExpandedRequestIds(expandedRequestIds.filter(x => x !== id));
        } else {
            setExpandedRequestIds([...expandedRequestIds, id]);
        }
    };

    const handleUploadSubmit = async (requestId: string) => {
        if (!uploadFile) return;

        setIsSubmitting(true);
        try {
            // 1. Upload to Supabase Storage first
            const path = await uploadFinanceFile(uploadFile, "invoices");
            if (!path) {
                throw new Error("Failed to upload file to storage");
            }

            // 2. Associate with the purchase request
            const success = await uploadVendorPortalInvoice({
                token,
                request_id: requestId,
                invoice_url: path,
                invoice_name: uploadFile.name
            });

            if (success) {
                setUploadFile(null);
                setUploadNotes("");
                setUploadingRequestId(null);
                // Reload data
                await loadPortalData();
            } else {
                alert("Failed to associate invoice with request. Please try again.");
            }
        } catch (err: any) {
            console.error("Invoice upload error:", err);
            alert(err.message || "An error occurred during invoice upload.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate Summary Stats
    const stats = useMemo(() => {
        if (!requests.length) return { totalAmount: 0, outstandingAmount: 0, paidCount: 0, totalCount: 0 };
        const totalAmount = requests.reduce((sum, r) => sum + (r.amount || 0), 0);
        const outstandingAmount = requests
            .filter(r => r.financial_status !== 'PAID')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        const paidCount = requests.filter(r => r.financial_status === 'PAID').length;
        const totalCount = requests.length;
        return { totalAmount, outstandingAmount, paidCount, totalCount };
    }, [requests]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-4">
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-14 h-14 rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-rose-500 animate-spin" />
                    <img src="/logo-adidaya-red.svg" alt="Adidaya Logo" className="w-6 h-6 animate-pulse" />
                </div>
                <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 tracking-widest uppercase mt-2 animate-pulse">Loading secure portal...</p>
            </div>
        );
    }

    if (error || !portal) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Portal Error</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{error || "Invalid vendor portal token."}</p>
                    </div>
                    <div className="pt-2">
                        <a 
                            href="https://adidayastudio.com" 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-700"
                        >
                            Visit Adidaya Studio <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 transition-colors duration-300">
            {/* Ambient glows */}
            <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-400/20 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/20 blur-[150px] rounded-full" />
            </div>

            {/* Header */}
            <header className="border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo-adidaya-red.svg" alt="Adidaya" className="w-7 h-7" />
                        <span className="font-black text-sm text-neutral-900 dark:text-white tracking-tight uppercase">Adidaya Studio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Secure Vendor Portal</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Vendor Info & Stats Summary */}
                    <div className="space-y-6 lg:col-span-1">
                        <div className="bg-white/60 dark:bg-neutral-900/60 border border-white/80 dark:border-neutral-800/60 rounded-[32px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] backdrop-blur-xl">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Vendor Partner</span>
                                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-snug break-words">
                                        {portal.vendor_name}
                                    </h1>
                                </div>
                                <div className="h-[1px] bg-neutral-200/50 dark:bg-neutral-800/50" />
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    Welcome to your billing portal. Here you can track your purchase orders (POs) from Adidaya Studio, upload invoices, and monitor payment status.
                                </p>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* Card 1: Total Amount */}
                            <div className="bg-white/60 dark:bg-neutral-900/60 border border-white/80 dark:border-neutral-800/60 rounded-3xl p-5 flex items-center gap-4 backdrop-blur-xl">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total PO Value</div>
                                    <div className="text-lg font-black text-neutral-900 dark:text-white mt-0.5 truncate">{formatCurrency(stats.totalAmount)}</div>
                                </div>
                            </div>

                            {/* Card 2: Outstanding (Unpaid) */}
                            <div className="bg-white/60 dark:bg-neutral-900/60 border border-white/80 dark:border-neutral-800/60 rounded-3xl p-5 flex items-center gap-4 backdrop-blur-xl">
                                <div className={clsx(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                    stats.outstandingAmount > 0 
                                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-500" 
                                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
                                )}>
                                    <Coins className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Outstanding (Unpaid)</div>
                                    <div className="text-lg font-black text-neutral-900 dark:text-white mt-0.5 truncate">
                                        {formatCurrency(stats.outstandingAmount)}
                                    </div>
                                    <div className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5">
                                        {stats.paidCount} / {stats.totalCount} Paid
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Linked Purchase Requests */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white px-2">Associated Purchase Orders</h2>

                        {requests.length === 0 ? (
                            <div className="bg-white/40 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl py-16 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto">
                                    <Receipt className="w-8 h-8 text-neutral-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">No active orders</h3>
                                    <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1">There are no purchase orders linked to this portal yet.</p>
                                </div>
                            </div>
                        ) : (
                            requests.map((req) => {
                                const isExpanded = expandedRequestIds.includes(req.id);
                                const poIdStr = req.request_number 
                                    ? `PO-${req.project?.project_number || req.project_number}-${req.request_number}`
                                    : `PO-${req.id.slice(0, 8).toUpperCase()}`;

                                // Determine Status Details
                                const isPaid = req.financial_status === "PAID";
                                const isAwaitingPayment = req.financial_status === "UNPAID" && req.purchase_stage === "INVOICED";
                                const isAwaitingInvoice = req.purchase_stage === "APPROVED" && (!req.invoices || req.invoices.length === 0);

                                return (
                                    <div 
                                        key={req.id}
                                        className="bg-white/40 dark:bg-neutral-900/40 border border-white/60 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all"
                                    >
                                        {/* Card Header */}
                                        <div 
                                            onClick={() => toggleExpand(req.id)}
                                            className="px-6 py-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/20 dark:hover:bg-neutral-800/10 transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-black text-neutral-900 dark:text-white tracking-tight">{poIdStr}</span>
                                                    <span className="text-[11px] font-medium text-neutral-400 tabular-nums">
                                                        • {format(new Date(req.date), "dd MMM yyyy")}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate max-w-sm sm:max-w-md">{req.description}</p>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                {/* Status Badge */}
                                                {isPaid ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Paid
                                                    </span>
                                                ) : isAwaitingPayment ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 flex items-center gap-1">
                                                        <FileCheck className="w-3 h-3" /> Awaiting Payment
                                                    </span>
                                                ) : isAwaitingInvoice ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 animate-pulse" /> Awaiting Invoice
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-700 flex items-center gap-1">
                                                        {req.purchase_stage || "Processing"}
                                                    </span>
                                                )}

                                                <button className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-400">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        {isExpanded && (
                                            <div className="px-6 pb-6 border-t border-neutral-100 dark:border-neutral-800 bg-white/20 dark:bg-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {/* PO Details Table */}
                                                <div className="mt-5 space-y-4">
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5">Item Breakdown</h4>
                                                        <div className="border border-neutral-100 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white/40 dark:bg-neutral-900/40">
                                                            <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                    <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-bold">
                                                                        <th className="px-4 py-2">Item Name</th>
                                                                        <th className="px-4 py-2 text-center w-20">Quantity</th>
                                                                        <th className="px-4 py-2 text-right w-28">Unit Price</th>
                                                                        <th className="px-4 py-2 text-right w-28">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                                                                    {req.items && req.items.length > 0 ? (
                                                                        req.items.map((item: any) => (
                                                                            <tr key={item.id} className="hover:bg-white/30 dark:hover:bg-neutral-800/20 font-medium">
                                                                                <td className="px-4 py-2.5">{item.name}</td>
                                                                                <td className="px-4 py-2.5 text-center">{item.qty} {item.unit || "pcs"}</td>
                                                                                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(item.unit_price || 0)}</td>
                                                                                <td className="px-4 py-2.5 text-right font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(item.total || 0)}</td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td className="px-4 py-3" colSpan={4}>{req.description || "General Purchase order items"}</td>
                                                                        </tr>
                                                                    )}
                                                                    <tr className="bg-neutral-50/30 dark:bg-neutral-800/20 font-bold border-t border-neutral-100 dark:border-neutral-800">
                                                                        <td className="px-4 py-3" colSpan={2}>Grand Total</td>
                                                                        <td className="px-4 py-3 text-right" colSpan={2}>
                                                                            <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                                                                                {formatCurrency(req.amount || 0)}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    {/* Invoices List */}
                                                    {req.invoices && req.invoices.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Uploaded Invoices</h4>
                                                            <div className="flex flex-col gap-2.5">
                                                                {req.invoices.map((inv: any) => (
                                                                    <div 
                                                                        key={inv.id}
                                                                        className="flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-xs font-medium"
                                                                    >
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                                                                <FileText size={16} />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="font-bold text-neutral-900 dark:text-white truncate">{inv.invoice_name || "Invoice File"}</div>
                                                                                <div className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                                                                                    Uploaded: {format(new Date(inv.created_at), "dd MMM yyyy HH:mm")}
                                                                                    {inv.notes && <span className="truncate max-w-[200px]" title={inv.notes}>• Notes: {inv.notes}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <a 
                                                                            href={inv.invoice_url} 
                                                                            target="_blank" 
                                                                            rel="noreferrer"
                                                                            className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-bold transition-all shrink-0"
                                                                        >
                                                                            View
                                                                        </a>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Upload Invoice Section */}
                                                    {isAwaitingInvoice && (
                                                        <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 bg-white/20 dark:bg-neutral-900/10">
                                                            {uploadingRequestId === req.id ? (
                                                                <div className="space-y-4">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Invoice Submission Form</span>
                                                                        <button 
                                                                            onClick={() => {
                                                                                setUploadingRequestId(null);
                                                                                setUploadFile(null);
                                                                                setUploadNotes("");
                                                                            }}
                                                                            className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-200"
                                                                        >
                                                                            <X size={14} className="text-neutral-500" />
                                                                        </button>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        {/* File Input */}
                                                                        {!uploadFile ? (
                                                                            <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-rose-500 dark:hover:border-rose-500/50 rounded-2xl cursor-pointer bg-white/40 hover:bg-white/60 dark:bg-neutral-900/20 dark:hover:bg-neutral-900/40 transition-all">
                                                                                <UploadCloud className="w-8 h-8 text-neutral-400 mb-2 group-hover:text-rose-500" />
                                                                                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Click to upload Invoice PDF / Image</span>
                                                                                <span className="text-[10px] text-neutral-400 mt-1">Accepts PDF, JPG, PNG (Max 10MB)</span>
                                                                                <input 
                                                                                    type="file" 
                                                                                    accept=".pdf,image/*" 
                                                                                    onChange={handleFileChange} 
                                                                                    className="hidden" 
                                                                                />
                                                                            </label>
                                                                        ) : (
                                                                            <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                                                                                <div className="flex items-center gap-3 min-w-0">
                                                                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                                                                        <FileText size={20} />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">{uploadFile.name}</div>
                                                                                        <div className="text-[10px] text-neutral-400 mt-0.5">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</div>
                                                                                    </div>
                                                                                </div>
                                                                                <button 
                                                                                    onClick={() => setUploadFile(null)}
                                                                                    className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-500 rounded-lg"
                                                                                >
                                                                                    <X size={14} />
                                                                                </button>
                                                                            </div>
                                                                        )}

                                                                        {/* Notes input */}
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1">Optional Notes</label>
                                                                            <textarea
                                                                                value={uploadNotes}
                                                                                onChange={(e) => setUploadNotes(e.target.value)}
                                                                                placeholder="Enter invoice date, billing notes, or invoice number here..."
                                                                                className="w-full text-xs font-medium p-3 border border-neutral-200 dark:border-neutral-800 bg-white/50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                                                                rows={2}
                                                                            />
                                                                        </div>

                                                                        {/* Submit */}
                                                                        <button
                                                                            onClick={() => handleUploadSubmit(req.id)}
                                                                            disabled={!uploadFile || isSubmitting}
                                                                            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 disabled:opacity-50"
                                                                        >
                                                                            {isSubmitting ? (
                                                                                <>
                                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading invoice...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <UploadCloud size={14} /> Submit & Request Payment
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center py-4 space-y-3">
                                                                    <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                                                        <Receipt size={20} />
                                                                    </div>
                                                                    <div className="text-center space-y-1">
                                                                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Invoice Required</h4>
                                                                        <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto">This order is approved. Please upload your invoice to request payment.</p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => setUploadingRequestId(req.id)}
                                                                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-rose-500/10"
                                                                    >
                                                                        Upload Invoice
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-20 border-t border-neutral-200/50 dark:border-neutral-800/50 py-10 bg-white/20 dark:bg-neutral-900/20">
                <div className="max-w-6xl mx-auto px-6 text-center text-xs font-medium text-neutral-400">
                    <div>© {new Date().getFullYear()} Adidaya Studio. All Rights Reserved.</div>
                </div>
            </footer>
        </div>
    );
}
