import type { Project } from '@/lib/api/projects';

export function compareProjectNumbers(a: Project, b: Project): number {
    const aNumber = String(a.number || '').trim(), bNumber = String(b.number || '').trim();
    if (!aNumber || !bNumber) {
        if (aNumber || bNumber) return aNumber ? -1 : 1;
    }
    return aNumber.localeCompare(bNumber, undefined, { numeric: true }) || a.title.localeCompare(b.title);
}
