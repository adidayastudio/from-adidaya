export function getFinanceStatusColor(status?: string | null, isDark = false): string {
    const value = String(status || '').trim().toLowerCase().replace(/_/g, ' ');
    if (value === 'draft' || value === 'cancelled' || value === 'canceled' || value === 'void' || value === 'waiting' || value === 'not submitted') return '#8E8E93';
    if (value === 'submitted') return isDark ? '#FFFFFF' : '#1C1C1E';
    if (value === 'pending' || value === 'pending review' || value === 'unpaid' || value === 'outstanding' || value === 'processing' || value === 'in review' || value === 'awaiting approval' || value.includes('revision') || value === 'revised') return '#FF9500';
    if (value === 'approved' || value === 'consolidated') return '#007AFF';
    if (value === 'partially paid' || value === 'partial payment' || value === 'paying') return '#5856D6';
    if (value === 'paid' || value === 'completed') return '#34C759';
    if (value === 'rejected' || value === 'failed' || value === 'overdue') return '#FF3B30';
    return '#8E8E93';
}

export function getFinanceStatusBackground(status?: string | null, isDark = false): string {
    const color = getFinanceStatusColor(status, isDark);
    if (color === '#1C1C1E' || color === '#FFFFFF') return isDark ? 'rgba(255,255,255,0.16)' : 'rgba(28,28,30,0.10)';
    const opacity = isDark ? '42' : '18';
    return `${color}${opacity}`;
}
