import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PROJECT_CATALOG } from '@/lib/projectCatalog';
import { documentFolderCode } from '@/lib/projectDocumentFolders';
import type { ProjectDocItem } from './DocsTab';

export function DocumentFolderTree({ documents, isDark, renderDocument }: { documents: ProjectDocItem[]; isDark: boolean; renderDocument: (document: ProjectDocItem) => React.ReactNode }) {
    const [expanded, setExpanded] = useState<string[]>([]), [search, setSearch] = useState('');
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
    const inbox = documents.filter(doc => !documentFolderCode(doc)).filter(matches);
    return <View>
        <TextInput accessibilityLabel="Search document folders" placeholder="Search folders or documents" placeholderTextColor={secondary} value={search} onChangeText={value => { setSearch(value); if (value.trim()) setExpanded(['inbox', ...PROJECT_CATALOG.map(entry => entry.code)]); }} style={{ ...pill, color, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TouchableOpacity onPress={() => setExpanded(['inbox', ...PROJECT_CATALOG.map(entry => entry.code)])} style={pill}><Text style={{ color: '#007AFF' }}>Expand all</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setExpanded([])} style={pill}><Text style={{ color: '#007AFF' }}>Collapse all</Text></TouchableOpacity>
        </View>
        {(!query || inbox.length > 0 || 'inbox'.includes(query)) && <View>{folderRow('inbox', 'Inbox', inbox.length)}{expanded.includes('inbox') && <View style={{ paddingLeft: 28 }}>{renderFiles(inbox)}</View>}</View>}
        {PROJECT_CATALOG.filter(entry => entry.parentCode === null).map(stage => {
            const children = PROJECT_CATALOG.filter(entry => entry.parentCode === stage.code);
            const codes = [stage.code, ...children.map(entry => entry.code)];
            const files = documents.filter(doc => codes.includes(documentFolderCode(doc) || ''));
            const parentMatches = `${stage.code} ${stage.name}`.toLowerCase().includes(query);
            const visible = children.filter(child => !query || parentMatches || `${child.code} ${child.name}`.toLowerCase().includes(query) || files.some(doc => documentFolderCode(doc) === child.code && matches(doc)));
            if (query && !parentMatches && !visible.length && !files.some(matches)) return null;
            return <View key={stage.code}>
                {folderRow(stage.code, `${stage.code} · ${stage.name}`, files.length)}
                {expanded.includes(stage.code) && <View>
                    {files.filter(doc => documentFolderCode(doc) === stage.code && (parentMatches || matches(doc))).map(doc => <View key={doc.id} style={{ paddingLeft: 28 }}>{renderDocument(doc)}</View>)}
                    {visible.map(child => {
                        const childMatches = `${child.code} ${child.name}`.toLowerCase().includes(query);
                        const childFiles = files.filter(doc => documentFolderCode(doc) === child.code && (parentMatches || childMatches || matches(doc)));
                        return <View key={child.code}>{folderRow(child.code, `${child.code} · ${child.name}`, childFiles.length, 1)}{expanded.includes(child.code) && <View style={{ marginLeft: 42, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: border }}>{renderFiles(childFiles)}</View>}</View>;
                    })}
                </View>}
            </View>;
        })}
    </View>;
}
