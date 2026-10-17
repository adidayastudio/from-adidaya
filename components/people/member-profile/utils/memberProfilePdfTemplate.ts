import { MemberProfileData } from '../types';

export function generateMemberProfileHtml(profile: MemberProfileData | any, tenantOrName?: any, documents: any[] = []): string {
    const tenantObj = typeof tenantOrName === 'object' ? tenantOrName : null;
    const company = (tenantObj?.branding_name || tenantObj?.name || tenantOrName) || 'Adidaya Studio';
    const tenantLogo = tenantObj?.branding_logo_url || tenantObj?.logo_url || null;

    const tenantNameLower = (company || '').toLowerCase();
    const tenantSlugLower = (tenantObj?.slug || '').toLowerCase();
    const tenantCodeLower = (tenantObj?.company_code || '').toLowerCase();
    const isAdidaya = tenantNameLower.includes('adidaya') || tenantSlugLower.includes('adidaya') || tenantCodeLower === 'ady' || tenantCodeLower === 'adidaya';

    const printDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const fullName = profile.full_name || profile.name || 'Team Member';
    const dept = profile.department || '—';
    const role = profile.position || profile.job_title || profile.role || '—';
    const empId = profile.employee_id || profile.id_number || '—';
    const idCode = profile.id_code || profile.display_id || '—';
    const status = (profile.status || profile.work_status || 'Active').toUpperCase();

    // Helper for matching
    const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const resolveFileUrl = (doc: any) => {
        if (!doc) return null;
        let url = doc.file_url || doc.url || doc.public_url || doc.uri || doc.file_uri || doc.document_url || doc.storage_path || null;
        if (!url) return null;
        if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('file:')) {
            url = `https://fnarqfpkxzpdffxplkwc.supabase.co/storage/v1/object/public/profile_documents/${url}`;
        }
        return url;
    };

    // Check for uploaded photo
    const pasFotoDoc = documents.find((d) => {
        const cat = normalize(d.document_type || d.category || d.title || '');
        return cat.includes('pasfoto') || cat.includes('photo') || cat.includes('foto');
    });
    const photoUrl = profile.avatar_url || profile.photo_url || resolveFileUrl(pasFotoDoc) || null;

    // Bank formatting
    const bankName = profile.custom_bank_name || profile.bank_name || '—';
    const bankAcc = profile.bank_account_number || '—';
    const bankHolder = profile.bank_account_holder || fullName;

    // Emergency Contact
    const emgName = profile.emergency_name || '—';
    const emgRel = profile.emergency_relationship || '—';
    const emgPhone = profile.emergency_phone || '—';

    // Standard document categories
    const docCategories = [
        'Pas Foto',
        'KTP',
        'NPWP',
        'CV',
        'Latest Diploma',
        'Latest Transcript',
    ];

    const docItems = docCategories.map((cat) => {
        const targetNorm = normalize(cat);
        const found = documents.find((d) => {
            const docCatNorm = normalize(d.document_type || d.category || d.title || '');
            return docCatNorm === targetNorm || docCatNorm.includes(targetNorm) || targetNorm.includes(docCatNorm);
        });
        const fileUrl = resolveFileUrl(found);
        return {
            category: cat,
            isUploaded: !!found,
            fileUrl,
            date: found ? new Date(found.created_at || found.updated_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            fileName: found ? (found.title || found.name || `${cat} file`) : 'Not Uploaded',
        };
    });

    // Custom documents
    const standardNorms = docCategories.map(c => normalize(c));
    const extraDocs = documents.filter((d) => {
        const docCatNorm = normalize(d.document_type || d.category || '');
        return !standardNorms.some(sn => docCatNorm === sn || docCatNorm.includes(sn) || sn.includes(docCatNorm));
    }).map((d) => ({
        category: d.document_type || d.category || d.title || 'Other Document',
        isUploaded: true,
        fileUrl: resolveFileUrl(d),
        date: new Date(d.created_at || d.updated_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        fileName: d.title || d.name || 'Document File',
    }));

    const allDocItems = [...docItems, ...extraDocs];

    // Uploaded attachments excluding Pas Foto (which is already displayed in the top avatar profile)
    const uploadedAttachments = allDocItems.filter((d) => d.isUploaded && d.fileUrl && !normalize(d.category).includes('pasfoto') && !normalize(d.category).includes('photo'));

    // History items
    const historyList: any[] = Array.isArray(profile.employment_history) ? profile.employment_history : [];

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Employee Profile - ${fullName}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 14mm 14mm 14mm 14mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #E5E5EA;
            color: #111827;
            font-size: 11px;
            line-height: 1.45;
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
                max-width: 780px;
                padding: 36px 40px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.12);
                border-radius: 6px;
            }
        }
        @media print {
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

        /* Top Document Header */
        .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .brand-area {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .brand-logo-svg {
            width: 28px;
            height: 28px;
            flex-shrink: 0;
        }
        .brand-logo-img {
            max-height: 32px;
            max-width: 150px;
            object-fit: contain;
            flex-shrink: 0;
        }
        .brand-title {
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            margin: 0;
            letter-spacing: -0.5px;
        }
        .doc-meta {
            text-align: right;
            font-size: 9.5px;
            color: #6E6E73;
        }
        .doc-meta .doc-type {
            font-size: 12px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 2px;
        }

        /* Profile Summary Row (Clean, No card) */
        .profile-summary-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 14px;
            margin-bottom: 16px;
            border-bottom: 1px solid #E5E5EA;
        }
        .profile-summary-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .profile-avatar {
            width: 48px;
            height: 48px;
            border-radius: 24px;
            background: #0036F8;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: -0.5px;
            overflow: hidden;
            flex-shrink: 0;
        }
        .profile-avatar-img {
            width: 48px;
            height: 48px;
            border-radius: 24px;
            object-fit: cover;
            border: 1px solid #E5E5EA;
            flex-shrink: 0;
        }
        .profile-name-area h2 {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 2px 0;
            color: #111827;
        }
        .profile-name-area .sub {
            font-size: 11px;
            color: #6E6E73;
            margin: 0 0 3px 0;
        }
        .profile-name-area .ids {
            font-size: 9.5px;
            color: #8E8E93;
            font-family: monospace;
        }
        .status-badge {
            background: #F3F4F6;
            color: #111827;
            font-weight: 700;
            font-size: 9.5px;
            padding: 3px 9px;
            border-radius: 12px;
            border: 1px solid #E5E7EB;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Section Styling */
        .section {
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        .section-header {
            font-size: 11px;
            font-weight: 700;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #E5E5EA;
            padding-bottom: 4px;
            margin-bottom: 10px;
        }

        /* Field Row Grid (Clean lines, no chunky cards) */
        .fields-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 24px;
        }
        .fields-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px 20px;
        }
        .field-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding-bottom: 6px;
            border-bottom: 1px dashed #EFEFF4;
        }
        .field-label {
            font-size: 9px;
            color: #8E8E93;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .field-value {
            font-size: 11px;
            color: #111827;
            font-weight: 500;
            word-break: break-word;
        }

        /* Table */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 4px;
        }
        th {
            background: #F9FAFB;
            color: #4B5563;
            text-align: left;
            padding: 6px 8px;
            font-weight: 600;
            border-bottom: 1px solid #E5E7EB;
            text-transform: uppercase;
            font-size: 8.5px;
            letter-spacing: 0.3px;
        }
        td {
            padding: 6px 8px;
            border-bottom: 1px solid #F3F4F6;
            color: #111827;
        }
        .status-pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8.5px;
            font-weight: 600;
        }
        .status-verified {
            background: #ECFDF5;
            color: #059669;
        }
        .status-missing {
            background: #F3F4F6;
            color: #9CA3AF;
        }

        /* Attached Document Previews */
        .attachments-section {
            margin-top: 24px;
        }
        .attachment-card {
            margin-top: 14px;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            overflow: hidden;
            page-break-inside: avoid;
            background: #FAFAFA;
        }
        .attachment-header {
            background: #F9FAFB;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #E5E7EB;
            font-size: 10.5px;
            font-weight: 600;
            color: #111827;
        }
        .attachment-date {
            font-size: 9px;
            font-weight: 400;
            color: #6B7280;
        }
        .attachment-image-wrap {
            padding: 14px;
            display: flex;
            justify-content: center;
            background: #FFFFFF;
        }
        .attachment-image {
            max-width: 100%;
            max-height: 520px;
            object-fit: contain;
            border-radius: 4px;
            border: 1px solid #E5E7EB;
        }
        .attachment-pdf-wrap {
            background: #FFFFFF;
            height: 480px;
        }
        .attachment-pdf-frame {
            width: 100%;
            height: 100%;
            border: none;
        }

        @media print {
            .attachments-section {
                page-break-before: always;
            }
            .attachment-card {
                page-break-inside: avoid;
                margin-bottom: 20px;
            }
        }

        /* Footer */
        .doc-footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #E5E5EA;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #6B7280;
        }
    </style>
</head>
<body>
    <div class="page-sheet">
        <!-- Top Document Header -->
        <div class="doc-header">
            <div class="brand-area">
                ${tenantLogo ? `
                    <img src="${tenantLogo}" alt="${company}" class="brand-logo-img" />
                ` : (isAdidaya ? `
                    <svg class="brand-logo-svg" viewBox="0 0 1080 1080">
                        <path fill="#111827" d="M623.19,809.47h-169.09c-8.8,10.26-14.27,22.13-19.73,34.13-8.88,19.53-18.13,38.9-27.44,58.23-16.73,34.76-68.56,49.38-105.02,27.6-38.35-22.9-46.29-75.23-25.66-106.05,12.38-18.49,26.35-35.94,40.04-53.52,27.89-35.82,56.06-71.42,84.12-107.11,15.3-19.45,30.86-38.69,45.82-58.4,6.83-9,15.11-17.31,19.08-30.67-5.5.58-9.44.62-13.22,1.44-53.22,11.54-106.42,23.22-159.64,34.78-8.06,1.75-16.16,3.69-24.35,4.5-30.52,3.03-55.14-7.56-72.5-33.26-15.69-23.21-16.08-48.06-5.85-73.25,8.52-20.97,37.84-46.95,71.46-44.56,14.79,1.05,29.5,3.53,44.2,5.67,49,7.15,97.98,14.47,146.99,21.58,2.88.42,5.94-.43,10.94-.87-4.45-11.93-11.91-19.64-18.34-27.83-37.74-48.03-75.72-95.89-113.54-143.86-13.28-16.84-26.18-33.99-39.59-50.74-19.55-24.42-22.36-51.87-10.14-79.19,12.16-27.18,34.86-43.79,65.09-47.39,38.48-4.59,66.98,12.95,82.69,48.94,33.69,77.17,67.57,154.25,101.51,231.3,2.57,5.83,6.2,11.18,9.06,16.27,9.46-.66,9.51-7.77,11.37-12.6,13.61-35.45,26.7-71.1,40.27-106.57,4.42-11.55,9.06-23.12,14.82-34.03,18.71-35.42,64.92-46.98,100.8-28.68,49.25,25.12,56.1,88.15,17.43,124.99-33.47,31.88-65.7,65.07-98.36,97.79-3.8,3.81-6.87,8.35-12.38,15.15,9.22-.95,14.92-1.09,20.43-2.17,51-9.99,101.96-20.18,152.96-30.2,8.09-1.59,16.28-2.65,24.43-3.93,54.53-8.55,101.86,44.24,79.72,103.41-10.35,27.66-31.35,44.2-61.29,46.96-10.55.97-21.53.11-32.02-1.65-52.08-8.72-104.05-18.07-156.09-27.05-7.89-1.36-15.93-3.88-23.85-.5-1.71,8.39,4.46,12.63,8.32,17.48,43.2,54.24,86.65,108.29,130.06,162.37,11.88,14.8,24.32,29.19,35.6,44.44,6.82,9.21,13.48,19.12,17.46,29.74,13.56,36.2-.86,74.11-34.44,93.55-12.89,7.46-25.71,14.32-41.53,14.27-30.78-.08-54.76-12.07-69.26-39.31-10.05-18.88-17.68-39.05-26.46-58.62-4.69-10.45-9.51-20.84-14.9-32.61ZM540.29,622.33c-1.8,1.05-3.91,1.52-4.46,2.71-17.24,37.27-34.36,74.59-51.31,111.99-.89,1.96-.11,4.68-.11,7.43,2.41.6,4.67,1.66,6.92,1.66,32.86-.05,65.72-.23,98.59-.43.77,0,1.68-.4,2.25-.92.52-.48.66-1.37,1.6-3.55-13.29-38.47-32.17-75.86-48.37-114.35-.81-1.94-3.44-3.11-5.1-4.54Z"/>
                    </svg>
                ` : `
                    <svg class="brand-logo-svg" viewBox="0 0 100 100">
                        <rect width="100" height="100" rx="22" fill="#0036F8"/>
                        <path d="M28 26 h44 v12 h-28 v14 h24 v12 h-24 v20 h-16 Z" fill="#FFFFFF"/>
                    </svg>
                `)}
                <h1 class="brand-title">${company}</h1>
            </div>
            <div class="doc-meta">
                <div class="doc-type">Employee Profile</div>
                <div>Generated: ${printDate}</div>
            </div>
        </div>

        <!-- Profile Summary Row -->
        <div class="profile-summary-row">
            <div class="profile-summary-left">
                ${photoUrl ? `
                    <img src="${photoUrl}" alt="${fullName}" class="profile-avatar-img" />
                ` : `
                    <div class="profile-avatar">
                        ${fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                `}
                <div class="profile-name-area">
                    <h2>${fullName}</h2>
                    <div class="sub">${role} &bull; ${dept}</div>
                    <div class="ids">Employee ID: <strong>${empId}</strong> &bull; Code: <strong>${idCode}</strong></div>
                </div>
            </div>
            <div>
                <span class="status-badge">${status}</span>
            </div>
        </div>

        <!-- 1. Account & Contact Information -->
        <div class="section">
            <div class="section-header">1. Account & Contact Information</div>
            <div class="fields-grid-2">
                <div class="field-item">
                    <div class="field-label">Official Work Email</div>
                    <div class="field-value">${profile.email || '—'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Personal Email</div>
                    <div class="field-value">${profile.personal_email || '—'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">WhatsApp / Mobile Phone</div>
                    <div class="field-value">${profile.whatsapp || profile.phone || '—'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Username / Nickname</div>
                    <div class="field-value">@${profile.username || '—'} ${profile.nickname ? `(${profile.nickname})` : ''}</div>
                </div>
            </div>
        </div>

        <!-- 2. Identity & Personal Details -->
        <div class="section">
            <div class="section-header">2. Identity & Personal Details</div>
            <div class="fields-grid-3">
                <div class="field-item">
                    <div class="field-label">National ID (NIK)</div>
                    <div class="field-value">${profile.nik || '—'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Gender</div>
                    <div class="field-value">${profile.gender || 'Not Specified'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Date of Birth</div>
                    <div class="field-value">${profile.birth_date || '—'}</div>
                </div>
            </div>
            <div class="fields-grid-2" style="margin-top: 8px;">
                <div class="field-item">
                    <div class="field-label">Current Domicile Address</div>
                    <div class="field-value">${profile.current_address || '—'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">KTP Registered Address</div>
                    <div class="field-value">${profile.ktp_address || '—'}</div>
                </div>
            </div>
            <div class="fields-grid-3" style="margin-top: 8px;">
                <div class="field-item">
                    <div class="field-label">Emergency Contact Name</div>
                    <div class="field-value">${emgName}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Relationship</div>
                    <div class="field-value">${emgRel}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Emergency Phone</div>
                    <div class="field-value">${emgPhone}</div>
                </div>
            </div>
            <div class="fields-grid-3" style="margin-top: 8px;">
                <div class="field-item">
                    <div class="field-label">Bank Name</div>
                    <div class="field-value">${bankName}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Bank Account Number</div>
                    <div class="field-value">${bankAcc}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Account Beneficiary</div>
                    <div class="field-value">${bankHolder}</div>
                </div>
            </div>
        </div>

        <!-- 3. Employment & Role Progression -->
        <div class="section">
            <div class="section-header">3. Employment & Role Progression</div>
            <div class="fields-grid-3">
                <div class="field-item">
                    <div class="field-label">Department</div>
                    <div class="field-value">${dept}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Position / Job Title</div>
                    <div class="field-value">${role}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Level / Grade</div>
                    <div class="field-value">${profile.level || 'Standard'}</div>
                </div>
            </div>
            <div class="fields-grid-3" style="margin-top: 8px;">
                <div class="field-item">
                    <div class="field-label">Contract Type</div>
                    <div class="field-value">${profile.contract_type || 'Full-Time'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Join Date</div>
                    <div class="field-value">${profile.join_date || '—'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">End Date</div>
                    <div class="field-value">${profile.end_date || 'Present'}</div>
                </div>
            </div>
            <div class="fields-grid-2" style="margin-top: 8px;">
                <div class="field-item">
                    <div class="field-label">Assigned Work Schedule</div>
                    <div class="field-value">${profile.schedule_name || 'Standard 5-Day'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Schedule Detail</div>
                    <div class="field-value">${profile.schedule_detail || 'Mon - Fri • 08:00 - 17:00'}</div>
                </div>
            </div>

            ${historyList.length > 0 ? `
            <div style="margin-top: 10px;">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Role / Position</th>
                            <th>Department</th>
                            <th>Level</th>
                            <th>Notes / Milestone</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyList.map((h: any) => `
                            <tr>
                                <td><strong>${h.date || '—'}</strong></td>
                                <td>${h.position || '—'}</td>
                                <td>${h.department || '—'}</td>
                                <td>${h.level || '—'}</td>
                                <td>${h.note || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
        </div>

        <!-- 4. Performance & Leave Balances -->
        <div class="section">
            <div class="section-header">4. Performance & Leave Balances</div>
            <div class="fields-grid-3">
                <div class="field-item">
                    <div class="field-label">Overall KPI Score</div>
                    <div class="field-value" style="font-weight: 700; color: #111827;">${profile.kpi_score || '88%'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Monthly Work Hours</div>
                    <div class="field-value">${profile.work_hours_month || '176 hrs'}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Annual Leave Balance</div>
                    <div class="field-value">${profile.leave_balance_remaining || '12'} Days Remaining</div>
                </div>
            </div>
        </div>

        <!-- 5. Official Documents Status -->
        <div class="section">
            <div class="section-header">5. Official Document Records</div>
            <table>
                <thead>
                    <tr>
                        <th>Document Name</th>
                        <th>Status</th>
                        <th>Uploaded Date</th>
                        <th>File Reference</th>
                    </tr>
                </thead>
                <tbody>
                    ${allDocItems.map((d) => `
                        <tr>
                            <td><strong>${d.category}</strong></td>
                            <td>
                                <span class="status-pill ${d.isUploaded ? 'status-verified' : 'status-missing'}">
                                    ${d.isUploaded ? '✓ Verified' : 'Not Uploaded'}
                                </span>
                            </td>
                            <td>${d.date}</td>
                            <td style="color: #6E6E73;">${d.fileName}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- 6. Attached Uploaded Documents (Embedded Preview) -->
        ${uploadedAttachments.length > 0 ? `
        <div class="attachments-section">
            <div class="section-header">6. Document Attachments</div>
            ${uploadedAttachments.map((att) => {
                const isPdf = (att.fileUrl && att.fileUrl.toLowerCase().includes('.pdf')) || (att.fileName && att.fileName.toLowerCase().endsWith('.pdf'));
                return `
                <div class="attachment-card">
                    <div class="attachment-header">
                        <span>${att.category} &bull; ${att.fileName}</span>
                        <span class="attachment-date">Uploaded: ${att.date}</span>
                    </div>
                    ${isPdf ? `
                        <div class="attachment-pdf-wrap">
                            <iframe src="${att.fileUrl}" class="attachment-pdf-frame"></iframe>
                        </div>
                    ` : `
                        <div class="attachment-image-wrap">
                            <img src="${att.fileUrl}" alt="${att.category}" class="attachment-image" />
                        </div>
                    `}
                </div>
                `;
            }).join('')}
        </div>
        ` : ''}

        <!-- Document Footer -->
        <div class="doc-footer">
            <div>${company} &bull; Employee Profile</div>
            <div>Doc. Ref: ${profile.id ? profile.id.slice(0, 12) : 'DOC-001'}</div>
        </div>
    </div>
</body>
</html>
    `;
}
