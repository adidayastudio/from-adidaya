import React, { useEffect, useState } from 'react';
import { Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { GlassView } from '@/components/ui/GlassView';
import { ProjectInformationDetails, resizeBuildingMasses, currentStageCode } from '@/lib/projectInformation';
import { INDONESIAN_REGIONS } from '@/lib/indonesianRegions';
import { fetchDefaultWorkspaceId, fetchTypologies, fetchDisciplines, fetchClasses, fetchAllStageTemplates } from '@/lib/api/templates';

type Option = { value: string; label: string };
const LEGACY_STAGES: Record<string, string[][]> = {
    'design-only': [['01-KO', 'Kickoff'], ['02-SD', 'Schematic Design'], ['03-DD', 'Design Development'], ['04-ED', 'Engineering/Tender'], ['05-HO', 'Handover']],
    'design-build': [['01-KO', 'Kickoff'], ['02-SD', 'Schematic Design'], ['03-DD', 'Design Development'], ['04-CD', 'Construction Drawing'], ['05-TN', 'Tender'], ['06-CN', 'Construction'], ['07-HO', 'Handover']],
    'build-only': [['01-KO', 'Kickoff'], ['02-ED', 'Engineering'], ['03-PC', 'Pre-Construction'], ['04-CN', 'Construction'], ['05-HO', 'Handover']],
};
export function ProjectInformationSections({ value, onChange, scopeId, currentStage, isDark, position = 'details' }: { value: ProjectInformationDetails; onChange: (next: ProjectInformationDetails) => void; scopeId?: string; currentStage?: string; isDark: boolean; position?: 'stages' | 'details' }) {
    const text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#8E8E93' : '#636366', divider = isDark ? '#303034' : '#E5E5EA';
    const [categories, setCategories] = useState<Option[]>([{ value: 'new', label: 'New Building' }, { value: 'renovation', label: 'Renovation' }, { value: 'interior', label: 'Interior Fit-out' }, { value: 'landscape', label: 'Landscape' }]);
    const [disciplines, setDisciplines] = useState(['Architecture', 'Structure', 'MEP', 'Interior', 'Landscape']);
    const [classes, setClasses] = useState<Option[]>(['Luxury', 'Premium', 'Standard', 'Basic'].map((name, index) => ({ value: String.fromCharCode(65 + index), label: `Class ${String.fromCharCode(65 + index)} - ${name}` })));
    const [newDiscipline, setNewDiscipline] = useState('');
    const [stages, setStages] = useState<any[]>([]), [optionError, setOptionError] = useState('');
    useEffect(() => {
        let active = true;
        (async () => {
            const workspace = await fetchDefaultWorkspaceId();
            if (!workspace) return;
            if (position === 'stages') { const result = await fetchAllStageTemplates(workspace); if (active) setStages(result); return; }
            const [types, trades, levels] = await Promise.all([fetchTypologies(workspace), fetchDisciplines(workspace), fetchClasses(workspace)]);
            if (!active) return;
            if (types.length) setCategories(types.map(item => ({ value: item.code || item.id, label: item.name })));
            if (trades.length) setDisciplines(trades.map(item => item.nameEn));
            if (levels.length) setClasses(levels.map(item => ({ value: item.classCode, label: `Class ${item.classCode} - ${item.description || item.finishLevel || ''}` })));
        })().catch(() => { if (active) setOptionError('Some setup options could not be loaded. Existing project values are retained.'); });
        return () => { active = false; };
    }, [position]);
    const patch = (key: keyof ProjectInformationDetails, next: any) => onChange({ ...value, [key]: next });
    const patchLocation = (key: string, next: string) => onChange({ ...value, location: { ...value.location, [key]: next } });
    const section = (title: string, children: React.ReactNode) => <View style={{ gap: 8 }}><Text style={{ color: secondary, fontSize: 13, fontWeight: '600', paddingLeft: 12 }}>{title}</Text><GlassView intensity={isDark ? 10 : 25} style={{ borderRadius: 24, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', overflow: 'hidden' }}>{children}</GlassView></View>;
    const field = (label: string, stored: any, update: (next: string) => void, numeric = false) => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 0.5, borderBottomColor: divider }}><Text style={{ color: text, fontSize: 16, flex: 1 }}>{label}</Text><TextInput accessibilityLabel={label} value={String(stored ?? '')} onChangeText={update} keyboardType={numeric ? 'decimal-pad' : 'default'} placeholder="—" placeholderTextColor={secondary} style={{ color: text, fontSize: 16, textAlign: 'right', flex: 1.3, minWidth: 80, padding: 0 }} /></View>;
    const select = (label: string, stored: string, options: Option[], update: (next: string) => void) => <ContextMenu key={label} dropdownMenuMode actions={options.map(option => ({ title: option.label, selected: stored === option.value }))} onPress={event => { const option = options[event.nativeEvent.index]; if (option) update(option.value); }}><View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 0.5, borderBottomColor: divider }}><Text style={{ color: text, fontSize: 16, flex: 1 }}>{label}</Text><Text style={{ color: stored ? text : secondary, fontSize: 16 }}>{options.find(option => option.value === stored)?.label || stored || 'Select'}</Text><Ionicons name="chevron-down" size={14} color={secondary} /></View></ContextMenu>;
    if (position === 'stages') {
        const configured = stages.filter(stage => stage.isActive && stage.projectTypeId === scopeId).sort((a, b) => a.position - b.position);
        const rows = configured.length ? configured.map(stage => [stage.displayCode || stage.stageCode, stage.stageName]) : LEGACY_STAGES[scopeId || ''] || [];
        const activeCode = currentStageCode(currentStage, rows.map(([code]) => code));
        return section('Applicable Stages', <View>{rows.length > 0 && select('Current Stage', activeCode || currentStage || '', rows.map(([code, name]) => ({ value: code, label: `${code} · ${name}` })), next => patch('currentStage', next))}{rows.length ? rows.map(([code, name], index) => <View key={code} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 0.5, borderBottomColor: divider }}><Text style={{ color: secondary, width: 22 }}>{index + 1}</Text><Text style={{ color: text, flex: 1 }}>{code} · {name}</Text>{(activeCode === code) && <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '700' }}>CURRENT</Text>}</View>) : <Text style={{ color: secondary, padding: 16 }}>No applicable stages configured for this scope.</Text>}</View>);
    }
    const province = INDONESIAN_REGIONS.find(item => item.province === value.location.province);
    return <View style={{ gap: 22 }}>
        {!!optionError && <Text style={{ color: secondary }}>{optionError}</Text>}
        {section('Location', <>
            {field('Address', value.location.address, next => patchLocation('address', next))}
            {select('Province', value.location.province || '', INDONESIAN_REGIONS.map(item => ({ value: item.province, label: item.province })), next => onChange({ ...value, location: { ...value.location, province: next, city: '' } }))}
            {select('City', value.location.city || '', (province?.cities || []).map(city => ({ value: city, label: city })), next => patchLocation('city', next))}
            {field('Google Maps Link', value.location.mapsLink, next => patchLocation('mapsLink', next))}
            {!!value.location.mapsLink && <TouchableOpacity onPress={() => { if (/^https?:\/\//i.test(value.location.mapsLink)) Linking.openURL(value.location.mapsLink); }} style={{ paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-end', margin: 8, borderRadius: 999, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}><Text style={{ color: '#007AFF' }}>Open Map ↗</Text></TouchableOpacity>}
            {field('Latitude', value.location.latitude, next => patchLocation('latitude', next), true)}
            {field('Longitude', value.location.longitude, next => patchLocation('longitude', next), true)}
        </>)}
        {section('Scope of Work', <>
            {select('Category', value.category, categories, next => patch('category', next))}
            <View style={{ padding: 16, gap: 12 }}><Text style={{ color: text, fontSize: 16 }}>Disciplines</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Array.from(new Set([...disciplines, ...value.disciplines])).map(name => <TouchableOpacity key={name} accessibilityRole="checkbox" accessibilityState={{ checked: value.disciplines.includes(name) }} onPress={() => patch('disciplines', value.disciplines.includes(name) ? value.disciplines.filter(item => item !== name) : [...value.disciplines, name])} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: value.disciplines.includes(name) ? (isDark ? '#102447' : '#E6EEFF') : (isDark ? '#2C2C2E' : '#F2F2F7') }}><Text style={{ color: value.disciplines.includes(name) ? '#007AFF' : text }}>{name}</Text></TouchableOpacity>)}</View>
                <View style={{ flexDirection: 'row', gap: 8 }}><TextInput accessibilityLabel="New discipline" placeholder="Add discipline" placeholderTextColor={secondary} value={newDiscipline} onChangeText={setNewDiscipline} style={{ flex: 1, color: text, borderRadius: 999, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', paddingHorizontal: 14, paddingVertical: 8 }} /><TouchableOpacity accessibilityRole="button" disabled={!newDiscipline.trim()} onPress={() => { const name = newDiscipline.trim(); if (!value.disciplines.some(item => item.toLowerCase() === name.toLowerCase())) patch('disciplines', [...value.disciplines, name]); setNewDiscipline(''); }} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: isDark ? '#102447' : '#E6EEFF', opacity: newDiscipline.trim() ? 1 : 0.5 }}><Text style={{ color: '#007AFF' }}>Add</Text></TouchableOpacity></View>
            </View>
        </>)}
        {section('Specifications', <>
            {field('Land Area (m²)', value.landArea, next => patch('landArea', next), true)}
            {field('Building Area (m²)', value.buildingArea, next => patch('buildingArea', next), true)}
            {field('Floors', value.floors, next => patch('floors', next), true)}
            {select('RAB Class', value.rabClass, classes, next => patch('rabClass', next))}
            {select('Building Mass Count', String(value.buildingMassCount), Array.from({ length: 25 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })), next => onChange({ ...value, buildingMassCount: Number(next), buildingMasses: resizeBuildingMasses(value.buildingMasses, Number(next), value.buildingArea, value.floors) }))}
        </>)}
        {section('Building Masses & Segments', <>{value.buildingMasses.map((mass, index) => <View key={`${mass.code}:${index}`} style={{ borderBottomWidth: 0.5, borderBottomColor: divider }}><Text style={{ color: '#007AFF', paddingHorizontal: 16, paddingTop: 14, fontWeight: '700' }}>[{mass.code}]{mass.isSiteWork ? ' · Site Work' : ''}</Text>{(['name', 'buildingArea', 'floors'] as const).map(key => field(({ name: 'Name', buildingArea: 'Building Area (m²)', floors: 'Floors' })[key], mass[key], next => patch('buildingMasses', value.buildingMasses.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: next } : item)), key !== 'name'))}</View>)}</>)}
        {section('Client Information', <>{field('Client Name', value.clientName, next => patch('clientName', next))}{field('Contact', value.clientContact, next => patch('clientContact', next))}</>)}
    </View>;
}
