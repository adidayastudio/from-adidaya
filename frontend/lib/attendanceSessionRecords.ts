// Reconcile saved clock sessions with daily summaries without writing synthetic rows to the database.
export function reconcileAttendanceSessions(records: any[], sessions: any[]) {
    const byDay = new Map(records.map(record => [`${record.user_id}:${record.date}`, { ...record }]));
    const grouped = new Map<string, any[]>();
    for (const session of sessions) {
        if (!session.user_id || !session.date || !session.clock_in) continue;
        const key = `${session.user_id}:${session.date}`;
        const group = grouped.get(key) || [];
        group.push(session);
        grouped.set(key, group);
    }
    for (const [key, group] of grouped) {
        group.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());
        const first = group[0];
        const last = group[group.length - 1];
        const existing = byDay.get(key);
        const hasAttendanceStatus = ['ontime', 'intime', 'late', 'present'].includes(existing?.status);
        const minutes = (session: any) => session.clock_out
            ? Math.max(0, session.duration_minutes ?? Math.floor((new Date(session.clock_out).getTime() - new Date(session.clock_in).getTime()) / 60000))
            : 0;
        const summaryComplete = existing?.clock_in && existing?.clock_out && last.clock_out;
        byDay.set(key, {
            ...existing,
            id: existing?.id || `session-record-${first.id}`,
            summary_pending: !existing?.id,
            user_id: first.user_id,
            date: first.date,
            profiles: existing?.profiles || first.profiles,
            clock_in: existing?.clock_in || first.clock_in,
            clock_out: last.clock_out ? (existing?.clock_out || last.clock_out) : null,
            status: hasAttendanceStatus ? existing.status : 'present',
            notes: hasAttendanceStatus ? existing?.notes : undefined,
            check_in_notes: hasAttendanceStatus ? existing?.check_in_notes : undefined,
            total_minutes: (summaryComplete ? existing?.total_minutes : undefined) ?? group.filter(s => !s.is_overtime).reduce((sum, s) => sum + minutes(s), 0),
            overtime_minutes: (summaryComplete ? existing?.overtime_minutes : undefined) ?? group.filter(s => s.is_overtime).reduce((sum, s) => sum + minutes(s), 0),
            check_in_latitude: existing?.check_in_latitude ?? first.latitude,
            check_in_longitude: existing?.check_in_longitude ?? first.longitude,
            check_in_location_code: existing?.check_in_location_code || first.location_code,
            check_in_location_type: existing?.check_in_location_type || first.location_type,
            check_in_remote_mode: existing?.check_in_remote_mode || first.remote_mode,
            check_in_location_status: existing?.check_in_location_status || first.location_status,
            check_in_photo_url: existing?.check_in_photo_url || first.photo_url,
        });
    }
    return [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));
}
