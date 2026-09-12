/**
 * Project Code Normalization and Matching Utilities
 * 
 * Supports flexible formats like:
 * - "039-RBH", "039 RBH", "039 - RBH", "039_RBH"
 * - "RBH", "039"
 * - "rbh", "039-rbh"
 */

/**
 * Strips all non-alphanumeric characters and converts to uppercase
 * e.g. "039-RBH" -> "039RBH", "039 RBH" -> "039RBH", "039 - RBH" -> "039RBH"
 */
export function normalizeProjectCode(code?: string | null): string {
    if (!code) return "";
    return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Extracts the alphabetic/suffix part of the project code
 * e.g. "039-RBH" -> "RBH", "039 RBH" -> "RBH", "039 - RBH" -> "RBH", "RBH" -> "RBH", "039" -> ""
 */
export function getProjectSuffix(code?: string | null): string {
    if (!code) return "";
    const clean = code.trim();
    
    // Check if separated by dash, underscore, or space
    const parts = clean.split(/[\s\-_]+/);
    if (parts.length > 1) {
        // Return the last non-empty alphabetic or alphanumeric part
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i].trim();
            if (part && /[a-zA-Z]/.test(part)) {
                return part.toUpperCase();
            }
        }
    }
    
    // If no separator, strip leading numbers
    const stripped = clean.replace(/^[0-9]+[\s\-_]*/, "");
    if (stripped && /[a-zA-Z]/.test(stripped)) {
        return stripped.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    }

    // Fallback: if it has letters, return all letters
    const letters = clean.match(/[a-zA-Z]+/g)?.join("");
    return (letters || clean.replace(/[^a-zA-Z0-9]/g, "")).toUpperCase();
}

/**
 * Extracts the numeric project number part
 * e.g. "039-RBH" -> "039", "039 RBH" -> "039", "039" -> "039"
 */
export function getProjectNumber(code?: string | null): string {
    if (!code) return "";
    const match = code.match(/^\d+/);
    return match ? match[0] : "";
}

/**
 * Formats a project code for display (usually the uppercase suffix like RBH, or original if none)
 */
export function formatProjectCode(code?: string | null): string {
    if (!code) return "-";
    const suffix = getProjectSuffix(code);
    return suffix || code.trim().toUpperCase() || "-";
}

/**
 * Checks if two project code representations refer to the same project
 * 
 * Returns true if:
 * 1. Either is "ALL" (in filter context)
 * 2. Exact match after stripping symbols and uppercase ("039-RBH" === "039 RBH")
 * 3. Both have identical non-empty alphabetical suffixes ("039-RBH" === "RBH")
 * 4. Both have identical non-empty project numbers with same base ("039-RBH" === "039")
 * 5. One normalized string contains the other (e.g. "039RBH" contains "RBH")
 */
export function isMatchingProjectCode(
    codeA?: string | null,
    codeB?: string | null,
    allowAll: boolean = true
): boolean {
    if (allowAll) {
        if (codeA === "ALL" || codeB === "ALL") return true;
    }
    if (!codeA && !codeB) return true;
    if (!codeA || !codeB) return false;

    const normA = normalizeProjectCode(codeA);
    const normB = normalizeProjectCode(codeB);

    if (!normA || !normB) return false;

    // Direct normalized match (e.g. "039-RBH" vs "039 RBH" -> "039RBH" === "039RBH")
    if (normA === normB) return true;

    // Suffix match (e.g. "039-RBH" vs "RBH")
    const suffixA = getProjectSuffix(codeA);
    const suffixB = getProjectSuffix(codeB);
    if (suffixA && suffixB && suffixA === suffixB) {
        return true;
    }

    // Project number match if suffix is missing on one side (e.g. "039-RBH" vs "039")
    const numA = getProjectNumber(codeA);
    const numB = getProjectNumber(codeB);
    if (numA && numB && numA === numB && (!suffixA || !suffixB)) {
        return true;
    }

    // Substring containment for normalized strings of reasonable length
    if (normA.length >= 2 && normB.length >= 2) {
        if (normA.includes(normB) || normB.includes(normA)) {
            return true;
        }
    }

    return false;
}
