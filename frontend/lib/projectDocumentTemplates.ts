import sourceBlocks from '@/constants/projectDocumentTemplateBlocks.json';
import templates from '@/constants/projectDocumentTemplates.json';

export const PROJECT_DOCUMENT_TEMPLATES = templates;
export type ProjectDocumentTemplate = typeof templates[number];
export function createTemplateDocument(template: ProjectDocumentTemplate, project: { code?: string; title?: string }, existing: { documentNumber?: string }[], id: string) {
    const projectCode = (project.code || 'PRJ').trim();
    const prefix = `${template.code}-${projectCode}-${template.folder}-`;
    const sequence = Math.max(0, ...existing.map(doc => doc.documentNumber?.startsWith(prefix) ? Number(doc.documentNumber.slice(prefix.length)) || 0 : 0)) + 1;
    const documentNumber = `${prefix}${String(sequence).padStart(3, '0')}`;
    const content = template.content.replace(/\b(?:PIF|CDB|SSR|FST|SFP|SPK|PKD)-(?:039|\[PPP\])-(?:\d{2}|\[XY\])-(?:\[?NNN\]?\]?|\d{3})/g, match => match.startsWith(`${template.code}-`) ? documentNumber : match.replace('-039-', `-${projectCode}-`));
    return { id, name: `${template.code} · ${template.title.replace(/^\w+\s*-\s*/, '')}`, documentNumber, revision: '00', content, templateCode: template.code, templateSourceUrl: template.sourceUrl, subworkCode: template.folder, folder: `00 / ${template.folder}`, projectName: project.title || '', size: 'Editable document', uploadedBy: 'You', time: '', date: new Date().toISOString().slice(0, 10), dateLabel: 'Today', isSelf: true };
}

export interface DocumentBlock {
    type: string; text?: string; heading?: string; bold?: boolean; italic?: boolean; bullet?: boolean;
    widths?: number[]; rows?: { colSpan: number; blocks: DocumentBlock[] }[][];
}
export function templateDocumentBlocks(code: string, number: string, revision = '00'): DocumentBlock[] {
    const template = templates.find(item => item.code === code);
    const source = sourceBlocks.find(item => template?.sourceUrl.includes(item.id));
    const blocks: DocumentBlock[] = JSON.parse(JSON.stringify(source?.blocks || []));
    const visit = (items: DocumentBlock[]) => items.forEach(block => {
        if (block.text) block.text = block.text.replace(new RegExp(`${code}-(?:039|\\[PPP\\])-(?:\\d{2}|\\[XY\\])-(?:\\[?NNN\\]?\\]?|\\d{3})`, 'g'), number);
        block.rows?.forEach(row => { row.forEach(cell => visit(cell.blocks)); if (row[0]?.blocks.some(item => item.text === 'Revision') && row[1]) row[1].blocks = [{ type: 'paragraph', text: revision }]; });
    });
    visit(blocks); return blocks;
}
export function documentBlocksText(blocks: DocumentBlock[]): string {
    return blocks.map(block => block.rows ? block.rows.map(row => row.map(cell => documentBlocksText(cell.blocks)).join('\t')).join('\n') : block.text || '').join('\n');
}
