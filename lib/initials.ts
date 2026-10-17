/**
 * Smart Initials Generator
 * 
 * Rules:
 * 1. Default: First char of 1st word + First char of 2nd word.
 * 2. If single word: First char + Second char.
 * 3. Collision Resolution:
 *    - Try Next char of 2nd word.
 *    - Try Next char of 1st word.
 *    - Iterate until unique 2-char string found.
 *    - Fallback: Random or numeric suffix (not implemented yet, assuming names are diverse enough).
 */

export function generateSmartInitials(name: string, occupied: string[]): string {
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z\s]/g, ""); // Only letters and spaces
    if (!cleanName) return "??";

    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    const occupiedSet = new Set(occupied.map(s => s.toUpperCase()));

    // Helper to check availability
    const check = (s: string) => !occupiedSet.has(s);

    if (words.length >= 2) {
        const first = words[0];
        const second = words[1];

        // Strategy A: First Initial + Second Word Initials
        // ADE SUPANGAT -> AS, AU, AP, AA, AN, AG, AT...
        for (let i = 0; i < second.length; i++) {
            const code = first[0] + second[i];
            if (check(code)) return code;
        }

        // Strategy B: First Word Initials (starting from 2nd char)
        // ADE -> AD, AE
        for (let i = 1; i < first.length; i++) {
            const code = first[0] + first[i];
            if (check(code)) return code;
        }
    } else {
        // Single Word Case
        const word = words[0];
        // ADE -> AD, AE
        for (let i = 1; i < word.length; i++) {
            const code = word[0] + word[i];
            if (check(code)) return code;
        }
    }

    // DRY RUN: If all specific standard combos taken, try ANY combo of first word
    // e.g. ASTRI -> AS, AT, AR, AI... already tried above.

    // Strategy C: Brute force 2 chars from the whole string (ignoring spaces)
    const allChars = cleanName.replace(/\s/g, "");
    if (allChars.length >= 2) {
        for (let i = 0; i < allChars.length; i++) {
            for (let j = i + 1; j < allChars.length; j++) {
                const code = allChars[i] + allChars[j];
                if (check(code)) return code;
            }
        }
    }

    // Fallback: If literally everything is taken (unlikely for 2 chars = 676 combos), return first 2 chars overlapping
    // or maybe add a number? User asked for letters.
    // Let's return the standard one even if duplicate, to let user fix manually.
    const standard = words.length >= 2 ? (words[0][0] + words[1][0]) : (words[0].substring(0, 2));
    return standard.toUpperCase();
}
