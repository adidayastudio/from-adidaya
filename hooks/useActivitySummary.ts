import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import useUserProfile from '@/hooks/useUserProfile';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { getWorkHoursConfig } from '@/lib/work-hours-utils';

export type ActivityRingMode = "personal" | "team";

export interface ActivityRingData {
    tasksPercentage: number | "-";
    presencePercentage: number | "-";
    pulsePercentage: number | "-";
    insight: string | null;
    loading: boolean;
}

export function useActivitySummary(mode: ActivityRingMode = "personal"): ActivityRingData {
    const { profile } = useUserProfile();
    const supabase = createClient();

    const [data, setData] = useState<ActivityRingData>({
        tasksPercentage: "-",
        presencePercentage: "-",
        pulsePercentage: "-",
        insight: null,
        loading: true
    });

    useEffect(() => {
        if (!profile?.id) return;

        async function fetchActivityData() {
            try {
                const userId = profile!.id;
                const today = new Date();
                const todayStr = format(today, 'yyyy-MM-dd');
                const todayStart = startOfDay(today).toISOString();
                const todayEnd = endOfDay(today).toISOString();

                // For Pulse
                const sevenDaysAgo = subDays(today, 7);
                const sevenDaysAgoStart = startOfDay(sevenDaysAgo).toISOString();
                const yesterday = subDays(today, 1);
                const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

                let tasksPercentage: number | "-" = "-";
                let presencePercentage: number | "-" = "-";
                let pulsePercentage: number | "-" = "-";
                let insight: string | null = null;

                // ==========================================
                // TASKS
                // ==========================================
                if (mode === "personal") {
                    const [assignedTodayRes, completedTodayRes] = await Promise.all([
                        supabase
                            .from('tasks')
                            .select('id, task_assignees!inner(user_id)', { count: 'exact', head: true })
                            .eq('task_assignees.user_id', userId)
                            .eq('deadline_date', todayStr),
                        supabase
                            .from('tasks')
                            .select('id, task_assignees!inner(user_id)', { count: 'exact', head: true })
                            .eq('task_assignees.user_id', userId)
                            .eq('status', 'DONE')
                            .gte('updated_at', todayStart)
                            .lte('updated_at', todayEnd)
                    ]);

                    const assignedToday = assignedTodayRes.count || 0;
                    const completedToday = completedTodayRes.count || 0;

                    if (assignedToday > 0) {
                        tasksPercentage = Math.round((completedToday / assignedToday) * 100);
                    }
                } else {
                    const [assignedTodayRes, completedTodayRes] = await Promise.all([
                        supabase
                            .from('tasks')
                            .select('id', { count: 'exact', head: true })
                            .eq('deadline_date', todayStr),
                        supabase
                            .from('tasks')
                            .select('id', { count: 'exact', head: true })
                            .eq('status', 'DONE')
                            .gte('updated_at', todayStart)
                            .lte('updated_at', todayEnd)
                    ]);

                    const assignedToday = assignedTodayRes.count || 0;
                    const completedToday = completedTodayRes.count || 0;

                    if (assignedToday > 0) {
                        tasksPercentage = Math.round((completedToday / assignedToday) * 100);
                    }
                }

                // ==========================================
                // PRESENCE
                // ==========================================
                const EXPECTED_HOURS_PER_DAY = getWorkHoursConfig(today).workHours;

                if (mode === "personal") {
                    const { data: sessions } = await supabase
                        .from('attendance_sessions')
                        .select('clock_in, clock_out')
                        .eq('user_id', userId)
                        .eq('date', todayStr);

                    if (sessions && sessions.length > 0) {
                        let totalMins = 0;
                        sessions.forEach((s: any) => {
                            const inDate = new Date(s.clock_in);
                            let outDate = s.clock_out ? new Date(s.clock_out) : new Date();

                            const durationMs = outDate.getTime() - inDate.getTime();
                            if (durationMs > 0) totalMins += durationMs / (1000 * 60);
                        });
                        const loggedHours = totalMins / 60;
                        presencePercentage = EXPECTED_HOURS_PER_DAY > 0 ? Math.round((loggedHours / EXPECTED_HOURS_PER_DAY) * 100) : 0;
                    }
                } else {
                    const { data: teamSessions } = await supabase
                        .from('attendance_sessions')
                        .select('clock_in, clock_out, user_id')
                        .eq('date', todayStr);

                    if (teamSessions && teamSessions.length > 0) {
                        const uniqueUsers = new Set<string>();
                        let totalMins = 0;
                        teamSessions.forEach((s: any) => {
                            uniqueUsers.add(s.user_id);
                            const inDate = new Date(s.clock_in);
                            let outDate = s.clock_out ? new Date(s.clock_out) : new Date();

                            const durationMs = outDate.getTime() - inDate.getTime();
                            if (durationMs > 0) totalMins += durationMs / (1000 * 60);
                        });

                        const userCount = uniqueUsers.size;
                        const loggedHours = totalMins / 60;
                        const expectedTotal = userCount * EXPECTED_HOURS_PER_DAY;

                        if (expectedTotal > 0) {
                            presencePercentage = Math.round((loggedHours / expectedTotal) * 100);
                        }
                    }
                }

                // ==========================================
                // PULSE & INSIGHT
                // ==========================================
                let recentTasks: any[] | null = null;

                if (mode === "personal") {
                    const { data } = await supabase
                        .from('tasks')
                        .select('id, updated_at, task_assignees!inner(user_id)')
                        .eq('task_assignees.user_id', userId)
                        .eq('status', 'DONE')
                        .gte('updated_at', sevenDaysAgoStart)
                        .lte('updated_at', todayEnd);
                    recentTasks = data;
                } else {
                    const { data } = await supabase
                        .from('tasks')
                        .select('id, updated_at')
                        .eq('status', 'DONE')
                        .gte('updated_at', sevenDaysAgoStart)
                        .lte('updated_at', todayEnd);
                    recentTasks = data;
                }

                if (recentTasks) {
                    const completedByDate: Record<string, number> = {};
                    let completedToday = 0;
                    let completedYesterday = 0;

                    recentTasks.forEach(task => {
                        const taskDate = format(new Date(task.updated_at), 'yyyy-MM-dd');
                        if (!completedByDate[taskDate]) completedByDate[taskDate] = 0;
                        completedByDate[taskDate]++;

                        if (taskDate === todayStr) completedToday++;
                        if (taskDate === yesterdayStr) completedYesterday++;
                    });

                    let totalIn7Days = 0;
                    let daysWithData = 0;
                    for (let i = 1; i <= 7; i++) {
                        const dStr = format(subDays(today, i), 'yyyy-MM-dd');
                        if (completedByDate[dStr] !== undefined) {
                            totalIn7Days += completedByDate[dStr];
                            daysWithData++;
                        }
                    }

                    const avg7Days = totalIn7Days / 7;

                    if (avg7Days > 0) {
                        pulsePercentage = Math.round((completedToday / avg7Days) * 100);
                        if (pulsePercentage > 150) pulsePercentage = 150;
                    } else if (completedYesterday > 0) {
                        pulsePercentage = Math.round((completedToday / completedYesterday) * 100);
                        if (pulsePercentage > 150) pulsePercentage = 150;
                    } else {
                        pulsePercentage = "-";
                    }
                }

                // INSIGHT (BASED ON PULSE ONLY)
                if (pulsePercentage !== "-") {
                    if (pulsePercentage > 110) {
                        insight = "You are moving faster than usual";
                    } else if (pulsePercentage >= 90 && pulsePercentage <= 110) {
                        insight = "Steady pace today";
                    } else if (pulsePercentage < 90) {
                        insight = "Lighter than usual today";
                    }
                } else {
                    insight = null;
                }

                setData({
                    tasksPercentage,
                    presencePercentage,
                    pulsePercentage,
                    insight,
                    loading: false
                });

            } catch (error) {
                console.error("Error fetching activity summary data:", error);
                setData(prev => ({ ...prev, loading: false }));
            }
        }

        fetchActivityData();
    }, [profile?.id, mode]);

    return data;
}
