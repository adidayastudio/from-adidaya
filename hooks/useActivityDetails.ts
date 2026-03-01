import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import useUserProfile from '@/hooks/useUserProfile';
import { startOfDay, endOfDay, subDays, format, parseISO, isWithinInterval } from 'date-fns';
import { ActivityRingMode } from './useActivitySummary';
import { getWorkHoursConfig } from '@/lib/work-hours-utils';

export interface HourlyData {
    hour: number;        // 0-23
    value: number;       // For Tasks(count), Presence(1/0 active), Pulse(ratio 0-150)
    hasData?: boolean;   // True if the hour has any logged data specifically
}

export interface ActivityDetailData {
    tasks: {
        assignedToday: number | "-";
        completedToday: number | "-";
        percentage: number | "-";
        hourly: HourlyData[];
        insight: string | null;
    };
    presence: {
        loggedHours: number | "-";
        expectedHours: number | "-";
        percentage: number | "-";
        hourly: HourlyData[];
        insight: string | null;
    };
    pulse: {
        completedToday: number | "-";
        avg7Days: number | "-";
        percentage: number | "-";
        hourly: HourlyData[];
        insight: string | null;
    };
    loading: boolean;
}

const emptyHourly = (): HourlyData[] => Array.from({ length: 24 }, (_, i) => ({ hour: i, value: 0 }));

export function useActivityDetails(mode: ActivityRingMode = "personal", targetDate?: Date): ActivityDetailData {
    const { profile } = useUserProfile();
    const supabase = createClient();

    // Default to today if no date provided
    const dateToFetch = targetDate || new Date();

    const [data, setData] = useState<ActivityDetailData>({
        tasks: { assignedToday: "-", completedToday: "-", percentage: "-", hourly: emptyHourly(), insight: null },
        presence: { loggedHours: "-", expectedHours: "-", percentage: "-", hourly: emptyHourly(), insight: null },
        pulse: { completedToday: "-", avg7Days: "-", percentage: "-", hourly: emptyHourly(), insight: null },
        loading: true
    });

    useEffect(() => {
        if (!profile?.id) return;

        async function fetchDetails() {
            setData(prev => ({ ...prev, loading: true }));

            try {
                const userId = profile!.id;
                const dStr = format(dateToFetch, 'yyyy-MM-dd');
                const dStart = startOfDay(dateToFetch).toISOString();
                const dEnd = endOfDay(dateToFetch).toISOString();

                // For Pulse
                const sevenDaysAgo = subDays(dateToFetch, 7);
                const sevenDaysAgoStart = startOfDay(sevenDaysAgo).toISOString();

                // ----------------------------------------------------
                // 1. TASKS
                // ----------------------------------------------------
                let tAssignedToday = 0;
                let tCompletedToday = 0;
                let tPercentage: number | "-" = "-";
                const tHourly = emptyHourly();
                let tInsight: string | null = null;

                if (mode === "personal") {
                    const [assignedRes, completedRes] = await Promise.all([
                        supabase
                            .from('tasks')
                            .select('id, task_assignees!inner(user_id)', { count: 'exact', head: true })
                            .eq('task_assignees.user_id', userId)
                            .eq('deadline_date', dStr),
                        supabase
                            .from('tasks')
                            .select('id, updated_at, task_assignees!inner(user_id)')
                            .eq('task_assignees.user_id', userId)
                            .eq('status', 'DONE')
                            .gte('updated_at', dStart)
                            .lte('updated_at', dEnd)
                    ]);

                    tAssignedToday = assignedRes.count || 0;
                    const tasksDone = completedRes.data || [];
                    tCompletedToday = tasksDone.length;

                    if (tAssignedToday > 0) tPercentage = Math.round((tCompletedToday / tAssignedToday) * 100);

                    tasksDone.forEach((t: any) => {
                        const h = new Date(t.updated_at).getHours();
                        tHourly[h].value++;
                        tHourly[h].hasData = true;
                    });
                } else {
                    const [assignedRes, completedRes] = await Promise.all([
                        supabase
                            .from('tasks')
                            .select('id', { count: 'exact', head: true })
                            .eq('deadline_date', dStr),
                        supabase
                            .from('tasks')
                            .select('id, updated_at')
                            .eq('status', 'DONE')
                            .gte('updated_at', dStart)
                            .lte('updated_at', dEnd)
                    ]);

                    tAssignedToday = assignedRes.count || 0;
                    const tasksDone = completedRes.data || [];
                    tCompletedToday = tasksDone.length;

                    if (tAssignedToday > 0) tPercentage = Math.round((tCompletedToday / tAssignedToday) * 100);

                    tasksDone.forEach((t: any) => {
                        const h = new Date(t.updated_at).getHours();
                        tHourly[h].value++;
                        tHourly[h].hasData = true;
                    });
                }

                // Tasks Insight
                if (tCompletedToday > 0) {
                    let peakHour = 0;
                    let peakVal = 0;
                    tHourly.forEach(h => {
                        if (h.value > peakVal) {
                            peakVal = h.value;
                            peakHour = h.hour;
                        }
                    });
                    const peakHourStr = peakHour.toString().padStart(2, '0');
                    tInsight = `Peak productivity at ${peakHourStr}:00–${peakHourStr}:59`;
                } else {
                    tInsight = "No tasks completed today";
                }

                // ----------------------------------------------------
                // 2. PRESENCE
                // ----------------------------------------------------
                const workConfig = getWorkHoursConfig(dateToFetch);
                const EXPECTED = workConfig.workHours;
                let pLogged: number | "-" = "-";
                let pExpected: number | "-" = "-";
                let pPercentage: number | "-" = "-";
                const pHourly = emptyHourly();
                let pInsight: string | null = null;

                if (mode === "personal") {
                    const [sessionsRes] = await Promise.all([
                        supabase.from('attendance_sessions').select('clock_in, clock_out').eq('user_id', userId).eq('date', dStr)
                    ]);

                    const sessions = sessionsRes.data || [];
                    let totalMins = 0;
                    const isToday = dStr === format(new Date(), 'yyyy-MM-dd');

                    sessions.forEach((s: any) => {
                        const inDate = new Date(s.clock_in);
                        let outDate = s.clock_out ? new Date(s.clock_out) : (isToday ? new Date() : endOfDay(dateToFetch));

                        if (outDate > endOfDay(dateToFetch)) {
                            outDate = endOfDay(dateToFetch);
                        }

                        const durationMs = outDate.getTime() - inDate.getTime();
                        if (durationMs > 0) {
                            totalMins += durationMs / (1000 * 60);
                        }

                        // Fill hourly chart
                        const startHr = inDate.getHours();
                        const endHr = outDate.getHours();
                        for (let h = startHr; h <= endHr; h++) {
                            pHourly[h].value = 100;
                            pHourly[h].hasData = true;
                        }
                    });

                    pLogged = totalMins / 60;
                    pExpected = EXPECTED;
                    pPercentage = EXPECTED > 0 ? Math.round((pLogged / pExpected) * 100) : 0;
                } else {
                    const [sessionsRes] = await Promise.all([
                        supabase.from('attendance_sessions').select('clock_in, clock_out, user_id').eq('date', dStr)
                    ]);

                    const sessions = sessionsRes.data || [];
                    if (sessions.length > 0) {
                        const activeUsersByHour: Record<number, Set<string>> = {};
                        const uniqueUsers = new Set<string>();
                        let totalDurationMins = 0;

                        sessions.forEach((s: any) => {
                            uniqueUsers.add(s.user_id);
                            const inDate = new Date(s.clock_in);
                            const isToday = dStr === format(new Date(), 'yyyy-MM-dd');
                            let outDate = s.clock_out ? new Date(s.clock_out) : (isToday ? new Date() : endOfDay(dateToFetch));

                            if (outDate > endOfDay(dateToFetch)) outDate = endOfDay(dateToFetch);

                            const durationMs = outDate.getTime() - inDate.getTime();
                            if (durationMs > 0) totalDurationMins += durationMs / (1000 * 60);

                            const startHr = inDate.getHours();
                            const endHr = outDate.getHours();
                            for (let h = startHr; h <= endHr; h++) {
                                if (!activeUsersByHour[h]) activeUsersByHour[h] = new Set();
                                activeUsersByHour[h].add(s.user_id);
                            }
                        });

                        const userCount = uniqueUsers.size;
                        pLogged = totalDurationMins / 60;
                        pExpected = userCount * EXPECTED;
                        pPercentage = pExpected > 0 ? Math.round((pLogged / pExpected) * 100) : 0;

                        // Fill team hourly chart
                        for (let h = 0; h < 24; h++) {
                            const activeInHour = activeUsersByHour[h]?.size || 0;
                            if (activeInHour > 0) {
                                pHourly[h].value = userCount > 0 ? (activeInHour / userCount) * 100 : 0;
                                pHourly[h].hasData = true;
                            }
                        }
                    }
                }

                // Presence Insight
                if (pLogged === "-") {
                    pInsight = "No activity recorded";
                } else {
                    const loggedH = Number(pLogged);
                    const expectedH = Number(pExpected);
                    if (loggedH > expectedH) pInsight = "Extra hours logged";
                    else if (loggedH >= expectedH) pInsight = "Full day completed";
                    else pInsight = "Day in progress";
                }

                // ----------------------------------------------------
                // 3. PULSE
                // ----------------------------------------------------
                let puPercentage: number | "-" = "-";
                let puAvg7: number | "-" = "-";
                const puHourly = emptyHourly();
                let puInsight: string | null = null;

                let recentTasks: any[] | null = null;
                if (mode === "personal") {
                    const { data } = await supabase
                        .from('tasks')
                        .select('id, updated_at, task_assignees!inner(user_id)')
                        .eq('task_assignees.user_id', userId)
                        .eq('status', 'DONE')
                        .gte('updated_at', sevenDaysAgoStart)
                        .lte('updated_at', dEnd);
                    recentTasks = data;
                } else {
                    const { data } = await supabase
                        .from('tasks')
                        .select('id, updated_at')
                        .eq('status', 'DONE')
                        .gte('updated_at', sevenDaysAgoStart)
                        .lte('updated_at', dEnd);
                    recentTasks = data;
                }

                if (recentTasks) {
                    const completedByDate: Record<string, number> = {};
                    const completedTodayHr = new Array(24).fill(0);
                    const completedPast7Hr = new Array(24).fill(0);

                    recentTasks.forEach((t: any) => {
                        const dRaw = new Date(t.updated_at);
                        const dStrT = format(dRaw, 'yyyy-MM-dd');
                        const h = dRaw.getHours();

                        if (dStrT === dStr) {
                            completedTodayHr[h]++;
                        } else {
                            if (!completedByDate[dStrT]) completedByDate[dStrT] = 0;
                            completedByDate[dStrT]++;
                            completedPast7Hr[h]++;
                        }
                    });

                    let totalIn7Days = 0;
                    for (let i = 1; i <= 7; i++) {
                        const dPastStr = format(subDays(dateToFetch, i), 'yyyy-MM-dd');
                        if (completedByDate[dPastStr]) totalIn7Days += completedByDate[dPastStr];
                    }

                    const avg7Days = totalIn7Days / 7;
                    if (avg7Days > 0) {
                        puAvg7 = Number(avg7Days.toFixed(1));
                        puPercentage = Math.round((tCompletedToday / avg7Days) * 100);
                        if (puPercentage > 150) puPercentage = 150;
                    } else if (tCompletedToday > 0) {
                        puPercentage = 100;
                    }

                    // Chart 00-24 ratio
                    for (let h = 0; h < 24; h++) {
                        const todayHrCount = completedTodayHr[h];
                        const avgHrCount = completedPast7Hr[h] / 7; // avg for this specific hour over 7 days

                        let ratio = 0;
                        if (avgHrCount > 0) {
                            ratio = Math.round((todayHrCount / avgHrCount) * 100);
                            if (ratio > 150) ratio = 150;
                        } else if (todayHrCount > 0) {
                            ratio = 100; // If did something but no history
                        }

                        if (todayHrCount > 0 || avgHrCount > 0) {
                            puHourly[h].value = ratio;
                            puHourly[h].hasData = true;
                        }
                    }
                }

                if (puPercentage !== "-") {
                    if (puPercentage > 110) puInsight = "Strong momentum today";
                    else if (puPercentage >= 90) puInsight = "On your usual rhythm";
                    else puInsight = "Below your usual pace";
                }

                setData({
                    tasks: { assignedToday: tAssignedToday, completedToday: tCompletedToday, percentage: tPercentage, hourly: tHourly, insight: tInsight },
                    presence: { loggedHours: pLogged, expectedHours: pExpected, percentage: pPercentage, hourly: pHourly, insight: pInsight },
                    pulse: { completedToday: tCompletedToday, avg7Days: puAvg7, percentage: puPercentage, hourly: puHourly, insight: puInsight },
                    loading: false
                });

            } catch (error) {
                console.error("Error fetching activity detail data:", error);
                setData(prev => ({ ...prev, loading: false }));
            }
        }

        fetchDetails();
    }, [profile?.id, mode, dateToFetch]);

    return data;
}
