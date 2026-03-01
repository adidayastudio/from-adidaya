import { createClient } from "@/utils/supabase/client";
import { WorkMetrics, PersonaType, resolveWorkPersona } from "../workPersonaLogic";
import { startOfWeek, endOfWeek, format, subWeeks, eachWeekOfInterval, isBefore } from "date-fns";

export interface VibeHistoryEntry {
    id: string;
    persona_type: PersonaType;
    week_start: string;
    week_end: string;
    metrics: WorkMetrics;
    is_locked: boolean;
    created_at: string;
}

export async function getCurrentVibe(profileId: string) {
    const supabase = createClient();

    // In a real app, we would fetch current period metrics from various tables
    // For now, we return mock metrics or fetch the latest unlocked record
    const { data, error } = await supabase
        .from('people_vibe_history')
        .select('*')
        .eq('profile_id', profileId)
        .order('week_start', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        process.env.NODE_ENV === 'development' && console.error('Error fetching current vibe:', error);
    }

    return data as VibeHistoryEntry | null;
}

export async function getVibeHistory(profileId: string, type: 'weekly' | 'monthly' = 'weekly') {
    const supabase = createClient();

    // Validate UUID format to avoid DB error
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!profileId || !uuidRegex.test(profileId)) {
        return [];
    }

    // Try to trigger a sync for the last 4 weeks if it's a real user
    await syncVibeHistory(profileId);

    const limit = type === 'weekly' ? 12 : 12; // Show more history if available

    const { data, error } = await supabase
        .from('people_vibe_history')
        .select('*')
        .eq('profile_id', profileId)
        .order('week_start', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching vibe history:', error);
        return [];
    }

    return data as VibeHistoryEntry[];
}

export async function syncVibeHistory(profileId: string) {
    const supabase = createClient();
    const now = new Date();
    const startRange = new Date("2026-01-01");

    // Get all sundays between start and now
    const weeks = eachWeekOfInterval({
        start: startRange,
        end: now
    }, { weekStartsOn: 1 });

    // Filter only past weeks (not current week) and reverse to process newest first
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const pastWeeks = weeks.filter(w => isBefore(w, currentWeekStart)).reverse();

    // Check which ones are already in DB
    const { data: existing } = await supabase
        .from('people_vibe_history')
        .select('week_start')
        .eq('profile_id', profileId);

    const existingStarts = new Set((existing || []).map(h => h.week_start));

    // Process only missing weeks (max 4 per sync to avoid timeout)
    const missing = pastWeeks.filter(w => !existingStarts.has(format(w, "yyyy-MM-dd"))).slice(0, 4);

    if (missing.length === 0) return;

    for (const weekStart of missing) {
        const wsStr = format(weekStart, "yyyy-MM-dd");
        const weStr = format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

        try {
            // Fetch real metrics for this week
            const [tasksRes, completedRes, prevCompletedRes, attendanceRes] = await Promise.all([
                supabase.from('tasks').select('id', { count: 'exact', head: true })
                    .eq('task_assignees.user_id', profileId)
                    .gte('deadline_date', wsStr)
                    .lte('deadline_date', weStr),
                supabase.from('tasks').select('id', { count: 'exact', head: true })
                    .eq('task_assignees.user_id', profileId)
                    .eq('status', 'DONE')
                    .gte('updated_at', weekStart.toISOString())
                    .lte('updated_at', endOfWeek(weekStart, { weekStartsOn: 1 }).toISOString()),
                supabase.from('tasks').select('id', { count: 'exact', head: true })
                    .eq('task_assignees.user_id', profileId)
                    .eq('status', 'DONE')
                    .gte('updated_at', subWeeks(weekStart, 1).toISOString())
                    .lte('updated_at', weekStart.toISOString()),
                supabase.from('attendance_sessions').select('clock_in, clock_out')
                    .eq('user_id', profileId)
                    .gte('date', wsStr)
                    .lte('date', weStr)
            ]);

            const tasksTotal = tasksRes.count || 0;
            const tasksCompleted = completedRes.count || 0;
            const prevCompleted = prevCompletedRes.count || 0;

            let totalMins = 0;
            (attendanceRes.data || []).forEach(s => {
                const cin = new Date(s.clock_in);
                const cout = s.clock_out ? new Date(s.clock_out) : new Date(cin.getTime() + 8 * 3600000); // 8h default if not clocked out
                totalMins += Math.max(0, (cout.getTime() - cin.getTime()) / 60000);
            });
            const hoursLogged = totalMins / 60;
            const attendanceRate = Math.min(100, Math.round((hoursLogged / 40) * 100));

            let pulseScore = 0;
            if (prevCompleted > 0) pulseScore = Math.min(100, Math.round((tasksCompleted / prevCompleted) * 100));
            else if (tasksCompleted > 0) pulseScore = 100;

            const metrics: WorkMetrics = {
                tasksCompleted,
                tasksTotal,
                tasksOverdue: 0, // Simplified for backfill
                attendanceRate,
                pulseScore,
                activeTasks: 0,
                criticalTasksOpen: 0,
                timeLoggedHours: hoursLogged,
                projectSwitchCount: 0,
                daysEvaluated: 5,
                previousPeriodTasksCompleted: prevCompleted
            };

            const persona = resolveWorkPersona(metrics);

            // Persist to DB
            await supabase.from('people_vibe_history').insert({
                profile_id: profileId,
                persona_type: persona.type,
                week_start: wsStr,
                week_end: weStr,
                metrics: metrics,
                is_locked: true
            });
        } catch (e) {
            console.error(`Failed to backfill week ${wsStr}:`, e);
        }
    }
}

// Generate mock history if no data exists
function getMockHistory(type: 'weekly' | 'monthly'): VibeHistoryEntry[] {
    const history: VibeHistoryEntry[] = [];
    const count = type === 'weekly' ? 8 : 12;
    const personas: PersonaType[] = ["momentum", "stabilizer", "fighter", "rebuilder", "navigator", "drifter", "stalled", "avoider"];

    const now = new Date();

    const oldestAllowed = new Date("2026-01-01");

    for (let i = 0; i < count; i++) {
        const dStart = new Date(now);
        if (type === 'weekly') {
            dStart.setDate(now.getDate() - (i * 7));
            const day = dStart.getDay();
            const diff = dStart.getDate() - day + (day === 0 ? -6 : 1);
            dStart.setDate(diff);
        } else {
            dStart.setMonth(now.getMonth() - i);
            dStart.setDate(1);
        }

        // Cek jika sudah melebihi batas awal penggunaan aplikasi (Jan 2026)
        if (dStart < oldestAllowed) break;

        const dEnd = new Date(dStart);
        if (type === 'weekly') {
            dEnd.setDate(dStart.getDate() + 6);
        } else {
            dEnd.setMonth(dStart.getMonth() + 1);
            dEnd.setDate(0);
        }

        history.push({
            id: `mock-${i}`,
            persona_type: personas[i % personas.length],
            week_start: dStart.toISOString().split('T')[0],
            week_end: dEnd.toISOString().split('T')[0],
            metrics: {
                tasksCompleted: Math.max(0, 10 - i),
                tasksTotal: 12,
                tasksOverdue: i < 2 ? 0 : i - 1,
                attendanceRate: 100 - (i * 5),
                pulseScore: 90 - (i * 10),
                activeTasks: 5,
                criticalTasksOpen: i > 5 ? 1 : 0,
                timeLoggedHours: 40 - (i * 2),
                projectSwitchCount: 2 + (i % 3),
                daysEvaluated: 5,
                previousPeriodTasksCompleted: 8
            },
            is_locked: i > 0,
            created_at: dStart.toISOString()
        });
    }

    return history;
}

export async function lockVibe(profileId: string, personaType: PersonaType, metrics: WorkMetrics, weekStart: string, weekEnd: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('people_vibe_history')
        .upsert({
            profile_id: profileId,
            persona_type: personaType,
            week_start: weekStart,
            week_end: weekEnd,
            metrics: metrics,
            is_locked: true
        })
        .select()
        .single();

    if (error) {
        process.env.NODE_ENV === 'development' && console.error('Error locking vibe:', error);
        throw error;
    }

    return data as VibeHistoryEntry;
}

export async function updateCurrentVibe(profileId: string, metrics: WorkMetrics) {
    const supabase = createClient();

    // Calculate week bounds (running week)
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const weekStart = new Date(now.setDate(diff)).toISOString().split('T')[0];
    const weekEnd = new Date(now.setDate(diff + 6)).toISOString().split('T')[0];

    const persona = resolveWorkPersona(metrics);

    const { data, error } = await supabase
        .from('people_vibe_history')
        .upsert({
            profile_id: profileId,
            persona_type: persona.type,
            week_start: weekStart,
            week_end: weekEnd,
            metrics: metrics,
            is_locked: false
        })
        .select()
        .single();

    if (error) {
        process.env.NODE_ENV === 'development' && console.error('Error updating current vibe:', error);
        throw error;
    }

    return data as VibeHistoryEntry;
}
