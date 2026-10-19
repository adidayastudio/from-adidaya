import { PROJECT_CATALOG } from './projectCatalog';
const codes = new Set(PROJECT_CATALOG.map(entry => entry.code));
export function documentFolderCode(document: Record<string, any>): string | null {
    for (const value of [document.subworkCode, document.subwork_code, document.folderCode, document.folder_code, document.stageCode, document.stage_code]) {
        if (typeof value === 'string' && codes.has(value.trim())) return value.trim();
    }
    if (typeof document.folder === 'string') {
        const parts = document.folder.split('/').map(part => part.trim());
        for (const part of parts.reverse()) {
            const match = part.match(/^(\d{2})(?:\s*[-·]\s*.+)?$/);
            if (match && codes.has(match[1])) return match[1];
        }
    }
    return null;
}
