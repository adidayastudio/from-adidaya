import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import useUserProfile from '@/hooks/useUserProfile';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { getWorkHoursConfig } from '@/lib/work-hours-utils';
import { ActivityRingMode } from './useActivitySummary';

export interface DayRingSummary {
    date: string; // yyyy-MM-dd
    tasks: number | "-";
    presence: number | "-";
    pulse: number | "-";
}

/**
 * Lightweight hook that fetches ring summary percentages for a range of dates.
 * Used to populate the mini calendar rings in the Activity Detail page.
 */
export function useWeekRingSummary(
    mode: ActivityRingMode,
    dates: Date[]
): { data: Record<string, DayRingSummary>; loading: boolean } {
    const { profile } = useUserProfile();
    const supabase = createClient();

    const [result, setResult] = useState<{ data: Record<string, DayRingSummary>; loading: boolean }>({
        data: {},
        loading: true,
    });

    // Build a stable key from dates to avoid infinite re-renders
    const dateKeys = dates.map(d => format(d, 'yyyy-MM-dd')).join(',');

    useEffect(() => {
        if (!profile?.id || dates.length === 0) return;

        async function fetchSummaries() {
            try {
                const userId = profile!.id;
                const dateStrs = dates.map(d => format(d, 'yyyy-MM-dd'));
                const minDate = dateStrs[0];
                const maxDate = dateStrs[dateStrs.length - 1];
                const minStart = startOfDay(dates[0]).toISOString();
                const maxEnd = endOfDay(dates[dates.length - 1]).toISOString();

                // Fetch all tasks and sessions for dates in range
                const [assignedRes, completedRes, sessionsRes] = await Promise.all([
                    mode === "personal"
                        ? supabase
                            .from('tasks')
                            .select('id, deadline_date, task_assignees!inner(user_id)')
                            .eq('task_assignees.user_id', userId)
                            .gte('deadline_date', minDate)
                            .lte('deadline_date', maxDate)
                        : supabase
                            .from('tasks')
                            .select('id, deadline_date')
                            .gte('deadline_date', minDate)
                            .lte('deadline_date', maxDate),
                    mode === "personal"
                        ? supabase
                            .from('tasks')
                            .select('id, updated_at, task_assignees!inner(user_id)')
                            .eq('task_assignees.user_id', userId)
                            .eq('status', 'DONE')
                            .gte('updated_at', minStart)
                            .lte('updated_at', maxEnd)
                        : supabase
                            .from('tasks')
                            .select('id, updated_at')
                            .eq('status', 'DONE')
                            .gte('updated_at', minStart)
                            .lte('updated_at', maxEnd),
                    mode === "personal"
                        ? supabase
                            .from('attendance_sessions')
                            .select('date, clock_in, clock_out')
                            .eq('user_id', userId)
                            .gte('date', minDate)
                            .lte('date', maxDate)
                        : supabase
                            .from('attendance_sessions')
                            .select('date, clock_in, clock_out, user_id')
                            .gte('date', minDate)
                            .lte('date', maxDate),
                ]);

                // Group assigned tasks by deadline_date
                const assignedByDate: Record<string, number> = {};
                (assignedRes.data || []).forEach((t: any) => {
                    const dStr = t.deadline_date;
                    assignedByDate[dStr] = (assignedByDate[dStr] || 0) + 1;
                });

                // Group completed tasks by updated_at date
                const completedByDate: Record<string, number> = {};
                (completedRes.data || []).forEach((t: any) => {
                    const dStr = format(new Date(t.updated_at), 'yyyy-MM-dd');
                    completedByDate[dStr] = (completedByDate[dStr] || 0) + 1;
                });

                // Group attendance by date and user
                const attendanceByDate: Record<string, number> = {};
                const usersByDate: Record<string, Set<string>> = {};

                (sessionsRes.data || []).forEach((s: any) => {
                    const dStr = s.date;
                    const inDate = new Date(s.clock_in);
                    const isToday = dStr === format(new Date(), 'yyyy-MM-dd');
                    let outDate = s.clock_out ? new Date(s.clock_out) : (isToday ? new Date() : endOfDay(new Date(dStr)));

                    if (outDate > endOfDay(new Date(dStr))) outDate = endOfDay(new Date(dStr));

                    const durationMs = outDate.getTime() - inDate.getTime();
                    if (durationMs > 0) {
                        const mins = durationMs / (1000 * 60);
                        attendanceByDate[dStr] = (attendanceByDate[dStr] || 0) + (mins / 60);
                    }

                    if (mode === "team") {
                        if (!usersByDate[dStr]) usersByDate[dStr] = new Set();
                        usersByDate[dStr].add(s.user_id);
                    }
                });

                // Build per-day summaries
                const summaries: Record<string, DayRingSummary> = {};

                for (const dStr of dateStrs) {
                    const assigned = assignedByDate[dStr] || 0;
                    const completed = completedByDate[dStr] || 0;
                    const loggedHours = attendanceByDate[dStr] || 0;
                    const workConfig = getWorkHoursConfig(dStr);

                    let expectedHours = workConfig.workHours;
                    if (mode === "team") {
                        const userCount = usersByDate[dStr]?.size || 0;
                        expectedHours = userCount * workConfig.workHours;
                    }

                    const taskPct: number | "-" = assigned > 0 ? Math.round((completed / assigned) * 100) : "-";
                    const presencePct: number | "-" = loggedHours > 0 && expectedHours > 0 ? Math.round((loggedHours / expectedHours) * 100) : "-";

                    summaries[dStr] = {
                        date: dStr,
                        tasks: taskPct,
                        presence: presencePct,
                        pulse: "-",
                    };
                }

                setResult({ data: summaries, loading: false });
            } catch (err) {
                console.error('Error fetching week ring summaries:', err);
                setResult({ data: {}, loading: false });
            }
        }

        fetchSummaries();
    }, [profile?.id, mode, dateKeys]);

    return result;
}
