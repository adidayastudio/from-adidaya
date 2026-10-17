import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import type { Tenant } from '@/context/TenantContext';
import type { SupabaseClient } from '@supabase/supabase-js';

export const ORGANIZATION_ROLES = ['Member', 'Super Admin', 'Admin', 'Viewer', 'System'] as const;
export function organizationRoleOptions(current?: string | null): string[] {
    const key = resolveOrganizationRole(null, current);
    const match = ORGANIZATION_ROLES.find(role => resolveOrganizationRole(null, role) === key);
    return match || !current ? [...ORGANIZATION_ROLES] : [...ORGANIZATION_ROLES, current];
}

export function resolveOrganizationRole(membership: { role?: string; status?: string } | null, profileRole?: string | null): string {
    const role = membership
        ? (!membership.status || membership.status.toLowerCase() === 'active' ? membership.role : 'member')
        : profileRole;
    return (role || 'member').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function canEditOrganization(role?: string | null): boolean {
    return ['superadmin', 'admin', 'administrator', 'owner', 'ceo'].includes((role || '').trim().toLowerCase().replace(/[\s_-]+/g, ''));
}

export function organizationRoleLabel(role?: string | null): string {
    const key = (role || 'member').trim().toLowerCase().replace(/[\s_-]+/g, '');
    const labels: Record<string, string> = { superadmin: 'SUPER ADMIN', admin: 'ADMIN', administrator: 'ADMIN', supervisor: 'SUPERVISOR', manager: 'MANAGER', staff: 'MEMBER', member: 'MEMBER', owner: 'OWNER', ceo: 'CEO', finance: 'FINANCE', viewer: 'VIEWER', system: 'SYSTEM' };
    return labels[key] || (role || 'MEMBER').toUpperCase();
}

export function organizationUpdate(payload: Partial<Tenant>, current: Tenant): Record<string, unknown> {
    if (payload.company_code !== undefined && payload.company_code !== current.company_code) {
        throw new Error('The Adidaya organization code is fixed.');
    }
    const allowed = ['name', 'branding_name', 'branding_logo_url', 'primary_color', 'address', 'gmaps_url', 'contact_email', 'contact_phone', 'latitude', 'longitude', 'attendance_radius'];
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        if (allowed.includes(key) && value !== undefined) update[key] = typeof value === 'string' ? value.trim() : value;
    }
    if (payload.logo_url !== undefined && payload.branding_logo_url === undefined) update.branding_logo_url = payload.logo_url;
    for (const key of ['name', 'branding_name']) {
        if (key in update && !update[key]) throw new Error('Company name is required.');
    }
    if ('primary_color' in update && !/^#[0-9a-f]{6}$/i.test(String(update.primary_color))) throw new Error('Enter a valid six-digit color.');
    if (update.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(update.contact_email))) throw new Error('Enter a valid email address.');
    for (const [key, limit] of [['latitude', 90], ['longitude', 180]] as const) {
        if (key in update && update[key] !== null && (!Number.isFinite(update[key]) || Math.abs(Number(update[key])) > limit)) throw new Error('Enter valid location coordinates.');
    }
    if ('attendance_radius' in update && (!Number.isFinite(update.attendance_radius) || Number(update.attendance_radius) <= 0)) throw new Error('Attendance radius must be greater than zero.');
    if (!Object.keys(update).length) throw new Error('No supported organization changes to save.');
    return update;
}

async function uploadLogo(client: SupabaseClient, uri: string, tenantId: string, userId: string): Promise<string> {
    if (/^https?:\/\//i.test(uri)) return uri;
    let body: ArrayBuffer;
    let mime = 'image/jpeg';
    if (Platform.OS !== 'web' && !uri.startsWith('data:')) {
        const data = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        body = decode(data);
        if (/\.png(?:\?|$)/i.test(uri)) mime = 'image/png';
    } else {
        const response = await fetch(uri);
        if (!response.ok) throw new Error('The selected logo could not be read. Please choose it again.');
        mime = response.headers.get('content-type')?.split(';')[0] || mime;
        body = await response.arrayBuffer();
    }
    if (!body.byteLength || body.byteLength > 5 * 1024 * 1024) throw new Error('Choose a logo smaller than 5 MB.');
    const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
    const ext = extensions[mime];
    if (!ext) throw new Error('Choose an image for the organization logo.');
    const bucket = client.storage.from('avatars');
    const path = `organization/${tenantId}/${userId}/${Date.now()}.${ext}`;
    const { error } = await bucket.upload(path, body, { contentType: mime, upsert: false });
    if (error) throw error;
    const url = bucket.getPublicUrl(path).data.publicUrl;
    if (!url) throw new Error('The uploaded logo URL is unavailable.');
    return url;
}

export async function saveOrganization(client: SupabaseClient, current: Tenant, id: string, role: string | undefined, payload: Partial<Tenant>): Promise<Tenant> {
    if (current.id !== id || !canEditOrganization(role)) throw new Error('You do not have access to update this organization.');
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new Error('Sign in again before saving organization settings.');
    const update = organizationUpdate(payload, current);
    if (typeof update.branding_logo_url === 'string' && update.branding_logo_url) update.branding_logo_url = await uploadLogo(client, update.branding_logo_url, id, user.id);
    const { data, error } = await client.from('tenants').update(update).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('The organization was not updated. Check your access and try again.');
    return data as Tenant;
}

export async function saveOrganizationMember(client: SupabaseClient, tenantId: string, userId: string, role: string, status: string) {
    if (!tenantId || !userId) throw new Error('Select an Adidaya member first.');
    const normalizedRole = resolveOrganizationRole(null, role);
    const normalizedStatus = status.trim().toLowerCase();
    if (!['active', 'inactive', 'archived'].includes(normalizedStatus)) throw new Error('Invalid member status.');
    const { data, error } = await client.rpc('adidaya_save_organization_member', {target_user_id:userId,new_role:normalizedRole,new_status:normalizedStatus});
    if (error) throw new Error(error.code === 'PGRST202' ? 'Adidaya organization role setup must be applied in the database before saving.' : error.message);
    const saved=Array.isArray(data)?data[0]:data;
    if (!saved || saved.role !== normalizedRole || saved.status !== normalizedStatus) throw new Error('Adidaya did not confirm the role and status.');
    return saved;
}
