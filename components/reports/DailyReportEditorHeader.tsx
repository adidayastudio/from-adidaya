import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE } from '@/constants/desktopLayout';
interface Props { section: string; language: string; saving: boolean; exporting: boolean; onSection: (id: string) => void; onLanguage: (id: string) => void; onBack: () => void; onSave: () => void; onExport: () => void }
export default function DailyReportEditorHeader(p: Props) {
    const { resolvedTheme } = useTheme(); const dark = resolvedTheme === 'dark';
    const color = dark ? '#F5F5F7' : '#111827';
    return <View style={[DESKTOP_PANEL_HEADER, { backgroundColor: dark ? '#000000' : '#F2F2F7' }]}>
        <View style={DESKTOP_PANEL_TITLE_ROW}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 }}><HeaderCircleButton type="back" size={34} isDark={dark} onPress={p.onBack} /><Text style={[DESKTOP_PANEL_TITLE, { color }]}>Daily Report</Text></View>
            <View style={{ flexDirection: 'row', gap: 8 }}><HeaderCircleButton type="custom" iconName="square.and.arrow.down" size={34} isDark={dark} onPress={() => { if (!p.exporting) p.onExport(); }} /><HeaderCircleButton type="custom" iconName={p.saving ? 'ellipsis' : 'checkmark'} size={34} tintColor="#FFFFFF" style={{ backgroundColor: '#0F9D8A' }} onPress={() => { if (!p.saving) p.onSave(); }} /></View>
        </View>
        <View style={{ marginTop: 12 }}><SegmentedControl fullWidth activeSegment={p.section} onSegmentChange={p.onSection} segments={[{ id: 'general', label: 'Info' }, { id: 'workItems', label: 'Work' }, { id: 'personnel', label: 'Crew' }, { id: 'cuaca', label: 'Weather' }, { id: 'material', label: 'Material' }, { id: 'catatan', label: 'Notes' }, { id: 'dokumentasi', label: 'Photos' }, { id: 'ttd', label: 'Approval' }]} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}><Text style={{ color, opacity: 0.5, fontSize: 12 }}>Document language</Text><View style={{ flexDirection: 'row', gap: 4 }}>{[{ id: 'bilingual', label: 'ID / EN' }, { id: 'id', label: 'ID' }, { id: 'en', label: 'EN' }].map(lang => <TouchableOpacity key={lang.id} onPress={() => p.onLanguage(lang.id)} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: p.language === lang.id ? (dark ? '#2C2C2E' : '#E5E7EB') : 'transparent' }}><Text style={{ color, fontSize: 11, fontWeight: '700' }}>{lang.label}</Text></TouchableOpacity>)}</View></View>
    </View>;
}
