import AdidayaReportEditor from '@/components/reports/AdidayaReportEditor';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ADIDAYA_REPORT_TYPES } from '@/constants/adidayaReports';
import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE } from '@/constants/desktopLayout';
import { AdidayaProjectReport, getAdidayaProjectReports, reportContentFields } from '@/lib/api/projectReports';

function ReadValue({ value, color, depth = 0 }: { value: unknown; color: string; depth?: number }) {
    if (value === null || value === undefined || value === '') return <Text style={{ color }}>—</Text>;
    if (typeof value !== 'object') return <Text selectable style={{ color, lineHeight: 23 }}>{String(value).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')}</Text>;
    if (depth > 6) return null;
    return <View style={{ gap: 10 }}>{Object.entries(value).map(([key, item]) => <View key={key} style={{ gap: 4 }}><Text style={{ color, opacity: 0.55 }}>{/^\d+$/.test(key) ? Number(key) + 1 : key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</Text><ReadValue value={item} color={color} depth={depth + 1} /></View>)}</View>;
}
export default function ReportsScreen() {
    const { resolvedTheme } = useTheme();
    const { isAuthenticated } = useUserContext();
    const dark = resolvedTheme === 'dark', color = dark ? '#F5F5F7' : '#111827', bg = dark ? '#000000' : '#F2F2F7', card = dark ? '#1C1C1E' : '#FFFFFF';
    const { width } = useWindowDimensions();
    const desktop = Platform.OS === 'web' && width >= 768;
    const [reports, setReports] = useState<AdidayaProjectReport[]>([]);
    const [loading, setLoading] = useState(false), [error, setError] = useState('');
    const [segment, setSegment] = useState('overview'), [type, setType] = useState('all'), [search, setSearch] = useState(''), [searchOpen, setSearchOpen] = useState(false);
    const [editor, setEditor] = useState<{ reportId?: string; reportType: string; exportPdf?: boolean } | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const load = useCallback(async () => {
        if (!isAuthenticated) { setReports([]); return; }
        setLoading(true); setError('');
        try { setReports(await getAdidayaProjectReports()); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat laporan Adidaya.'); }
        finally { setLoading(false); }
    }, [isAuthenticated]);
    useEffect(() => { void load(); }, [load]);
    const filtered = useMemo(() => reports.filter(r => (type === 'all' || r.report_type === type) && `${r.title} ${r.projects?.project_name || ''} ${r.projects?.project_code || ''}`.toLowerCase().includes(search.toLowerCase())), [reports, type, search]);
    const selected = reports.find(r => r.id === selectedId);
    const openEditor = (report?: AdidayaProjectReport, pdf = false) => {
        setEditor({ reportId: report?.id, reportType: report?.report_type || (type === 'all' ? 'daily' : type), exportPdf: pdf });
    };
    const closeEditor = useCallback(() => { setEditor(null); setSelectedId(null); }, []);
    const savedEditor = useCallback(() => { setEditor(null); setSelectedId(null); void load(); }, [load]);
    const list = <>
        <View style={styles.header}>
            <View style={styles.titleRow}><Text style={[styles.title, { color }]}>Reports</Text><View style={{ flexDirection: 'row', gap: 8 }}><HeaderCircleButton type="custom" iconName="magnifyingglass" size={34} isDark={dark} onPress={() => setSearchOpen(v => !v)} />{isAuthenticated && <HeaderCircleButton type="custom" iconName="plus" size={34} tintColor="#FFFFFF" style={{ backgroundColor: '#0F9D8A' }} onPress={() => { void openEditor(); }} />}</View></View>
            <View style={{ marginTop: 12 }}><SegmentedControl fullWidth segments={[{ id: 'overview', label: 'Overview' }, { id: 'reports', label: 'Reports' }]} activeSegment={segment} onSegmentChange={setSegment} /></View>
            {searchOpen && <TextInput accessibilityLabel="Search reports" placeholder="Search reports or project…" placeholderTextColor="#8E8E93" value={search} onChangeText={setSearch} style={{ color, padding: 12, backgroundColor: card, borderRadius: 14, marginTop: 12 }} />}
        </View>
        <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12, paddingBottom: 120 }}>
            {!isAuthenticated ? <Text style={{ color }}>Sign in to view Adidaya project reports.</Text> : <>
                {!!error && <View style={[styles.card, { backgroundColor: card }]}><Text style={{ color: '#FF453A' }}>{error}</Text><TouchableOpacity onPress={load}><Text style={{ color: '#0F9D8A', marginTop: 10 }}>Try again</Text></TouchableOpacity></View>}
                {loading && !reports.length && <ActivityIndicator color="#0F9D8A" />}
                {segment === 'overview' && <>
                    <View style={[styles.card, { backgroundColor: card }]}><Text style={{ color, fontSize: 28, fontWeight: '800' }}>{reports.length}</Text><Text style={{ color, opacity: 0.6 }}>Project reports · Adidaya</Text></View>
                    {ADIDAYA_REPORT_TYPES.map(t => <TouchableOpacity key={t.type} onPress={() => { setType(t.type); setSegment('reports'); }} style={[styles.card, { backgroundColor: card }]}><Text style={{ color: '#0F9D8A', fontSize: 11, marginBottom: 6 }}>{t.clusterLabel}</Text><Text style={{ color, fontWeight: '700', fontSize: 16 }}>{t.title}</Text><Text style={{ color, opacity: 0.6, marginTop: 6 }}>{t.description}</Text><Text style={{ color, marginTop: 10 }}>{reports.filter(r => r.report_type === t.type).length} reports ›</Text></TouchableOpacity>)}
                </>}
                {segment === 'reports' && <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><TouchableOpacity onPress={() => setType('all')} style={[styles.chip, { backgroundColor: type === 'all' ? '#0F9D8A' : card }]}><Text style={{ color: type === 'all' ? '#FFFFFF' : color }}>All</Text></TouchableOpacity>{ADIDAYA_REPORT_TYPES.map(t => <TouchableOpacity key={t.type} onPress={() => setType(t.type)} style={[styles.chip, { backgroundColor: type === t.type ? '#0F9D8A' : card }]}><Text style={{ color: type === t.type ? '#FFFFFF' : color }}>{t.title}</Text></TouchableOpacity>)}</ScrollView>
                    {!loading && !error && !filtered.length && <Text style={{ color, opacity: 0.6, paddingVertical: 30 }}>No Adidaya reports in this view.</Text>}
                    {filtered.map(r => <TouchableOpacity key={r.id} onPress={() => { setSelectedId(r.id); openEditor(r); }} style={[styles.card, { backgroundColor: card, borderWidth: 1, borderColor: selectedId === r.id ? '#0F9D8A' : 'transparent' }]}><Text style={{ color, fontSize: 17, fontWeight: '700' }}>{r.title}</Text><Text style={{ color, opacity: 0.6, marginTop: 8 }}>{r.projects?.project_code || r.projects?.project_name || 'Project'} · {r.report_date}</Text><Text style={{ color: '#0F9D8A', marginTop: 8 }}>{r.report_type || 'daily'} · {r.status}{r.progress != null ? ` · ${r.progress}%` : ''}</Text></TouchableOpacity>)}
                </>}
            </>}
        </ScrollView>
    </>;
    const detail = editor ? <AdidayaReportEditor key={`${editor.reportId || 'new'}-${editor.reportType}`} {...editor} onClose={closeEditor} onSaved={savedEditor} /> : selected ? <ScrollView contentContainerStyle={{ padding: 24, gap: 18, paddingBottom: 120 }}><TouchableOpacity onPress={() => setSelectedId(null)}><Text style={{ color: '#0F9D8A' }}>‹ Back to reports</Text></TouchableOpacity><Text style={{ color, fontSize: 26, fontWeight: '800' }}>{selected.title}</Text><Text style={{ color, opacity: 0.6 }}>{selected.projects?.project_name} · {selected.report_date} · {selected.status}</Text><View style={{ flexDirection: 'row', gap: 12 }}><TouchableOpacity style={[styles.chip, { backgroundColor: card }]} onPress={() => { void openEditor(selected); }}><Text style={{ color }}>Edit report</Text></TouchableOpacity><TouchableOpacity style={[styles.chip, { backgroundColor: card }]} onPress={() => { void openEditor(selected, true); }}><Text style={{ color }}>PDF</Text></TouchableOpacity></View>{selected.progress != null && <Text style={{ color }}>Progress: {selected.progress}%</Text>}{selected.manpower_count != null && <Text style={{ color }}>Manpower: {selected.manpower_count}</Text>}{selected.weather_condition && <Text style={{ color }}>Weather: {selected.weather_condition}</Text>}{reportContentFields(selected.content).map(([key, value]) => <View key={key} style={[styles.card, { backgroundColor: card }]}><Text style={{ color, fontWeight: '700', fontSize: 17, marginBottom: 12 }}>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</Text><ReadValue value={value} color={color} /></View>)}</ScrollView> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}><Text style={{ color, opacity: 0.5 }}>Select an Adidaya project report to view its details.</Text></View>;
    if (editor) return <View style={{ flex: 1, backgroundColor: bg }}><Stack.Screen options={{ headerShown: false }} /><AdidayaReportEditor key={editor.reportId || 'new'} {...editor} onClose={closeEditor} onSaved={savedEditor} /></View>;
    return <View style={{ flex: 1, backgroundColor: bg }}><Stack.Screen options={{ headerShown: false }} />{desktop ? <View style={{ flex: 1, flexDirection: 'row' }}><View style={[DESKTOP_LIST_PANE, { borderRightWidth: 1, borderRightColor: dark ? '#222222' : '#DDDDDD' }]}>{list}</View><View style={{ flex: 1, minWidth: 0 }}>{detail}</View></View> : (selected || editor) ? detail : list}</View>;
}
const styles = StyleSheet.create({ header: { ...DESKTOP_PANEL_HEADER }, titleRow: { ...DESKTOP_PANEL_TITLE_ROW }, title: { ...DESKTOP_PANEL_TITLE }, card: { borderRadius: 20, padding: 18 }, chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 } });
