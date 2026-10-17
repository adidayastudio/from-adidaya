import { supabase } from '@/lib/supabase';
import { canAccessFinanceTeam } from '@/lib/auth-utils';
// Read the same authoritative role code as Adidaya, never a local approval matrix or user metadata.
export async function assertFinanceMutation(type: 'purchasing' | 'reimbursement', id: string, updates?: Record<string, any>, deleting = false) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Sign in to update finance requests.');
    const { data: role, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (roleError) throw roleError;
    if (canAccessFinanceTeam(role?.role)) return;
    const ownerColumn = type === 'purchasing' ? 'created_by' : 'user_id';
    const statusColumn = type === 'purchasing' ? 'approval_status' : 'status';
    const { data: request, error } = await supabase.from(type === 'purchasing' ? 'purchasing_requests' : 'reimbursement_requests').select(`${ownerColumn},${statusColumn}`).eq('id', id).single();
    if (error || !request || (request as any)[ownerColumn] !== user.id) throw new Error('You cannot change another user’s finance request.');
    const status = String((request as any)[statusColumn]).toUpperCase();
    if (!['DRAFT', 'NEED_REVISION', 'REJECTED'].includes(status)) throw new Error('This submitted request requires Finance or an authorized manager.');
    if (deleting) return;
    const allowed = type === 'purchasing' ? ['approval_status'] : ['status'];
    if (!updates || Object.keys(updates).some(key => !allowed.includes(key))) throw new Error('This finance action requires an authorized role.');
    const target = String(updates[statusColumn] || '').toUpperCase();
    if (!['DRAFT', 'SUBMITTED', 'PENDING'].includes(target)) throw new Error('Approval and payment require an authorized finance role.');
}
