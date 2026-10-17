import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { ADIDAYA_RED_LOGO_BASE64 } from './adidayaLogoBase64';

export interface FinanceExportFileItem {
    url: string;
    name: string;
    path?: string;
}

export function formatFinanceDate(val?: string | null): string {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return String(val);
    }
}

export function formatFinanceDateTime(val?: string | null): string {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        const dateStr = d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        const timeStr = d.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        return `${dateStr}, ${timeStr}`;
    } catch {
        return String(val);
    }
}

export function formatFinanceCurrency(amount?: number | string | null): string {
    if (amount === null || amount === undefined || amount === '') return 'Rp 0';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

export function isImageFile(urlOrName?: string | null): boolean {
    if (!urlOrName) return false;
    if (urlOrName.startsWith('data:image/')) return true;
    const clean = urlOrName.split('?')[0].toLowerCase();
    return /\.(jpg|jpeg|png|webp|gif|heic|bmp)$/i.test(clean);
}

export function isAttachmentImage(item: any): boolean {
    if (!item) return false;
    if (typeof item === 'string') return isImageFile(item);
    if (item.url && item.url.startsWith('data:image/')) return true;
    if (isImageFile(item.url)) return true;
    if (isImageFile(item.name)) return true;
    if (isImageFile(item.path)) return true;
    return false;
}

/**
 * Generate official, high-fidelity printable HTML for a Finance Request
 */
export function generateFinanceRequestHtml(
    request: any,
    tenantOrName?: any,
    invoices: FinanceExportFileItem[] = [],
    proofs: FinanceExportFileItem[] = [],
    approvalChain: any[] = []
): string {
    const tenantObj = typeof tenantOrName === 'object' ? tenantOrName : null;
    const tenantName = tenantObj?.branding_name || tenantObj?.name || (typeof tenantOrName === 'string' ? tenantOrName : 'Adidaya Studio');
    const isAdidaya = !tenantObj || (
        (tenantName || '').toLowerCase().includes('adidaya') ||
        (tenantObj?.company_code || '').toLowerCase() === 'ady' ||
        (tenantObj?.slug || '').toLowerCase().includes('adidaya')
    );
    const tenantLogo = tenantObj?.branding_logo_url || tenantObj?.logo_url || null;

    const generateDate = formatFinanceDateTime(new Date().toISOString());
    const refNumber = request.ref || request.code || request.shortRef || 'FIN-REQUEST';
    const requestType = (request.purchase_stage || request.purchase_stage_id || request.vendor) ? 'Purchase Request' : 'Reimbursement';
    
    const projectCode = request.project_obj?.project_code || request.project?.project_code || request.project || '—';
    const projectName = request.project_obj?.project_name || request.project?.project_name || '';
    const projectDisplayText = projectName && projectName !== projectCode ? `${projectCode} — ${projectName}` : projectCode;

    const submitter = request.submitted_by_name || request.approved_by_name || request.submitter || '—';
    const invoiceDate = formatFinanceDate(request.date || request.invoice_date || request.created_at);
    const targetDate = request.target_date || request.due_date ? formatFinanceDate(request.target_date || request.due_date) : null;
    const category = request.type || request.category || 'General';
    const subcategory = request.subcategory || '—';
    const priority = (request.priority || 'Normal').toUpperCase();
    const orderStage = request.purchase_stage || request.order_stage || request.stage || null;
    const vendor = request.vendor || request.vendor_name || null;
    const description = request.description || request.notes || request.title || '—';
    const rawStatus = (request.statusTag || request.status || 'Submitted').toUpperCase();

    // Priority color
    let priorityColor = '#3B82F6';
    if (priority === 'URGENT' || priority === 'HIGH') priorityColor = '#EF4444';
    else if (priority === 'MEDIUM') priorityColor = '#F59E0B';
    else if (priority === 'LOW') priorityColor = '#10B981';

    // Status color
    let statusBg = '#EFF6FF';
    let statusColor = '#1D4ED8';
    let statusBorder = '#BFDBFE';
    if (rawStatus === 'APPROVED' || rawStatus === 'COMPLETED' || rawStatus === 'PAID') {
        statusBg = '#ECFDF5';
        statusColor = '#047857';
        statusBorder = '#A7F3D0';
    } else if (rawStatus === 'REJECTED' || rawStatus === 'CANCELLED') {
        statusBg = '#FEF2F2';
        statusColor = '#B91C1C';
        statusBorder = '#FECACA';
    } else if (rawStatus.includes('REVIS') || rawStatus === 'PENDING') {
        statusBg = '#FFFBEB';
        statusColor = '#B45309';
        statusBorder = '#FDE68A';
    }

    const totalAmount = formatFinanceCurrency(request.amount || request.total_amount || 0);

    // Combine attachments
    const allAttachments = [
        ...invoices.map((inv, idx) => ({ ...inv, label: inv.name || `Invoice / Receipt ${idx + 1}`, type: 'Receipt' })),
        ...proofs.map((prf, idx) => ({ ...prf, label: prf.name || `Payment Proof ${idx + 1}`, type: 'Payment Proof' })),
    ];

    const imageAttachments = allAttachments.filter(a => isAttachmentImage(a));
    const nonImageAttachments = allAttachments.filter(a => !isAttachmentImage(a));

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>${refNumber} - ${tenantName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #F3F4F6;
            color: #111827;
            font-size: 12px;
            line-height: 1.5;
        }
        @media screen {
            body {
                padding: 24px 16px;
                display: flex;
                justify-content: center;
                min-height: 100vh;
            }
            .page-sheet {
                background: #FFFFFF;
                width: 100%;
                max-width: 820px;
                padding: 36px 42px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.08);
                border-radius: 8px;
            }
        }
        @media print {
            @page {
                size: A4 portrait;
                margin: 14mm 12mm;
            }
            body {
                background: #FFFFFF;
                padding: 0;
            }
            .page-sheet {
                width: 100%;
                max-width: 100%;
                padding: 0;
                box-shadow: none;
                border-radius: 0;
            }
        }

        /* 1. TOP DOCUMENT HEADER (Left: Logo + Name, Right: Ref + Gen Date) */
        .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #111827;
            padding-bottom: 14px;
            margin-bottom: 20px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .tenant-logo {
            max-height: 40px;
            max-width: 150px;
            object-fit: contain;
            flex-shrink: 0;
        }
        .tenant-fallback-emblem {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: #159957;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 16px;
            letter-spacing: -0.5px;
        }
        .tenant-name {
            font-size: 19px;
            font-weight: 800;
            color: #111827;
            margin: 0;
            letter-spacing: -0.4px;
        }
        .tenant-sub {
            font-size: 10px;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 1px;
        }
        .header-right {
            text-align: right;
        }
        .doc-ref-number {
            font-size: 15px;
            font-weight: 800;
            color: #111827;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            letter-spacing: -0.3px;
        }
        .doc-gen-date {
            font-size: 10.5px;
            color: #6B7280;
            margin-top: 2px;
        }

        /* 2. SUMMARY BANNER */
        .summary-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 24px;
        }
        .banner-left h1 {
            font-size: 17px;
            font-weight: 700;
            margin: 0 0 4px 0;
            color: #111827;
        }
        .banner-left .type-sub {
            font-size: 11.5px;
            color: #6B7280;
        }
        .banner-right {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
        }
        .status-pill {
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.5px;
            padding: 3px 10px;
            border-radius: 12px;
            background: ${statusBg};
            color: ${statusColor};
            border: 1px solid ${statusBorder};
        }
        .amount-display {
            font-size: 20px;
            font-weight: 800;
            color: #111827;
            letter-spacing: -0.5px;
        }

        /* 3. SECTION STYLES */
        .section-block {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 11px;
            font-weight: 800;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 6px;
            margin-bottom: 12px;
        }

        /* Grid Rows */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 28px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding-bottom: 6px;
            border-bottom: 1px dashed #E5E7EB;
            gap: 12px;
        }
        .info-label {
            font-size: 11.5px;
            color: #6B7280;
            font-weight: 500;
            flex-shrink: 0;
        }
        .info-val {
            font-size: 11.5px;
            color: #111827;
            font-weight: 600;
            text-align: right;
            word-break: break-word;
        }
        .priority-indicator {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            color: ${priorityColor};
            font-weight: 700;
        }
        .priority-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: ${priorityColor};
            display: inline-block;
        }

        .desc-box {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 11.5px;
            color: #1F2937;
            margin-top: 10px;
            white-space: pre-wrap;
        }

        /* Approval Table */
        .approval-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        .approval-table th {
            text-align: left;
            background: #F9FAFB;
            padding: 8px 10px;
            font-weight: 700;
            color: #4B5563;
            border-bottom: 1px solid #E5E7EB;
        }
        .approval-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #F3F4F6;
            color: #111827;
        }

        /* 4. EMBEDDED ATTACHMENTS (Images & Docs) */
        .embedded-section {
            page-break-before: auto;
            margin-top: 24px;
        }
        .attachment-card {
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            margin-bottom: 16px;
            background: #FFFFFF;
            page-break-inside: auto;
        }
        .attachment-header {
            background: #F9FAFB;
            padding: 8px 14px;
            border-bottom: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .attachment-title {
            font-weight: 700;
            font-size: 11px;
            color: #374151;
        }
        .attachment-type-badge {
            font-size: 9.5px;
            background: #E5E7EB;
            color: #374151;
            padding: 2px 7px;
            border-radius: 4px;
            font-weight: 600;
        }
        .attachment-img-wrapper {
            padding: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #FAFAFA;
        }
        .attachment-img {
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .doc-attachment-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            margin-bottom: 8px;
            page-break-inside: avoid;
        }
        .doc-attachment-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .doc-badge-icon {
            background: #EF4444;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 9px;
            padding: 3px 6px;
            border-radius: 4px;
            letter-spacing: 0.5px;
        }
        .doc-attachment-name {
            font-weight: 600;
            color: #111827;
            font-size: 11.5px;
        }
        .doc-attachment-link {
            font-size: 11px;
            color: #2563EB;
            text-decoration: none;
            font-weight: 600;
        }

        /* 5. FOOTER */
        .doc-footer {
            margin-top: 32px;
            padding-top: 12px;
            border-top: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #9CA3AF;
        }

        /* Payment Details */
        .payment-card {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 12px 16px;
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        .payment-bank {
            font-size: 15px;
            font-weight: 700;
            color: #111827;
        }
        .payment-number {
            font-size: 15px;
            font-weight: 700;
            color: #111827;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .payment-beneficiary {
            font-size: 13px;
            color: #4B5563;
            font-weight: 500;
        }

        /* Items List Table */
        .items-table {
            width: 100% !important;
            table-layout: fixed;
            border-collapse: collapse;
            margin-top: 8px;
            box-sizing: border-box;
        }
        .items-table th {
            background: #F3F4F6;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #4B5563;
            padding: 8px 12px;
            border-top: 1px solid #E5E7EB;
            border-bottom: 1px solid #E5E7EB;
        }
        .items-table th:nth-child(1),
        .items-table td:nth-child(1) {
            width: 50%;
            text-align: left;
        }
        .items-table th:nth-child(2),
        .items-table td:nth-child(2) {
            width: 25%;
            text-align: right;
        }
        .items-table th:nth-child(3),
        .items-table td:nth-child(3) {
            width: 25%;
            text-align: right;
        }
        .items-table td {
            padding: 10px 12px;
            font-size: 13px;
            border-bottom: 1px solid #F3F4F6;
            vertical-align: middle;
        }
        .item-name {
            font-weight: 600;
            color: #111827;
        }
        .item-notes {
            font-size: 11px;
            color: #6B7280;
            margin-top: 2px;
        }

        /* Additional Notes Box */
        .notes-box {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 12px 14px;
            font-size: 13px;
            color: #374151;
            line-height: 1.5;
        }
        .notes-empty {
            font-style: italic;
            color: #9CA3AF;
        }

        .tenant-logo-svg {
            width: 36px;
            height: 36px;
            display: inline-block;
            vertical-align: middle;
            flex-shrink: 0;
        }
    </style>
</head>
<body>
    <div class="page-sheet">
        <!-- 1. HEADER (Kiri: Logo + Nama Tenant, Kanan: No Pengajuan + Tanggal Generate) -->
        <div class="doc-header">
            <div class="header-left">
                ${isAdidaya ? `
                    <img src="${ADIDAYA_RED_LOGO_BASE64}" alt="${tenantName}" class="tenant-logo" style="width: 38px; height: 38px; object-fit: contain; flex-shrink: 0;" />
                ` : (tenantLogo ? `
                    <img src="${tenantLogo}" alt="${tenantName}" class="tenant-logo" style="max-height: 38px; max-width: 120px; object-fit: contain;" />
                ` : `
                    <div class="tenant-fallback-emblem">${tenantName.charAt(0).toUpperCase()}</div>
                `)}
                <div>
                    <div class="tenant-name">${tenantName}</div>
                    <div class="tenant-sub">Finance Department</div>
                </div>
            </div>
            <div class="header-right">
                <div class="doc-ref-number">${refNumber}</div>
                <div class="doc-gen-date">Generated: ${generateDate}</div>
            </div>
        </div>

        <!-- 2. SUMMARY BANNER -->
        <div class="summary-banner">
            <div class="banner-left">
                <h1>${requestType}</h1>
                <div class="type-sub">Project: <strong>${projectDisplayText}</strong></div>
            </div>
            <div class="banner-right">
                <span class="status-pill">${rawStatus}</span>
                <div class="amount-display">${totalAmount}</div>
            </div>
        </div>

        <!-- 3. GENERAL INFORMATION -->
        <div class="section-block">
            <div class="section-title">General Information</div>
            <div class="info-grid">
                <!-- Row 1: Request Type & Submitter -->
                <div class="info-item">
                    <span class="info-label">Request Type</span>
                    <span class="info-val">${requestType}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Submitter</span>
                    <span class="info-val">${submitter}</span>
                </div>

                <!-- Row 2: Date sebelahan sama Date -->
                <div class="info-item">
                    <span class="info-label">Invoice Date</span>
                    <span class="info-val">${invoiceDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Target Date</span>
                    <span class="info-val">${targetDate || '—'}</span>
                </div>

                <!-- Row 3: Category sebelahan sama Subcategory -->
                <div class="info-item">
                    <span class="info-label">Category</span>
                    <span class="info-val">${category}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Subcategory</span>
                    <span class="info-val">${subcategory}</span>
                </div>

                <!-- Row 4: Priority & Order Stage / Vendor -->
                <div class="info-item">
                    <span class="info-label">Priority</span>
                    <span class="info-val priority-indicator">
                        <span class="priority-dot"></span>
                        ${priority}
                    </span>
                </div>
                ${orderStage ? `
                <div class="info-item">
                    <span class="info-label">Order Stage</span>
                    <span class="info-val">${orderStage}</span>
                </div>
                ` : (vendor ? `
                <div class="info-item">
                    <span class="info-label">Vendor</span>
                    <span class="info-val">${vendor}</span>
                </div>
                ` : `
                <div class="info-item"></div>
                `)}

                <!-- Row 5 (if both order stage & vendor exist) -->
                ${(orderStage && vendor) ? `
                <div class="info-item">
                    <span class="info-label">Vendor</span>
                    <span class="info-val">${vendor}</span>
                </div>
                <div class="info-item"></div>
                ` : ''}
            </div>

            <!-- Description -->
            <div style="margin-top: 14px;">
                <span class="info-label" style="display: block; margin-bottom: 4px;">Description / Notes</span>
                <div class="desc-box">${description}</div>
            </div>
        </div>

        <!-- 4. ITEMS LIST (Breakdown) -->
        ${(request.items && request.items.length > 0) ? `
        <div class="section-block">
            <div class="section-title">Items List (${request.items.length})</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item & Description</th>
                        <th style="text-align: right;">Qty & Rate</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${request.items.map((item: any, idx: number) => {
                        const qty = item.qty || 1;
                        const unit = item.unit || 'pcs';
                        const unitPrice = item.unit_price || item.unitPrice || 0;
                        const lineTotal = item.amount || item.total_price || (qty * unitPrice);
                        return `
                        <tr>
                            <td>
                                <div class="item-name">${item.name || item.description || `Item #${idx + 1}`}</div>
                                ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
                            </td>
                            <td style="text-align: right; color: #4B5563;">
                                ${qty} ${unit} × ${formatFinanceCurrency(unitPrice)}
                            </td>
                            <td style="text-align: right; font-weight: 700; color: #111827;">
                                ${formatFinanceCurrency(lineTotal)}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="font-weight: 700; text-align: right; padding-top: 10px; border-top: 1px solid #E5E7EB;">Subtotal Items:</td>
                        <td style="font-weight: 800; text-align: right; padding-top: 10px; border-top: 1px solid #E5E7EB; color: #111827;">${totalAmount}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        ` : ''}

        <!-- 5. PAYMENT DETAILS -->
        ${(request.beneficiary_bank || request.beneficiary_number || request.beneficiary_name) ? `
        <div class="section-block">
            <div class="section-title">Payment Details</div>
            <div class="payment-card">
                <div class="payment-row">
                    <span class="payment-bank">${request.beneficiary_bank || 'Bank Transfer'}</span>
                    ${request.beneficiary_number ? `<span class="payment-number">${request.beneficiary_number}</span>` : ''}
                </div>
                ${request.beneficiary_name ? `<div class="payment-beneficiary">${request.beneficiary_name}</div>` : ''}
            </div>
        </div>
        ` : ''}

        <!-- 6. ADDITIONAL NOTES -->
        <div class="section-block">
            <div class="section-title">Additional Notes</div>
            <div class="notes-box">
                ${request.notes ? request.notes : '<span class="notes-empty">No notes provided</span>'}
            </div>
        </div>

        <!-- 7. APPROVAL WORKFLOW (If any) -->
        ${approvalChain && approvalChain.length > 0 ? `
        <div class="section-block">
            <div class="section-title">Approval Workflow</div>
            <table class="approval-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">Level</th>
                        <th style="width: 30%;">Designated Role</th>
                        <th style="width: 30%;">Assignee</th>
                        <th style="width: 25%; text-align: right;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${approvalChain.map((app, idx) => {
                        const lvlName = approvalChain.length > 1 ? `L${idx + 1}` : 'Level 1';
                        const role = app.positionTitle || 'Approver';
                        const person = app.personName || 'Designated Role';
                        const isApproved = (app.status || '').toLowerCase() === 'approved';
                        const appStatus = isApproved ? 'Approved' : (idx === 0 ? 'Pending' : 'Submitted');
                        return `
                        <tr>
                            <td><strong>${lvlName}</strong></td>
                            <td>${role}</td>
                            <td>${person}</td>
                            <td style="text-align: right; font-weight: 700; color: ${isApproved ? '#059669' : '#D97706'};">
                                ${appStatus}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <!-- 8. EMBEDDED ATTACHMENTS (Images & Files) -->
        ${(imageAttachments.length > 0 || nonImageAttachments.length > 0) ? `
        <div class="section-block embedded-section">
            <div class="section-title">Embedded Documents & Attachments (${allAttachments.length})</div>
            
            <!-- Embedded Images -->
            ${imageAttachments.map((img) => `
                <div class="attachment-card">
                    <div class="attachment-header">
                        <span class="attachment-title">${img.label}</span>
                        <span class="attachment-type-badge">${img.type}</span>
                    </div>
                    <div class="attachment-img-wrapper">
                        <img src="${img.url}" alt="${img.label}" class="attachment-img" />
                    </div>
                </div>
            `).join('')}

            <!-- Document Links / Files -->
            ${nonImageAttachments.map((doc) => `
                <div class="doc-attachment-item">
                    <div class="doc-attachment-left">
                        <span class="doc-badge-icon">PDF</span>
                        <span class="doc-attachment-name">${doc.label}</span>
                    </div>
                    <a href="${doc.url}" target="_blank" class="doc-attachment-link">Open Official File ↗</a>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- 9. FOOTER -->
        <div class="doc-footer">
            <span>Forma Finance Management System</span>
            <span>Document Ref: ${refNumber} · Confidential</span>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Utility to convert an image URL to Base64 Data URI for clean Canvas/SVG rasterization
 */
export async function urlToDataUri(url: string): Promise<string> {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve((reader.result as string) || url);
            };
            reader.readAsDataURL(blob);
        });
    } catch {
        return url;
    }
}

/**
 * Pre-processes attachments, converting remote images to base64 data URIs so canvas/PDF won't hang on CORS or network delays
 */
async function prepareExportAttachments(items: FinanceExportFileItem[]): Promise<FinanceExportFileItem[]> {
    return Promise.all(
        items.map(async (item) => {
            if (isAttachmentImage(item)) {
                try {
                    const dataUri = await urlToDataUri(item.url);
                    return { ...item, url: dataUri };
                } catch {
                    return item;
                }
            }
            return item;
        })
    );
}

/**
 * Fallback print dialog via invisible iframe on Web
/**
 * Export Finance Request as PDF (Auto-downloads .pdf on Web, Native sharing on iOS/Android)
 */
export async function exportFinanceRequestAsPdf({
    request,
    tenant,
    invoices = [],
    proofs = [],
    approvalChain = [],
}: {
    request: any;
    tenant: any;
    invoices?: FinanceExportFileItem[];
    proofs?: FinanceExportFileItem[];
    approvalChain?: any[];
}): Promise<void> {
    const cleanRef = (request.ref || request.code || 'Finance_Request').replace(/[\/\\?%*:|"<>]/g, '_');

    if (Platform.OS === 'web') {
        const [resolvedInv, resolvedPrf] = await Promise.all([
            prepareExportAttachments(invoices),
            prepareExportAttachments(proofs),
        ]);
        const html = generateFinanceRequestHtml(request, tenant, resolvedInv, resolvedPrf, approvalChain);

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '820px';
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);

        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const sheet = (tempDiv.querySelector('.page-sheet') as HTMLElement) || tempDiv;
            const canvas = await html2canvas(sheet, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#FFFFFF',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgWidth = 210; // A4 mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [imgWidth, imgHeight],
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${cleanRef}.pdf`);
        } finally {
            document.body.removeChild(tempDiv);
        }
        return;
    }

    try {
        const [resolvedInv, resolvedPrf] = await Promise.all([
            prepareExportAttachments(invoices),
            prepareExportAttachments(proofs),
        ]);
        const html = generateFinanceRequestHtml(request, tenant, resolvedInv, resolvedPrf, approvalChain);
        const { uri } = await Print.printToFileAsync({ html });
        const targetUri = `${FileSystem.cacheDirectory}${cleanRef}.pdf`;
        await FileSystem.copyAsync({ from: uri, to: targetUri });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(targetUri, {
                mimeType: 'application/pdf',
                dialogTitle: `Share ${request.ref || 'Finance Request'}`,
                UTI: 'com.adobe.pdf',
            });
        }
    } catch (e: any) {
        console.error('Failed to export PDF:', e);
        throw e;
    }
}

/**
 * Export Finance Request as JPG (Auto-downloads directly on Web, Native sharing on iOS/Android)
 */
export async function exportFinanceRequestAsJpg({
    request,
    tenant,
    invoices = [],
    proofs = [],
    approvalChain = [],
}: {
    request: any;
    tenant: any;
    invoices?: FinanceExportFileItem[];
    proofs?: FinanceExportFileItem[];
    approvalChain?: any[];
}): Promise<void> {
    const cleanRef = (request.ref || request.code || 'Finance_Request').replace(/[\/\\?%*:|"<>]/g, '_');

    if (Platform.OS === 'web') {
        const [resolvedInv, resolvedPrf] = await Promise.all([
            prepareExportAttachments(invoices),
            prepareExportAttachments(proofs),
        ]);
        const html = generateFinanceRequestHtml(request, tenant, resolvedInv, resolvedPrf, approvalChain);

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '820px';
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);

        try {
            const html2canvas = (await import('html2canvas')).default;
            const sheet = (tempDiv.querySelector('.page-sheet') as HTMLElement) || tempDiv;
            const canvas = await html2canvas(sheet, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#FFFFFF',
                logging: false,
            });

            const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
            const a = document.createElement('a');
            a.href = jpgUrl;
            a.download = `${cleanRef}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            document.body.removeChild(tempDiv);
        }
        return;
    }

    // On Native iOS / Android:
    try {
        const [resolvedInv, resolvedPrf] = await Promise.all([
            prepareExportAttachments(invoices),
            prepareExportAttachments(proofs),
        ]);
        const html = generateFinanceRequestHtml(request, tenant, resolvedInv, resolvedPrf, approvalChain);
        const { uri } = await Print.printToFileAsync({ html });
        const targetUri = `${FileSystem.cacheDirectory}${cleanRef}.pdf`;
        await FileSystem.copyAsync({ from: uri, to: targetUri });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(targetUri, {
                mimeType: 'application/pdf',
                dialogTitle: `Share ${request.ref || 'Finance Request'}`,
                UTI: 'com.adobe.pdf',
            });
        }
    } catch (e: any) {
        console.error('Failed to export JPG:', e);
        throw e;
    }
}
