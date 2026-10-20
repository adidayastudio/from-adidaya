import { PROJECT_DOCUMENT_TEMPLATES, ProjectDocumentTemplate } from '@/lib/projectDocumentTemplates';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PROJECT_CATALOG, PROJECT_FINAL_CHAPTERS } from '@/lib/projectCatalog';
import { documentFolderCode } from '@/lib/projectDocumentFolders';
import type { ProjectDocItem } from './DocsTab';

export function DocumentFolderTree({ documents, isDark, renderDocument, headerControls, onUseTemplate }: { onUseTemplate?: (template: ProjectDocumentTemplate) => void; headerControls?: { search: string; expanded: string[]; setExpanded: (value: string[]) => void }; documents: ProjectDocItem[]; isDark: boolean; renderDocument: (document: ProjectDocItem) => React.ReactNode }) {
    const [internalExpanded, setInternalExpanded] = useState<string[]>([]), [internalSearch, setSearch] = useState('');
    const expanded = headerControls?.expanded ?? internalExpanded;
    const setExpanded: React.Dispatch<React.SetStateAction<string[]>> = value => { const next = typeof value === 'function' ? value(expanded) : value; if (headerControls) headerControls.setExpanded(next); else setInternalExpanded(next); };
    const search = headerControls?.search ?? internalSearch;
    const color = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#8E8E93' : '#636366';
    const border = isDark ? '#303034' : '#E5E5EA', pill = { borderRadius: 999, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', paddingHorizontal: 16, paddingVertical: 10 };
    const query = search.trim().toLowerCase();
    const matches = (doc: ProjectDocItem) => !query || doc.name.toLowerCase().includes(query);
    const toggle = (code: string) => setExpanded(current => current.includes(code) ? current.filter(item => item !== code) : [...current, code]);
    const renderFiles = (files: ProjectDocItem[]) => files.length ? files.map(doc => <View key={doc.id} style={{ paddingVertical: 4 }}>{renderDocument(doc)}</View>) : <Text style={{ color: secondary, padding: 12 }}>No documents in this folder.</Text>;
    const folderRow = (code: string, label: string, count: number, depth = 0) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expanded.includes(code) }} onPress={() => toggle(code)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingLeft: depth * 24, borderBottomWidth: 1, borderBottomColor: border }}>
        <Ionicons name={expanded.includes(code) ? 'chevron-down' : 'chevron-forward'} size={15} color={secondary} />
        <Ionicons name={expanded.includes(code) ? 'folder-open-outline' : 'folder-outline'} size={22} color="#007AFF" />
        <Text style={{ color, flex: 1, fontWeight: depth ? '500' : '600' }}>{label}</Text><Text style={{ color: secondary, fontSize: 12 }}>{count} documents</Text>
    </TouchableOpacity>;
    const templatesFor = (code: string) => onUseTemplate ? PROJECT_DOCUMENT_TEMPLATES.filter(template => template.folder === code && (!query || `${template.code} ${template.title}`.toLowerCase().includes(query) || PROJECT_CATALOG.some(entry => (entry.code === code || entry.code === code[0] + '0') && `${entry.code} ${entry.name}`.toLowerCase().includes(query)))) : [];
    const renderTemplates = (code: string) => templatesFor(code).map(template => <TouchableOpacity key={template.code} accessibilityLabel={`Use ${template.code} template`} onPress={() => onUseTemplate?.(template)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}><Ionicons name="document-text-outline" size={22} color="#007AFF" /><View style={{ flex: 1 }}><Text style={{ color, fontWeight: '500' }}>{template.title}</Text><Text style={{ color: secondary, fontSize: 12, marginTop: 4 }}>Template · Create an editable project document</Text></View><Text style={{ color: '#007AFF', fontWeight: '600' }}>Use template</Text></TouchableOpacity>);
    const inbox = documents.filter(doc => !documentFolderCode(doc)).filter(matches);
    return <View>
        {!headerControls && <><TextInput accessibilityLabel="Search document folders" placeholder="Search folders or documents" placeholderTextColor={secondary} value={search} onChangeText={value => { setSearch(value); if (value.trim()) setExpanded(['inbox', ...PROJECT_CATALOG.map(entry => entry.code)]); }} style={{ ...pill, color, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TouchableOpacity onPress={() => setExpanded(['inbox', ...PROJECT_CATALOG.map(entry => entry.code)])} style={pill}><Text style={{ color: '#007AFF' }}>Expand all</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setExpanded([])} style={pill}><Text style={{ color: '#007AFF' }}>Collapse all</Text></TouchableOpacity>
        </View>
        </>}
        {(!query || inbox.length > 0 || 'inbox'.includes(query)) && <View>{folderRow('inbox', 'Inbox', inbox.length)}{expanded.includes('inbox') && <View style={{ paddingLeft: 28 }}>{renderFiles(inbox)}</View>}</View>}
        {PROJECT_CATALOG.filter(entry => entry.parentCode === null).map(stage => {
            const children = PROJECT_CATALOG.filter(entry => entry.parentCode === stage.code);
            const codes = [stage.code, ...children.map(entry => entry.code)];
            const files = documents.filter(doc => codes.includes(documentFolderCode(doc) || ''));
            const parentMatches = `${stage.code} ${stage.name}`.toLowerCase().includes(query);
            const visible = children.filter(child => !query || parentMatches || `${child.code} ${child.name}`.toLowerCase().includes(query) || PROJECT_FINAL_CHAPTERS.some(chapter => chapter.parentCode === child.code && `${chapter.code} ${chapter.name}`.toLowerCase().includes(query)) || templatesFor(child.code).length > 0 || files.some(doc => documentFolderCode(doc) === child.code && matches(doc)));
            if (query && !parentMatches && !visible.length && !files.some(matches)) return null;
            return <View key={stage.code}>
                {folderRow(stage.code, `${stage.code} · ${stage.name}`, files.length)}
                {expanded.includes(stage.code) && <View>
                    {files.filter(doc => documentFolderCode(doc) === stage.code && (parentMatches || matches(doc))).map(doc => <View key={doc.id} style={{ paddingLeft: 28 }}>{renderDocument(doc)}</View>)}
                    {visible.map(child => {
                        const childMatches = `${child.code} ${child.name}`.toLowerCase().includes(query);
                        const childFiles = files.filter(doc => documentFolderCode(doc) === child.code && (parentMatches || childMatches || matches(doc)));
                        const chapters = PROJECT_FINAL_CHAPTERS.filter(chapter => chapter.parentCode === child.code);
                        const visibleChapters = chapters.filter(chapter => !query || parentMatches || childMatches || `${chapter.code} ${chapter.name}`.toLowerCase().includes(query));
                        return <View key={child.code}>
                            {folderRow(child.code, `${child.code} · ${child.name}`, childFiles.length, 1)}
                            {expanded.includes(child.code) && <View style={{ marginLeft: 42, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: border }}>
                                <Text style={{ color: secondary, fontSize: 12, lineHeight: 19, paddingVertical: 12 }}>{child.description}</Text>
                                {chapters.length > 0 && <View style={{ gap: 4, paddingBottom: 12 }}>
                                    <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600', paddingBottom: 6 }}>Final document outline · Awaiting review</Text>
                                    {visibleChapters.map(chapter => <View key={chapter.code} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' }}>
                                        <Ionicons name="list-outline" size={16} color={secondary} />
                                        <Text style={{ color: secondary, minWidth: 44, fontSize: 12 }}>{chapter.code}</Text>
                                        <Text style={{ color, flex: 1, fontSize: 13 }}>{chapter.name}</Text>
                                    </View>)}
                                </View>}
                                {renderTemplates(child.code)}
                                {(childFiles.length > 0 || (!templatesFor(child.code).length && !chapters.length)) && renderFiles(childFiles)}
                            </View>}
                        </View>;
                    })}
                </View>}
            </View>;
        })}
    </View>;
}
