/**
 * STREAM CLASSIFIER ENGINE
 * Rule-based + pattern matching for natural language input classification.
 * Supports Bahasa Indonesia and English, mixed input.
 */

import type {
    ClassificationResult,
    StreamIntentType,
    ParsedProjectData,
    ParsedExpenseData,
    ParsedProgressData,
    ParsedTaskData,
    ParsedGeneralData,
} from "./types";

// ============================================
// PATTERN DEFINITIONS
// ============================================

const PROJECT_KEYWORDS = [
    // Indonesian
    "proyek baru", "bikin proyek", "buat proyek", "project baru", "tambah proyek",
    "bikin project", "buat project", "tambah project", "new project", "create project",
    // English
    "new project", "create project", "add project", "start project",
];

const EXPENSE_KEYWORDS = [
    // Indonesian
    "beli", "bayar", "pembelian", "purchasing", "belanja", "harga", "biaya", "pengeluaran",
    "reimburse", "reimbursement", "petty cash", "kas kecil",
    // English
    "buy", "purchase", "expense", "spend", "cost", "payment",
];

const PROGRESS_KEYWORDS = [
    // Indonesian
    "progress", "kemajuan", "perkembangan", "selesai", "capaian",
    "udah", "sudah", "mencapai",
    // English  
    "progress", "completed", "done", "finished", "achieved",
];

const TASK_KEYWORDS = [
    // Indonesian
    "task", "tugas", "kerjaan", "harus", "perlu", "tolong", "reminder",
    "besok", "deadline", "tenggat", "jadwalkan",
    // English
    "task", "todo", "to-do", "assign", "reminder", "schedule",
    "need to", "have to", "must",
];

// Currency/amount patterns
const AMOUNT_PATTERNS = [
    /(?:rp\.?\s*)?(\d[\d.,]*)\s*(rb|ribu|k)/i,        // "200rb", "Rp 200ribu"
    /(?:rp\.?\s*)?(\d[\d.,]*)\s*(jt|juta|m)/i,         // "5jt", "Rp 5juta"
    /(?:rp\.?\s*)(\d[\d.,]*)/i,                        // "Rp 200000"
    /(\d[\d.,]*)\s*(?:rupiah|idr)/i,                   // "200000 rupiah"
];

const QUANTITY_PATTERN = /(\d+(?:[.,]\d+)?)\s*(sak|kg|m3|m2|m|pcs|unit|btg|lbr|dus|box|set|roll|lembar|buah|batang|meter|liter|galon|karung)/i;

const PERCENTAGE_PATTERN = /(\d+(?:[.,]\d+)?)\s*%/;

// City/location patterns (Indonesian cities)
const CITY_KEYWORDS = [
    "jakarta", "bandung", "surabaya", "semarang", "medan", "makassar", "bali",
    "denpasar", "yogyakarta", "jogja", "malang", "bogor", "depok", "tangerang",
    "bekasi", "solo", "palembang", "balikpapan", "pontianak", "manado",
    "lampung", "cirebon", "karawang", "cikarang", "bsd", "serpong",
    "pik", "kelapa gading", "kemang", "senopati", "scbd",
];

// ============================================
// MAIN CLASSIFIER
// ============================================

export function classifyInput(input: string): ClassificationResult {
    const normalized = input.toLowerCase().trim();

    // Score each intent
    const scores: Record<StreamIntentType, number> = {
        create_project: scoreProjectIntent(normalized),
        log_expense: scoreExpenseIntent(normalized),
        update_progress: scoreProgressIntent(normalized),
        add_task: scoreTaskIntent(normalized),
        general: 0.1, // baseline
    };

    // Find highest score
    const entries = Object.entries(scores) as [StreamIntentType, number][];
    entries.sort((a, b) => b[1] - a[1]);

    const [bestType, bestScore] = entries[0];
    const confidence = Math.min(bestScore, 1.0);

    // If confidence is too low, fallback to general
    if (confidence < 0.3) {
        return {
            type: "general",
            data: { message: input } as ParsedGeneralData,
            confidence: 0.1,
            rawInput: input,
        };
    }

    // Parse data based on classified type
    const data = parseIntentData(bestType, input, normalized);

    return {
        type: bestType,
        data,
        confidence,
        rawInput: input,
    };
}

// ============================================
// SCORING FUNCTIONS
// ============================================

function scoreProjectIntent(input: string): number {
    let score = 0;

    for (const kw of PROJECT_KEYWORDS) {
        if (input.includes(kw)) {
            score += 0.6;
            break;
        }
    }

    // City mention boosts project intent
    for (const city of CITY_KEYWORDS) {
        if (input.includes(city)) {
            score += 0.2;
            break;
        }
    }

    // Project type mentions
    if (/design|desain|build|bangun|konstruksi|interior|renovasi/i.test(input)) {
        score += 0.15;
    }

    return score;
}

function scoreExpenseIntent(input: string): number {
    let score = 0;

    for (const kw of EXPENSE_KEYWORDS) {
        if (input.includes(kw)) {
            score += 0.4;
            break;
        }
    }

    // Amount patterns strongly indicate expense
    for (const pattern of AMOUNT_PATTERNS) {
        if (pattern.test(input)) {
            score += 0.35;
            break;
        }
    }

    // Quantity pattern
    if (QUANTITY_PATTERN.test(input)) {
        score += 0.2;
    }

    return score;
}

function scoreProgressIntent(input: string): number {
    let score = 0;

    for (const kw of PROGRESS_KEYWORDS) {
        if (input.includes(kw)) {
            score += 0.4;
            break;
        }
    }

    // Percentage strongly indicates progress
    if (PERCENTAGE_PATTERN.test(input)) {
        score += 0.4;
    }

    // "lantai", "fase", "stage" etc
    if (/lantai|fase|stage|floor|bagian|section|area/i.test(input)) {
        score += 0.15;
    }

    return score;
}

function scoreTaskIntent(input: string): number {
    let score = 0;

    for (const kw of TASK_KEYWORDS) {
        if (input.includes(kw)) {
            score += 0.5;
            break;
        }
    }

    // Time references boost task intent
    if (/besok|lusa|minggu\s*depan|senin|selasa|rabu|kamis|jumat|sabtu|tomorrow|next\s*week|monday|tuesday|wednesday|thursday|friday/i.test(input)) {
        score += 0.25;
    }

    // Assignment references
    if (/@|assign|untuk\s+(pak|bu|mas|mba|bro)|kasih\s+ke/i.test(input)) {
        score += 0.15;
    }

    return score;
}

// ============================================
// DATA PARSERS
// ============================================

function parseIntentData(
    type: StreamIntentType,
    originalInput: string,
    normalized: string
): ClassificationResult["data"] {
    switch (type) {
        case "create_project":
            return parseProjectData(originalInput, normalized);
        case "log_expense":
            return parseExpenseData(originalInput, normalized);
        case "update_progress":
            return parseProgressData(originalInput, normalized);
        case "add_task":
            return parseTaskData(originalInput, normalized);
        default:
            return { message: originalInput } as ParsedGeneralData;
    }
}

function parseProjectData(original: string, normalized: string): ParsedProjectData {
    // Remove keyword prefixes to get the project name
    let name = original;
    const prefixes = [
        /^(?:bikin|buat|tambah|create|add|start|new)\s+(?:proyek|project)\s+(?:baru\s+)?/i,
        /^(?:proyek|project)\s+(?:baru\s+)?/i,
    ];
    for (const prefix of prefixes) {
        name = name.replace(prefix, "").trim();
    }

    // Extract city
    let city: string | undefined;
    for (const c of CITY_KEYWORDS) {
        const regex = new RegExp(`\\b${c}\\b`, "i");
        const match = original.match(regex);
        if (match) {
            city = match[0];
            // Capitalize
            city = city.charAt(0).toUpperCase() + city.slice(1);
            break;
        }
    }

    // Extract type
    let type: ParsedProjectData["type"];
    if (/design\s*(?:&|and|dan)?\s*build|desain\s*(?:&|dan)?\s*bangun/i.test(normalized)) {
        type = "design-build";
    } else if (/design\s*only|desain\s*saja|desain\s*only/i.test(normalized)) {
        type = "design";
    } else if (/build\s*only|konstruksi\s*saja|bangun\s*saja/i.test(normalized)) {
        type = "build";
    }

    // Clean project name (remove city from name if it's at the end)
    if (city) {
        name = name.replace(new RegExp(`\\s*${city}\\s*$`, "i"), "").trim();
        // If city was part of the project name, keep it
        if (!name || name.length < 3) {
            name = original.replace(/^(?:bikin|buat|tambah|create|add|start|new)\s+(?:proyek|project)\s+(?:baru\s+)?/i, "").trim();
        }
    }

    return { name, city, type };
}

function parseExpenseData(original: string, normalized: string): ParsedExpenseData {
    let item = original;
    let qty: number | undefined;
    let unit: string | undefined;
    let amount: number | undefined;

    // Extract quantity + unit
    const qtyMatch = normalized.match(QUANTITY_PATTERN);
    if (qtyMatch) {
        qty = parseFloat(qtyMatch[1].replace(",", "."));
        unit = qtyMatch[2].toLowerCase();
    }

    // Extract amount
    for (const pattern of AMOUNT_PATTERNS) {
        const match = normalized.match(pattern);
        if (match) {
            let rawAmount = parseFloat(match[1].replace(/[.,]/g, ""));
            const suffix = match[2]?.toLowerCase();
            if (suffix === "rb" || suffix === "ribu" || suffix === "k") {
                rawAmount *= 1000;
            } else if (suffix === "jt" || suffix === "juta" || suffix === "m") {
                rawAmount *= 1000000;
            }
            amount = rawAmount;
            break;
        }
    }

    // Clean item name — remove keyword prefixes, amounts, quantities
    const cleanPrefixes = /^(?:beli|bayar|purchase|buy|belanja)\s+/i;
    item = item.replace(cleanPrefixes, "").trim();
    // Remove amount text
    item = item.replace(/(?:rp\.?\s*)?\d[\d.,]*\s*(?:rb|ribu|jt|juta|k|m|rupiah|idr)?/gi, "").trim();
    // Remove quantity text  
    item = item.replace(/\d+(?:[.,]\d+)?\s*(?:sak|kg|m3|m2|m|pcs|unit|btg|lbr|dus|box|set|roll|lembar|buah|batang|meter|liter|galon|karung)/gi, "").trim();
    // Clean up extra spaces
    item = item.replace(/\s+/g, " ").trim();

    if (!item) item = original;

    return { item, qty, unit, amount, currency: "IDR" };
}

function parseProgressData(original: string, normalized: string): ParsedProgressData {
    let target = original;
    let progress = 0;

    // Extract percentage
    const percentMatch = normalized.match(PERCENTAGE_PATTERN);
    if (percentMatch) {
        progress = parseFloat(percentMatch[1].replace(",", "."));
    }

    // Extract target (what the progress is about)
    // Remove keyword prefixes
    target = target.replace(/^(?:progress|kemajuan|update)\s+/i, "").trim();
    // Remove percentage text
    target = target.replace(/\d+(?:[.,]\d+)?\s*%/g, "").trim();
    // Remove common connector words
    target = target.replace(/(?:udah|sudah|mencapai|selesai|done|completed|at)\s*/gi, "").trim();
    // Clean up
    target = target.replace(/\s+/g, " ").trim();

    if (!target) target = original;

    return { target, progress };
}

function parseTaskData(original: string, normalized: string): ParsedTaskData {
    let title = original;
    let dueDate: string | undefined;
    let priority: ParsedTaskData["priority"] = "normal";

    // Extract due date references
    const today = new Date();
    if (/besok|tomorrow/i.test(normalized)) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString().split("T")[0];
    } else if (/lusa|day\s*after\s*tomorrow/i.test(normalized)) {
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);
        dueDate = dayAfter.toISOString().split("T")[0];
    } else if (/minggu\s*depan|next\s*week/i.test(normalized)) {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        dueDate = nextWeek.toISOString().split("T")[0];
    }

    // Extract priority
    if (/urgent|darurat|segera|asap|penting\s*banget/i.test(normalized)) {
        priority = "urgent";
    } else if (/penting|important|high/i.test(normalized)) {
        priority = "high";
    }

    // Clean title
    const taskPrefixes = /^(?:task|tugas|kerjaan|tolong|reminder|todo)\s*:?\s*/i;
    title = title.replace(taskPrefixes, "").trim();
    // Remove due date references
    title = title.replace(/\s*(?:besok|lusa|tomorrow|next\s*week|minggu\s*depan)\s*/gi, " ").trim();
    // Remove priority markers
    title = title.replace(/\s*(?:urgent|darurat|segera|asap|penting\s*banget|penting|important)\s*/gi, " ").trim();
    // Remove "harus" / "perlu" / "need to" prefixes
    title = title.replace(/^(?:harus|perlu|need\s*to|have\s*to|must)\s+/i, "").trim();
    // Clean up
    title = title.replace(/\s+/g, " ").trim();

    if (!title) title = original;

    return { title, dueDate, priority };
}

// ============================================
// UTILITY: Get intent label (display text)
// ============================================

export function getIntentLabel(type: StreamIntentType): string {
    switch (type) {
        case "create_project": return "New Project";
        case "log_expense": return "Expense";
        case "update_progress": return "Progress Update";
        case "add_task": return "Task";
        case "general": return "Note";
    }
}

export function getIntentEmoji(type: StreamIntentType): string {
    switch (type) {
        case "create_project": return "📋";
        case "log_expense": return "💰";
        case "update_progress": return "📊";
        case "add_task": return "✅";
        case "general": return "💬";
    }
}

export function getIntentColor(type: StreamIntentType): string {
    switch (type) {
        case "create_project": return "text-blue-600 bg-blue-50 border-blue-200";
        case "log_expense": return "text-emerald-600 bg-emerald-50 border-emerald-200";
        case "update_progress": return "text-amber-600 bg-amber-50 border-amber-200";
        case "add_task": return "text-violet-600 bg-violet-50 border-violet-200";
        case "general": return "text-neutral-600 bg-neutral-50 border-neutral-200";
    }
}
