import { Share, Alert } from 'react-native';
import { format } from 'date-fns';
import { AttendanceRecord, LeaveRequest, OvertimeLog, BusinessTrip } from './api/attendance';
import { calculateStats, formatMinutes } from './clock-data-logic';

/**
 * Common formatting helpers
 */
const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '--:--';
        return format(date, 'HH:mm');
    } catch {
        return '--:--';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'present': return 'Present';
        case 'ontime': return 'On Time';
        case 'intime': return 'In Time';
        case 'late': return 'Late';
        case 'absent': return 'Absent';
        case 'leave': return 'Leave';
        case 'sick': return 'Sick';
        case 'weekend': return 'Weekend';
        case 'holiday': return 'Holiday';
        case 'cuti-bersama': return 'Joint Leave';
        default: return status.toUpperCase();
    }
};

const handleShareError = (error: any) => {
    const msg = error?.message || String(error || '');
    if (error?.name === 'AbortError' || msg.includes('Abort') || msg.includes('cancellation') || msg.includes('cancel')) {
        return;
    }
    Alert.alert("Gagal Share", error?.message || 'Terjadi kesalahan saat membagikan.');
};

/**
 * Tenant info for export headers
 */
export interface ExportTenantInfo {
    name: string;
    logoUrl?: string | null;
    companyCode?: string | null;
    primaryColor?: string | null;
    slug?: string | null;
}

const ADIDAYA_SVG_PATH = `M623.19,809.47h-169.09c-8.8,10.26-14.27,22.13-19.73,34.13-8.88,19.53-18.13,38.9-27.44,58.23-16.73,34.76-68.56,49.38-105.02,27.6-38.35-22.9-46.29-75.23-25.66-106.05,12.38-18.49,26.35-35.94,40.04-53.52,27.89-35.82,56.06-71.42,84.12-107.11,15.3-19.45,30.86-38.69,45.82-58.4,6.83-9,15.11-17.31,19.08-30.67-5.5.58-9.44.62-13.22,1.44-53.22,11.54-106.42,23.22-159.64,34.78-8.06,1.75-16.16,3.69-24.35,4.5-30.52,3.03-55.14-7.56-72.5-33.26-15.69-23.21-16.08-48.06-5.85-73.25,8.52-20.97,37.84-46.95,71.46-44.56,14.79,1.05,29.5,3.53,44.2,5.67,49,7.15,97.98,14.47,146.99,21.58,2.88.42,5.94-.43,10.94-.87-4.45-11.93-11.91-19.64-18.34-27.83-37.74-48.03-75.72-95.89-113.54-143.86-13.28-16.84-26.18-33.99-39.59-50.74-19.55-24.42-22.36-51.87-10.14-79.19,12.16-27.18,34.86-43.79,65.09-47.39,38.48-4.59,66.98,12.95,82.69,48.94,33.69,77.17,67.57,154.25,101.51,231.3,2.57,5.83,6.2,11.18,9.06,16.27,9.46-.66,9.51-7.77,11.37-12.6,13.61-35.45,26.7-71.1,40.27-106.57,4.42-11.55,9.06-23.12,14.82-34.03,18.71-35.42,64.92-46.98,100.8-28.68,49.25,25.12,56.1,88.15,17.43,124.99-33.47,31.88-65.7,65.07-98.36,97.79-3.8,3.81-6.87,8.35-12.38,15.15,9.22-.95,14.92-1.09,20.43-2.17,51-9.99,101.96-20.18,152.96-30.2,8.09-1.59,16.28-2.65,24.43-3.93,54.53-8.55,101.86,44.24,79.72,103.41-10.35,27.66-31.35,44.2-61.29,46.96-10.55.97-21.53.11-32.02-1.65-52.08-8.72-104.05-18.07-156.09-27.05-7.89-1.36-15.93-3.88-23.85-.5-1.71,8.39,4.46,12.63,8.32,17.48,43.2,54.24,86.65,108.29,130.06,162.37,11.88,14.8,24.32,29.19,35.6,44.44,6.82,9.21,13.48,19.12,17.46,29.74,13.56,36.2-.86,74.11-34.44,93.55-12.89,7.46-25.71,14.32-41.53,14.27-30.78-.08-54.76-12.07-69.26-39.31-10.05-18.88-17.68-39.05-26.46-58.62-4.69-10.45-9.51-20.84-14.9-32.61ZM540.29,622.33c-1.8,1.05-3.91,1.52-4.46,2.71-17.24,37.27-34.36,74.59-51.31,111.99-.89,1.96-.11,4.68-.11,7.43,2.41.6,4.67,1.66,6.92,1.66,32.86-.05,65.72-.23,98.59-.43.77,0,1.68-.4,2.25-.92.52-.48.66-1.37,1.6-3.55-13.29-38.47-32.17-75.86-48.37-114.35-.81-1.94-3.44-3.11-5.1-4.54Z`;

export const commonHeaderCss = `
    .doc-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 18px; }
    .brand-area { display: flex; align-items: center; gap: 10px; }
    .brand-logo-img { max-height: 32px; max-width: 120px; object-fit: contain; flex-shrink: 0; }
    .brand-logo-svg { width: 30px; height: 30px; flex-shrink: 0; }
    .brand-avatar-badge { width: 30px; height: 30px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 700; font-size: 11px; flex-shrink: 0; letter-spacing: -0.3px; }
    .brand-title { font-size: 16px; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.3px; }
    .doc-meta { text-align: right; font-size: 10px; color: #6E6E73; }
    .doc-meta .doc-type { font-size: 13px; font-weight: 700; color: #007AFF; margin-bottom: 2px; }
`;

export function generateDocHeader(tenant: ExportTenantInfo | undefined, reportTitle: string, dateStr: string): string {
    const companyName = tenant?.name || 'Workspace';
    const isAdidaya = (companyName.toLowerCase().includes('adidaya')) ||
                      (tenant?.slug || '').toLowerCase().includes('adidaya') ||
                      (tenant?.companyCode || '').toLowerCase() === 'ady' ||
                      (tenant?.companyCode || '').toLowerCase() === 'adidaya';

    let logoHtml = '';
    if (tenant?.logoUrl) {
        logoHtml = `<img src="${tenant.logoUrl}" alt="${companyName}" class="brand-logo-img" />`;
    } else if (isAdidaya) {
        logoHtml = `<svg class="brand-logo-svg" viewBox="0 0 1080 1080"><path fill="#d91011" d="${ADIDAYA_SVG_PATH}"/></svg>`;
    } else {
        const initials = (tenant?.companyCode || companyName.split(' ').map(w => w[0]).join('').slice(0, 3) || 'ORG').toUpperCase();
        const primaryColor = tenant?.primaryColor || '#007AFF';
        logoHtml = `<div class="brand-avatar-badge" style="background: ${primaryColor};">${initials}</div>`;
    }

    return `
        <div class="doc-header">
            <div class="brand-area">
                ${logoHtml}
                <h1 class="brand-title">${companyName}</h1>
            </div>
            <div class="doc-meta">
                <div class="doc-type">${reportTitle}</div>
                <div>${dateStr}</div>
            </div>
        </div>
    `;
}

/**
 * 1. Today's Team Attendance Share
 */
export async function shareTodayAttendance(members: any[]) {
    try {
        const todayStr = format(new Date(), 'dd MMMM yyyy');
        const total = members.length;
        const checkedIn = members.filter(m => m.clockIn !== null).length;
        const late = members.filter(m => m.status === 'late').length;
        const leave = members.filter(m => m.status === 'leave').length;
        const absent = members.filter(m => m.status === 'absent').length;
        const pending = total - checkedIn - leave - absent;

        let message = `📢 LAPORAN ABSENSI HARI INI (${todayStr})\n\n`;
        message += `• Total Anggota: ${total}\n`;
        message += `• Hadir (Clocked In): ${checkedIn}\n`;
        message += `• Terlambat: ${late}\n`;
        message += `• Sedang Cuti: ${leave}\n`;
        message += `• Belum Absen: ${pending}\n\n`;
        message += `--- DETAIL KEHADIRAN ANGGOTA ---\n\n`;

        members.forEach((m, idx) => {
            const timeInfo = m.clockIn 
                ? `Clock In: ${formatTime(m.clockIn)}${m.clockOut ? ` | Clock Out: ${formatTime(m.clockOut)}` : ' (Masih Bekerja)'}` 
                : 'Belum Clock In';
            
            message += `${idx + 1}. ${m.fullName}\n`;
            message += `   • Status: ${getStatusLabel(m.status)}\n`;
            message += `   • Waktu: ${timeInfo}\n\n`;
        });

        message += `Dikirim via Aplikasi Adidaya`;

        await Share.share({
            message,
            title: `Laporan Absensi ${todayStr}`
        });
    } catch (error: any) {
        handleShareError(error);
    }
}

/**
 * 2. Personal Timesheet Share
 */
export async function sharePersonalTimesheet(records: AttendanceRecord[], month: Date, userName: string) {
    try {
        const monthStr = format(month, 'MMMM yyyy');
        const stats = calculateStats(records as any, month);
        
        let message = `📋 TIMESHEET BULANAN KARYAWAN (${monthStr})\n`;
        message += `==========================================\n`;
        message += `Nama Karyawan    : ${userName}\n`;
        message += `Skor Kehadiran   : ${stats.attendanceScore}%\n`;
        message += `Total Kehadiran  : ${stats.totalDaysPresent} Hari\n`;
        message += `Total Terlambat  : ${stats.totalDaysLate} Hari\n`;
        message += `Total Lembur     : ${Math.round(stats.totalOvertimeMinutes / 60)} Jam\n`;
        message += `==========================================\n\n`;
        message += `--- DETAIL HARIAN ---\n\n`;

        // Sort chronological
        const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

        sorted.forEach((r) => {
            const dateDisplay = format(new Date(r.date), 'EEE, dd MMM');
            const inTime = r.clockIn ? formatTime(r.clockIn) : '-';
            const outTime = r.clockOut ? formatTime(r.clockOut) : '-';
            const durationHrs = r.totalMinutes ? (r.totalMinutes / 60).toFixed(1) : '0';
            
            // Flag if work hours are short (less than 8 hours, ignoring weekends, holidays, leaves)
            const isWorkingDay = !['weekend', 'holiday', 'cuti-bersama', 'leave', 'sick'].includes(r.status);
            const isShortHours = isWorkingDay && r.clockIn && r.totalMinutes < 480;
            const shortFlag = isShortHours ? ' ⚠️ (JAM KERJA KURANG - Kurang dari 8 jam)' : '';

            message += `• ${dateDisplay}:\n`;
            message += `   Status: ${getStatusLabel(r.status)}\n`;
            if (r.clockIn) {
                message += `   IN: ${inTime} | OUT: ${outTime}\n`;
                message += `   Durasi: ${durationHrs} Jam${shortFlag}\n`;
            }
            if (r.overtimeMinutes > 0) {
                message += `   Lembur: ${(r.overtimeMinutes / 60).toFixed(1)} Jam\n`;
            }
            if (r.notes) {
                message += `   Catatan: ${r.notes}\n`;
            }
            message += `\n`;
        });

        message += `Dikirim via Aplikasi Adidaya`;

        await Share.share({
            message,
            title: `Timesheet ${userName} - ${monthStr}`
        });
    } catch (error: any) {
        handleShareError(error);
    }
}

/**
 * 3. Team Timesheet Share
 */
export async function shareTeamTimesheet(records: AttendanceRecord[], month: Date, workingDays: number) {
    try {
        const monthStr = format(month, 'MMMM yyyy');

        // Group by user
        const userRecordsMap = new Map<string, { name: string; recs: AttendanceRecord[] }>();
        records.forEach(r => {
            const uId = r.userId;
            if (!userRecordsMap.has(uId)) {
                userRecordsMap.set(uId, { name: r.userName || 'Employee', recs: [] });
            }
            userRecordsMap.get(uId)!.recs.push(r);
        });

        const totalMembers = userRecordsMap.size || 1;

        let totalDaysPresent = 0;
        let totalDaysLate = 0;
        let totalOvertimeMinutes = 0;
        let totalScoreSum = 0;

        const membersSummary: any[] = [];

        userRecordsMap.forEach((userVal) => {
            const presentCount = userVal.recs.filter(r => r.clockIn !== null).length;
            const lateCount = userVal.recs.filter(r => r.status === 'late').length;
            const otMinutes = userVal.recs.reduce((sum, r) => sum + r.overtimeMinutes, 0);
            
            // Standard work duration sum (only on actual presence working days)
            const presentWorkMinutes = userVal.recs
                .filter(r => r.clockIn !== null && !['weekend', 'holiday', 'cuti-bersama', 'leave', 'sick'].includes(r.status))
                .reduce((sum, r) => sum + r.totalMinutes, 0);
            const expectedMinutes = presentCount * 480;
            const hasShortHours = expectedMinutes > 0 && presentWorkMinutes < expectedMinutes;

            const otHours = Math.round(otMinutes / 60);
            const otBonus = Math.min(otHours, 5);
            const userScore = Math.max(0, Math.min(100, 100 - lateCount * 2 + otBonus));

            totalDaysPresent += presentCount;
            totalDaysLate += lateCount;
            totalOvertimeMinutes += otMinutes;
            totalScoreSum += userScore;

            membersSummary.push({
                name: userVal.name,
                present: presentCount,
                late: lateCount,
                otHours,
                score: userScore,
                hasShortHours
            });
        });

        const avgPresent = (totalDaysPresent / totalMembers).toFixed(1);
        const avgLate = (totalDaysLate / totalMembers).toFixed(1);
        const avgOvertimeHours = ((totalOvertimeMinutes / 60) / totalMembers).toFixed(1);
        const avgScore = Math.round(totalScoreSum / totalMembers);

        let message = `👥 LAPORAN TIMESHEET TEAM (${monthStr})\n`;
        message += `==========================================\n`;
        message += `Total Anggota     : ${totalMembers} Orang\n`;
        message += `Hari Kerja Efektif: ${workingDays} Hari\n`;
        message += `Rerata Kehadiran  : ${avgPresent} Hari\n`;
        message += `Rerata Keterlambatan: ${avgLate} Hari\n`;
        message += `Rerata Kerja Lembur: ${avgOvertimeHours} Jam\n`;
        message += `Rerata Nilai Tim  : ${avgScore}%\n`;
        message += `==========================================\n\n`;
        
        message += `--- RINGKASAN ANGGOTA TIM ---\n\n`;
        membersSummary.sort((a, b) => b.score - a.score).forEach((m, idx) => {
            const shortFlag = m.hasShortHours ? ' ⚠️ (JAM KERJA KURANG)' : '';
            message += `${idx + 1}. ${m.name}\n`;
            message += `   • Hadir: ${m.present} hari | Terlambat: ${m.late} hari\n`;
            message += `   • Lembur: ${m.otHours} jam | Skor: ${m.score}%${shortFlag}\n\n`;
        });

        message += `Dikirim via Aplikasi Adidaya`;

        await Share.share({
            message,
            title: `Timesheet Team - ${monthStr}`
        });
    } catch (error: any) {
        handleShareError(error);
    }
}

/**
 * 4. Personal Requests Summary Share
 */
export async function sharePersonalRequests(
    leaves: LeaveRequest[],
    overtimes: OvertimeLog[],
    trips: BusinessTrip[],
    month: Date
) {
    try {
        const monthStr = format(month, 'MMMM yyyy');
        const total = leaves.length + overtimes.length + trips.length;

        const countStatus = (arr: any[], status: string) => arr.filter(i => i.status === status).length;

        let message = `📄 RINGKASAN PENGAJUAN PRIBADI (${monthStr})\n`;
        message += `==========================================\n`;
        message += `Total Pengajuan: ${total} Items\n`;
        message += `• Cuti (Leave): ${leaves.length} (App: ${countStatus(leaves, 'approved')}, Pend: ${countStatus(leaves, 'pending')}, Rej: ${countStatus(leaves, 'rejected')})\n`;
        message += `• Lembur (OT): ${overtimes.length} (App: ${countStatus(overtimes, 'approved')}, Pend: ${countStatus(overtimes, 'pending')}, Rej: ${countStatus(overtimes, 'rejected')})\n`;
        message += `• Dinas (Trip): ${trips.length} (App: ${countStatus(trips, 'approved')}, Pend: ${countStatus(trips, 'pending')}, Rej: ${countStatus(trips, 'rejected')})\n`;
        message += `==========================================\n\n`;

        message += `--- DAFTAR PENGAJUAN ---\n\n`;
        let counter = 1;

        leaves.forEach((l) => {
            message += `${counter++}. [CUTI] Nomor: ${l.requestNumber || '-'}\n`;
            message += `   • Jenis Cuti: ${l.type} (${l.subtype || ''})\n`;
            message += `   • Durasi: ${l.startDate} s/d ${l.endDate}\n`;
            message += `   • Status: ${l.status.toUpperCase()}\n`;
            if (l.reason) message += `   • Alasan: ${l.reason}\n`;
            message += `\n`;
        });

        overtimes.forEach((o) => {
            message += `${counter++}. [LEMBUR] Nomor: ${o.requestNumber || '-'}\n`;
            message += `   • Tanggal: ${o.date}\n`;
            message += `   • Waktu: ${o.startTime} - ${o.endTime}\n`;
            message += `   • Status: ${o.status.toUpperCase()}\n`;
            if (o.description) message += `   • Deskripsi: ${o.description}\n`;
            message += `\n`;
        });

        trips.forEach((t) => {
            message += `${counter++}. [DINAS] Nomor: ${t.requestNumber || '-'}\n`;
            message += `   • Tujuan: ${t.destination}\n`;
            message += `   • Durasi: ${t.startDate} s/d ${t.endDate}\n`;
            message += `   • Status: ${t.status.toUpperCase()}\n`;
            if (t.purpose) message += `   • Maksud: ${t.purpose}\n`;
            message += `\n`;
        });

        message += `Dikirim via Aplikasi Adidaya`;

        await Share.share({
            message,
            title: `Rekap Pengajuan - ${monthStr}`
        });
    } catch (error: any) {
        handleShareError(error);
    }
}

/**
 * 5. Team Approvals Summary Share
 */
export async function shareTeamApprovals(
    approvals: any[],
    month: Date,
    activeType: 'leaves' | 'overtime' | 'trips' | 'corrections'
) {
    try {
        const monthStr = format(month, 'MMMM yyyy');
        const typeLabel = activeType === 'leaves' ? 'Leave Request' : activeType === 'overtime' ? 'Overtime' : activeType === 'trips' ? 'Business Trip' : 'Attendance Correction';
        
        let message = `📋 REKAP PENGAJUAN & APPROVAL TEAM (${monthStr})\n`;
        message += `==========================================\n`;
        message += `Kategori      : ${typeLabel}\n`;
        message += `Total Record  : ${approvals.length} Items\n`;
        message += `Pending       : ${approvals.filter(a => a.status === 'pending').length} Items\n`;
        message += `Approved      : ${approvals.filter(a => a.status === 'approved').length} Items\n`;
        message += `Rejected/Rev  : ${approvals.filter(a => ['rejected', 'revision', 'need revision'].includes(a.status)).length} Items\n`;
        message += `==========================================\n\n`;

        message += `--- DAFTAR PENGAJUAN TIM ---\n\n`;

        approvals.forEach((a, idx) => {
            message += `${idx + 1}. [${a.type.toUpperCase()}] ${a.employee}\n`;
            message += `   • No. Form: ${a.requestNumber || '-'}\n`;
            message += `   • Detail: ${a.details}\n`;
            message += `   • Waktu: ${a.dates}\n`;
            message += `   • Status: ${a.status.toUpperCase()}\n`;
            if (a.reason) message += `   • Alasan/Maksud: ${a.reason}\n`;
            if (a.rejectReason) message += `   • Catatan Admin: ${a.rejectReason}\n`;
            message += `\n`;
        });

        message += `Dikirim via Aplikasi Adidaya`;

        await Share.share({
            message,
            title: `Rekap Approval - ${monthStr}`
        });
    } catch (error: any) {
        handleShareError(error);
    }
}

/**
 * 6. Individual Leave Certificate (Surat Keterangan Cuti)
 */
export async function shareIndividualLeave(request: LeaveRequest) {
    try {
        let message = `==========================================\n`;
        message += `              SURAT KETERANGAN RESMI\n`;
        message += `                 NO: ${request.requestNumber || 'SRT/CUTI/' + request.id.slice(0, 8).toUpperCase()}\n`;
        message += `==========================================\n\n`;
        message += `Menerangkan bahwa pengajuan berikut telah diproses:\n\n`;
        message += `• Nama Karyawan    : ${request.userName || 'Karyawan Adidaya'}\n`;
        message += `• Tipe Pengajuan   : Permohonan Cuti (Leave Request)\n`;
        message += `• Jenis Cuti       : ${request.type}${request.subtype ? ` (${request.subtype.replace('_', ' ')})` : ''}\n`;
        message += `• Waktu / Tanggal  : ${request.startDate} s/d ${request.endDate}\n`;
        message += `• Status           : ${request.status.toUpperCase()}\n`;
        message += `• Alasan           : ${request.reason || '-'}\n\n`;

        if (request.rejectReason) {
            const label = ['revision', 'need revision'].includes(request.status) ? 'Instruksi Revisi' : 'Alasan Penolakan';
            message += `Catatan Tambahan:\n`;
            message += `• ${label}: ${request.rejectReason}\n\n`;
        }

        message += `------------------------------------------\n`;
        message += `Dokumen ini sah dikeluarkan secara digital\n`;
        message += `melalui Aplikasi Portal Adidaya.\n`;
        message += `Tanggal: ${format(new Date(request.createdAt || Date.now()), 'dd MMMM yyyy HH:mm')}\n`;
        message += `==========================================`;

        await Share.share({
            message,
            title: `Surat Keterangan Cuti - ${request.requestNumber || 'Cuti'}`
        });
    } catch (error: any) {
        handleShareError(error);
    }
}

/**
 * 7. Individual Overtime Certificate (Surat Keterangan Lembur)
 */
export async function shareIndividualOvertime(request: OvertimeLog) {
    try {
        let message = `==========================================\n`;
        message += `              SURAT KETERANGAN RESMI\n`;
        message += `                 NO: ${request.requestNumber || 'SRT/OT/' + request.id.slice(0, 8).toUpperCase()}\n`;
        message += `==========================================\n\n`;
        message += `Menerangkan bahwa pengajuan berikut telah diproses:\n\n`;
        message += `• Nama Karyawan    : ${request.userName || 'Karyawan Adidaya'}\n`;
        message += `• Tipe Pengajuan   : Kerja Lembur (Overtime Log)\n`;
        message += `• Tanggal Kerja    : ${request.date}\n`;
        message += `• Jam Kerja        : ${request.startTime} s/d ${request.endTime}\n`;
        message += `• Status           : ${request.status.toUpperCase()}\n`;
        message += `• Deskripsi        : ${request.description || '-'}\n\n`;

        if (request.rejectReason) {
            const label = ['revision', 'need revision'].includes(request.status) ? 'Instruksi Revisi' : 'Alasan Penolakan';
            message += `Catatan Tambahan:\n`;
            message += `• ${label}: ${request.rejectReason}\n\n`;
        }

        message += `------------------------------------------\n`;
        message += `Dokumen ini sah dikeluarkan secara digital\n`;
        message += `melalui Aplikasi Portal Adidaya.\n`;
        message += `Tanggal: ${format(new Date(request.createdAt || Date.now()), 'dd MMMM yyyy HH:mm')}\n`;
        message += `==========================================`;

        await Share.share({
            message,
            title: `Surat Keterangan Lembur - ${request.requestNumber || 'Lembur'}`
        });
    } catch (error: any) {
        handleShareError(error);
    }
}

/**
 * 8. Individual Business Trip Certificate (Surat Keterangan Dinas)
 */
export async function shareIndividualTrip(request: BusinessTrip) {
    try {
        let message = `==========================================\n`;
        message += `             SURAT PERINTAH TUGAS\n`;
        message += `                 NO: ${request.requestNumber || 'SRT/DINAS/' + request.id.slice(0, 8).toUpperCase()}\n`;
        message += `==========================================\n\n`;
        message += `Menerangkan bahwa pengajuan berikut telah diproses:\n\n`;
        message += `• Nama Karyawan    : ${request.userName || 'Karyawan Adidaya'}\n`;
        message += `• Tipe Pengajuan   : Perjalanan Dinas (Business Trip)\n`;
        message += `• Tujuan Dinas     : ${request.destination}\n`;
        message += `• Waktu / Tanggal  : ${request.startDate} s/d ${request.endDate}\n`;
        message += `• Status           : ${request.status.toUpperCase()}\n`;
        message += `• Maksud & Tujuan  : ${request.purpose || '-'}\n`;
        if (request.transportation) message += `• Transportasi     : ${request.transportation}\n`;
        if (request.accommodation) message += `• Akomodasi        : ${request.accommodation}\n`;
        if (request.estimatedCost) message += `• Estimasi Biaya   : Rp ${request.estimatedCost.toLocaleString('id-ID')}\n\n`;

        if (request.rejectReason) {
            const label = ['revision', 'need revision'].includes(request.status) ? 'Instruksi Revisi' : 'Alasan Penolakan';
            message += `Catatan Tambahan:\n`;
            message += `• ${label}: ${request.rejectReason}\n\n`;
        }

        message += `------------------------------------------\n`;
        message += `Dokumen ini sah dikeluarkan secara digital\n`;
        message += `melalui Aplikasi Portal Adidaya.\n`;
        message += `Tanggal: ${format(new Date(request.createdAt || Date.now()), 'dd MMMM yyyy HH:mm')}\n`;
        message += `==========================================`;

        await Share.share({
            message,
            title: `Surat Tugas Dinas - ${request.requestNumber || 'Dinas'}`
        });
    } catch (error: any) {
        handleShareError(error);
    }
}

/**
 * HTML Generation Helpers for PDF Previews
 */

export function generateTodayAttendanceHtml(members: any[], tenant?: ExportTenantInfo): string {
    const todayStr = format(new Date(), 'dd MMMM yyyy');
    const total = members.length;
    const checkedIn = members.filter(m => m.clockIn !== null).length;
    const late = members.filter(m => m.status === 'late').length;
    const leave = members.filter(m => m.status === 'leave').length;
    const absent = members.filter(m => m.status === 'absent').length;
    const pending = total - checkedIn - leave - absent;

    const rowsHtml = members.map((m, idx) => {
        const timeInfo = m.clockIn 
            ? `Clock In: ${formatTime(m.clockIn)}${m.clockOut ? ` | Clock Out: ${formatTime(m.clockOut)}` : ' (Active)'}` 
            : 'Not Clocked In';
        const statusColor = m.status === 'ontime' ? '#34C759' : m.status === 'late' ? '#FF3B30' : '#8E8E93';
        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${m.fullName}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${statusColor}; font-weight: 600;">${getStatusLabel(m.status)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${timeInfo}</td>
            </tr>
        `;
    }).join('');

    return `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                    ${commonHeaderCss}
                    .summary-grid { display: flex; justify-content: space-between; background: #F2F2F7; padding: 15px; border-radius: 12px; margin-bottom: 25px; font-size: 13px; }
                    .summary-item { text-align: center; flex: 1; }
                    .summary-val { font-size: 18px; font-weight: bold; color: #007AFF; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th { background-color: #007AFF; color: white; padding: 10px; text-align: left; }
                    td { padding: 10px; }
                </style>
            </head>
            <body>
                ${generateDocHeader(tenant, 'Daily Attendance Report', todayStr)}
                <div class="summary-grid">
                    <div class="summary-item">Total Members<div class="summary-val" style="color: #333;">${total}</div></div>
                    <div class="summary-item">Present<div class="summary-val" style="color: #34C759;">${checkedIn}</div></div>
                    <div class="summary-item">Late<div class="summary-val" style="color: #FF3B30;">${late}</div></div>
                    <div class="summary-item">Leave<div class="summary-val" style="color: #AF52DE;">${leave}</div></div>
                    <div class="summary-item">Pending<div class="summary-val" style="color: #FF9500;">${pending}</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">No</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Time Info</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
        </html>
    `;
}

export function generatePersonalTimesheetHtml(records: AttendanceRecord[], month: Date, userName: string, tenant?: ExportTenantInfo): string {
    const monthStr = format(month, 'MMMM yyyy');
    const stats = calculateStats(records as any, month);

    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    const rowsHtml = sorted.map((r, idx) => {
        const dateDisplay = format(new Date(r.date), 'EEE, dd MMM yyyy');
        const inTime = r.clockIn ? formatTime(r.clockIn) : '-';
        const outTime = r.clockOut ? formatTime(r.clockOut) : '-';
        const durationHrs = r.totalMinutes ? (r.totalMinutes / 60).toFixed(1) : '0';

        const isWorkingDay = !['weekend', 'holiday', 'cuti-bersama', 'leave', 'sick'].includes(r.status);
        const isShortHours = isWorkingDay && r.clockIn && r.totalMinutes < 480;
        const shortFlag = isShortHours ? ' <span style="color: #FF3B30; font-weight: bold;">⚠️ Short Hours</span>' : '';

        const statusColor = r.status === 'ontime' ? '#34C759' : r.status === 'late' ? '#FF3B30' : r.status === 'absent' ? '#8E8E93' : '#FF9500';

        let detailStr = '';
        if (r.clockIn) {
            detailStr = `IN: ${inTime} | OUT: ${outTime} (${durationHrs} Hours)${shortFlag}`;
        } else {
            detailStr = r.notes ? r.notes : '-';
        }

        if (r.overtimeMinutes > 0) {
            detailStr += ` | OT: ${(r.overtimeMinutes / 60).toFixed(1)} Hours`;
        }

        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${dateDisplay}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${statusColor}; font-weight: 600;">${getStatusLabel(r.status)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${detailStr}</td>
            </tr>
        `;
    }).join('');

    return `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                    ${commonHeaderCss}
                    .employee-info { margin-bottom: 20px; font-size: 14px; }
                    .info-row { display: flex; margin-bottom: 4px; }
                    .info-label { color: #666; width: 150px; }
                    .info-val { font-weight: bold; }
                    .stats-grid { display: flex; justify-content: space-between; background: #F2F2F7; padding: 15px; border-radius: 12px; margin-bottom: 25px; font-size: 13px; }
                    .stat-item { text-align: center; flex: 1; }
                    .stat-val { font-size: 18px; font-weight: bold; color: #007AFF; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th { background-color: #007AFF; color: white; padding: 10px; text-align: left; }
                    td { padding: 10px; }
                </style>
            </head>
            <body>
                ${generateDocHeader(tenant, 'Timesheet Report', monthStr)}
                <div class="employee-info">
                    <div class="info-row"><span class="info-label">Nama Karyawan:</span><span class="info-val">${userName}</span></div>
                    <div class="info-row"><span class="info-label">Periode:</span><span class="info-val">${monthStr}</span></div>
                </div>
                <div class="stats-grid">
                    <div class="stat-item">Attendance Score<div class="stat-val" style="color: #007AFF;">${stats.attendanceScore}%</div></div>
                    <div class="stat-item">Days Present<div class="stat-val" style="color: #34C759;">${stats.totalDaysPresent}</div></div>
                    <div class="stat-item">Days Late<div class="stat-val" style="color: #FF3B30;">${stats.totalDaysLate}</div></div>
                    <div class="stat-item">Overtime Hours<div class="stat-val" style="color: #AF52DE;">${Math.round(stats.totalOvertimeMinutes / 60)}h</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">No</th>
                            <th style="width: 150px;">Date</th>
                            <th style="width: 120px;">Status</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
        </html>
    `;
}

export function generateTeamTimesheetHtml(records: AttendanceRecord[], month: Date, workingDays: number, tenant?: ExportTenantInfo): string {
    const monthStr = format(month, 'MMMM yyyy');

    const userRecordsMap = new Map<string, { name: string; recs: AttendanceRecord[] }>();
    records.forEach(r => {
        const uId = r.userId;
        if (!userRecordsMap.has(uId)) {
            userRecordsMap.set(uId, { name: r.userName || 'Employee', recs: [] });
        }
        userRecordsMap.get(uId)!.recs.push(r);
    });

    const totalMembers = userRecordsMap.size || 1;
    let totalDaysPresent = 0;
    let totalDaysLate = 0;
    let totalOvertimeMinutes = 0;
    let totalScoreSum = 0;

    const membersSummary: any[] = [];

    userRecordsMap.forEach((userVal) => {
        const presentCount = userVal.recs.filter(r => !!r.clockIn && !['absent', 'leave', 'sick', 'weekend', 'holiday', 'cuti-bersama'].includes(r.status)).length;
        const absentCount = userVal.recs.filter(r => r.status === 'absent').length;
        const lateCount = userVal.recs.filter(r => r.status === 'late').length;
        const leaveSickCount = userVal.recs.filter(r => ['leave', 'sick'].includes(r.status)).length;
        const otMinutes = userVal.recs.reduce((sum, r) => sum + r.overtimeMinutes, 0);
        let totalWorkMinutes = 0;
        let totalOtMins = 0;
        userVal.recs.forEach(r => {
            totalWorkMinutes += (r.totalMinutes || 0);
            totalOtMins += (r.overtimeMinutes || 0);
        });

        const penalty = lateCount * 2 + absentCount * 5;
        const bonus = totalOtMins > 0 ? 3 : 0;
        const userScore = Math.max(0, Math.min(100, 100 - penalty + bonus));

        totalDaysPresent += presentCount;
        totalDaysLate += lateCount;
        totalOvertimeMinutes += otMinutes;
        totalScoreSum += userScore;

        membersSummary.push({
            name: userVal.name,
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            leaveSick: leaveSickCount,
            workHours: formatMinutes(totalWorkMinutes + totalOtMins),
            otDisplay: totalOtMins > 0 ? formatMinutes(totalOtMins) : '-',
            score: userScore,
        });
    });

    const avgPresent = (totalDaysPresent / totalMembers).toFixed(1);
    const avgLate = (totalDaysLate / totalMembers).toFixed(1);
    const avgOvertimeHours = ((totalOvertimeMinutes / 60) / totalMembers).toFixed(1);
    const avgScore = Math.round(totalScoreSum / totalMembers);

    const rowsHtml = membersSummary.sort((a, b) => a.name.localeCompare(b.name)).map((m, idx) => {
        const absentColor = m.absent > 0 ? '#D70015' : '#8E8E93';
        const lateColor = m.late > 0 ? '#C96800' : '#8E8E93';
        const leaveSickColor = m.leaveSick > 0 ? '#AF52DE' : '#8E8E93';
        const otColor = m.otDisplay !== '-' ? '#248A3D' : '#8E8E93';
        const scoreColor = m.score >= 85 ? '#248A3D' : m.score >= 70 ? '#C96800' : '#D70015';
        const scoreBg = m.score >= 85 ? 'rgba(52,199,89,0.12)' : m.score >= 70 ? 'rgba(255,149,0,0.12)' : 'rgba(255,59,48,0.12)';
        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${m.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${m.present} d</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; color: ${absentColor};">${m.absent > 0 ? m.absent + ' d' : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; color: ${lateColor};">${m.late > 0 ? m.late + ' d' : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; color: ${leaveSickColor};">${m.leaveSick > 0 ? m.leaveSick + ' d' : '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${m.workHours}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; color: ${otColor};">${m.otDisplay}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;"><span style="background: ${scoreBg}; color: ${scoreColor}; font-weight: bold; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${m.score}%</span></td>
            </tr>
        `;
    }).join('');

    return `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                    ${commonHeaderCss}
                    .period { color: #666; font-size: 13px; margin-bottom: 18px; }
                    .stats-grid { display: flex; justify-content: space-between; background: #F2F2F7; padding: 15px; border-radius: 12px; margin-bottom: 25px; font-size: 12px; }
                    .stat-item { text-align: center; flex: 1; }
                    .stat-val { font-size: 16px; font-weight: bold; color: #007AFF; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th { background-color: #007AFF; color: white; padding: 10px; text-align: center; }
                    th:first-child { text-align: left; }
                    td { padding: 10px; }
                </style>
            </head>
            <body>
                ${generateDocHeader(tenant, 'Team Timesheet Report', monthStr)}
                <div class="period">${totalMembers} team members · ${workingDays} working days</div>
                <div class="stats-grid">
                    <div class="stat-item">Avg Present<div class="stat-val" style="color: #34C759;">${avgPresent}d</div></div>
                    <div class="stat-item">Avg Late<div class="stat-val" style="color: #FF3B30;">${avgLate}d</div></div>
                    <div class="stat-item">Avg Overtime<div class="stat-val" style="color: #AF52DE;">${avgOvertimeHours}h</div></div>
                    <div class="stat-item">Score<div class="stat-val" style="color: #007AFF;">${avgScore}%</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">Member</th>
                            <th>Present</th>
                            <th>Absent</th>
                            <th>Late</th>
                            <th>Leave/Sick</th>
                            <th>Work Hours</th>
                            <th>Overtime</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
        </html>
    `;
}

export function generatePersonalRequestsHtml(
    leaves: LeaveRequest[],
    overtimes: OvertimeLog[],
    trips: BusinessTrip[],
    month: Date,
    userName: string,
    tenant?: ExportTenantInfo
): string {
    const monthStr = format(month, 'MMMM yyyy');
    const total = leaves.length + overtimes.length + trips.length;

    let rowsHtml = '';
    let counter = 1;

    leaves.forEach((l) => {
        const statusColor = l.status === 'approved' ? '#34C759' : l.status === 'rejected' ? '#FF3B30' : '#FF9500';
        rowsHtml += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${counter++}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">CUTI</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">No: ${l.requestNumber || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${l.type} (${l.subtype || ''})</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${l.startDate} s/d ${l.endDate}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${statusColor}; font-weight: bold; text-align: center;">${l.status.toUpperCase()}</td>
            </tr>
        `;
    });

    overtimes.forEach((o) => {
        const statusColor = o.status === 'approved' ? '#34C759' : o.status === 'rejected' ? '#FF3B30' : '#FF9500';
        rowsHtml += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${counter++}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">LEMBUR</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">No: ${o.requestNumber || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${o.description || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${o.date} (${o.startTime} - ${o.endTime})</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${statusColor}; font-weight: bold; text-align: center;">${o.status.toUpperCase()}</td>
            </tr>
        `;
    });

    trips.forEach((t) => {
        const statusColor = t.status === 'approved' ? '#34C759' : t.status === 'rejected' ? '#FF3B30' : '#FF9500';
        rowsHtml += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${counter++}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">DINAS</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">No: ${t.requestNumber || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">Tujuan: ${t.destination} (${t.purpose || '-'})</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${t.startDate} s/d ${t.endDate}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${statusColor}; font-weight: bold; text-align: center;">${t.status.toUpperCase()}</td>
            </tr>
        `;
    });

    if (total === 0) {
        rowsHtml = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #8E8E93;">Tidak ada pengajuan untuk periode ini.</td></tr>`;
    }

    return `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                    ${commonHeaderCss}
                    .employee-info { margin-bottom: 20px; font-size: 14px; }
                    .info-row { display: flex; margin-bottom: 4px; }
                    .info-label { color: #666; width: 150px; }
                    .info-val { font-weight: bold; }
                    .summary-grid { display: flex; justify-content: space-between; background: #F2F2F7; padding: 15px; border-radius: 12px; margin-bottom: 25px; font-size: 12px; }
                    .summary-item { text-align: center; flex: 1; }
                    .summary-val { font-size: 16px; font-weight: bold; color: #007AFF; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th { background-color: #007AFF; color: white; padding: 10px; text-align: center; }
                    th:nth-child(4) { text-align: left; }
                    td { padding: 10px; }
                </style>
            </head>
            <body>
                ${generateDocHeader(tenant, 'Personal Requests Summary', monthStr)}
                <div class="employee-info">
                    <div class="info-row"><span class="info-label">Nama Karyawan:</span><span class="info-val">${userName}</span></div>
                    <div class="info-row"><span class="info-label">Periode:</span><span class="info-val">${monthStr}</span></div>
                </div>
                <div class="summary-grid">
                    <div class="summary-item">Total Requests<div class="summary-val" style="color: #333;">${total}</div></div>
                    <div class="summary-item">Leaves<div class="summary-val" style="color: #AF52DE;">${leaves.length}</div></div>
                    <div class="summary-item">Overtimes<div class="summary-val" style="color: #FF9500;">${overtimes.length}</div></div>
                    <div class="summary-item">Business Trips<div class="summary-val" style="color: #34C759;">${trips.length}</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">No</th>
                            <th>Category</th>
                            <th>Form No</th>
                            <th style="text-align: left;">Details</th>
                            <th>Date / Range</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
        </html>
    `;
}

export function generateTeamApprovalsHtml(
    approvals: any[],
    month: Date,
    activeType: 'leaves' | 'overtime' | 'trips' | 'corrections',
    tenant?: ExportTenantInfo
): string {
    const monthStr = format(month, 'MMMM yyyy');
    const typeLabel = activeType === 'leaves' ? 'Leave Request' : activeType === 'overtime' ? 'Overtime' : activeType === 'trips' ? 'Business Trip' : 'Attendance Correction';

    const rowsHtml = approvals.map((a, idx) => {
        const statusColor = a.status === 'approved' ? '#34C759' : ['rejected', 'revision', 'need revision'].includes(a.status) ? '#FF3B30' : '#FF9500';
        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${a.employee}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">No: ${a.requestNumber || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${a.details || '-'} ${a.reason ? `(${a.reason})` : ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${a.dates}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${statusColor}; font-weight: bold; text-align: center;">${a.status.toUpperCase()}</td>
            </tr>
        `;
    }).join('');

    const total = approvals.length;
    const pending = approvals.filter(a => a.status === 'pending').length;
    const approved = approvals.filter(a => a.status === 'approved').length;
    const rejected = approvals.filter(a => ['rejected', 'revision', 'need revision'].includes(a.status)).length;

    return `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                    ${commonHeaderCss}
                    .period { color: #666; font-size: 13px; margin-bottom: 18px; }
                    .summary-grid { display: flex; justify-content: space-between; background: #F2F2F7; padding: 15px; border-radius: 12px; margin-bottom: 25px; font-size: 12px; }
                    .summary-item { text-align: center; flex: 1; }
                    .summary-val { font-size: 16px; font-weight: bold; color: #007AFF; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th { background-color: #007AFF; color: white; padding: 10px; text-align: center; }
                    th:nth-child(2) { text-align: left; }
                    th:nth-child(4) { text-align: left; }
                    td { padding: 10px; }
                </style>
            </head>
            <body>
                ${generateDocHeader(tenant, 'Team Approvals Report', monthStr)}
                <div class="period">Category: ${typeLabel}</div>
                <div class="summary-grid">
                    <div class="summary-item">Total Requests<div class="summary-val" style="color: #333;">${total}</div></div>
                    <div class="summary-item">Pending<div class="summary-val" style="color: #FF9500;">${pending}</div></div>
                    <div class="summary-item">Approved<div class="summary-val" style="color: #34C759;">${approved}</div></div>
                    <div class="summary-item">Rejected / Revision<div class="summary-val" style="color: #FF3B30;">${rejected}</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">No</th>
                            <th style="text-align: left;">Name</th>
                            <th>Form No</th>
                            <th style="text-align: left;">Details</th>
                            <th>Date / Range</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
        </html>
    `;
}
