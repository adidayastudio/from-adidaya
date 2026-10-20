import { TemplateDocumentPage } from './TemplateDocumentPage';
import { documentBlocksText, templateDocumentBlocks } from '@/lib/projectDocumentTemplates';
import React, { useState } from 'react';
import { Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getProjectMeta, saveProjectMeta } from '@/lib/api/projects';
import type { ProjectDocItem } from './DocsTab';

export function ProjectTemplateDocumentEditor({ projectId, document, isDark, onClose, onSaved }: { projectId: string; document: ProjectDocItem; isDark: boolean; onClose: () => void; onSaved: (documents: ProjectDocItem[]) => void }) {
    const [draft, setDraft] = useState(() => document.documentBlocks || document.updatedAt ? document : { ...document, documentBlocks: templateDocumentBlocks(document.templateCode || '', document.documentNumber || '', document.revision) });
    const [saving, setSaving] = useState(false), [error, setError] = useState('');
    const text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = '#8E8E93', surface = isDark ? '#1C1C1E' : '#FFFFFF';
    const dirty = JSON.stringify(draft) !== JSON.stringify(document);
    const [confirmStructure, setConfirmStructure] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);
    const close = () => { if (dirty) setConfirmClose(true); else onClose(); };
    const save = async () => {
        if (saving) return;
        setSaving(true); setError('');
        try {
            if (!draft.name.trim() || !draft.documentNumber?.trim()) throw new Error('Enter a document name and number.');
            const meta = await getProjectMeta(projectId);
            const current: ProjectDocItem[] = Array.isArray(meta.documents) ? meta.documents : [];
            const previous = current.find(item => item.id === draft.id);
            if (previous && previous.updatedAt !== document.updatedAt) throw new Error('This document changed elsewhere. Reopen it before saving.');
            if (current.some(item => item.id !== draft.id && item.documentNumber === draft.documentNumber)) throw new Error('This document number is already in use.');
            const content = document.documentNumber && draft.documentNumber !== document.documentNumber ? (draft.content || '').split(document.documentNumber).join(draft.documentNumber!) : draft.content;
            const saved = { ...draft, content: draft.documentBlocks ? documentBlocksText(draft.documentBlocks) : content, updatedAt: new Date().toISOString() };
            const next = previous ? current.map(item => item.id === draft.id ? saved : item) : [...current, saved];
            await saveProjectMeta(projectId, { documents: next });
            const readback = await getProjectMeta(projectId);
            if (!readback.documents?.some((item: ProjectDocItem) => item.id === saved.id && item.updatedAt === saved.updatedAt)) throw new Error('Unable to save document. Please try again.');
            onSaved(next); onClose();
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save document.'); }
        finally { setSaving(false); }
    };
    const field = (key: 'name' | 'documentNumber' | 'revision', label: string, flex = 1) => <View style={{ flex, gap: 6 }}><Text style={{ color: secondary, fontSize: 12 }}>{label}</Text><TextInput accessibilityLabel={label} editable={!saving} value={draft[key] || ''} onChangeText={value => setDraft(current => {
        const blocks = current.documentBlocks ? JSON.parse(JSON.stringify(current.documentBlocks)) as NonNullable<ProjectDocItem['documentBlocks']> : undefined;
        const visit = (items: NonNullable<ProjectDocItem['documentBlocks']>) => items.forEach(block => {
            if (key === 'documentNumber' && current.documentNumber && block.text?.includes(current.documentNumber)) block.text = block.text.split(current.documentNumber).join(value);
            block.rows?.forEach(row => { row.forEach(cell => visit(cell.blocks)); if (key === 'revision' && row[0]?.blocks.some(item => item.text === 'Revision') && row[1]) row[1].blocks = [{ type: 'paragraph', text: value }]; });
        });
        if (blocks) visit(blocks);
        return { ...current, [key]: value, ...(blocks ? { documentBlocks: blocks } : {}) };
    })} style={{ color: text, backgroundColor: surface, height: 42, borderRadius: 999, paddingHorizontal: 16 }} /></View>;
    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity disabled={saving} onPress={close} style={{ padding: 12, backgroundColor: surface, borderRadius: 999 }}><Text style={{ color: text }}>Back</Text></TouchableOpacity>
            <Text style={{ color: text, fontSize: 18, fontWeight: '600', flex: 1 }}>{draft.templateCode} · Project document</Text>
            {!!draft.templateSourceUrl && <TouchableOpacity onPress={() => Linking.openURL(draft.templateSourceUrl!)}><Text style={{ color: '#007AFF' }}>Source template</Text></TouchableOpacity>}
            <TouchableOpacity disabled={saving} onPress={save} style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#007AFF', borderRadius: 999, opacity: saving ? 0.5 : 1 }}><Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{saving ? 'Saving…' : 'Save document'}</Text></TouchableOpacity>
        </View>
        {confirmClose && <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}><Text style={{ color: text }}>Discard unsaved changes?</Text><TouchableOpacity onPress={onClose}><Text style={{ color: '#FF3B30' }}>Discard</Text></TouchableOpacity><TouchableOpacity onPress={() => setConfirmClose(false)}><Text style={{ color: '#007AFF' }}>Keep editing</Text></TouchableOpacity></View>}
        {!!error && <Text accessibilityRole="alert" style={{ color: '#FF3B30' }}>{error}</Text>}
        <View style={{ flexDirection: 'row', gap: 12 }}>{field('name', 'Document name', 3)}{field('documentNumber', 'Document number', 2)}{field('revision', 'Revision')}</View>
        <Text style={{ color: secondary, fontSize: 12 }}>Project: {draft.projectName} · Folder {draft.subworkCode}</Text>
        {!draft.documentBlocks && <View style={{ gap: 10 }}><Text style={{ color: secondary }}>This document was saved in the earlier text layout.</Text><TouchableOpacity onPress={() => setConfirmStructure(true)}><Text style={{ color: '#007AFF' }}>Use structured template layout</Text></TouchableOpacity>{confirmStructure && <View style={{ gap: 8 }}><Text style={{ color: text }}>Start again from the structured template? Save a copy of any text changes before replacing the layout.</Text><TouchableOpacity onPress={() => { setDraft(current => ({ ...current, documentBlocks: templateDocumentBlocks(current.templateCode || '', current.documentNumber || '', current.revision) })); setConfirmStructure(false); }}><Text style={{ color: '#007AFF' }}>Replace layout</Text></TouchableOpacity><TouchableOpacity onPress={() => setConfirmStructure(false)}><Text style={{ color: text }}>Cancel</Text></TouchableOpacity></View>}</View>}
        {draft.documentBlocks ? <TemplateDocumentPage blocks={draft.documentBlocks} readOnly={saving} onChange={documentBlocks => setDraft(current => ({ ...current, documentBlocks }))} /> : <TextInput accessibilityLabel="Document content" multiline editable={!saving} value={draft.content || ''} onChangeText={content => setDraft(current => ({ ...current, content }))} style={{ color: text, backgroundColor: surface, borderRadius: 20, padding: 20, minHeight: 600, textAlignVertical: 'top', fontSize: 14, lineHeight: 23 }} />}
    </ScrollView>;
}
