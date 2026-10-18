import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/api/projects';
import { reportContentFields } from '@/lib/api/projectReports';

export type PlanningSection = 'stages' | 'wbs' | 'volume' | 'rab' | 'schedule' | 'reports';
const TABLES = { stages: 'project_stages', wbs: 'project_wbs_items', volume: 'project_volume_calcs', rab: 'project_rab_versions', schedule: 'project_tasks', reports: 'project_reports' };
export function ProjectPlanningPanel({ project, section, isDark }: { project: Project; section: PlanningSection; isDark: boolean }) {
    const [rows, setRows] = useState<any[]>([]), [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [rabItems, setRabItems] = useState<any[]>([]);
    const text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#AEAEB2' : '#636366';
    const card = { padding: 20, borderRadius: 20, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', marginBottom: 12 };
    useEffect(() => {
        let active = true;
        setLoading(true); setError(''); setSelected(null); setRows([]);
        (async () => {
            const result: any[] = [];
            for (let offset = 0; ; offset += 500) {
                const { data, error } = await supabase.from(TABLES[section]).select('*').eq('project_id', project.id).order('id').range(offset, offset + 499);
                if (error) throw error;
                result.push(...(data || []));
                if (!data || data.length < 500) break;
            }
            result.sort((a, b) => section === 'rab' ? Number(b.version_no || 0) - Number(a.version_no || 0) : Number(a.position || 0) - Number(b.position || 0));
            if (active) setRows(result);
        })().catch(e => { if (active) setError(e.message || 'Unable to load project records.'); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [project.id, section]);
    useEffect(() => {
        if (section !== 'rab' || !selected) return;
        let active = true;
        setLoading(true); setError(''); setRabItems([]);
        (async () => {
            const result: any[] = [];
            for (let offset = 0; ; offset += 500) {
                const { data, error } = await supabase.from('project_rab_items').select('*').eq('rab_version_id', selected.id).order('id').range(offset, offset + 499);
                if (error) throw error;
                result.push(...(data || []));
                if (!data || data.length < 500) break;
            }
            if (active) setRabItems(result);
        })().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [section, selected?.id]);
    const money = (value: unknown) => typeof value === 'number' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) : String(value || '—');
    return <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, maxWidth: 840, width: '100%', alignSelf: 'center' }}>
        {selected && <TouchableOpacity onPress={() => { setSelected(null); setError(''); }} style={{ paddingVertical: 12, marginBottom: 12 }}><Text style={{ color: '#007AFF', fontWeight: '600' }}>‹ Back to list</Text></TouchableOpacity>}
        {loading && <ActivityIndicator color="#007AFF" />}
        {!!error && <Text accessibilityRole="alert" style={{ color: '#FF3B30', marginBottom: 16 }}>{error}</Text>}
        {!loading && !error && !selected && !rows.length && <View style={card}><Text style={{ color: text, fontSize: 17, fontWeight: '600' }}>No records yet</Text><Text style={{ color: secondary, marginTop: 8 }}>No {section} records have been saved for this project.</Text></View>}
        {!selected ? rows.map(row => <TouchableOpacity key={row.id} style={card} onPress={() => setSelected(row)}>
            <Text style={{ color: text, fontSize: 16, fontWeight: '600' }}>{row.wbs_code ? `${row.wbs_code} · ` : ''}{row.title || row.name || row.report_type || row.wbs_code || 'Record'}</Text>
            <Text style={{ color: secondary, marginTop: 8 }}>{[row.status, row.start_date, row.end_date || row.target_date || row.report_date, row.version_no !== undefined ? `Version ${row.version_no}` : null].filter(Boolean).join(' · ') || 'View details'}</Text>
        </TouchableOpacity>) : <View>
            <View style={card}>
                <Text style={{ color: text, fontSize: 22, fontWeight: '700', marginBottom: 16 }}>{selected.title || selected.name || selected.wbs_code || 'Details'}</Text>
                {Object.entries({ Code: selected.wbs_code || selected.code, Status: selected.status, 'Start date': selected.start_date, 'Target date': selected.end_date || selected.target_date, Quantity: selected.quantity, Unit: selected.unit, Notes: selected.notes || selected.description }).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => <View key={label} style={{ paddingVertical: 10 }}><Text style={{ color: secondary, fontSize: 12 }}>{label}</Text><Text style={{ color: text, marginTop: 4 }}>{String(value)}</Text></View>)}
                {section === 'reports' && reportContentFields(selected.content).map(([label, value]) => <View key={label} style={{ marginTop: 16 }}><Text style={{ color: secondary }}>{label}</Text><Text style={{ color: text, marginTop: 4 }}>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')}</Text></View>)}
            </View>
            {section === 'rab' && <>
                <Text style={{ color: secondary, marginBottom: 16 }}>Saved RAB version · viewing only</Text>
                {rabItems.map(item => <View key={item.id} style={card}><Text style={{ color: text, fontWeight: '600' }}>{item.description || item.title || item.wbs_code || 'Budget item'}</Text><Text style={{ color: secondary, marginTop: 8 }}>{item.quantity ?? '—'} {item.unit || ''} × {money(item.unit_price)}</Text><Text style={{ color: text, marginTop: 8 }}>{money(item.total_price ?? item.subtotal ?? (Number(item.quantity || 0) * Number(item.unit_price || 0)))}</Text></View>)}
                {!loading && !rabItems.length && !error && <Text style={{ color: secondary }}>No budget items in this version.</Text>}
            </>}
        </View>}
    </ScrollView>;
}
