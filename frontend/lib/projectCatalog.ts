import catalog from '@/constants/projectDocumentCatalog.json';
export interface ProjectCatalogEntry { code: string; name: string; parentCode: string | null; description?: string; reviewStatus?: string; }

// Stable category codes; changing a label never replaces existing database IDs.
export const PROJECT_CATALOG: readonly ProjectCatalogEntry[] = catalog.entries;
// Chapters are outlines within a final document, not separate published documents.
export const PROJECT_FINAL_CHAPTERS: readonly ProjectCatalogEntry[] = catalog.chapters;
