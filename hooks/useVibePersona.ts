"use client";

import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, format, subWeeks } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import useUserProfile from "./useUserProfile";
import { PERSONAS, Persona, resolveWorkPersona, WorkMetrics } from "@/lib/workPersonaLogic";

const DEFAULT_METRICS: WorkMetrics = {
    tasksCompleted: 0,
    tasksTotal: 0,
    tasksOverdue: 0,
    attendanceRate: 0,
    pulseScore: 0,
    activeTasks: 0,
    criticalTasksOpen: 0,
    timeLoggedHours: 0,
    projectSwitchCount: 0,
    daysEvaluated: 0,
    previousPeriodTasksCompleted: 0,
};

export function useVibePersona() {
    const { profile } = useUserProfile();
    const supabase = createClient();

    const [metrics, setMetrics] = useState<WorkMetrics>(DEFAULT_METRICS);
    const [persona, setPersona] = useState<Persona>(PERSONAS.navigator);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;

        const fetchMetrics = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const weekStart = startOfWeek(now, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
                const weekStartStr = format(weekStart, 'yyyy-MM-dd');
                const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

                const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
                const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

                const [tasksRes, completedRes, prevCompletedRes, attendanceRes] = await Promise.all([
                    // Total tasks due this week
                    supabase.from('tasks').select('id', { count: 'exact', head: true })
                        .eq('task_assignees.user_id', profile.id)
                        .gte('deadline_date', weekStartStr)
                        .lte('deadline_date', weekEndStr),
                    // Tasks completed this week
                    supabase.from('tasks').select('id', { count: 'exact', head: true })
                        .eq('task_assignees.user_id', profile.id)
                        .eq('status', 'DONE')
                        .gte('updated_at', weekStart.toISOString())
                        .lte('updated_at', weekEnd.toISOString()),
                    // Tasks completed last week (for Pulse)
                    supabase.from('tasks').select('id', { count: 'exact', head: true })
                        .eq('task_assignees.user_id', profile.id)
                        .eq('status', 'DONE')
                        .gte('updated_at', prevWeekStart.toISOString())
                        .lte('updated_at', prevWeekEnd.toISOString()),
                    // Attendance this week
                    supabase.from('attendance_sessions').select('clock_in, clock_out')
                        .eq('user_id', profile.id)
                        .gte('date', weekStartStr)
                        .lte('date', weekEndStr)
                ]);

                const tasksTotal = tasksRes.count || 0;
                const tasksCompleted = completedRes.count || 0;
                const prevCompleted = prevCompletedRes.count || 0;

                // Calculate Attendance Rate (Assume 40h/week target)
                let totalMins = 0;
                (attendanceRes.data || []).forEach(s => {
                    const cin = new Date(s.clock_in);
                    const cout = s.clock_out ? new Date(s.clock_out) : new Date();
                    totalMins += Math.max(0, (cout.getTime() - cin.getTime()) / 60000);
                });
                const hoursLogged = totalMins / 60;
                const attendanceRate = Math.min(100, Math.round((hoursLogged / 40) * 100));

                // Calculate Pulse (Trend vs prev week)
                let pulseScore = 0;
                if (prevCompleted > 0) {
                    pulseScore = Math.min(100, Math.round((tasksCompleted / prevCompleted) * 100));
                } else if (tasksCompleted > 0) {
                    pulseScore = 100;
                }

                const liveMetrics: WorkMetrics = {
                    ...DEFAULT_METRICS,
                    tasksCompleted,
                    tasksTotal,
                    attendanceRate,
                    pulseScore,
                    timeLoggedHours: hoursLogged,
                    daysEvaluated: now.getDay() || 7,
                    previousPeriodTasksCompleted: prevCompleted
                };

                setMetrics(liveMetrics);
                setPersona(resolveWorkPersona(liveMetrics));
            } catch (err) {
                console.error("Error in useVibePersona:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [profile?.id]);

    return { metrics, persona, loading };
}
