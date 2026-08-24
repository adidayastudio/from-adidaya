import { supabase } from "@/lib/supabaseClient";
import { fetchCrewMembers, fetchDailyLogs, fetchRequests } from "@/lib/api/crew";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { isCrewPaidHolidayOrSunday } from "@/lib/holidays";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================
// TYPES & SCHEMAS
// ============================================

export type CrewIntelligenceIntent =
    // Directory
    | "crew.directory.count"
    | "crew.directory.list"
    | "crew.directory.profile"
    | "crew.directory.rate"
    | "crew.directory.average_rate"
    | "crew.directory.unassigned"
    | "crew.directory.new"
    | "crew.directory.inactive"
    | "crew.directory.profile_completeness"
    | "crew.directory.tenure"
    | "crew.directory.breakdown"
    // Assignment
    | "crew.assignment.current"
    | "crew.assignment.list"
    | "crew.assignment.count"
    | "crew.assignment.history"
    | "crew.assignment.unassigned"
    | "crew.assignment.starting"
    | "crew.assignment.ending"
    | "crew.assignment.expired"
    | "crew.assignment.transfer"
    | "crew.assignment.duration"
    | "crew.assignment.capacity"
    | "crew.assignment.available"
    // Daily Log
    | "crew.daily_log.summary"
    | "crew.daily_log.attendance_count"
    | "crew.daily_log.attendance_list"
    | "crew.daily_log.attendance_rate"
    | "crew.daily_log.absence"
    | "crew.daily_log.leave"
    | "crew.daily_log.overtime"
    | "crew.daily_log.overtime_total"
    | "crew.daily_log.completion"
    | "crew.daily_log.missing"
    // Payroll
    | "crew.payroll.total"
    | "crew.payroll.project"
    | "crew.payroll.worker"
    | "crew.payroll.breakdown"
    | "crew.payroll.compare"
    | "crew.payroll.rank"
    | "crew.payroll.average"
    | "crew.payroll.cost_efficiency"
    | "crew.payroll.anomaly"
    // KPI
    | "crew.kpi.worker"
    | "crew.kpi.rank"
    | "crew.kpi.status"
    | "crew.kpi.project_average"
    | "crew.kpi.attendance"
    | "crew.kpi.overtime"
    | "crew.kpi.evaluation"
    | "crew.kpi.performance_change"
    | "crew.kpi.replace_candidate"
    // Request
    | "crew.request.list"
    | "crew.request.count"
    | "crew.request.total"
    | "crew.request.leave"
    | "crew.request.cash_advance"
    | "crew.request.reimburse"
    | "crew.request.pending"
    | "crew.request.outstanding"
    // Cross-tab / Analytical
    | "crew.crosstab.payroll_change"
    | "crew.crosstab.worker_payroll"
    | "crew.crosstab.productivity"
    | "crew.crosstab.anomalies"
    | "crew.crosstab.health"
    | "crew.crosstab.replace_candidates";

export interface CrewIntelligenceParams {
    projectCode?: string;
    crewMemberName?: string;
    crewMemberId?: string;
    role?: string;
    status?: string;
    date?: string; // YYYY-MM-DD
    periodType?: "weekly" | "monthly" | "custom";
    periodStart?: string; // YYYY-MM-DD
    periodEnd?: string; // YYYY-MM-DD
    requestType?: "LEAVE" | "KASBON" | "REIMBURSE" | "SICK";
    requestStatus?: string;
}

export interface CrewRoutingResult {
    domain: "crew";
    intent: CrewIntelligenceIntent;
    parameters: CrewIntelligenceParams;
    confidence: number;
    requiredSources: string[];
}

// ============================================
// INTENT ROUTER & PARAMETER EXTRACTOR (LOCAL)
// ============================================

export function localParseCrewPrompt(
    text: string,
    allCrewNames: string[] = [],
    previousContext?: { intent: CrewIntelligenceIntent; parameters: CrewIntelligenceParams }
): CrewRoutingResult {
    const normalized = text.toLowerCase().trim();
    const result: CrewRoutingResult = {
        domain: "crew",
        intent: "crew.directory.count", // Default fallback
        parameters: {},
        confidence: 0.5,
        requiredSources: ["crew_members"]
    };

    // 1. PROJECT EXTRACTION
    const projectMatch = normalized.match(/\b(jpf|prg|rwm|rbh|tpc|lax|rawamangun|precision|jpadel|fatmawati)\b/i);
    if (projectMatch) {
        const val = projectMatch[1].toUpperCase();
        if (val === "RAWAMANGUN") result.parameters.projectCode = "RWM";
        else if (val === "PRECISION") result.parameters.projectCode = "PRG";
        else if (val === "JPADEL" || val === "FATMAWATI") result.parameters.projectCode = "JPF";
        else result.parameters.projectCode = val;
    }

    // 2. CREW NAME EXTRACTION
    for (const name of allCrewNames) {
        const nameLower = name.toLowerCase();
        if (normalized.includes(nameLower) || nameLower.split(/\s+/).some(part => part.length > 2 && normalized.includes(part))) {
            result.parameters.crewMemberName = name;
            break;
        }
    }

    // 3. ROLE / TRADE EXTRACTION
    if (normalized.includes("mandor") || normalized.includes("foreman")) result.parameters.role = "FOREMAN";
    else if (normalized.includes("kepala tukang") || normalized.includes("leader")) result.parameters.role = "LEADER";
    else if (normalized.includes("kenek") || normalized.includes("helper") || normalized.includes("asisten")) result.parameters.role = "HELPER";
    else if (normalized.includes("operator")) result.parameters.role = "OPERATOR";
    else if (normalized.includes("listrik")) {
        result.parameters.role = "SKILLED";
        result.parameters.status = "ACTIVE";
    } else if (normalized.includes("tukang")) result.parameters.role = "SKILLED";
    else if (normalized.includes("lain-lain") || normalized.includes("general")) result.parameters.role = "GENERAL";

    // 4. STATUS EXTRACTION
    if (normalized.includes("aktif") || normalized.includes("active")) result.parameters.status = "ACTIVE";
    else if (normalized.includes("tidak aktif") || normalized.includes("inactive") || normalized.includes("nonaktif")) result.parameters.status = "INACTIVE";

    // 5. DATE & PERIOD EXTRACTION
    const today = new Date();
    const formatLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };

    if (normalized.includes("hari ini") || normalized.includes("today")) {
        result.parameters.date = formatLocalDate(today);
    } else if (normalized.includes("kemarin") || normalized.includes("yesterday")) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        result.parameters.date = formatLocalDate(yesterday);
    } else if (normalized.includes("minggu ini") || normalized.includes("this week")) {
        result.parameters.periodType = "weekly";
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay()); // Sunday
        result.parameters.periodStart = formatLocalDate(start);
        result.parameters.periodEnd = formatLocalDate(today);
    } else if (normalized.includes("minggu lalu") || normalized.includes("last week") || normalized.includes("previous week")) {
        result.parameters.periodType = "weekly";
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        result.parameters.periodStart = formatLocalDate(start);
        result.parameters.periodEnd = formatLocalDate(end);
    } else if (normalized.includes("bulan ini") || normalized.includes("this month")) {
        result.parameters.periodType = "monthly";
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        result.parameters.periodStart = formatLocalDate(start);
        result.parameters.periodEnd = formatLocalDate(today);
    } else if (normalized.includes("bulan lalu") || normalized.includes("last month")) {
        result.parameters.periodType = "monthly";
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        result.parameters.periodStart = formatLocalDate(start);
        result.parameters.periodEnd = formatLocalDate(end);
    }

    // Default dates if not specified for range queries
    if (!result.parameters.date && !result.parameters.periodStart) {
        const rolling = new Date(today);
        rolling.setDate(today.getDate() - 6);
        result.parameters.periodStart = formatLocalDate(rolling);
        result.parameters.periodEnd = formatLocalDate(today);
        result.parameters.periodType = "weekly";
    }

    // 6. REQUEST TYPES
    if (normalized.includes("cuti") || normalized.includes("leave") || normalized.includes("ijin")) result.parameters.requestType = "LEAVE";
    else if (normalized.includes("kasbon") || normalized.includes("bon") || normalized.includes("cash advance")) result.parameters.requestType = "KASBON";
    else if (normalized.includes("reimburse")) result.parameters.requestType = "REIMBURSE";
    else if (normalized.includes("sakit") || normalized.includes("sick")) result.parameters.requestType = "SICK";

    // 7. FOLLOW-UP CONTEXT INHERITANCE
    // When user asks short follow-up like "skilled?", "kalau di RWM?", inherit missing params
    if (previousContext) {
        const wordCount = normalized.split(/\s+/).length;
        const isFollowUp = (
            wordCount <= 6 ||
            /^(kalau|kalo|terus|lalu|dan|gimana|bagaimana|how about|what about|nah)\b/.test(normalized) ||
            (normalized.endsWith("?") && wordCount <= 4)
        );
        if (isFollowUp) {
            if (!result.parameters.projectCode && previousContext.parameters.projectCode) {
                result.parameters.projectCode = previousContext.parameters.projectCode;
            }
            if (!result.parameters.status && previousContext.parameters.status) {
                result.parameters.status = previousContext.parameters.status;
            }
        }
    }

    // 8. MULTI-ROLE DETECTION
    // Detect "berapa skilled berapa helper", "rincian tenaga kerja", etc.
    const detectedRoles: string[] = [];
    if (normalized.includes("skilled") || (normalized.includes("tukang") && !normalized.includes("kepala tukang"))) detectedRoles.push("SKILLED");
    if (normalized.includes("helper") || normalized.includes("kenek") || normalized.includes("asisten")) detectedRoles.push("HELPER");
    if (normalized.includes("mandor") || normalized.includes("foreman")) detectedRoles.push("FOREMAN");
    if (normalized.includes("operator")) detectedRoles.push("OPERATOR");
    if (normalized.includes("leader") || normalized.includes("kepala tukang")) detectedRoles.push("LEADER");

    if (detectedRoles.length >= 2 ||
        ((normalized.includes("rincian") || normalized.includes("breakdown") || normalized.includes("per role") || normalized.includes("per peran")) &&
         (normalized.includes("tenaga") || normalized.includes("crew") || normalized.includes("pekerja") || normalized.includes("kerja")))) {
        result.intent = "crew.directory.breakdown";
        result.confidence = 0.9;
        result.requiredSources = ["crew_members"];
        return result;
    }

    // 9. INTENT CLASSIFICATION RULES
    let intentDetected = false;

    // Cross-tab Analysis "Why" questions (high priority)
    if (normalized.includes("kenapa") || normalized.includes("mengapa") || normalized.includes("why")) {
        if (normalized.includes("payroll") || normalized.includes("gaji") || normalized.includes("biaya") || normalized.includes("cost")) {
            if (result.parameters.crewMemberName) {
                result.intent = "crew.crosstab.worker_payroll";
            } else {
                result.intent = "crew.crosstab.payroll_change";
            }
            intentDetected = true;
        } else if (normalized.includes("lelet") || normalized.includes("lambat") || normalized.includes("productivity") || normalized.includes("progress")) {
            result.intent = "crew.crosstab.productivity";
            intentDetected = true;
        } else if (normalized.includes("monitor") || normalized.includes("replace") || normalized.includes("diganti")) {
            result.intent = "crew.crosstab.replace_candidates";
            intentDetected = true;
        } else if (normalized.includes("overtime") || normalized.includes("lembur")) {
            result.intent = "crew.crosstab.anomalies";
            intentDetected = true;
        }
    } else if (normalized.includes("aman") || normalized.includes("sehat") || normalized.includes("kondisi") || normalized.includes("masalah") || normalized.includes("gimana") || normalized.includes("bagaimana")) {
        if (projectMatch || normalized.includes("crew")) {
            result.intent = "crew.crosstab.health";
            intentDetected = true;
        }
    } else if (normalized.includes("aneh") || normalized.includes("abnormal") || normalized.includes("tidak normal")) {
        result.intent = "crew.crosstab.anomalies";
        intentDetected = true;
    }

    if (intentDetected) {
        result.confidence = 0.9;
        result.requiredSources = ["crew_members", "crew_daily_logs", "crew_requests", "crew_project_history"];
        return result;
    }

    // Comparison shortcut without other indicators default to payroll comparison
    if (normalized.includes("dibanding") || normalized.includes("vs") || normalized.includes("bandingkan")) {
        result.intent = "crew.payroll.compare";
        result.requiredSources = ["crew_daily_logs", "crew_members", "crew_requests"];
        result.confidence = 0.85;
        return result;
    }

    // Request module
    if (normalized.includes("kasbon") || normalized.includes("reimburse") || normalized.includes("cuti") || (normalized.includes("ijin") && !normalized.includes("masuk"))) {
        result.requiredSources = ["crew_requests", "crew_members"];
        if (normalized.includes("pending") || normalized.includes("belum di-approve") || normalized.includes("belum diapprove")) {
            result.intent = "crew.request.pending";
            result.parameters.requestStatus = "PENDING";
        } else if (normalized.includes("outstanding") || normalized.includes("sisa")) {
            result.intent = "crew.request.outstanding";
        } else if (normalized.includes("total") || normalized.includes("berapa jumlah") || normalized.includes("berapa kasbon")) {
            result.intent = "crew.request.total";
        } else {
            if (result.parameters.requestType === "LEAVE") result.intent = "crew.request.leave";
            else if (result.parameters.requestType === "KASBON") result.intent = "crew.request.cash_advance";
            else if (result.parameters.requestType === "REIMBURSE") result.intent = "crew.request.reimburse";
            else result.intent = "crew.request.list";
        }
        result.confidence = 0.85;
        return result;
    }

    // KPI module
    if (normalized.includes("kpi") || normalized.includes("rating") || normalized.includes("disiplin") || normalized.includes("performa") || normalized.includes("terbaik") || normalized.includes("terjelek") || normalized.includes("bintang") || normalized.includes("replace") || normalized.includes("monitor") || normalized.includes("evaluasi") || normalized.includes("diganti")) {
        result.requiredSources = ["crew_daily_logs", "crew_members"];
        if (result.parameters.crewMemberName) {
            result.intent = "crew.kpi.worker";
        } else if (normalized.includes("replace") || normalized.includes("sebaiknya diganti") || normalized.includes("ganti") || normalized.includes("diganti")) {
            result.intent = "crew.kpi.replace_candidate";
        } else if (normalized.includes("monitor")) {
            result.intent = "crew.kpi.status";
            result.parameters.status = "MONITOR";
        } else if (normalized.includes("tertinggi") || normalized.includes("terbaik") || normalized.includes("terendah") || normalized.includes("terjelek") || normalized.includes("ranking")) {
            result.intent = "crew.kpi.rank";
        } else if (normalized.includes("turun") || normalized.includes("naik") || normalized.includes("perubahan")) {
            result.intent = "crew.kpi.performance_change";
        } else {
            result.intent = "crew.kpi.project_average";
        }
        result.confidence = 0.85;
        return result;
    }

    // Payroll module
    if (normalized.includes("payroll") || normalized.includes("gaji") || normalized.includes("bayar") || normalized.includes("gajinya") || normalized.includes("base salary") || normalized.includes("biaya crew")) {
        result.requiredSources = ["crew_daily_logs", "crew_members", "crew_requests"];
        if (result.parameters.crewMemberName) {
            result.intent = "crew.payroll.worker";
        } else if (normalized.includes("rata-rata") || normalized.includes("rata rata") || normalized.includes("average")) {
            result.intent = "crew.payroll.average";
        } else if (normalized.includes("terbesar") || normalized.includes("tertinggi") || normalized.includes("paling mahal") || normalized.includes("ranking")) {
            result.intent = "crew.payroll.rank";
        } else if (normalized.includes("breakdown") || normalized.includes("rincian") || normalized.includes("lembur") || normalized.includes("potongan")) {
            result.intent = "crew.payroll.breakdown";
        } else {
            result.intent = "crew.payroll.total";
        }
        result.confidence = 0.85;
        return result;
    }

    // Daily Log module
    if (normalized.includes("absen") || normalized.includes("masuk") || normalized.includes("kehadiran") || normalized.includes("attendance") || normalized.includes("hadir") || normalized.includes("alpa") || normalized.includes("tidak datang") || normalized.includes("lembur") || normalized.includes("overtime") || normalized.includes("lengkap") || normalized.includes("belum diisi") || normalized.includes("belum isi") || normalized.includes("setengah hari") || normalized.includes("daily log")) {
        result.requiredSources = ["crew_daily_logs", "crew_members"];
        if (normalized.includes("belum diisi") || normalized.includes("lengkap") || normalized.includes("belum isi") || normalized.includes("siapa yang belum") || normalized.includes("belum punya daily log")) {
            result.intent = "crew.daily_log.completion";
        } else if (normalized.includes("alpa") || normalized.includes("tidak hadir") || normalized.includes("tidak masuk") || normalized.includes("absen")) {
            result.intent = "crew.daily_log.absence";
        } else if (normalized.includes("lembur") || normalized.includes("overtime")) {
            result.intent = "crew.daily_log.overtime";
        } else if (normalized.includes("persen") || normalized.includes("rate") || normalized.includes("prosentase")) {
            result.intent = "crew.daily_log.attendance_rate";
        } else {
            result.intent = "crew.daily_log.attendance_count";
        }
        result.confidence = 0.85;
        return result;
    }


    // Assignment module
    if (normalized.includes("proyek mana") || normalized.includes("assignment") || normalized.includes("ditugaskan") || normalized.includes("pindah") || normalized.includes("berpindah") || normalized.includes("selesai") || normalized.includes("mulai") || normalized.includes("available")) {
        result.requiredSources = ["crew_project_history", "crew_members"];
        if (normalized.includes("riwayat") || normalized.includes("pernah") || normalized.includes("dulu di")) {
            result.intent = "crew.assignment.history";
        } else if (normalized.includes("belum") || normalized.includes("menganggur") || normalized.includes("unassigned")) {
            result.intent = "crew.assignment.unassigned";
        } else if (normalized.includes("mulai")) {
            result.intent = "crew.assignment.starting";
        } else if (normalized.includes("selesai") || normalized.includes("habis")) {
            result.intent = "crew.assignment.ending";
        } else if (normalized.includes("lama")) {
            result.intent = "crew.assignment.duration";
        } else if (normalized.includes("available") || normalized.includes("luang")) {
            result.intent = "crew.assignment.available";
        } else {
            result.intent = "crew.assignment.current";
        }
        result.confidence = 0.85;
        return result;
    }

    // FOLLOW-UP INTENT INHERITANCE
    // If no specific intent matched and this is a follow-up, reuse previous intent
    if (previousContext) {
        const wordCount = normalized.split(/\s+/).length;
        const isFollowUp = (
            wordCount <= 6 ||
            /^(kalau|kalo|terus|lalu|dan|gimana|bagaimana|how about|what about|nah)\b/.test(normalized) ||
            (normalized.endsWith("?") && wordCount <= 4)
        );
        if (isFollowUp) {
            result.intent = previousContext.intent;
            result.confidence = 0.8;
            return result;
        }
    }

    // Directory module (Fallback count/list)
    if (normalized.includes("siapa saja") || normalized.includes("daftar") || normalized.includes("siapa crew")) {
        result.intent = "crew.directory.list";
    } else if (normalized.includes("rate") || normalized.includes("harga") || normalized.includes("base rate") || normalized.includes("gaji harian")) {
        if (result.parameters.crewMemberName) result.intent = "crew.directory.rate";
        else result.intent = "crew.directory.average_rate";
    } else if (normalized.includes("rekening") || normalized.includes("bank") || normalized.includes("lengkap") || normalized.includes("nik") || normalized.includes("phone")) {
        result.intent = "crew.directory.profile";
    } else {
        result.intent = "crew.directory.count";
    }
    result.confidence = 0.75;

    return result;
}

// ============================================
// DETERMINISTIC QUERY & CALCULATION ENGINE
// ============================================

export async function executeCrewQuery(
    intent: CrewIntelligenceIntent,
    params: CrewIntelligenceParams,
    workspaceId: string
): Promise<any> {
    const todayStr = params.date || new Date().toISOString().split("T")[0];

    switch (intent) {
        // --- DIRECTORY INTENTS ---
        case "crew.directory.count": {
            const members = await fetchCrewMembers(workspaceId, {
                status: (params.status as any) || "ACTIVE",
                role: params.role as any,
                projectCode: params.projectCode
            });
            return {
                count: members.length,
                status: params.status || "ACTIVE",
                role: params.role || "ALL",
                project: params.projectCode || "ALL"
            };
        }
        case "crew.directory.list": {
            const members = await fetchCrewMembers(workspaceId, {
                status: (params.status as any) || "ACTIVE",
                role: params.role as any,
                projectCode: params.projectCode
            });
            return {
                members: members.map(m => ({ id: m.id, name: m.name, role: m.role, status: m.status, rate: m.baseDailyRate })),
                project: params.projectCode || "ALL"
            };
        }
        case "crew.directory.profile": {
            const members = await fetchCrewMembers(workspaceId);
            let matched = members;
            if (params.crewMemberName) {
                matched = members.filter(m => m.name.toLowerCase().includes(params.crewMemberName!.toLowerCase()));
            }
            return {
                profiles: matched.map(m => ({
                    name: m.name,
                    role: m.role,
                    status: m.status,
                    phone: m.phone || "Belum diisi",
                    nik: m.nik || "Belum diisi",
                    bank: m.bankName || "Belum diisi",
                    accountNumber: m.bankAccount || "Belum diisi",
                    currentProject: m.currentProjectCode || "Belum ditugaskan",
                    rate: m.baseDailyRate,
                    joinDate: m.joinDate || "Belum diisi",
                    isComplete: !!(m.phone && m.nik && m.bankName && m.bankAccount)
                }))
            };
        }
        case "crew.directory.rate": {
            const members = await fetchCrewMembers(workspaceId);
            const matched = members.find(m => m.name.toLowerCase().includes(params.crewMemberName?.toLowerCase() || ""));
            if (!matched) return { error: `Crew bernama "${params.crewMemberName}" tidak ditemukan.` };
            return {
                name: matched.name,
                baseDailyRate: matched.baseDailyRate,
                overtimeDailyRate: matched.overtimeDailyRate,
                otRate1: matched.otRate1,
                otRate2: matched.otRate2,
                otRate3: matched.otRate3
            };
        }
        case "crew.directory.average_rate": {
            const members = await fetchCrewMembers(workspaceId, { role: params.role as any, status: "ACTIVE" });
            if (members.length === 0) return { average: 0, count: 0 };
            const sum = members.reduce((s, m) => s + m.baseDailyRate, 0);
            return {
                average: Math.round(sum / members.length),
                count: members.length,
                role: params.role || "ALL"
            };
        }
        case "crew.directory.unassigned": {
            const members = await fetchCrewMembers(workspaceId, { status: "ACTIVE" });
            const unassigned = members.filter(m => !m.currentProjectCode);
            return {
                count: unassigned.length,
                members: unassigned.map(m => ({ name: m.name, role: m.role }))
            };
        }
        case "crew.directory.breakdown": {
            const members = await fetchCrewMembers(workspaceId, {
                status: (params.status as any) || "ACTIVE",
                projectCode: params.projectCode
            });
            const roleCounts: Record<string, number> = {};
            members.forEach(m => {
                const role = m.role || "GENERAL";
                roleCounts[role] = (roleCounts[role] || 0) + 1;
            });
            const roleList = Object.entries(roleCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([role, count]) => ({ role, count }));
            return {
                project: params.projectCode || "ALL",
                totalActive: members.length,
                breakdown: roleList
            };
        }
        case "crew.directory.new": {
            const members = await fetchCrewMembers(workspaceId, { status: "ACTIVE" });
            // Sort by join date descending
            const sorted = members
                .filter(m => m.joinDate)
                .sort((a, b) => new Date(b.joinDate!).getTime() - new Date(a.joinDate!).getTime());
            return {
                newest: sorted.slice(0, 5).map(m => ({ name: m.name, role: m.role, joinDate: m.joinDate }))
            };
        }

        // --- ASSIGNMENT INTENTS ---
        case "crew.assignment.current": {
            const members = await fetchCrewMembers(workspaceId);
            if (params.crewMemberName) {
                const matched = members.find(m => m.name.toLowerCase().includes(params.crewMemberName!.toLowerCase()));
                if (!matched) return { error: `Crew "${params.crewMemberName}" tidak ditemukan.` };
                return {
                    name: matched.name,
                    projectCode: matched.currentProjectCode || "Belum ditugaskan",
                    role: matched.role
                };
            }
            // If no crew member name, list assignments for project
            const projectMembers = members.filter(m => m.currentProjectCode && m.currentProjectCode.includes(params.projectCode || ""));
            return {
                projectCode: params.projectCode || "ALL",
                count: projectMembers.length,
                crew: projectMembers.map(m => ({ name: m.name, role: m.role }))
            };
        }
        case "crew.assignment.history": {
            const members = await fetchCrewMembers(workspaceId);
            const matched = members.find(m => m.name.toLowerCase().includes(params.crewMemberName?.toLowerCase() || ""));
            if (!matched) return { error: `Crew "${params.crewMemberName}" tidak ditemukan.` };

            const { data: history, error } = await supabase
                .from("crew_project_history")
                .select("*")
                .eq("crew_member_id", matched.id)
                .order("start_date", { ascending: false });

            if (error) throw error;
            return {
                name: matched.name,
                history: (history || []).map(h => ({
                    projectCode: h.project_code,
                    startDate: h.start_date,
                    endDate: h.end_date || "Sekarang",
                    status: h.status
                }))
            };
        }

        // --- DAILY LOG INTENTS ---
        case "crew.daily_log.attendance_count": {
            const members = await fetchCrewMembers(workspaceId, { status: "ACTIVE" });
            const logs = await fetchDailyLogs(workspaceId, params.projectCode, todayStr);
            const present = logs.filter(l => l.status === "PRESENT" || l.status === "CUTI").length;
            const halfDay = logs.filter(l => l.status === "HALF_DAY").length;
            const absent = logs.filter(l => l.status === "ABSENT").length;
            const totalAssigned = members.filter(m => m.currentProjectCode && m.currentProjectCode.includes(params.projectCode || "")).length;

            return {
                date: todayStr,
                project: params.projectCode || "ALL",
                present: present + halfDay,
                halfDay,
                absent,
                totalAssigned
            };
        }
        case "crew.daily_log.absence": {
            const logs = await fetchDailyLogs(workspaceId, params.projectCode, todayStr);
            const absentLogs = logs.filter(l => l.status === "ABSENT");
            const members = await fetchCrewMembers(workspaceId);

            const absentList = absentLogs.map(l => {
                const crew = members.find(c => c.id === l.crewId);
                return {
                    name: crew?.name || "Unknown",
                    role: crew?.role || "GENERAL",
                    project: l.projectCode
                };
            });

            return {
                date: todayStr,
                absentList
            };
        }
        case "crew.daily_log.overtime": {
            const logs = await fetchDailyLogs(workspaceId, params.projectCode, todayStr);
            const overtimeLogs = logs.filter(l => (l.ot1Hours || 0) + (l.ot2Hours || 0) + (l.ot3Hours || 0) > 0);
            const members = await fetchCrewMembers(workspaceId);

            const list = overtimeLogs.map(l => {
                const crew = members.find(c => c.id === l.crewId);
                const otTotal = (l.ot1Hours || 0) + (l.ot2Hours || 0) + (l.ot3Hours || 0);
                return {
                    name: crew?.name || "Unknown",
                    project: l.projectCode,
                    hours: otTotal
                };
            });

            return {
                date: todayStr,
                totalHours: list.reduce((s, x) => s + x.hours, 0),
                list
            };
        }
        case "crew.daily_log.completion": {
            const projects = await fetchProjectsByWorkspace(workspaceId);
            const members = await fetchCrewMembers(workspaceId, { status: "ACTIVE" });
            const logs = await fetchDailyLogs(workspaceId, undefined, todayStr);

            const results = [];
            for (const p of projects) {
                const projectSuffix = p.project_code.split("-")[1] || p.project_code;
                const assigned = members.filter(m => m.currentProjectCode && m.currentProjectCode.includes(projectSuffix));
                if (assigned.length === 0) continue;

                const projectLogs = logs.filter(l => l.projectCode === projectSuffix);
                const missing = assigned.filter(m => !projectLogs.some(l => l.crewId === m.id));

                results.push({
                    projectName: p.project_name,
                    projectCode: projectSuffix,
                    assigned: assigned.length,
                    filled: projectLogs.length,
                    isComplete: missing.length === 0,
                    missing: missing.map(m => m.name)
                });
            }

            return {
                date: todayStr,
                completionStatus: results
            };
        }

        // --- PAYROLL INTENTS ---
        case "crew.payroll.total":
        case "crew.payroll.project": {
            const payload = await calculatePayrollLocal(workspaceId, params.projectCode, params.periodStart, params.periodEnd);
            return {
                projectCode: params.projectCode || "ALL",
                periodStart: params.periodStart,
                periodEnd: params.periodEnd,
                ...payload
            };
        }
        case "crew.payroll.worker": {
            const payload = await calculatePayrollLocal(workspaceId, undefined, params.periodStart, params.periodEnd);
            const workerPayroll = payload.payrollData.find((p: any) => p.crewName.toLowerCase().includes(params.crewMemberName?.toLowerCase() || ""));
            if (!workerPayroll) return { error: `Gaji untuk "${params.crewMemberName}" pada periode ini tidak ditemukan.` };
            return {
                name: workerPayroll.crewName,
                role: workerPayroll.crewRole,
                daysWorked: workerPayroll.days,
                basePay: workerPayroll.basePay,
                otPay: workerPayroll.otPay,
                kasbon: workerPayroll.kasbon,
                reimburse: workerPayroll.reimburse,
                netPay: workerPayroll.total,
                periodStart: params.periodStart,
                periodEnd: params.periodEnd
            };
        }
        case "crew.payroll.compare": {
            const periodA = { start: params.periodStart!, end: params.periodEnd! };
            // Compute period B (previous period of same duration)
            const dStart = new Date(periodA.start);
            const dEnd = new Date(periodA.end);
            const durationMs = dEnd.getTime() - dStart.getTime();

            const dStartB = new Date(dStart.getTime() - durationMs - (24 * 60 * 60 * 1000));
            const dEndB = new Date(dStart.getTime() - (24 * 60 * 60 * 1000));

            const formatD = (d: Date) => d.toISOString().split("T")[0];

            const payA = await calculatePayrollLocal(workspaceId, params.projectCode, periodA.start, periodA.end);
            const payB = await calculatePayrollLocal(workspaceId, params.projectCode, formatD(dStartB), formatD(dEndB));

            const totalA = payA.totals.total;
            const totalB = payB.totals.total;
            const diff = totalA - totalB;
            const pct = totalB > 0 ? (diff / totalB) * 100 : 0;

            return {
                projectCode: params.projectCode || "ALL",
                currentPeriod: periodA,
                previousPeriod: { start: formatD(dStartB), end: formatD(dEndB) },
                currentTotal: totalA,
                previousTotal: totalB,
                difference: diff,
                percentageChange: parseFloat(pct.toFixed(2)),
                drivers: {
                    basePayDiff: payA.totals.base - payB.totals.base,
                    otPayDiff: payA.totals.ot - payB.totals.ot,
                    kasbonDiff: payA.totals.kasbon - payB.totals.kasbon,
                    reimburseDiff: payA.totals.reimburse - payB.totals.reimburse
                }
            };
        }

        // --- KPI INTENTS ---
        case "crew.kpi.worker": {
            const payload = await calculateKPILocal(workspaceId, params.periodStart, params.periodEnd);
            const worker = payload.find(w => w.crewName.toLowerCase().includes(params.crewMemberName?.toLowerCase() || ""));
            if (!worker) return { error: `Data KPI untuk "${params.crewMemberName}" tidak ditemukan.` };
            return worker;
        }
        case "crew.kpi.rank": {
            const payload = await calculateKPILocal(workspaceId, params.periodStart, params.periodEnd);
            if (params.projectCode) {
                const projFiltered = payload.filter(w => w.projectCode === params.projectCode);
                return {
                    projectCode: params.projectCode,
                    rankings: projFiltered.sort((a, b) => b.totalScore - a.totalScore)
                };
            }
            return {
                rankings: payload.sort((a, b) => b.totalScore - a.totalScore)
            };
        }
        case "crew.kpi.replace_candidate": {
            const payload = await calculateKPILocal(workspaceId, params.periodStart, params.periodEnd);
            const candidates = payload.filter(w => w.status === "REPLACE");
            return {
                candidates: candidates.map(c => ({ name: c.crewName, project: c.projectCode, score: c.totalScore, reason: `Attendance ${c.daysPresent}/${c.workingDays} hari, Rating harian avg ${c.avgRating}` }))
            };
        }

        // --- REQUEST INTENTS ---
        case "crew.request.pending": {
            const reqs = await fetchRequests(workspaceId);
            const pending = reqs.filter(r => r.status === "PENDING" && (!params.requestType || r.type === params.requestType));
            return {
                count: pending.length,
                pendingRequests: pending.map(r => ({ id: r.id, name: r.crewName, type: r.type, amount: r.amount, reason: r.reason, date: r.startDate }))
            };
        }
        case "crew.request.outstanding": {
            // Outstanding cash advance (KASBON approved but not settled/paid? Or just totals)
            const reqs = await fetchRequests(workspaceId);
            const approvedKasbon = reqs.filter(r => r.status === "APPROVED" && r.type === "KASBON");
            const sum = approvedKasbon.reduce((s, r) => s + (r.amount || 0), 0);
            return {
                totalOutstanding: sum,
                requestsCount: approvedKasbon.length
            };
        }

        // --- CROSS-TAB ANALYTICAL INTENTS ---
        case "crew.crosstab.payroll_change": {
            return await analyzePayrollChangeLocal(workspaceId, params.projectCode, params.periodStart, params.periodEnd);
        }
        case "crew.crosstab.worker_payroll": {
            return await analyzeWorkerPayrollLocal(workspaceId, params.crewMemberName!, params.periodStart, params.periodEnd);
        }
        case "crew.crosstab.productivity": {
            return await analyzeProductivityLocal(workspaceId, params.projectCode);
        }
        case "crew.crosstab.health": {
            return await getCrewHealthSummaryLocal(workspaceId, params.projectCode);
        }
        case "crew.crosstab.anomalies": {
            return await detectCrewAnomaliesLocal(workspaceId, params.projectCode);
        }
        case "crew.crosstab.replace_candidates": {
            const payload = await calculateKPILocal(workspaceId, params.periodStart, params.periodEnd);
            const replacements = payload.filter(w => w.status === "REPLACE");
            const monitorList = payload.filter(w => w.status === "MONITOR");
            return {
                replacements: replacements.map(r => ({ name: r.crewName, role: r.crewRole, project: r.projectCode, score: r.totalScore })),
                monitor: monitorList.map(r => ({ name: r.crewName, role: r.crewRole, project: r.projectCode, score: r.totalScore }))
            };
        }

        default:
            return { error: `Intent "${intent}" belum didukung deterministik.` };
    }
}

// ============================================
// HELPER CALCULATIONS
// ============================================

async function calculatePayrollLocal(
    workspaceId: string,
    projectSuffix?: string,
    startStr?: string,
    endStr?: string
): Promise<any> {
    const allMembers = await fetchCrewMembers(workspaceId);
    
    // Default to last 7 days if not defined
    const dEnd = endStr ? new Date(endStr) : new Date();
    const dStart = startStr ? new Date(startStr) : new Date(dEnd.getTime() - (6 * 24 * 60 * 60 * 1000));

    const dates: string[] = [];
    let d = new Date(dStart);
    while (d <= dEnd) {
        dates.push(d.toISOString().split("T")[0]);
        d.setDate(d.getDate() + 1);
    }

    const logsPromises = dates.map(date => fetchDailyLogs(workspaceId, projectSuffix, date));
    const logsArrs = await Promise.all(logsPromises);
    const allLogs = logsArrs.flat();

    let approvedReqs: any[] = [];
    try {
        const requests = await fetchRequests(workspaceId);
        approvedReqs = requests.filter(r => {
            if (r.status !== "APPROVED") return false;
            if (r.type !== "KASBON" && r.type !== "REIMBURSE") return false;

            if (projectSuffix) {
                const reqProj = r.projectCode;
                if (!reqProj) return false;
                if (reqProj !== projectSuffix) return false;
            }

            const reqDate = r.startDate || r.createdAt.split("T")[0];
            const startLimit = dStart.toISOString().split("T")[0];
            const endLimit = dEnd.toISOString().split("T")[0];
            return reqDate >= startLimit && reqDate <= endLimit;
        });
    } catch (e) {
        console.error(e);
    }

    const crewIdsWithLogs = new Set(allLogs.map(l => l.crewId));
    const crewIdsWithReqs = new Set(approvedReqs.map(r => r.crewId));
    const currentlyAssigned = projectSuffix 
        ? allMembers.filter(m => m.currentProjectCode && m.currentProjectCode.includes(projectSuffix))
        : allMembers;

    const relevantCrew = allMembers.filter(m => 
        crewIdsWithLogs.has(m.id) || 
        crewIdsWithReqs.has(m.id) ||
        (projectSuffix ? currentlyAssigned.some(ca => ca.id === m.id) : true)
    );

    const payrollMap = new Map<string, any>();
    relevantCrew.forEach(crew => {
        payrollMap.set(crew.id, {
            id: crew.id,
            crewName: crew.name,
            crewRole: crew.role,
            days: 0,
            basePay: 0,
            otPay: 0,
            kasbon: 0,
            reimburse: 0,
            total: 0
        });
    });

    const uniqueLogsMap = new Map<string, any>();
    allLogs.forEach(log => {
        const key = `${log.crewId}_${log.date}`;
        uniqueLogsMap.set(key, log);
    });

    Array.from(uniqueLogsMap.values()).forEach(log => {
        const entry = payrollMap.get(log.crewId);
        if (!entry) return;

        const crew = relevantCrew.find(c => c.id === log.crewId);
        if (!crew) return;

        if (log.status === "PRESENT") entry.days += 1;
        else if (log.status === "HALF_DAY") entry.days += 0.5;

        const isHoliday = isCrewPaidHolidayOrSunday(log.date);
        const dailyRate = isHoliday ? crew.overtimeDailyRate : crew.baseDailyRate;
        const hourlyRate = dailyRate / 8;
        entry.basePay += log.regularHours * hourlyRate;

        entry.otPay += (log.ot1Hours * crew.otRate1) + (log.ot2Hours * crew.otRate2) + (log.ot3Hours * crew.otRate3);
    });

    approvedReqs.forEach(req => {
        const entry = payrollMap.get(req.crewId);
        if (!entry) return;

        if (req.type === "KASBON") {
            entry.kasbon += (req.amount || 0);
        } else if (req.type === "REIMBURSE") {
            entry.reimburse += (req.amount || 0);
        }
    });

    const results = Array.from(payrollMap.values()).map(e => ({
        ...e,
        total: e.basePay + e.otPay - e.kasbon + e.reimburse
    }));

    return {
        payrollData: results,
        totals: {
            base: results.reduce((s, p) => s + p.basePay, 0),
            ot: results.reduce((s, p) => s + p.otPay, 0),
            kasbon: results.reduce((s, p) => s + p.kasbon, 0),
            reimburse: results.reduce((s, p) => s + p.reimburse, 0),
            total: results.reduce((s, p) => s + p.total, 0)
        }
    };
}

async function calculateKPILocal(
    workspaceId: string,
    startStr?: string,
    endStr?: string
): Promise<any[]> {
    const members = await fetchCrewMembers(workspaceId);
    const allLogs = await fetchDailyLogs(workspaceId);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const dStart = startStr ? new Date(startStr) : new Date(today.getTime() - (29 * 24 * 60 * 60 * 1000));
    dStart.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today.getTime() - dStart.getTime());
    const elapsedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return members.map(m => {
        const memberLogs = allLogs.filter(l => {
            const ld = new Date(l.date);
            return l.crewId === m.id && ld >= dStart && ld <= today;
        });

        // 1. Attendance (50%)
        const daysPresent = memberLogs.filter(l => l.status === "PRESENT" || l.status === "CUTI").length;
        const halfDays = memberLogs.filter(l => l.status === "HALF_DAY").length;
        const effectivePresent = daysPresent + (halfDays * 0.5);
        const attendanceRatio = Math.min(1, effectivePresent / elapsedDays);
        const attendanceScore = attendanceRatio * 50;

        // 2. Overtime (25%)
        const totalOtHours = memberLogs.reduce((sum, l) => sum + l.ot1Hours + l.ot2Hours + l.ot3Hours, 0);
        const otBenchmark = elapsedDays * 6; // 6 hours per elapsed day benchmark
        const otRatio = Math.min(1, totalOtHours / (otBenchmark || 1));
        const overtimeScore = otRatio * 25;

        // 3. Rating (25%)
        const ratings = memberLogs.filter(l => l.rating !== undefined && l.rating > 0).map(l => l.rating!);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        const ratingScore = (avgRating / 5) * 25;

        const totalScore = Math.round(attendanceScore + overtimeScore + ratingScore);

        let status: "KEEP" | "MONITOR" | "REPLACE" = "REPLACE";
        if (totalScore >= 80) status = "KEEP";
        else if (totalScore >= 60) status = "MONITOR";

        return {
            id: m.id,
            crewName: m.name,
            crewRole: m.role,
            projectCode: m.currentProjectCode || "-",
            attendanceScore: Math.round(attendanceScore),
            overtimeScore: Math.round(overtimeScore),
            ratingScore: Math.round(ratingScore),
            daysPresent: effectivePresent,
            daysOt: totalOtHours,
            avgRating: parseFloat(avgRating.toFixed(1)),
            workingDays: elapsedDays,
            totalScore,
            status
        };
    });
}

// --- CROSS TAB EXPLANATIONS ---

async function analyzePayrollChangeLocal(
    workspaceId: string,
    projectSuffix?: string,
    startStr?: string,
    endStr?: string
): Promise<any> {
    const dEnd = endStr ? new Date(endStr) : new Date();
    const dStart = startStr ? new Date(startStr) : new Date(dEnd.getTime() - (6 * 24 * 60 * 60 * 1000));
    const duration = dEnd.getTime() - dStart.getTime();

    const dStartPrev = new Date(dStart.getTime() - duration - (24 * 60 * 60 * 1000));
    const dEndPrev = new Date(dStart.getTime() - (24 * 60 * 60 * 1000));

    const formatD = (d: Date) => d.toISOString().split("T")[0];

    const currentPay = await calculatePayrollLocal(workspaceId, projectSuffix, formatD(dStart), formatD(dEnd));
    const previousPay = await calculatePayrollLocal(workspaceId, projectSuffix, formatD(dStartPrev), formatD(dEndPrev));

    const currentTotal = currentPay.totals.total;
    const previousTotal = previousPay.totals.total;
    const difference = currentTotal - previousTotal;
    const pct = previousTotal > 0 ? (difference / previousTotal) * 100 : 0;

    // Detect drivers
    const drivers = [];
    
    // 1. Crew count impact
    const currentCrewCount = currentPay.payrollData.length;
    const previousCrewCount = previousPay.payrollData.length;
    if (currentCrewCount !== previousCrewCount) {
        const diffCount = currentCrewCount - previousCrewCount;
        const avgCrewCost = currentCrewCount > 0 ? currentTotal / currentCrewCount : 0;
        drivers.push({
            type: "crew_count",
            label: diffCount > 0 ? `Penambahan ${diffCount} crew` : `Pengurangan ${Math.abs(diffCount)} crew`,
            impact: Math.round(diffCount * avgCrewCost)
        });
    }

    // 2. Overtime impact
    const currentOt = currentPay.totals.ot;
    const previousOt = previousPay.totals.ot;
    if (Math.abs(currentOt - previousOt) > 10000) {
        drivers.push({
            type: "overtime",
            label: currentOt > previousOt ? "Kenaikan jam lembur" : "Penurunan jam lembur",
            impact: currentOt - previousOt
        });
    }

    // 3. Reimbursement impact
    const currentReimburse = currentPay.totals.reimburse;
    const previousReimburse = previousPay.totals.reimburse;
    if (Math.abs(currentReimburse - previousReimburse) > 10000) {
        drivers.push({
            type: "reimburse",
            label: currentReimburse > previousReimburse ? "Kenaikan reimburse" : "Penurunan reimburse",
            impact: currentReimburse - previousReimburse
        });
    }

    // 4. Cash advance impact
    const currentKasbon = currentPay.totals.kasbon;
    const previousKasbon = previousPay.totals.kasbon;
    if (Math.abs(currentKasbon - previousKasbon) > 10000) {
        drivers.push({
            type: "kasbon",
            label: currentKasbon > previousKasbon ? "Peningkatan potongan kasbon" : "Penurunan potongan kasbon",
            impact: -(currentKasbon - previousKasbon) // Deductions reduce net pay, so higher kasbon = lower net pay
        });
    }

    // Sort drivers by absolute impact
    drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
        currentTotal,
        previousTotal,
        difference,
        percentageChange: parseFloat(pct.toFixed(2)),
        drivers
    };
}

async function analyzeWorkerPayrollLocal(
    workspaceId: string,
    name: string,
    startStr?: string,
    endStr?: string
): Promise<any> {
    const payload = await calculatePayrollLocal(workspaceId, undefined, startStr, endStr);
    const worker = payload.payrollData.find((p: any) => p.crewName.toLowerCase().includes(name.toLowerCase()));
    
    if (!worker) return { error: `Gaji untuk "${name}" tidak ditemukan.` };

    const members = await fetchCrewMembers(workspaceId);
    const matchedCrew = members.find(m => m.id === worker.id);

    // Calculate peers avg in the same project or trade
    const sameTrade = payload.payrollData.filter((p: any) => p.crewRole === worker.crewRole && p.id !== worker.id);
    const avgTradePay = sameTrade.length > 0 ? sameTrade.reduce((s: number, p: any) => s + p.total, 0) / sameTrade.length : worker.total;

    return {
        name: worker.crewName,
        role: worker.crewRole,
        totalPay: worker.total,
        basePay: worker.basePay,
        otPay: worker.otPay,
        reimburse: worker.reimburse,
        kasbon: worker.kasbon,
        daysWorked: worker.days,
        tradeAvgPay: Math.round(avgTradePay),
        percentAboveAvg: avgTradePay > 0 ? parseFloat((((worker.total - avgTradePay) / avgTradePay) * 100).toFixed(2)) : 0,
        baseRate: matchedCrew?.baseDailyRate || 0,
        otRate: matchedCrew?.overtimeDailyRate || 0
    };
}

async function analyzeProductivityLocal(workspaceId: string, projectSuffix?: string): Promise<any> {
    const kpis = await calculateKPILocal(workspaceId);
    const projectKPIs = projectSuffix ? kpis.filter(k => k.projectCode === projectSuffix) : kpis;

    const monitorCount = projectKPIs.filter(k => k.status === "MONITOR").length;
    const replaceCount = projectKPIs.filter(k => k.status === "REPLACE").length;
    const keepCount = projectKPIs.filter(k => k.status === "KEEP").length;

    const total = projectKPIs.length;
    const avgScore = total > 0 ? Math.round(projectKPIs.reduce((s, k) => s + k.totalScore, 0) / total) : 0;
    
    // Attendance rate
    const avgAttendance = total > 0 ? Math.round(projectKPIs.reduce((s, k) => s + (k.daysPresent / k.workingDays * 100), 0) / total) : 0;

    return {
        projectCode: projectSuffix || "ALL",
        totalCrew: total,
        avgScore,
        avgAttendancePercent: avgAttendance,
        keepCount,
        monitorCount,
        replaceCount,
        indicators: {
            lowAttendance: projectKPIs.filter(k => k.daysPresent / k.workingDays < 0.8).map(k => k.crewName),
            highOvertimeLowScore: projectKPIs.filter(k => k.daysOt > 20 && k.totalScore < 60).map(k => k.crewName),
            lowDailyRating: projectKPIs.filter(k => k.avgRating > 0 && k.avgRating < 3.5).map(k => k.crewName)
        }
    };
}

async function getCrewHealthSummaryLocal(workspaceId: string, projectSuffix?: string): Promise<any> {
    const members = await fetchCrewMembers(workspaceId, { status: "ACTIVE", projectCode: projectSuffix });
    const kpis = await calculateKPILocal(workspaceId);
    const projKPIs = projectSuffix ? kpis.filter(k => k.projectCode === projectSuffix) : kpis;

    const avgKPI = projKPIs.length > 0 ? Math.round(projKPIs.reduce((s, k) => s + k.totalScore, 0) / projKPIs.length) : 0;
    const monitor = projKPIs.filter(k => k.status === "MONITOR").length;
    const replace = projKPIs.filter(k => k.status === "REPLACE").length;

    // Get attendance rate for past week
    const today = new Date().toISOString().split("T")[0];
    const logs = await fetchDailyLogs(workspaceId, projectSuffix, today);
    const presentCount = logs.filter(l => l.status === "PRESENT" || l.status === "HALF_DAY" || l.status === "CUTI").length;
    const attendancePercent = members.length > 0 ? Math.round((presentCount / members.length) * 100) : 0;

    // Pending requests
    const reqs = await fetchRequests(workspaceId);
    const pendingRequests = reqs.filter(r => r.status === "PENDING" && (!projectSuffix || r.projectCode === projectSuffix)).length;

    return {
        activeCrew: members.length,
        todayAttendancePercent: attendancePercent,
        avgKPI,
        monitorCount: monitor,
        replaceCount: replace,
        pendingRequests
    };
}

async function detectCrewAnomaliesLocal(workspaceId: string, projectSuffix?: string): Promise<any> {
    const payroll = await calculatePayrollLocal(workspaceId, projectSuffix);
    const kpis = await calculateKPILocal(workspaceId);

    const anomalies: any[] = [];

    // 1. High Overtime with Low KPI
    payroll.payrollData.forEach((w: any) => {
        const kpi = kpis.find(k => k.id === w.id);
        if (kpi && w.otPay > 1000000 && kpi.totalScore < 60) {
            anomalies.push({
                crewName: w.crewName,
                projectCode: kpi.projectCode,
                type: "HIGH_COST_LOW_PERFORMANCE",
                description: `Lembur tinggi (Rp ${w.otPay.toLocaleString("id-ID")}) tetapi skor performa rendah (${kpi.totalScore}/100)`
            });
        }
    });

    // 2. High Salary relative to peers
    const avgSalary = payroll.totals.total / (payroll.payrollData.length || 1);
    payroll.payrollData.forEach((w: any) => {
        if (w.total > avgSalary * 1.5) {
            anomalies.push({
                crewName: w.crewName,
                projectCode: w.crewProject || projectSuffix || "ALL",
                type: "HIGH_PAYROLL",
                description: `Gaji 50% di atas rata-rata crew sejenis (Rp ${w.total.toLocaleString("id-ID")} vs rata-rata Rp ${Math.round(avgSalary).toLocaleString("id-ID")})`
            });
        }
    });

    // 3. Repeated Absences
    kpis.forEach(k => {
        const absenceRatio = (k.workingDays - k.daysPresent) / k.workingDays;
        if (absenceRatio > 0.3) {
            anomalies.push({
                crewName: k.crewName,
                projectCode: k.projectCode,
                type: "HIGH_ABSENCE",
                description: `Tidak hadir lebih dari 30% hari kerja (${k.workingDays - k.daysPresent} hari alpa dari ${k.workingDays} hari kerja)`
            });
        }
    });

    return {
        anomaliesCount: anomalies.length,
        anomaliesList: anomalies
    };
}

// ============================================
// NATURAL LANGUAGE GENERATORS & FALLBACKS
// ============================================

export async function generateCrewResponse(
    intent: CrewIntelligenceIntent,
    queryResult: any,
    userPrompt: string
): Promise<string> {
    // 1. Try Gemini first if API key is present
    if (process.env.GOOGLE_AI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

            const prompt = `
                Anda adalah asisten AI Adidaya Intelligence yang menganalisis data pekerja (Crew).
                
                Tugas Anda: Jawab pertanyaan user berdasarkan DATA DETERMINISTIK dari database internal di bawah ini.
                
                Aturan Penting:
                1. Jawab secara ringkas, jelas, dan natural dalam Bahasa Indonesia.
                2. Wajib menggunakan data angka riil yang disediakan. Jangan mengarang nilai atau menyembunyikan kontributor utama.
                3. Urutkan faktor kontribusi terbesar/terkuat terlebih dahulu.
                4. Jika data tidak lengkap atau bernilai 0, katakan dengan jujur bahwa kesimpulan belum bisa dipastikan dari data yang ada.
                5. Jangan berasumsi adanya korelasi pasti jika tidak didukung data (misal lembur tinggi pasti karena rajin - bisa jadi karena kurang staff/tidak efisien).
                6. Jangan kembalikan tabel markdown yang terlalu panjang kecuali diminta, melainkan penjelasan teks natural.

                Pertanyaan User: "${userPrompt}"
                Intent Terdeteksi: "${intent}"
                Data Deterministik: ${JSON.stringify(queryResult, null, 2)}

                Jawaban Natural:
            `;

            const response = await model.generateContent(prompt);
            const text = (await response.response).text();
            if (text && text.trim().length > 0) return text.trim();
        } catch (e) {
            console.error("Gemini Response Generation Error:", e);
        }
    }

    // 2. Fallback to Local Natural Templates
    return getLocalTemplateResponse(intent, queryResult);
}

function getLocalTemplateResponse(intent: CrewIntelligenceIntent, data: any): string {
    if (data.error) return data.error;

    switch (intent) {
        case "crew.directory.count": {
            const projStr = data.project !== "ALL" ? ` di proyek **${data.project}**` : " di seluruh proyek";
            const roleStr = data.role !== "ALL" ? ` dengan peran **${data.role}**` : "";
            if (data.count === 0) {
                return `Saat ini tidak ada crew aktif${projStr}${roleStr} yang terdaftar dalam sistem.`;
            }
            return `Saat ini terdapat **${data.count} crew** aktif${projStr}${roleStr} yang terdaftar.\n\nData ini mencakup seluruh tenaga kerja berstatus aktif berdasarkan database Crew Directory.`;
        }
        case "crew.directory.list": {
            if (data.members.length === 0) {
                return `Tidak ditemukan crew aktif untuk proyek **${data.project}**. Pastikan ada crew yang sudah di-assign ke proyek ini.`;
            }
            const names = data.members.map((m: any) => `- **${m.name}** — ${m.role}`).join("\n");
            return `Berikut daftar **${data.members.length} crew** di proyek **${data.project}**:\n${names}`;
        }
        case "crew.directory.profile": {
            if (data.profiles.length === 0) return "Data profil crew tidak ditemukan.";
            const p = data.profiles[0];
            return `**Profil ${p.name}**:\n` +
                `- Peran: ${p.role} (${p.status})\n` +
                `- NIK: ${p.nik}\n` +
                `- No. HP: ${p.phone}\n` +
                `- Bank: ${p.bank} (${p.accountNumber})\n` +
                `- Proyek Saat Ini: ${p.currentProject}\n` +
                `- Gaji Harian: Rp ${p.rate.toLocaleString("id-ID")}\n` +
                `- Tanggal Gabung: ${p.joinDate}\n` +
                `*(Status Kelengkapan Data: ${p.isComplete ? "Lengkap" : "Belum Lengkap"})*`;
        }
        case "crew.directory.breakdown": {
            const projStr = data.project !== "ALL" ? ` di proyek **${data.project}**` : " di seluruh proyek";
            const lines = data.breakdown.map((r: any) => `- **${r.role}**: ${r.count} orang`).join("\n");
            return `Rincian tenaga kerja${projStr} — total **${data.totalActive} crew** aktif:\n\n${lines}\n\nData berdasarkan Crew Directory dengan status aktif.`;
        }
        case "crew.directory.rate": {
            return `Gaji harian **${data.name}** adalah **Rp ${data.baseDailyRate.toLocaleString("id-ID")}** untuk hari kerja regular, dan **Rp ${data.overtimeDailyRate.toLocaleString("id-ID")}** untuk hari Minggu/libur.\n\nUpah lembur per jam:\n- OT1: Rp ${data.otRate1.toLocaleString("id-ID")}\n- OT2: Rp ${data.otRate2.toLocaleString("id-ID")}\n- OT3: Rp ${data.otRate3.toLocaleString("id-ID")}`;
        }
        case "crew.directory.average_rate": {
            const roleStr = data.role !== "ALL" ? ` untuk peran ${data.role}` : "";
            return `Rata-rata rate crew aktif${roleStr} adalah **Rp ${data.average.toLocaleString("id-ID")}** per hari dari total ${data.count} crew.`;
        }
        case "crew.daily_log.attendance_count": {
            return `Kehadiran crew pada **${data.date}** di proyek **${data.project}**:\n` +
                `- Hadir/Cuti: **${data.present} personil** (termasuk ${data.halfDay} setengah hari)\n` +
                `- Absen/Alpa: **${data.absent} personil**\n` +
                `- Total Assigned: ${data.totalAssigned} crew.`;
        }
        case "crew.daily_log.absence": {
            if (data.absentList.length === 0) return `Semua crew hadir atau mengambil cuti resmi pada hari ini (${data.date}). Tidak ada yang alpa.`;
            const list = data.absentList.map((a: any) => `${a.name} (${a.role} - Proyek ${a.project})`).join(", ");
            return `Daftar crew tidak hadir (Alpa) pada **${data.date}**: ${list}.`;
        }
        case "crew.daily_log.overtime": {
            if (data.list.length === 0) return `Tidak ada crew yang lembur pada hari ini (${data.date}).`;
            const list = data.list.map((o: any) => `${o.name} (${o.hours} jam)`).join(", ");
            return `Total lembur crew hari ini adalah **${data.totalHours} jam**.\nDaftar crew lembur: ${list}.`;
        }
        case "crew.payroll.total": {
            return `Total payroll untuk proyek **${data.projectCode}** periode **${data.periodStart}** s.d **${data.periodEnd}** adalah **Rp ${data.totals.total.toLocaleString("id-ID")}**.\n` +
                `- Gaji Pokok: Rp ${data.totals.base.toLocaleString("id-ID")}\n` +
                `- Lembur: Rp ${data.totals.ot.toLocaleString("id-ID")}\n` +
                `- Potongan Kasbon: Rp ${data.totals.kasbon.toLocaleString("id-ID")}\n` +
                `- Reimburse: Rp ${data.totals.reimburse.toLocaleString("id-ID")}`;
        }
        case "crew.payroll.worker": {
            return `Detail payroll **${data.name}** (${data.role}) periode **${data.periodStart}** s.d **${data.periodEnd}**:\n` +
                `- Hari Kerja: **${data.daysWorked} hari**\n` +
                `- Gaji Pokok: Rp ${data.basePay.toLocaleString("id-ID")}\n` +
                `- Lembur: Rp ${data.otPay.toLocaleString("id-ID")}\n` +
                `- Kasbon: Rp ${data.kasbon.toLocaleString("id-ID")}\n` +
                `- Reimburse: Rp ${data.reimburse.toLocaleString("id-ID")}\n` +
                `- **Total Diterima (Net): Rp ${data.netPay.toLocaleString("id-ID")}**`;
        }
        case "crew.kpi.worker": {
            return `KPI Skor untuk **${data.crewName}** (${data.crewRole}): **${data.totalScore}/100** (Status: **${data.status}**).\n` +
                `- Kehadiran: ${data.daysPresent}/${data.workingDays} hari kerja (Skor: ${data.attendanceScore}/50)\n` +
                `- Lembur: ${data.daysOt} jam (Skor: ${data.overtimeScore}/25)\n` +
                `- Evaluasi Harian (Avg Rating): ${data.avgRating}/5.0 (Skor: ${data.ratingScore}/25)`;
        }
        case "crew.kpi.replace_candidate": {
            if (data.candidates.length === 0) return "Tidak ditemukan kandidat crew berstatus REPLACE (skor < 60) untuk periode ini.";
            const list = data.candidates.map((c: any) => `- **${c.name}** (Proyek ${c.project}, Skor: ${c.score}): ${c.reason}`).join("\n");
            return `Kandidat ganti (REPLACE) terdeteksi:\n${list}`;
        }
        case "crew.request.pending": {
            if (data.pendingRequests.length === 0) return "Tidak ada request pending saat ini.";
            const list = data.pendingRequests.map((r: any) => `- **${r.name}** mengajukan ${r.type} senilai Rp ${(r.amount || 0).toLocaleString("id-ID")} pada tanggal ${r.date} (Alasan: ${r.reason})`).join("\n");
            return `Terdapat **${data.count} request pending** menunggu approval:\n${list}`;
        }

        // --- Analytical Cross-tabs fallback ---
        case "crew.crosstab.payroll_change": {
            const dir = data.difference >= 0 ? "naik" : "turun";
            const diffStr = Math.abs(data.difference).toLocaleString("id-ID");
            const drvStr = data.drivers.map((d: any) => `${d.label} (dampak: Rp ${d.impact.toLocaleString("id-ID")})`).join(", ");
            return `Payroll minggu ini **Rp ${data.currentTotal.toLocaleString("id-ID")}**, ${dir} **Rp ${diffStr} (${data.percentageChange}%)** dibanding periode sebelumnya. Faktor kontribusi terbesar adalah: ${drvStr || "tidak ada perubahan signifikan"}.`;
        }
        case "crew.crosstab.worker_payroll": {
            const relStr = data.percentAboveAvg >= 0 ? `${data.percentAboveAvg}% di atas` : `${Math.abs(data.percentAboveAvg)}% di bawah`;
            return `Gaji **${data.name}** minggu ini adalah **Rp ${data.totalPay.toLocaleString("id-ID")}**, sekitar ${relStr} rata-rata gaji rekan sepekerjaan (${data.role}: Rp ${data.tradeAvgPay.toLocaleString("id-ID")}). ` +
                `Penyebab utama adalah kerja selama ${data.daysWorked} hari dengan lembur senilai Rp ${data.otPay.toLocaleString("id-ID")} dan reimburse Rp ${data.reimburse.toLocaleString("id-ID")}.`;
        }
        case "crew.crosstab.productivity": {
            return `Analisis produktivitas crew proyek **${data.projectCode}**:\n` +
                `- Rata-rata Skor KPI: **${data.avgScore}/100**\n` +
                `- Tingkat Kehadiran: **${data.avgAttendancePercent}%**\n` +
                `- Status Crew: Keep: ${data.keepCount}, Monitor: ${data.monitorCount}, Replace: ${data.replaceCount}\n` +
                `Indikator masalah:\n` +
                `- Kehadiran rendah (<80%): ${data.indicators.lowAttendance.join(", ") || "tidak ada"}\n` +
                `- Lembur tinggi dengan skor rendah: ${data.indicators.highOvertimeLowScore.join(", ") || "tidak ada"}\n` +
                `- Evaluasi harian rendah (<3.5/5.0): ${data.indicators.lowDailyRating.join(", ") || "tidak ada"}`;
        }
        case "crew.crosstab.health": {
            return `Status kesehatan crew proyek **${data.projectCode}**:\n` +
                `- Crew Aktif: **${data.activeCrew} personil**\n` +
                `- Kehadiran Hari Ini: **${data.todayAttendancePercent}%**\n` +
                `- Rata-rata KPI: **${data.avgKPI}/100** (Monitor: ${data.monitorCount}, Replace: ${data.replaceCount})\n` +
                `- Request Pending: **${data.pendingRequests} pengajuan**\n` +
                `Kondisi crew secara umum ${data.replaceCount > 2 ? "butuh perhatian karena beberapa crew berstatus REPLACE" : "terkendali dan aman"}.`;
        }
        case "crew.crosstab.anomalies": {
            if (data.anomaliesCount === 0) return "Tidak terdeteksi anomali pada data crew minggu ini.";
            const list = data.anomaliesList.map((a: any) => `- **${a.crewName}** (${a.projectCode}): [${a.type}] ${a.description}`).join("\n");
            return `Terdeteksi **${data.anomaliesCount} anomali** pada data crew:\n${list}`;
        }

        default:
            return "Query berhasil dieksekusi secara deterministik.";
    }
}
