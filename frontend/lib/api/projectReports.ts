import { supabase } from '@/lib/supabase';
export interface AdidayaProjectReport {
    id: string; project_id: string; title: string; report_type: string; report_date: string;
    status: string; progress?: number; content?: string; manpower_count?: number; weather_condition?: string;
    projects?: { project_name: string; project_code?: string } | null;
}
export async function getAdidayaProjectReports(): Promise<AdidayaProjectReport[]> {
    const rows: AdidayaProjectReport[] = [];
    for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('project_reports')
            .select('*, projects(project_name, project_code)')
            .order('report_date', { ascending: false }).order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data || []) as AdidayaProjectReport[]);
        if (!data || data.length < 500) return rows;
    }
}
export function reportContentFields(content?: string): [string, unknown][] {
    if (!content) return [];
    try { const parsed = JSON.parse(content); return parsed && typeof parsed === 'object' ? Object.entries(parsed) : [['Notes', String(parsed)]]; }
    catch { return [['Notes', content]]; }
}
