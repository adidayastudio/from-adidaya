/** Match spelling variants without treating other management roles as Superadmin. */
export function isFinanceSuperadmin(role?: string | null): boolean {
    return (role || '').trim().toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin';
}
