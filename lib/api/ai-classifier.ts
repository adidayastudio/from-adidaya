import { GoogleGenerativeAI } from "@google/generative-ai";

export type ResourceCategory = 'material' | 'labor' | 'equipment' | 'service' | 'asset' | 'tool';

export interface ClassifiedItem {
    canonicalName: string;
    category: ResourceCategory;
    unit: string;
    brand?: string;
    confidence: number;
}

const ALLOWED_CATEGORIES: ResourceCategory[] = ['material', 'labor', 'equipment', 'service', 'asset', 'tool'];

function sanitizeCategory(cat: string): ResourceCategory {
    if (!cat) return 'material';
    const normalized = cat.toLowerCase().trim();

    if (ALLOWED_CATEGORIES.includes(normalized as ResourceCategory)) {
        return normalized as ResourceCategory;
    }

    if (normalized.includes('tool') || normalized.includes('peralatan') || normalized.includes('perkakas')) return 'tool';
    if (normalized.includes('asset') || normalized.includes('properti') || normalized.includes('bangunan')) return 'asset';
    if (normalized.includes('equipment') || normalized.includes('alat berat') || normalized.includes('mesin')) return 'equipment';
    if (normalized.includes('labor') || normalized.includes('jasa') || normalized.includes('tukang') || normalized.includes('worker') || normalized.includes('operations') || normalized.includes('service')) return 'service';
    if (normalized.includes('material') || normalized.includes('bahan') || normalized.includes('consumable')) return 'material';

    return 'material';
}

export async function batchClassifyFinanceItems(
    items: { name: string, type: string }[],
    existingCatalog: string[] = []
): Promise<ClassifiedItem[]> {
    if (items.length === 0) return [];

    if (items.length === 1) {
        return [await classifyFinanceItem(items[0].name, items[0].type, existingCatalog)];
    }

    const catalogContext = existingCatalog.length > 0
        ? `EXISTING CATALOG (Reuse these EXACT names if it matches):\n- ${existingCatalog.slice(0, 100).join('\n- ')}`
        : "No existing catalog yet.";

    const prompt = `
        You are an expert procurement assistant for Adidaya (architecture/construction).
        Normalize this list of finance items into canonical inventory formats.

        ${catalogContext}

        Items to classify:
        ${items.map((it, i) => `${i + 1}. Name: "${it.name}", Type: "${it.type}"`).join('\n')}

        Rules:
        1. "canonicalName": Normalize the name. Fix typos, expand abbreviations.
           CRITICAL: If the item matches an entry in the "EXISTING CATALOG" above (even with slight spelling differences or numeric suffixes like "-1" or "-2"), reuse THAT EXACT NAME.
           Example: "Pasir Hitam-4" should match "Pasir Hitam" in the catalog.
        2. "category": Must be one of: 'material', 'labor', 'equipment', 'service', 'asset', 'tool'.
        3. "unit": Detect unit (kg, m3, pcs, set, jam, etc).
        4. "brand": Extract if mentioned.
        5. Return a JSON ARRAY of objects. Each object must have "index" (1-based), "canonicalName", "category", "unit", "brand", and "confidence".

        JSON Array Output:
    `;

    try {
        if (!process.env.GOOGLE_AI_API_KEY) throw new Error("Missing GOOGLE_AI_API_KEY");

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const result = await model.generateContent(prompt);
        const text = (await result.response).text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const results = JSON.parse(jsonMatch[0]);
            return items.map((_, i) => {
                const found = results.find((r: any) => r.index === i + 1);
                if (found) {
                    return {
                        ...found,
                        category: sanitizeCategory(found.category),
                        confidence: found.confidence || 0.8
                    };
                }
                return fallback(items[i].name, items[i].type);
            });
        }
        throw new Error("Failed to parse batch AI response");
    } catch (error) {
        console.error("Batch AI Classification Error:", error);
        return items.map(it => fallback(it.name, it.type));
    }
}

function fallback(name: string, type: string): ClassifiedItem {
    return {
        canonicalName: name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        category: sanitizeCategory(type),
        unit: name.toLowerCase().includes('kg') ? 'kg' :
            name.toLowerCase().includes('m3') ? 'm3' : 'pcs',
        confidence: 0
    };
}

export async function classifyFinanceItem(
    name: string,
    type: string,
    existingCatalog: string[] = []
): Promise<ClassifiedItem> {
    try {
        if (!process.env.GOOGLE_AI_API_KEY) throw new Error("Missing GOOGLE_AI_API_KEY");
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const catalogContext = existingCatalog.length > 0
            ? `EXISTING CATALOG (Reuse EXACTLY if it matches):\n- ${existingCatalog.slice(0, 50).join('\n- ')}`
            : "";

        const prompt = `Normalize this item: Name: "${name}", Type: "${type}". 
        ${catalogContext}
        Allowed Categories: material, labor, equipment, service, asset, tool.
        Rules: If it matches an entry in EXISTING CATALOG, use that EXACT name.
        Return JSON: {"canonicalName", "category", "unit", "brand", "confidence"}`;

        const result = await model.generateContent(prompt);
        const text = (await result.response).text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            return {
                ...data,
                category: sanitizeCategory(data.category),
                confidence: data.confidence || 0.8
            };
        }
        return fallback(name, type);
    } catch (error) {
        console.error("AI Classification Error:", error);
        return fallback(name, type);
    }
}
