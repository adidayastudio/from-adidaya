import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { sendLocalNotification } from './notificationService';
import { addLocalNotification } from './api/notifications';
import { supabase, supabaseForma, supabaseAdidaya } from './supabase';

export async function uploadAnnouncementFile(
    fileUri: string,
    fileName?: string
): Promise<string | null> {
    if (!fileUri) return null;
    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
        return fileUri;
    }

    try {
        let base64Data = '';
        if (fileUri.startsWith('data:')) {
            base64Data = fileUri.split(',')[1] || '';
        } else {
            let localUri = fileUri;
            if (localUri.startsWith('content://')) {
                const tempPath = `${FileSystem.cacheDirectory}ann_upload_${Date.now()}_${fileName || 'file.jpg'}`;
                await FileSystem.copyAsync({ from: localUri, to: tempPath });
                localUri = tempPath;
            }
            base64Data = await FileSystem.readAsStringAsync(localUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
        }

        if (!base64Data) return null;

        const binaryData = decode(base64Data);
        const ext = fileName?.split('.').pop() || fileUri.split('.').pop() || 'jpg';
        const cleanExt = (ext.toLowerCase() === 'jpeg' ? 'jpg' : ext.toLowerCase()).split('?')[0];
        const contentType = cleanExt === 'pdf' ? 'application/pdf' : `image/${cleanExt === 'jpg' ? 'jpeg' : cleanExt}`;
        const uniqueName = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;

        // Attempt upload across candidate buckets & Supabase clients
        const candidateBuckets = [
            'project-files',
            'avatars',
            'chat-attachments',
            'from-adidaya',
            'chat',
            'attendance',
            'finance-attachments',
            'finance_attachments',
        ];
        const clients = [supabase, supabaseForma, supabaseAdidaya];

        for (const client of clients) {
            for (const bucket of candidateBuckets) {
                for (const path of [`announcements/${uniqueName}`, uniqueName]) {
                    try {
                        const { error } = await client.storage
                            .from(bucket)
                            .upload(path, binaryData, {
                                contentType,
                                upsert: true,
                            });

                        if (!error) {
                            const { data } = client.storage
                                .from(bucket)
                                .getPublicUrl(path);

                            if (data?.publicUrl && data.publicUrl.startsWith('http')) {
                                console.log(`[uploadAnnouncementFile] Uploaded successfully to bucket: ${bucket}, path: ${path}`);
                                return data.publicUrl;
                            }
                        }
                    } catch {
                        // try next bucket/client
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Failed to upload announcement file to cloud storage:', e);
    }

    return null;
}

export function formatRole(role?: string): string {
    if (!role) return 'Operations';
    return role
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export function getInitials(name?: string): string {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return 'AD';
}

export type AnnouncementTemplateKey =
    | 'holiday'
    | 'site_visit'
    | 'system_update'
    | 'birthday'
    | 'policy_hr'
    | 'important_notice'
    | 'urgent_alert'
    | 'general'
    | 'custom';

export interface AnnouncementTemplateConfig {
    key: AnnouncementTemplateKey;
    label: string;
    accent: string;
    accentEnd: string;
    gradient: [string, string];
    bgGradientLight: [string, string];
    bgGradientDark: [string, string];
    icon: string;
    defaultBannerPattern: string;
}

export const ANNOUNCEMENT_TEMPLATES: Record<AnnouncementTemplateKey, AnnouncementTemplateConfig> = {
    holiday: {
        key: 'holiday',
        label: 'Holiday',
        accent: '#0EA5C6',
        accentEnd: '#168C7A',
        gradient: ['#0EA5C6', '#168C7A'],
        bgGradientLight: ['#E6F8F5', '#D1F4ED'],
        bgGradientDark: ['#122826', '#0B1B1A'],
        icon: 'sun.max.fill',
        defaultBannerPattern: 'tropical',
    },
    site_visit: {
        key: 'site_visit',
        label: 'Site Visit',
        accent: '#D97A32',
        accentEnd: '#F59E0B',
        gradient: ['#EA580C', '#F97316'],
        bgGradientLight: ['#FFF5EB', '#FFE8D6'],
        bgGradientDark: ['#2A1D13', '#1F140C'],
        icon: 'map.fill',
        defaultBannerPattern: 'topography',
    },
    system_update: {
        key: 'system_update',
        label: 'System Update',
        accent: '#007AFF',
        accentEnd: '#3B82F6',
        gradient: ['#1D4ED8', '#3B82F6'],
        bgGradientLight: ['#EAF4FF', '#D6E9FF'],
        bgGradientDark: ['#101A38', '#0B1226'],
        icon: 'gearshape.2.fill',
        defaultBannerPattern: 'circuit',
    },
    birthday: {
        key: 'birthday',
        label: 'Birthday',
        accent: '#EC4899',
        accentEnd: '#C0448F',
        gradient: ['#DB2777', '#F472B6'],
        bgGradientLight: ['#FDF2F8', '#FCE7F3'],
        bgGradientDark: ['#2E1222', '#200A17'],
        icon: 'gift.fill',
        defaultBannerPattern: 'confetti',
    },
    policy_hr: {
        key: 'policy_hr',
        label: 'Policy / HR',
        accent: '#4F46E5',
        accentEnd: '#6366F1',
        gradient: ['#4338CA', '#6366F1'],
        bgGradientLight: ['#F1F5F9', '#E2E8F0'],
        bgGradientDark: ['#1B1D28', '#13151D'],
        icon: 'shield.fill',
        defaultBannerPattern: 'minimal',
    },
    important_notice: {
        key: 'important_notice',
        label: 'Important Notice',
        accent: '#F59E0B',
        accentEnd: '#D97706',
        gradient: ['#D97706', '#F59E0B'],
        bgGradientLight: ['#FEF3C7', '#FDE68A'],
        bgGradientDark: ['#2D230D', '#1F1707'],
        icon: 'exclamationmark.triangle.fill',
        defaultBannerPattern: 'stripes',
    },
    urgent_alert: {
        key: 'urgent_alert',
        label: 'Urgent Alert',
        accent: '#EF4444',
        accentEnd: '#DC2626',
        gradient: ['#DC2626', '#EF4444'],
        bgGradientLight: ['#FEE2E2', '#FECACA'],
        bgGradientDark: ['#301313', '#220B0B'],
        icon: 'flame.fill',
        defaultBannerPattern: 'warning',
    },
    general: {
        key: 'general',
        label: 'General',
        accent: '#007AFF',
        accentEnd: '#2563EB',
        gradient: ['#007AFF', '#3872FF'],
        bgGradientLight: ['#F0F4F8', '#E2E8F0'],
        bgGradientDark: ['#181E29', '#11151D'],
        icon: 'megaphone.fill',
        defaultBannerPattern: 'geometry',
    },
    custom: {
        key: 'custom',
        label: 'Custom',
        accent: '#8B5CF6',
        accentEnd: '#A855F7',
        gradient: ['#8B5CF6', '#A855F7'],
        bgGradientLight: ['#F5F3FF', '#EDE9FE'],
        bgGradientDark: ['#1E1530', '#140D22'],
        icon: 'sparkles',
        defaultBannerPattern: 'minimal',
    },
};

export interface AnnouncementDocument {
    id: string;
    name: string;
    size: string;
    type?: string;
    url?: string;
}

export interface Announcement {
    id: string;
    tenantId?: string;
    workspaceId?: string;
    template: AnnouncementTemplateKey;
    title: string;
    subtitle: string;
    duration: string; // e.g. "Tomorrow" or "15 Sep – 17 Sep 2026"
    scheduledDate?: string; // ISO string for schedule / expiry checking
    dateCreated: string;
    coverImageUrl?: string;
    documents?: AnnouncementDocument[];
    bodyContent?: string;
    authorName?: string;
    authorRole?: string;
    authorAvatarUrl?: string;
    createdBy?: string;
    isFeatured?: boolean; // Pinned to Home Brief
    targetDepartment?: string;
    isDraft?: boolean;
    isWithdrawn?: boolean;
}

const STORAGE_KEY = '@forma_announcements_v4';
const DRAFTS_STORAGE_KEY = '@forma_announcements_drafts_v2';
const READ_STORAGE_KEY = '@forma_read_announcements_v2';

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

function toAnnouncementModel(row: any): Announcement {
    return {
        id: row.id,
        tenantId: row.tenant_id || undefined,
        workspaceId: row.workspace_id || undefined,
        template: (row.template as AnnouncementTemplateKey) || 'general',
        title: row.title || '',
        subtitle: row.subtitle || '',
        duration: row.duration || '',
        scheduledDate: row.scheduled_date || undefined,
        dateCreated: row.created_at || new Date().toISOString(),
        coverImageUrl: row.cover_image_url || undefined,
        documents: row.documents || [],
        bodyContent: row.body_content || '',
        authorName: row.author_name || undefined,
        authorRole: row.author_role || undefined,
        authorAvatarUrl: row.author_avatar_url || undefined,
        createdBy: row.created_by || undefined,
        isFeatured: row.is_featured ?? false,
        targetDepartment: row.target_department || 'All Departments (General)',
        isDraft: row.is_draft ?? false,
        isWithdrawn: row.is_withdrawn ?? false,
    };
}

type AnnouncementChangeListener = (announcements: Announcement[]) => void;
const listeners = new Set<AnnouncementChangeListener>();

export function subscribeToAnnouncements(listener: AnnouncementChangeListener): () => void {
    listeners.add(listener);
    initAnnouncementsRealtime();
    return () => {
        listeners.delete(listener);
    };
}

export function notifyAnnouncementChange(list: Announcement[]) {
    listeners.forEach((cb) => {
        try {
            cb(list);
        } catch (e) {
            console.error('Error in announcement listener:', e);
        }
    });
}

let realtimeChannel: any = null;

export function initAnnouncementsRealtime() {
    if (realtimeChannel) return;

    try {
        realtimeChannel = supabase
            .channel('public:announcements')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'announcements' },
                async () => {
                    // Notify listeners to reload their own tenant-scoped announcements
                    notifyAnnouncementChange([]);
                }
            )
            .subscribe();
    } catch (e) {
        console.warn('Could not initialize announcements realtime channel:', e);
    }
}

export async function getAnnouncements(forceRemote = false, tenantId?: string): Promise<Announcement[]> {
    const storageKey = tenantId ? `${STORAGE_KEY}_${tenantId}` : STORAGE_KEY;

    if (!tenantId) {
        try {
            const raw = await AsyncStorage.getItem(storageKey);
            if (raw !== null) {
                return JSON.parse(raw);
            }
        } catch {}
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('is_draft', false)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (!error && data !== null) {
            const mapped = data
                .filter((r: any) => r.tenant_id === tenantId)
                .map(toAnnouncementModel);
            await saveAnnouncements(mapped, tenantId);
            return mapped;
        }
    } catch {
        // Fallback to AsyncStorage if offline or table not configured
    }

    if (!forceRemote) {
        try {
            const raw = await AsyncStorage.getItem(storageKey);
            if (raw !== null) {
                const parsed: Announcement[] = JSON.parse(raw);
                return parsed.filter(a => a.tenantId === tenantId);
            }
        } catch {
            // silent
        }
    }

    return [];
}

export async function getAnnouncementById(id: string, tenantId?: string): Promise<Announcement | null> {
    try {
        let query = supabase
            .from('announcements')
            .select('*')
            .eq('id', id);

        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
            return toAnnouncementModel(data);
        }
    } catch {
        // Fallback to local cache
    }

    const list = await getAnnouncements(false, tenantId);
    return list.find(a => a.id === id) || null;
}

export async function saveAnnouncements(list: Announcement[], tenantId?: string): Promise<void> {
    try {
        const key = tenantId ? `${STORAGE_KEY}_${tenantId}` : STORAGE_KEY;
        await AsyncStorage.setItem(key, JSON.stringify(list));
        if (tenantId) {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
    } catch (e) {
        console.error('Failed to save announcements to storage:', e);
    }
}

export async function createAnnouncement(newAnn: Omit<Announcement, 'id' | 'dateCreated'>): Promise<Announcement> {
    const { error: schemaError } = await supabase.from('announcements').select('id').limit(0);
    if (schemaError) throw new Error('Announcements are not available yet. Please contact your administrator.');
    const list = await getAnnouncements(false, newAnn.tenantId);
    const annId = `ann-${Date.now()}`;
    const dateCreated = new Date().toISOString();

    // 1. Upload Cover Image to Cloud Storage if local
    let cloudCoverUrl = newAnn.coverImageUrl;
    if (cloudCoverUrl && !cloudCoverUrl.startsWith('http')) {
        const uploaded = await uploadAnnouncementFile(cloudCoverUrl, 'banner.jpg');
        if (uploaded && uploaded.startsWith('http')) {
            cloudCoverUrl = uploaded;
        } else {
            throw new Error('Announcement cover upload failed. Please try again.');
        }
    }

    // 2. Upload Attached Documents / Photos to Cloud Storage if local
    const cloudDocs: AnnouncementDocument[] = [];
    if (newAnn.documents && newAnn.documents.length > 0) {
        for (const doc of newAnn.documents) {
            let docUrl = doc.url;
            if (docUrl && !docUrl.startsWith('http')) {
                const uploaded = await uploadAnnouncementFile(docUrl, doc.name);
                if (uploaded && uploaded.startsWith('http')) {
                    docUrl = uploaded;
                } else { throw new Error('Announcement attachment upload failed: ' + doc.name); }
            }
            cloudDocs.push({
                ...doc,
                url: docUrl,
            });
        }
    }

    const created: Announcement = {
        ...newAnn,
        id: annId,
        coverImageUrl: cloudCoverUrl,
        documents: cloudDocs,
        dateCreated,
    };

    // 3. If set as featured/pinned, unpin all other items locally
    const updatedList = list.map(item => ({
        ...item,
        isFeatured: newAnn.isFeatured ? false : item.isFeatured,
    }));

    updatedList.unshift(created);


    // 4. Sync to Supabase Database with verified public URLs
    try {
        if (newAnn.isFeatured && newAnn.tenantId) {
            await supabase
                .from('announcements')
                .update({ is_featured: false })
                .eq('tenant_id', newAnn.tenantId)
                .eq('is_featured', true);
        }

        const remoteCoverUrl = cloudCoverUrl && cloudCoverUrl.startsWith('http') ? cloudCoverUrl : null;
        const remoteDocs = cloudDocs.map(d => ({
            ...d,
            url: d.url && d.url.startsWith('http') ? d.url : (d.url || null),
        }));

        const { error } = await supabase.from('announcements').insert({
            id: annId,
            tenant_id: newAnn.tenantId || null,
            workspace_id: newAnn.workspaceId || null,
            created_by: newAnn.createdBy || null,
            template: newAnn.template || 'general',
            title: newAnn.title,
            subtitle: newAnn.subtitle || null,
            duration: newAnn.duration || null,
            scheduled_date: newAnn.scheduledDate || null,
            cover_image_url: remoteCoverUrl,
            documents: remoteDocs,
            body_content: newAnn.bodyContent || null,
            author_name: newAnn.authorName || null,
            author_role: newAnn.authorRole || null,
            author_avatar_url: newAnn.authorAvatarUrl || null,
            is_featured: newAnn.isFeatured ?? false,
            target_department: newAnn.targetDepartment || 'All Departments (General)',
            is_draft: false,
            is_withdrawn: false,
            created_at: dateCreated,
            updated_at: dateCreated,
        });

        if (error) {
            throw error;
        }
    } catch (e) {
        throw e;
    }

    await saveAnnouncements(updatedList, newAnn.tenantId);
    notifyAnnouncementChange(updatedList);

    // 5. Trigger local push notification and in-app notification immediately
    sendLocalNotification(
        `📢 ${created.title}`,
        created.subtitle || created.bodyContent?.slice(0, 100) || 'New announcement posted.',
        { type: 'announcement', id: created.id }
    ).catch(() => {});

    addLocalNotification({
        text: `📢 Announcement: ${created.title}`,
        module: 'Announcement',
        user: created.authorName || 'Broadcast Team',
        category: 'system',
        ref: created.id,
    }).catch(() => {});

    return created;
}

async function resolveTenantId(id: string, explicitTenantId?: string): Promise<string | undefined> {
    if (explicitTenantId) return explicitTenantId;
    try {
        const { data } = await supabase
            .from('announcements')
            .select('tenant_id')
            .eq('id', id)
            .maybeSingle();
        if (data?.tenant_id) return data.tenant_id;
    } catch {
        // silent
    }
    return undefined;
}

export async function pinAnnouncement(id: string, tenantId?: string): Promise<void> {
    const tid = await resolveTenantId(id, tenantId);
    const list = await getAnnouncements(false, tid);
    const updated = list.map(item => ({
        ...item,
        isFeatured: item.id === id,
    }));
    await saveAnnouncements(updated, tid);
    notifyAnnouncementChange(updated);

    try {
        let unpinQuery = supabase.from('announcements').update({ is_featured: false }).neq('id', id);
        if (tid) unpinQuery = unpinQuery.eq('tenant_id', tid);
        await unpinQuery;

        await supabase.from('announcements').update({ is_featured: true }).eq('id', id);
    } catch {
        // silent
    }
}

export async function unpinAnnouncement(id: string, tenantId?: string): Promise<void> {
    const tid = await resolveTenantId(id, tenantId);
    const list = await getAnnouncements(false, tid);
    const updated = list.map(item => item.id === id ? { ...item, isFeatured: false } : item);
    await saveAnnouncements(updated, tid);
    notifyAnnouncementChange(updated);

    try {
        await supabase.from('announcements').update({ is_featured: false }).eq('id', id);
    } catch {
        // silent
    }
}

export async function togglePinAnnouncement(id: string, tenantId?: string): Promise<boolean> {
    const tid = await resolveTenantId(id, tenantId);
    const list = await getAnnouncements(false, tid);
    const current = list.find(a => a.id === id);
    if (current) {
        if (current.isFeatured) {
            await unpinAnnouncement(id, tid);
            return false;
        } else {
            await pinAnnouncement(id, tid);
            return true;
        }
    } else {
        try {
            const { data } = await supabase.from('announcements').select('is_featured').eq('id', id).maybeSingle();
            if (data?.is_featured) {
                await unpinAnnouncement(id, tid);
                return false;
            } else {
                await pinAnnouncement(id, tid);
                return true;
            }
        } catch {
            await pinAnnouncement(id, tid);
            return true;
        }
    }
}

export async function withdrawAnnouncement(id: string, tenantId?: string): Promise<void> {
    const tid = await resolveTenantId(id, tenantId);
    const list = await getAnnouncements(false, tid);
    const updated = list.map(item => item.id === id ? { ...item, isWithdrawn: true } : item);
    await saveAnnouncements(updated, tid);
    notifyAnnouncementChange(updated);

    try {
        await supabase.from('announcements').update({ is_withdrawn: true }).eq('id', id);
    } catch {
        // silent
    }
}

export async function restoreAnnouncement(id: string, tenantId?: string): Promise<void> {
    const tid = await resolveTenantId(id, tenantId);
    const list = await getAnnouncements(false, tid);
    const updated = list.map(item => item.id === id ? { ...item, isWithdrawn: false } : item);
    await saveAnnouncements(updated, tid);
    notifyAnnouncementChange(updated);

    try {
        await supabase.from('announcements').update({ is_withdrawn: false }).eq('id', id);
    } catch {
        // silent
    }
}

export async function deleteAnnouncement(id: string, tenantId?: string): Promise<void> {
    const tid = await resolveTenantId(id, tenantId);
    const list = await getAnnouncements(false, tid);
    const updated = list.filter(item => item.id !== id);
    await saveAnnouncements(updated, tid);
    notifyAnnouncementChange(updated);

    try {
        await supabase.from('announcements').delete().eq('id', id);
    } catch {
        // silent
    }
}

/** Check if announcement schedule has expired (max 1 hour after scheduled time) */
export function isAnnouncementExpired(ann: Announcement): boolean {
    if (!ann.scheduledDate) return false;
    try {
        const scheduleTime = new Date(ann.scheduledDate).getTime();
        const oneHourBuffer = 60 * 60 * 1000;
        return Date.now() > (scheduleTime + oneHourBuffer);
    } catch {
        return false;
    }
}

/** Format date string to "Posted at MMM D, h:mm A" (omits year if current year) */
export function formatPostedAt(dateStr?: string): string {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const isThisYear = date.getFullYear() === now.getFullYear();

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const day = date.getDate();

        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;

        const timeStr = `${hours}:${minutes} ${ampm}`;

        if (isThisYear) {
            return `Posted at ${month} ${day}, ${timeStr}`;
        } else {
            return `Posted at ${month} ${day} ${date.getFullYear()}, ${timeStr}`;
        }
    } catch {
        return '';
    }
}

export async function getReadAnnouncementIds(tenantId?: string): Promise<string[]> {
    try {
        const key = tenantId ? `${READ_STORAGE_KEY}_${tenantId}` : READ_STORAGE_KEY;
        const raw = await AsyncStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch {
        // silent
    }
    return [];
}

export async function markAnnouncementAsRead(id: string, tenantId?: string): Promise<void> {
    try {
        const readIds = await getReadAnnouncementIds(tenantId);
        if (!readIds.includes(id)) {
            const updated = [...readIds, id];
            const key = tenantId ? `${READ_STORAGE_KEY}_${tenantId}` : READ_STORAGE_KEY;
            await AsyncStorage.setItem(key, JSON.stringify(updated));
            const currentList = await getAnnouncements(false, tenantId);
            notifyAnnouncementChange(currentList);
        }
    } catch {
        // silent
    }
}

/** Helper to get active Home Brief announcement respecting pin, read-rotation, and expiration */
export async function getHomeActiveAnnouncement(tenantId?: string): Promise<{ activeItem: Announcement | null; unreadCount: number }> {
    const list = await getAnnouncements(false, tenantId);
    const readIds = await getReadAnnouncementIds(tenantId);

    // Active announcements: not withdrawn, not expired (or created recently)
    const activeList = list.filter(a => !a.isWithdrawn && !isAnnouncementExpired(a));

    const unreadList = activeList.filter(a => !readIds.includes(a.id));
    const unreadCount = unreadList.length;

    if (activeList.length === 0) {
        return { activeItem: null, unreadCount: 0 };
    }

    // 1. Explicitly pinned item takes absolute priority for Home Brief
    const pinned = activeList.find(a => a.isFeatured);
    if (pinned) {
        return {
            activeItem: pinned,
            unreadCount,
        };
    }

    // 2. If none pinned, show first unread announcement
    if (unreadList.length > 0) {
        return {
            activeItem: unreadList[0],
            unreadCount,
        };
    }

    // 3. All read and none pinned: show newest active announcement
    return {
        activeItem: activeList[0],
        unreadCount: 0,
    };
}

export async function getAnnouncementDrafts(): Promise<Announcement[]> {
    try {
        const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch {
        // silent
    }
    return [];
}

export async function saveAnnouncementDraft(draft: Partial<Announcement>): Promise<Announcement> {
    const drafts = await getAnnouncementDrafts();
    const existingIndex = drafts.findIndex(d => d.id === draft.id);

    const savedItem: Announcement = {
        id: draft.id || `draft-${Date.now()}`,
        template: draft.template || 'general',
        title: draft.title || 'Untitled Draft',
        subtitle: draft.subtitle || '',
        duration: draft.duration || 'Upcoming',
        dateCreated: draft.dateCreated || new Date().toISOString(),
        bodyContent: draft.bodyContent || '',
        coverImageUrl: draft.coverImageUrl,
        documents: draft.documents || [],
        targetDepartment: draft.targetDepartment || 'All Departments (General)',
        isFeatured: draft.isFeatured ?? false,
        isDraft: true,
    };

    let updatedDrafts: Announcement[];
    if (existingIndex >= 0) {
        updatedDrafts = [...drafts];
        updatedDrafts[existingIndex] = savedItem;
    } else {
        updatedDrafts = [savedItem, ...drafts];
    }

    await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    return savedItem;
}

export async function deleteAnnouncementDraft(id: string): Promise<void> {
    try {
        const drafts = await getAnnouncementDrafts();
        const updated = drafts.filter(d => d.id !== id);
        await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to delete draft:', e);
    }
}
