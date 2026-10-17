import { 
    supabase, 
    supabaseForma, 
    supabaseAdidaya, 
    APP_MODE,
    getActiveBackend,
    FORMA_SUPABASE_URL,
    FORMA_SUPABASE_ANON_KEY,
    ADIDAYA_SUPABASE_URL,
    ADIDAYA_SUPABASE_ANON_KEY
} from '../supabase';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { getProjects, Project } from './projects';
import { UserProfile } from '@/context/UserProvider';

export async function uploadChatAttachment(
    fileUri: string,
    fileName?: string,
    tenantId?: string | null,
    type: 'attachment' | 'avatar' = 'attachment',
    base64DataParam?: string
): Promise<string> {
    if (!fileUri && !base64DataParam) return fileUri;
    if (fileUri && (fileUri.startsWith('http://') || fileUri.startsWith('https://')) && !fileUri.includes('localhost') && !fileUri.includes('127.0.0.1')) {
        return fileUri;
    }

    let lastError: string | null = null;

    try {
        const ext = (fileName?.split('.').pop() || fileUri?.split('.').pop() || 'jpg').split('?')[0];
        const cleanExt = (ext.toLowerCase() === 'jpeg' ? 'jpg' : ext.toLowerCase());
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;
        const subFolder = type === 'avatar' ? 'avatars' : 'chat';
        const folder = tenantId ? `${tenantId}/${subFolder}` : subFolder;
        const storagePath = `${folder}/${safeName}`;

        let mimeType = 'application/octet-stream';
        if (['jpg', 'jpeg'].includes(cleanExt)) mimeType = 'image/jpeg';
        else if (cleanExt === 'png') mimeType = 'image/png';
        else if (cleanExt === 'webp') mimeType = 'image/webp';
        else if (cleanExt === 'gif') mimeType = 'image/gif';
        else if (cleanExt === 'mp4') mimeType = 'video/mp4';
        else if (cleanExt === 'mov') mimeType = 'video/quicktime';
        else if (cleanExt === 'pdf') mimeType = 'application/pdf';
        else if (cleanExt === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (cleanExt === 'xls') mimeType = 'application/vnd.ms-excel';
        else if (cleanExt === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (cleanExt === 'doc') mimeType = 'application/msword';
        else if (cleanExt === 'csv') mimeType = 'text/csv';

        const targetUrl = APP_MODE === 'adidaya' ? ADIDAYA_SUPABASE_URL : FORMA_SUPABASE_URL;
        const targetAnonKey = APP_MODE === 'adidaya' ? ADIDAYA_SUPABASE_ANON_KEY : FORMA_SUPABASE_ANON_KEY;

        let authToken = targetAnonKey;
        try {
            const sessionRes = await supabase.auth.getSession();
            if (sessionRes?.data?.session?.access_token) {
                authToken = sessionRes.data.session.access_token;
            }
        } catch (_) {}

        const bucketsToTry = ['chat-attachments', 'chat', 'project-files', 'avatars', 'from-adidaya', 'attendance', 'finance-attachments'];
        const clients = [supabase, supabaseForma, supabaseAdidaya];

        // 0. TIER 0: Web & Blob URL handling (Essential for Web / localhost preview)
        if (fileUri && (fileUri.startsWith('blob:') || Platform.OS === 'web' || fileUri.startsWith('data:'))) {
            try {
                let blobData: Blob | null = null;
                if (fileUri.startsWith('data:')) {
                    const base64Str = fileUri.split(',')[1] || '';
                    const bin = decode(base64Str);
                    blobData = new Blob([bin], { type: mimeType });
                } else {
                    const res = await fetch(fileUri);
                    blobData = await res.blob();
                }

                if (blobData) {
                    for (const client of clients) {
                        for (const bucket of bucketsToTry) {
                            try {
                                const { error } = await client.storage
                                    .from(bucket)
                                    .upload(storagePath, blobData, {
                                        contentType: mimeType,
                                        upsert: true,
                                    });

                                if (!error) {
                                    const { data } = client.storage.from(bucket).getPublicUrl(storagePath);
                                    if (data?.publicUrl && data.publicUrl.startsWith('http')) {
                                        console.log(`[uploadChatAttachment] Tier 0 Blob/Web upload success: ${data.publicUrl}`);
                                        return data.publicUrl;
                                    }
                                } else {
                                    lastError = `Blob ${bucket}: ${error.message}`;
                                }
                            } catch (bErr: any) {
                                lastError = `Blob ${bucket}: ${bErr?.message || bErr}`;
                            }
                        }
                    }
                }
            } catch (blobErr: any) {
                console.error('[uploadChatAttachment] Error reading blob URI:', blobErr);
            }
        }

        // Normalize local URI if needed for Native
        let localUploadUri = fileUri;
        if (fileUri && !fileUri.startsWith('data:') && !fileUri.startsWith('blob:')) {
            const fsAny = FileSystem as any;
            const cacheDir = fsAny.cacheDirectory || fsAny.documentDirectory || '';
            if (fileUri.startsWith('content://') && cacheDir) {
                const tempPath = `${cacheDir}chat_upload_${Date.now()}_${safeName}`;
                try {
                    await FileSystem.copyAsync({ from: fileUri, to: tempPath });
                    localUploadUri = tempPath;
                } catch (_) {}
            }
        }

        // 1. TIER 1: Native FileSystem.uploadAsync (Fastest, zero memory pressure on iOS / Android)
        if (Platform.OS !== 'web' && localUploadUri && !localUploadUri.startsWith('data:') && !localUploadUri.startsWith('blob:') && (FileSystem as any).uploadAsync) {
            for (const bucket of bucketsToTry) {
                try {
                    const uploadEndpoint = `${targetUrl}/storage/v1/object/${bucket}/${storagePath}`;
                    const uploadResult = await (FileSystem as any).uploadAsync(uploadEndpoint, localUploadUri, {
                        httpMethod: 'POST',
                        uploadType: (FileSystem as any).FileSystemUploadType?.BINARY_CONTENT ?? 0,
                        headers: {
                            'apikey': targetAnonKey,
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': mimeType,
                            'x-upsert': 'true',
                        },
                    });

                    if (uploadResult.status >= 200 && uploadResult.status < 300) {
                        const publicUrl = `${targetUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
                        console.log(`[uploadChatAttachment] Tier 1 Native upload success: ${publicUrl}`);
                        return publicUrl;
                    } else {
                        lastError = `NativeREST ${bucket} HTTP ${uploadResult.status}: ${uploadResult.body?.slice(0, 100)}`;
                    }
                } catch (restErr: any) {
                    lastError = `NativeREST ${bucket}: ${restErr?.message || restErr}`;
                }
            }
        }

        // 2. TIER 2: Supabase JS Client with Base64/ArrayBuffer fallback
        let base64Data = base64DataParam || '';
        if (!base64Data && localUploadUri && !localUploadUri.startsWith('blob:')) {
            if (localUploadUri.startsWith('data:')) {
                base64Data = localUploadUri.split(',')[1] || '';
            } else if (Platform.OS !== 'web') {
                try {
                    const fsAny = FileSystem as any;
                    const encoding = (fsAny.EncodingType && fsAny.EncodingType.Base64) ? fsAny.EncodingType.Base64 : 'base64';
                    base64Data = await FileSystem.readAsStringAsync(localUploadUri, { encoding: encoding as any });
                } catch (readErr: any) {
                    try {
                        const unescaped = decodeURI(localUploadUri);
                        const fsAny = FileSystem as any;
                        const encoding = (fsAny.EncodingType && fsAny.EncodingType.Base64) ? fsAny.EncodingType.Base64 : 'base64';
                        base64Data = await FileSystem.readAsStringAsync(unescaped, { encoding: encoding as any });
                    } catch (_) {}
                }
            }
        }

        if (base64Data) {
            const binaryData = decode(base64Data);

            for (const client of clients) {
                for (const bucket of bucketsToTry) {
                    try {
                        const { error } = await client.storage
                            .from(bucket)
                            .upload(storagePath, binaryData, {
                                contentType: mimeType,
                                upsert: true,
                            });

                        if (!error) {
                            const { data } = client.storage
                                .from(bucket)
                                .getPublicUrl(storagePath);
                            if (data?.publicUrl && data.publicUrl.startsWith('http')) {
                                console.log(`[uploadChatAttachment] Tier 2 JS SDK upload success: ${data.publicUrl}`);
                                return data.publicUrl;
                            }
                        } else {
                            lastError = `SDK ${bucket}: ${error.message}`;
                        }
                    } catch (bErr: any) {
                        lastError = `SDK ${bucket}: ${bErr?.message || bErr}`;
                    }
                }
            }
        }
    } catch (err: any) {
        console.error('[uploadChatAttachment] CRITICAL error:', err?.message || err);
    }

    console.error(`[uploadChatAttachment] ALL upload attempts failed for: ${fileName || fileUri?.slice(0, 60)}. Last error: ${lastError}`);
    return fileUri;
}

export type ChannelCategory = 'general' | 'department' | 'project' | 'manual';
export type ChannelMembershipStatus = 'active' | 'former' | 'none';

export interface ChannelMembershipInfo {
    status: ChannelMembershipStatus;
    role?: 'owner' | 'admin' | 'member';
    joinedAt?: string;
    leftAt?: string;
    canWrite: boolean;
    canReadHistory: boolean;
}

export interface ChatChannel {
    id: string;
    code: string; // e.g. #000-gen, #001-bod, #036-prg
    name: string;
    description?: string;
    senderName?: string;
    senderUserId?: string;
    lastMessageText: string;
    time?: string;
    unreadCount: number;
    membersCount: number;
    category: ChannelCategory;
    departmentId?: string;
    projectId?: string;
    status: 'active' | 'archived';
    isRecent?: boolean;
    isPinned?: boolean;
    pinOrder?: number;
    lastUpdatedAt?: number;
    channelNumber?: number;
    createdBy?: string;
    isCustom?: boolean;
    isPermanent?: boolean;
    membership?: ChannelMembershipInfo;
    avatarUrl?: string;
}

export interface ChatUserProfile {
    id: string;
    full_name: string;
    nickname?: string | null;
    avatar_url?: string | null;
    role?: string | null;
}

let cachedChatProfiles: ChatUserProfile[] | null = null;
let cachedProfilesById = new Map<string, ChatUserProfile>();
let cachedProfilesByName = new Map<string, ChatUserProfile>();

export function seedChatProfile(userProf?: any) {
    if (!userProf) return;
    const p: ChatUserProfile = {
        id: userProf.id,
        full_name: userProf.full_name || userProf.name || 'Member',
        nickname: userProf.nickname || null,
        avatar_url: userProf.avatar_url || null,
        role: userProf.position || userProf.job_title || userProf.role || null,
    };
    if (p.id) cachedProfilesById.set(p.id, p);
    if (p.full_name) {
        const fn = p.full_name.trim().toLowerCase();
        cachedProfilesByName.set(fn, p);
        fn.split(/\s+/).forEach(part => {
            if (part.length > 2 && !cachedProfilesByName.has(part)) {
                cachedProfilesByName.set(part, p);
            }
        });
    }
    if (p.nickname) {
        cachedProfilesByName.set(p.nickname.trim().toLowerCase(), p);
    }
}

export async function getChatProfiles(targetTenantId?: string | null): Promise<ChatUserProfile[]> {
    if (cachedChatProfiles && cachedChatProfiles.length > 0) {
        return cachedChatProfiles;
    }
    try {
        const [formaRes, adidayaRes] = await Promise.all([
            supabaseForma.from('profiles').select('*'),
            supabaseAdidaya.from('profiles').select('*'),
        ]);
        const combined = [...(formaRes.data || []), ...(adidayaRes.data || [])];
        if (combined.length > 0) {
            const list: ChatUserProfile[] = combined
                .filter((p: any) => p && p.account_type !== 'system')
                .map((p: any) => ({
                    id: p.id,
                    full_name: (p.full_name || p.name || '').trim() || 'Member',
                    nickname: (p.nickname || '').trim() || null,
                    avatar_url: p.avatar_url || null,
                    role: p.position || p.job_title || p.role || null,
                }));
            cachedChatProfiles = list;
            cachedProfilesById.clear();
            cachedProfilesByName.clear();
            list.forEach(p => {
                if (p.id) cachedProfilesById.set(p.id, p);
                if (p.full_name) {
                    const fn = p.full_name.trim().toLowerCase();
                    cachedProfilesByName.set(fn, p);
                    fn.split(/\s+/).forEach(part => {
                        if (part.length > 1 && !cachedProfilesByName.has(part)) {
                            cachedProfilesByName.set(part, p);
                        }
                    });
                }
                if (p.nickname) {
                    cachedProfilesByName.set(p.nickname.trim().toLowerCase(), p);
                }
            });
            return list;
        }
    } catch {
        // ignore
    }
    return cachedChatProfiles || [];
}

export function resolveProfile(userId?: string | null, name?: string | null): ChatUserProfile | undefined {
    if (userId && cachedProfilesById.has(userId)) {
        return cachedProfilesById.get(userId);
    }
    if (name) {
        const lower = name.trim().toLowerCase();
        if (cachedProfilesByName.has(lower)) {
            return cachedProfilesByName.get(lower);
        }
    }
    return undefined;
}

export function resolveFullName(name?: string | null, userId?: string | null): string {
    const prof = resolveProfile(userId, name);
    if (prof?.full_name && prof.full_name.trim().length > 0) {
        return prof.full_name.trim();
    }
    const clean = (name || '').trim();
    if (clean) {
        const lower = clean.toLowerCase();
        if (cachedProfilesByName.has(lower)) {
            const matched = cachedProfilesByName.get(lower);
            if (matched?.full_name && matched.full_name.trim().length > 0) return matched.full_name.trim();
        }
    }
    return clean || 'Member';
}

export function resolvePreviewName(name?: string | null, userId?: string | null): string {
    if (!name && !userId) return '';
    const prof = resolveProfile(userId, name);
    if (prof?.nickname && prof.nickname.trim().length > 0) {
        return prof.nickname.trim();
    }
    if (prof?.full_name && prof.full_name.trim().length > 0) {
        const parts = prof.full_name.trim().split(/\s+/);
        return parts[0] || prof.full_name.trim();
    }
    const clean = (name || '').trim();
    if (clean) {
        const lower = clean.toLowerCase();
        if (cachedProfilesByName.has(lower)) {
            const matched = cachedProfilesByName.get(lower);
            if (matched?.nickname && matched.nickname.trim().length > 0) return matched.nickname.trim();
            if (matched?.full_name && matched.full_name.trim().length > 0) return matched.full_name.trim().split(/\s+/)[0] || matched.full_name.trim();
        }
        const parts = clean.split(/\s+/);
        return parts[0] || clean;
    }
    return '';
}

export function resolveAvatarUrl(name?: string | null, userId?: string | null): string | undefined {
    const prof = resolveProfile(userId, name);
    return prof?.avatar_url || undefined;
}

export interface ChatAttachment {
    name: string;
    size: string;
    type: 'pdf' | 'xlsx' | 'image' | 'video' | 'document' | string;
    url?: string;
    uri?: string;
}

export interface ChatMedia {
    type: 'image' | 'video';
    title?: string;
    count?: number;
    duration?: string;
    thumbnailUri?: string;
    thumbnails?: string[];
}

export function formatMessagePreviewSnippet(message: {
    text?: string | null;
    media?: any;
    attachments?: any;
    attachment?: any;
    linked_record?: any;
    linkedRecord?: any;
}): string {
    if (message.text && message.text.trim().length > 0) {
        return message.text.trim();
    }

    const rawMedia = message.media;
    if (rawMedia) {
        const parsedMedia = typeof rawMedia === 'string' ? (() => { try { return JSON.parse(rawMedia); } catch (_) { return null; } })() : rawMedia;
        if (parsedMedia && typeof parsedMedia === 'object') {
            const mediaType = parsedMedia.type;
            const count = parsedMedia.count || (Array.isArray(parsedMedia.thumbnails) ? parsedMedia.thumbnails.length : 1);
            const title = typeof parsedMedia.title === 'string' ? parsedMedia.title.toLowerCase() : '';

            if (mediaType === 'video' || title.includes('video')) {
                return count > 1 ? `${count} Videos` : 'Video';
            }
            if (mediaType === 'image' || title.includes('photo') || title.includes('image')) {
                return count > 1 ? `${count} Photos` : 'Photo';
            }
            return count > 1 ? `${count} Photos` : 'Photo';
        }
        return 'Photo';
    }

    const rawAttachments = message.attachments || (message.attachment ? [message.attachment] : []);
    const parsedAttachments = typeof rawAttachments === 'string' ? (() => { try { return JSON.parse(rawAttachments); } catch (_) { return []; } })() : rawAttachments;
    if (Array.isArray(parsedAttachments) && parsedAttachments.length > 0) {
        const first = parsedAttachments[0];
        if (first?.name) return first.name;
        if (first?.type === 'image') return 'Photo';
        if (first?.type === 'video') return 'Video';
        return 'Document';
    }

    const lr = message.linked_record || message.linkedRecord;
    if (lr) {
        const parsedLr = typeof lr === 'string' ? (() => { try { return JSON.parse(lr); } catch (_) { return null; } })() : lr;
        if (parsedLr?.title) return parsedLr.title;
        return 'Linked Record';
    }

    return '';
}

export const USER_CHAT_PREFS_KEY = 'forma_user_chat_prefs_v3';

export async function getUserChatPreferences(
    userId?: string | null,
    workspaceId?: string | null
): Promise<{ pinnedIds: string[]; archivedIds: string[] }> {
    if (!userId) {
        return { pinnedIds: [], archivedIds: [] };
    }

    const isAdidaya = isAdidayaTenant(workspaceId);
    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;
    const wsKey = isAdidaya ? 'adidaya' : (workspaceId || 'default');
    const localKey = `${USER_CHAT_PREFS_KEY}_${userId}_${wsKey}`;

    let pinnedIds: string[] = [];
    let archivedIds: string[] = [];

    // 1. Read local cache for immediate 0ms UI load
    try {
        const stored = await AsyncStorage.getItem(localKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed.pinnedIds)) pinnedIds = parsed.pinnedIds;
            if (Array.isArray(parsed.archivedIds)) archivedIds = parsed.archivedIds;
        }
    } catch (_) {}

    // 2. Sync from dedicated chat_user_preferences table (per user per workspace)
    try {
        const { data: prefRow } = await targetClient
            .from('chat_user_preferences')
            .select('pinned_channels, archived_channels')
            .eq('user_id', userId)
            .eq('workspace_id', wsKey)
            .maybeSingle();

        if (prefRow) {
            if (Array.isArray(prefRow.pinned_channels)) {
                pinnedIds = prefRow.pinned_channels;
            }
            if (Array.isArray(prefRow.archived_channels)) {
                archivedIds = prefRow.archived_channels;
            }

            // Update local cache
            await AsyncStorage.setItem(localKey, JSON.stringify({ pinnedIds, archivedIds }));
            return { pinnedIds, archivedIds };
        }
    } catch (_) {}

    // 3. Fallback: Sync from Supabase profiles.meta
    try {
        const { data: profile } = await targetClient
            .from('profiles')
            .select('meta')
            .eq('id', userId)
            .maybeSingle();

        if (profile?.meta) {
            const remotePinned = profile.meta.pinned_channels;
            const remoteArchived = profile.meta.archived_channels;

            if (Array.isArray(remotePinned)) {
                pinnedIds = remotePinned;
            }
            if (Array.isArray(remoteArchived)) {
                archivedIds = remoteArchived;
            }

            // Save to local cache
            await AsyncStorage.setItem(localKey, JSON.stringify({ pinnedIds, archivedIds }));
        }
    } catch (_) {}

    return { pinnedIds, archivedIds };
}

export async function saveUserPinnedChannels(
    userId: string | undefined | null,
    workspaceId: string | undefined | null,
    pinnedIds: string[]
): Promise<void> {
    if (!userId) return;
    const isAdidaya = isAdidayaTenant(workspaceId);
    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;
    const wsKey = isAdidaya ? 'adidaya' : (workspaceId || 'default');
    const localKey = `${USER_CHAT_PREFS_KEY}_${userId}_${wsKey}`;

    let currentArchived: string[] = [];

    // 1. Update local storage immediately
    try {
        const stored = await AsyncStorage.getItem(localKey);
        const parsed = stored ? JSON.parse(stored) : {};
        if (Array.isArray(parsed.archivedIds)) currentArchived = parsed.archivedIds;
        const updated = { ...parsed, pinnedIds };
        await AsyncStorage.setItem(localKey, JSON.stringify(updated));
    } catch (_) {}

    // 2. Persist to Supabase chat_user_preferences
    try {
        await targetClient
            .from('chat_user_preferences')
            .upsert({
                user_id: userId,
                workspace_id: wsKey,
                pinned_channels: pinnedIds,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,workspace_id' });
    } catch (err) {
        console.warn('Failed to upsert chat_user_preferences:', err);
    }

    // 3. Persist to Supabase profiles.meta as secondary store
    try {
        const { data: profile } = await targetClient
            .from('profiles')
            .select('meta')
            .eq('id', userId)
            .maybeSingle();

        const meta = { ...(profile?.meta || {}), pinned_channels: pinnedIds };
        await targetClient.from('profiles').update({ meta }).eq('id', userId);
    } catch (err) {
        console.warn('Failed to save pinned channels to Supabase profiles:', err);
    }

    // 4. Real-time broadcast to sync across other devices of the same user
    try {
        const channel = targetClient.channel('global_chat_broadcast');
        channel.send({
            type: 'broadcast',
            event: 'user_prefs_updated',
            payload: {
                userId,
                workspaceId: wsKey,
                pinnedIds,
                archivedIds: currentArchived,
            },
        });
    } catch (_) {}
}

export async function saveUserArchivedChannels(
    userId: string | undefined | null,
    workspaceId: string | undefined | null,
    archivedIds: string[]
): Promise<void> {
    if (!userId) return;
    const isAdidaya = isAdidayaTenant(workspaceId);
    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;
    const wsKey = isAdidaya ? 'adidaya' : (workspaceId || 'default');
    const localKey = `${USER_CHAT_PREFS_KEY}_${userId}_${wsKey}`;

    let currentPinned: string[] = [];

    // 1. Update local storage immediately
    try {
        const stored = await AsyncStorage.getItem(localKey);
        const parsed = stored ? JSON.parse(stored) : {};
        if (Array.isArray(parsed.pinnedIds)) currentPinned = parsed.pinnedIds;
        const updated = { ...parsed, archivedIds };
        await AsyncStorage.setItem(localKey, JSON.stringify(updated));
    } catch (_) {}

    // 2. Persist to Supabase chat_user_preferences
    try {
        await targetClient
            .from('chat_user_preferences')
            .upsert({
                user_id: userId,
                workspace_id: wsKey,
                archived_channels: archivedIds,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,workspace_id' });
    } catch (err) {
        console.warn('Failed to upsert chat_user_preferences:', err);
    }

    // 3. Persist to Supabase profiles.meta as secondary store
    try {
        const { data: profile } = await targetClient
            .from('profiles')
            .select('meta')
            .eq('id', userId)
            .maybeSingle();

        const meta = { ...(profile?.meta || {}), archived_channels: archivedIds };
        await targetClient.from('profiles').update({ meta }).eq('id', userId);
    } catch (err) {
        console.warn('Failed to save archived channels to Supabase profiles:', err);
    }

    // 4. Real-time broadcast to sync across other devices of the same user
    try {
        const channel = targetClient.channel('global_chat_broadcast');
        channel.send({
            type: 'broadcast',
            event: 'user_prefs_updated',
            payload: {
                userId,
                workspaceId: wsKey,
                pinnedIds: currentPinned,
                archivedIds,
            },
        });
    } catch (_) {}
}

export interface ChatMessage {
    id: string;
    sender: string;
    userId?: string;
    role?: string;
    avatarUrl?: string;
    avatarBg?: string;
    text: string;
    time: string;
    isSelf: boolean;
    dateLabel?: string;
    isPinned?: boolean;
    isSaved?: boolean;
    isAnnouncement?: boolean;
    hasLink?: boolean;
    linkUrl?: string;
    hasMedia?: boolean;
    replyTo?: {
        messageId?: string;
        sender: string;
        text: string;
    };
    attachment?: ChatAttachment;
    attachments?: ChatAttachment[];
    media?: ChatMedia;
    linkedRecord?: {
        type: string;
        title: string;
        id: string;
    };
    reactions?: { emoji: string; count: number; users?: string[] }[];
    myReaction?: string;
    createdAt?: string;
    isDeleted?: boolean;
    isEdited?: boolean;
    isForwarded?: boolean;
    forwardedFrom?: string;
    channelId?: string;
    channel_id?: string;
}

export interface DBChatMessageRow {
    id: string;
    channel_id: string;
    workspace_id?: string | null;
    tenant_id?: string | null;
    user_id?: string | null;
    sender_name: string;
    sender_role?: string | null;
    avatar_url?: string | null;
    avatar_bg?: string | null;
    text: string;
    is_pinned?: boolean | null;
    is_saved?: boolean | null;
    is_announcement?: boolean | null;
    reply_to?: any;
    attachments?: any;
    media?: any;
    linked_record?: any;
    reactions?: any;
    is_deleted?: boolean | null;
    meta?: any;
    created_at?: string;
    updated_at?: string;
}

export interface DBChatChannelMemberRow {
    id?: string;
    channel_id: string;
    user_id: string;
    tenant_id?: string | null;
    role: 'owner' | 'admin' | 'member';
    is_active: boolean;
    joined_at: string;
    left_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export const STORAGE_PREFIX = '@forma_chat_messages_v10_';
export const LAST_MSG_PREFIX = '@forma_chat_last_msg_v10_';
export const MEMBERSHIP_PREFIX = '@forma_chat_membership_v10_';
export const MANUAL_CHANNELS_KEY = '@forma_manual_channels_v10_';
export const ACCESSIBLE_CACHE_KEY = 'forma_chat_accessible_channels_cache_v10_';

export const ADIDAYA_TENANT_UUID = '0b29e53c-1419-4764-95e0-fc52c5ee45da';
export const ADIDAYA_WORKSPACE_UUID = 'f39364e8-1376-4ff7-a716-78277e8d25b3';

/**
 * Single source of truth for routing chat data to the Adidaya DB.
 * Logged in via the Adidaya backend => always Adidaya (its tenant UUID is a real UUID, not 'adidaya-*').
 */
export function isAdidayaTenant(tenantId?: string | null): boolean {
    let backend: 'forma' | 'adidaya' = APP_MODE;
    try { backend = getActiveBackend(); } catch (_) {}
    if (backend === 'adidaya') return true;
    if (!tenantId) return false;
    const s = String(tenantId).toLowerCase();
    return s === ADIDAYA_TENANT_UUID || s === ADIDAYA_WORKSPACE_UUID || s === 'ady' || s.includes('adidaya');
}

export function getChannelTenantKey(tenantId?: string | null): string {
    return isAdidayaTenant(tenantId) ? 'adidaya' : (tenantId || 'default');
}

export function getChannelStorageKey(channelId: string, tenantId?: string | null): string {
    const tKey = getChannelTenantKey(tenantId);
    return `${STORAGE_PREFIX}${tKey}_${channelId}`;
}

export function getChannelLastMsgKey(channelId: string, tenantId?: string | null): string {
    const tKey = getChannelTenantKey(tenantId);
    return `${LAST_MSG_PREFIX}${tKey}_${channelId}`;
}

export const DEFAULT_GENERAL_CHANNEL: ChatChannel = {
    id: 'general-channel',
    code: '#000-gen',
    name: 'General Channel',
    senderName: '',
    lastMessageText: 'Workspace announcements and general team discussion.',
    time: '',
    unreadCount: 0,
    membersCount: 1,
    category: 'general',
    status: 'active',
    isRecent: false,
    isPermanent: true,
    channelNumber: 0,
    lastUpdatedAt: undefined,
    membership: {
        status: 'active',
        canWrite: true,
        canReadHistory: true,
        joinedAt: new Date().toISOString(),
    },
};

export function isValidUUID(id?: string | null): boolean {
    if (!id || typeof id !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

export function resolveValidTenantId(tenantId?: string | null, fallback?: string | null): string | null {
    if (isValidUUID(tenantId)) return tenantId!.trim();
    if (isValidUUID(fallback)) return fallback!.trim();
    return null;
}

export function resolveValidWorkspaceId(workspaceId?: string | null, fallback?: string | null): string | null {
    if (isValidUUID(workspaceId)) return workspaceId!.trim();
    if (isValidUUID(fallback)) return fallback!.trim();
    return null;
}

function formatMessageTime(dateString?: string): string {
    if (!dateString) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        return format(d, 'hh:mm a');
    } catch {
        return '';
    }
}

function formatMessageDateLabel(dateString?: string): string {
    if (!dateString) return 'Today';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'Today';
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return 'Today';
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return format(d, 'MMM d');
    } catch {
        return 'Today';
    }
}

export const CHAT_URL_REGEX = /(https?:\/\/[^\s]+|(?:www\.)[^\s]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.(?:com|org|net|edu|gov|mil|io|id|co\.id|go\.id|ac\.id|my\.id|biz\.id|web\.id|sch\.id|or\.id|dev|app|ai|me|tv|cc|tech|site|online|store|co|xyz|info|pro|space|live|cloud|agency|design|studio|digital|club|shop|top|vip|art|link|news|global|world|group|pub|mobi|asia|us|uk|ca|de|jp|fr|au|in|ru|ch|it|nl|se|no|es|br|sg|hk|nz|kr|tw|ph|th|vn|my|so|fm|gg|to|page|sh|run|is|ly|gl|be|vc|im|biz|fit|guru|life|team|media|zone|work|host|center|land|fun|icu|monster)(?:\/[^\s]*)?)/gi;

export function normalizeChatUrl(rawUrl: string): string {
    let clean = (rawUrl || '').trim();
    clean = clean.replace(/[.,!?:;)]+$/, '');
    if (!clean) return '';
    if (!/^https?:\/\//i.test(clean)) {
        return `https://${clean}`;
    }
    return clean;
}

export function transformRowToChatMessage(
    row: DBChatMessageRow,
    currentUserId?: string | null,
    editedIdsSet?: Set<string>
): ChatMessage {
    // Adidaya stores message author/body as sender_id/content.
    row = { ...row, user_id: row.user_id || (row as any).sender_id, text: row.text ?? (row as any).content ?? '' };
    const isSelf = !!(currentUserId && row.user_id && row.user_id === currentUserId);
    
    let rawReactions = row.reactions;
    if (typeof rawReactions === 'string') {
        try { rawReactions = JSON.parse(rawReactions); } catch (_) {}
    }
    const reactionsList = Array.isArray(rawReactions) ? rawReactions : [];
    const myReactionObj = currentUserId
        ? reactionsList.find((r: any) => Array.isArray(r.users) && r.users.includes(currentUserId))
        : undefined;

    let rawAttachments = row.attachments;
    if (typeof rawAttachments === 'string') {
        try { rawAttachments = JSON.parse(rawAttachments); } catch (_) {}
    }
    const attachmentsList: ChatAttachment[] = (Array.isArray(rawAttachments)
        ? rawAttachments
        : (rawAttachments ? [rawAttachments] : [])
    ).map((att: any) => ({
        ...att,
        url: att.url || att.uri || undefined,
        uri: att.uri || att.url || undefined,
    }));

    const firstAttachment = attachmentsList.length > 0 ? attachmentsList[0] : undefined;

    let rawMedia = row.media;
    if (typeof rawMedia === 'string') {
        try { rawMedia = JSON.parse(rawMedia); } catch (_) {}
    }

    // Normalize media object if present
    let normalizedMedia: ChatMedia | undefined = undefined;
    if (rawMedia && typeof rawMedia === 'object') {
        const thumbUri = rawMedia.thumbnailUri || rawMedia.uri || rawMedia.url || rawMedia.thumbnail_url || (Array.isArray(rawMedia.thumbnails) ? rawMedia.thumbnails[0] : undefined);
        normalizedMedia = {
            ...rawMedia,
            type: rawMedia.type || 'image',
            thumbnailUri: thumbUri,
            thumbnails: Array.isArray(rawMedia.thumbnails) && rawMedia.thumbnails.length > 0 
                ? rawMedia.thumbnails.map((t: any) => typeof t === 'string' ? t : (t?.uri || t?.url || thumbUri))
                : (thumbUri ? [thumbUri] : undefined),
        };
    } else if (attachmentsList.length > 0) {
        const imgAtt = attachmentsList.find(a => a.type === 'image' || (a.url && /\.(jpg|jpeg|png|webp|gif)$/i.test(a.url)) || (a.name && /\.(jpg|jpeg|png|webp|gif)$/i.test(a.name)));
        const vidAtt = attachmentsList.find(a => a.type === 'video' || (a.url && /\.(mp4|mov|webm)$/i.test(a.url)) || (a.name && /\.(mp4|mov|webm)$/i.test(a.name)));
        if (imgAtt && imgAtt.url) {
            normalizedMedia = {
                type: 'image',
                title: imgAtt.name,
                thumbnailUri: imgAtt.url,
                thumbnails: [imgAtt.url],
                count: 1,
            };
        } else if (vidAtt && vidAtt.url) {
            normalizedMedia = {
                type: 'video',
                title: vidAtt.name,
                thumbnailUri: vidAtt.url,
                count: 1,
            };
        }
    }

    let rawReplyTo = row.reply_to;
    if (typeof rawReplyTo === 'string') {
        try { rawReplyTo = JSON.parse(rawReplyTo); } catch (_) {}
    }

    const matches = row.text ? row.text.match(CHAT_URL_REGEX) : null;
    const hasLink = !!(matches && matches.length > 0);
    const linkUrl = hasLink ? normalizeChatUrl(matches![0]) : undefined;

    const prof = resolveProfile(row.user_id, row.sender_name);
    const fullSenderName = resolveFullName(row.sender_name, row.user_id);
    const senderRole = prof?.role || row.sender_role || undefined;
    const avatarUrl = prof?.avatar_url || row.avatar_url || undefined;

    const isDeleted = !!(row.is_deleted || (row as any).meta?.is_deleted || row.text === 'This message was deleted.' || row.text === 'You deleted this message.');
    const hasEditTimeDelta = !!(
        row.updated_at &&
        row.created_at &&
        row.updated_at !== row.created_at &&
        Math.abs(new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()) > 50
    );
    const wasEditedLocally = editedIdsSet ? editedIdsSet.has(row.id) : false;
    const isEdited = isDeleted ? false : !!((row as any).is_edited || (row as any).edited_at || (row as any).meta?.is_edited || wasEditedLocally || hasEditTimeDelta);
    const isForwarded = isDeleted ? false : !!((row as any).is_forwarded || (row as any).isForwarded || (row as any).meta?.is_forwarded || (row as any).meta?.forwarded_from || (row as any).forwarded_from);
    const forwardedFrom = isDeleted ? undefined : ((row as any).forwarded_from || (row as any).meta?.forwarded_from || undefined);

    return {
        id: row.id,
        sender: fullSenderName,
        userId: row.user_id || undefined,
        role: senderRole,
        avatarUrl,
        avatarBg: row.avatar_bg || undefined,
        text: isDeleted ? (isSelf ? 'You deleted this message.' : 'This message was deleted.') : (row.text || ''),
        time: formatMessageTime(row.created_at),
        dateLabel: formatMessageDateLabel(row.created_at),
        isSelf,
        isPinned: isDeleted ? false : !!row.is_pinned,
        isSaved: isDeleted ? false : !!row.is_saved,
        isAnnouncement: isDeleted ? false : !!row.is_announcement,
        hasLink: isDeleted ? false : hasLink,
        linkUrl: isDeleted ? undefined : linkUrl,
        hasMedia: isDeleted ? false : !!normalizedMedia,
        replyTo: isDeleted ? undefined : rawReplyTo || undefined,
        attachment: isDeleted ? undefined : firstAttachment,
        attachments: isDeleted ? undefined : (attachmentsList.length > 0 ? attachmentsList : undefined),
        media: isDeleted ? undefined : normalizedMedia,
        linkedRecord: isDeleted ? undefined : (row.linked_record || undefined),
        reactions: isDeleted ? [] : reactionsList,
        myReaction: isDeleted ? undefined : myReactionObj?.emoji,
        createdAt: row.created_at,
        isDeleted,
        isEdited,
        isForwarded,
        forwardedFrom,
        channelId: row.channel_id,
        channel_id: row.channel_id,
    };
}

// ----------------------------------------------------------------------
// CHANNEL MEMBERSHIP & ACCESS CONTROL
// ----------------------------------------------------------------------

/**
 * Determine a user's membership status for a channel.
 * Rules:
 * - General Channel: All tenant users have 'active' membership.
 * - Department Channel: Active if user belongs to the department; or checks membership history.
 * - Project Channel: Active if user is assigned to project; or checks membership history.
 * - Manual Channel: Active if in chat_channel_members without left_at; 'former' if left_at is set.
 */
export async function getChannelMembership(
    channelId: string,
    userId?: string | null,
    context?: {
        tenantId?: string | null;
        userProfile?: UserProfile | null;
        userRole?: string | null;
        category?: ChannelCategory;
        departmentId?: string;
        departmentName?: string;
        departmentCode?: string;
        projectId?: string;
    }
): Promise<ChannelMembershipInfo> {
    if (!userId) {
        return { status: 'none', canWrite: false, canReadHistory: false };
    }

    // 0. Superadmin & Tenant Owner: Full access to all channels
    const isSuperAdmin =
        context?.userRole === 'superadmin' ||
        context?.userRole === 'owner' ||
        context?.userProfile?.role === 'superadmin' ||
        context?.userProfile?.role === 'owner';

    if (isSuperAdmin) {
        return {
            status: 'active',
            role: 'admin',
            canWrite: true,
            canReadHistory: true,
            joinedAt: context?.userProfile?.join_date || new Date().toISOString(),
        };
    }

    // 1. General Channel: Automatic active access for all tenant members
    if (channelId === 'general-channel' || context?.category === 'general') {
        return {
            status: 'active',
            role: 'member',
            canWrite: true,
            canReadHistory: true,
            joinedAt: context?.userProfile?.join_date || new Date().toISOString(),
        };
    }

    // Check local/remote DB membership table first for explicit membership or former status
    try {
        const { data: memberRow, error } = await supabase
            .from('chat_channel_members')
            .select('*')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .maybeSingle();

        if (!error && memberRow) {
            if (memberRow.is_active && !memberRow.left_at) {
                return {
                    status: 'active',
                    role: memberRow.role || 'member',
                    joinedAt: memberRow.joined_at,
                    canWrite: true,
                    canReadHistory: true,
                };
            } else {
                return {
                    status: 'former',
                    role: memberRow.role || 'member',
                    joinedAt: memberRow.joined_at,
                    leftAt: memberRow.left_at || memberRow.updated_at,
                    canWrite: false,
                    canReadHistory: true,
                };
            }
        }
    } catch {
        // Fallback to local storage or profile rules
    }

    // Check local cache for explicit membership status
    try {
        const cachedMember = await AsyncStorage.getItem(`${MEMBERSHIP_PREFIX}${channelId}_${userId}`);
        if (cachedMember) {
            return JSON.parse(cachedMember);
        }
    } catch {
        // ignore
    }

    // 2. Department Channel Check: All tenant members have active access to collaborate
    if (context?.category === 'department' || channelId.startsWith('dept-')) {
        return {
            status: 'active',
            role: 'member',
            canWrite: true,
            canReadHistory: true,
            joinedAt: context?.userProfile?.join_date || new Date().toISOString(),
        };
    }

    // 3. Project Channel Check
    if (context?.category === 'project' || channelId.startsWith('proj-')) {
        return {
            status: 'active',
            role: 'member',
            canWrite: true,
            canReadHistory: true,
            joinedAt: new Date().toISOString(),
        };
    }

    // 4. Manual / Custom Channels
    try {
        const storedMembers = await AsyncStorage.getItem(`forma_channel_members_${channelId}`);
        if (storedMembers) {
            const list = JSON.parse(storedMembers);
            if (Array.isArray(list) && list.length > 0) {
                const found = list.find((m: any) => m.id === userId || m.user_id === userId);
                if (found) {
                    return {
                        status: 'active',
                        role: found.isAdmin ? 'admin' : 'member',
                        canWrite: true,
                        canReadHistory: true,
                        joinedAt: new Date().toISOString(),
                    };
                } else if (!isSuperAdmin) {
                    return {
                        status: 'none',
                        canWrite: false,
                        canReadHistory: false,
                    };
                }
            }
        }
    } catch {
        // fallback
    }

    return {
        status: 'active',
        role: 'admin',
        canWrite: true,
        canReadHistory: true,
        joinedAt: new Date().toISOString(),
    };
}

export const INITIAL_FALLBACK_CHANNELS: ChatChannel[] = [
    DEFAULT_GENERAL_CHANNEL,
];

let memoryAccessibleChannelsCache: { [key: string]: ChatChannel[] } = {};

export async function getCachedAccessibleChannels(workspaceIdOrParams?: string | { tenantId?: string | null; workspaceId?: string | null } | null): Promise<ChatChannel[]> {
    let wsKey = 'adidaya';
    if (typeof workspaceIdOrParams === 'string') {
        wsKey = isAdidayaTenant(workspaceIdOrParams) ? 'adidaya' : workspaceIdOrParams;
    } else if (workspaceIdOrParams && typeof workspaceIdOrParams === 'object') {
        const tId = workspaceIdOrParams.tenantId;
        const wId = workspaceIdOrParams.workspaceId;
        wsKey = isAdidayaTenant(tId || wId) ? 'adidaya' : (tId || wId || 'default');
    }

    if (memoryAccessibleChannelsCache[wsKey] && memoryAccessibleChannelsCache[wsKey].length > 0) {
        return memoryAccessibleChannelsCache[wsKey];
    }
    try {
        const cached = await AsyncStorage.getItem(`${ACCESSIBLE_CACHE_KEY}${wsKey}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                memoryAccessibleChannelsCache[wsKey] = parsed;
                return parsed;
            }
        }
    } catch {
        // ignore
    }
    const isAdidayaWs = wsKey === 'adidaya';
    const defaultGen = isAdidayaWs ? { ...DEFAULT_GENERAL_CHANNEL, id: '000-general', code: '#000-gen', name: 'General Channel' } : DEFAULT_GENERAL_CHANNEL;
    return [defaultGen];
}

/**
 * Fetch all channels accessible to the user according to the 6 system rules.
 * Runs queries in parallel for 10x faster seamless loading.
 */
export async function getUserAccessibleChannels(params: {
    userId?: string | null;
    tenantId?: string | null;
    workspaceId?: string | null;
    userProfile?: UserProfile | null;
    tenantRole?: string | null;
}): Promise<ChatChannel[]> {
    const { userId, tenantId, workspaceId, userProfile, tenantRole } = params;

    const isAdidaya = isAdidayaTenant(tenantId || (userProfile as any)?.tenant_id);

    const targetTenantId = isAdidaya ? 'adidaya-primary-tenant' : resolveValidTenantId(tenantId, (userProfile as any)?.tenant_id);
    const targetWorkspaceId = isAdidaya ? 'adidaya-primary-tenant' : resolveValidWorkspaceId(workspaceId, targetTenantId);
    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;

    const wsKey = isAdidaya ? 'adidaya' : (workspaceId || targetTenantId || 'default');
    const isSuperAdmin =
        tenantRole === 'superadmin' ||
        tenantRole === 'owner' ||
        userProfile?.role === 'superadmin' ||
        userProfile?.role === 'owner';

    try {
        // Parallel batch fetch all sources strictly scoped to the active tenant/workspace
        const [
            tmRes,
            deptProfilesRes,
            deptsRes,
            realProjects,
            storedManual,
            chatProfiles,
            recentMsgsRes,
            chatChannelsRes,
        ] = await Promise.all([
            isAdidaya
                ? (async () => { try { return await supabaseAdidaya.from('tenant_members').select('id, user_id').eq('status', 'active'); } catch { return { data: null }; } })()
                : (isValidUUID(targetTenantId)
                    ? (async () => { try { return await supabaseForma.from('tenant_members').select('id, user_id').eq('tenant_id', targetTenantId).eq('status', 'active'); } catch { return { data: null }; } })()
                    : (async () => { try { return await supabaseForma.from('tenant_members').select('id, user_id').eq('status', 'active'); } catch { return { data: null }; } })()),
            isAdidaya
                ? (async () => { try { return await supabaseAdidaya.from('profiles').select('id, department_id, department').neq('account_type', 'system'); } catch { return { data: null }; } })()
                : (isValidUUID(targetTenantId)
                    ? (async () => { try { return await supabaseForma.from('profiles').select('id, department_id, department').eq('tenant_id', targetTenantId).neq('account_type', 'system'); } catch { return { data: null }; } })()
                    : (async () => { try { return await supabaseForma.from('profiles').select('id, department_id, department').neq('account_type', 'system'); } catch { return { data: null }; } })()),
            isAdidaya
                ? (async () => { try { return await supabaseAdidaya.from('organization_departments').select('*').order('order_index', { ascending: true }); } catch { return { data: null }; } })()
                : (isValidUUID(targetTenantId)
                    ? (async () => { try { return await supabaseForma.from('organization_departments').select('*').or(`tenant_id.eq.${targetTenantId},workspace_id.eq.${targetWorkspaceId}`).order('order_index', { ascending: true }); } catch { return { data: null }; } })()
                    : (async () => { try { return await supabaseForma.from('organization_departments').select('*').order('order_index', { ascending: true }); } catch { return { data: null }; } })()),
            getProjects(isAdidaya ? 'adidaya-primary-tenant' : (targetWorkspaceId || targetTenantId || workspaceId || undefined)).catch(() => []),
            AsyncStorage.getItem(`${MANUAL_CHANNELS_KEY}${wsKey}`).catch(() => null),
            getChatProfiles(targetTenantId).catch(() => []),
            isAdidaya
                ? (async () => { try { return await supabaseAdidaya.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(60); } catch { return { data: null }; } })()
                : (isValidUUID(targetTenantId)
                    ? (async () => { try { return await supabaseForma.from('chat_messages').select('*').eq('tenant_id', targetTenantId).order('created_at', { ascending: false }).limit(60); } catch { return { data: null }; } })()
                    : Promise.resolve({ data: null })),
            isAdidaya
                ? (async () => { try { return await supabaseAdidaya.from('chat_channels').select('*'); } catch { return { data: null }; } })()
                : (isValidUUID(targetTenantId)
                    ? (async () => { try { return await supabaseForma.from('chat_channels').select('*').or(`tenant_id.eq.${targetTenantId},workspace_id.eq.${targetWorkspaceId}`); } catch { return { data: null }; } })()
                    : (async () => { try { return await supabaseForma.from('chat_channels').select('*'); } catch { return { data: null }; } })()),
        ]);

        // 1. General Channel (Dedicated per tenant)
        let tenantMembersCount = 1;
        if (tmRes.data && tmRes.data.length > 0) {
            tenantMembersCount = tmRes.data.length;
        }

        const dbGeneral = chatChannelsRes.data?.find((c: any) => c.category === 'general' || c.code === '#000-gen' || c.id === '000-general' || c.id === 'general-channel');
        const generalChannelId = dbGeneral?.id || (isAdidaya ? '000-general' : 'general-channel');

        const generalChannel: ChatChannel = {
            ...DEFAULT_GENERAL_CHANNEL,
            id: generalChannelId,
            name: dbGeneral?.name || 'General Channel',
            code: dbGeneral?.code || '#000-gen',
            description: dbGeneral?.description || 'Workspace announcements and general team discussion.',
            membersCount: tenantMembersCount,
            lastUpdatedAt: undefined,
            membership: {
                status: 'active',
                role: isSuperAdmin ? 'admin' : 'member',
                joinedAt: userProfile?.join_date || new Date().toISOString(),
                canWrite: true,
                canReadHistory: true,
            },
        };

        // Guarantee General Channel exists in Supabase for this tenant
        try {
            await targetClient.from('chat_channels').upsert([{
                id: generalChannelId,
                name: generalChannel.name,
                code: generalChannel.code,
                description: generalChannel.description,
                category: 'general',
                tenant_id: isAdidaya ? '0b29e53c-1419-4764-95e0-fc52c5ee45da' : (isValidUUID(targetTenantId) ? targetTenantId : null),
                workspace_id: isAdidaya ? 'f39364e8-1376-4ff7-a716-78277e8d25b3' : (isValidUUID(targetWorkspaceId) ? targetWorkspaceId : null),
                is_archived: false,
            }], { onConflict: 'id' });
        } catch (_) {}

        // 2. Department member count mapping
        const deptCountsMap: Record<string, number> = {};
        if (deptProfilesRes.data) {
            deptProfilesRes.data.forEach((p: any) => {
                if (p.department_id) {
                    deptCountsMap[p.department_id] = (deptCountsMap[p.department_id] || 0) + 1;
                }
                if (p.department) {
                    const dKey = p.department.trim().toLowerCase();
                    deptCountsMap[dKey] = (deptCountsMap[dKey] || 0) + 1;
                }
            });
        }

        // 3. Department Channels (Strictly from DB organization_departments + chat_channels)
        const deptChannels: ChatChannel[] = [];
        const seenDeptIds = new Set<string>();
        const rawDepts = deptsRes.data || [];

        if (rawDepts.length > 0) {
            const deptUpsertPayloads: any[] = [];
            for (let i = 0; i < rawDepts.length; i++) {
                const d = rawDepts[i];
                const numVal = parseInt(String(d.cluster_code ?? (i + 1)), 10) || (i + 1);
                const codeNum = String(numVal).padStart(3, '0');
                const codeTag = (d.code || d.name || 'dep').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 4);
                const channelCode = `#${codeNum}-${codeTag}`.toLowerCase();
                const dNameLower = (d.name || '').trim().toLowerCase();
                const dCount = deptCountsMap[d.id] || deptCountsMap[dNameLower] || 1;

                const deptChannelId = `dept-${d.id}`;
                seenDeptIds.add(deptChannelId);
                deptUpsertPayloads.push({
                    id: deptChannelId,
                    name: d.name || 'Department',
                    code: channelCode,
                    description: d.description || 'Department discussions and announcements.',
                    category: 'department',
                    department_id: isValidUUID(d.id) ? d.id : null,
                    tenant_id: isValidUUID(d.tenant_id) ? d.tenant_id : (isValidUUID(targetTenantId) ? targetTenantId : null),
                    workspace_id: isValidUUID(d.workspace_id) ? d.workspace_id : (isValidUUID(targetWorkspaceId) ? targetWorkspaceId : null),
                    is_archived: false,
                });

                deptChannels.push({
                    id: deptChannelId,
                    code: channelCode,
                    name: d.name || 'Department',
                    senderName: '',
                    lastMessageText: d.description || 'Department discussions and announcements.',
                    time: '',
                    unreadCount: 0,
                    membersCount: dCount,
                    category: 'department',
                    departmentId: d.id,
                    status: 'active',
                    isRecent: false,
                    channelNumber: numVal,
                    membership: {
                        status: 'active',
                        role: isSuperAdmin ? 'admin' : 'member',
                        joinedAt: userProfile?.join_date || new Date().toISOString(),
                        canWrite: true,
                        canReadHistory: true,
                    },
                });
            }

            if (deptUpsertPayloads.length > 0) {
                targetClient.from('chat_channels').upsert(deptUpsertPayloads, { onConflict: 'id' }).then(() => {}, () => {});
            }
        }

        // Include any department channels already stored in chat_channels table
        if (chatChannelsRes.data) {
            chatChannelsRes.data.forEach((c: any) => {
                if ((c.category === 'department' || c.id.startsWith('dept-')) && !seenDeptIds.has(c.id)) {
                    seenDeptIds.add(c.id);
                    const codeNum = parseInt(c.code?.replace(/[^0-9]/g, '') || '1', 10) || 1;
                    deptChannels.push({
                        id: c.id,
                        code: c.code || `#${String(codeNum).padStart(3, '0')}-dep`,
                        name: c.name || 'Department',
                        senderName: '',
                        lastMessageText: c.description || 'Department discussions and announcements.',
                        time: '',
                        unreadCount: 0,
                        membersCount: 1,
                        category: 'department',
                        departmentId: c.department_id || c.id.replace('dept-', ''),
                        status: c.is_archived ? 'archived' : 'active',
                        isRecent: false,
                        channelNumber: codeNum,
                        membership: {
                            status: 'active',
                            role: isSuperAdmin ? 'admin' : 'member',
                            joinedAt: c.created_at || new Date().toISOString(),
                            canWrite: true,
                            canReadHistory: true,
                        },
                    });
                }
            });
        }

        // 4. Project Channels (Strictly from realProjects in DB + chat_channels table)
        const projectChannels: ChatChannel[] = [];
        const seenProjIds = new Set<string>();
        const projectsToUse = (realProjects && realProjects.length > 0) ? realProjects : [];

        if (projectsToUse.length > 0) {
            const projUpsertPayloads: any[] = [];
            projectsToUse.forEach((p: any, index: number) => {
                const numStr = p.number || (p as any).project_number || (p as any).code_number;
                const numVal = numStr && !isNaN(Number(numStr)) ? Number(numStr) : (index + 1);
                const codeNum = String(numVal).padStart(3, '0');
                const rawCode = p.code || (p as any).project_code || (p as any).short_name || 'prj';
                const codeTag = rawCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'prj';
                const channelCode = `#${codeNum}-${codeTag}`.toLowerCase();
                const projectName = p.title || (p as any).project_name || (p as any).name || 'Project Channel';

                const rawHeroUrl = (typeof p.heroImage === 'string' ? p.heroImage : p.heroImage?.uri) || (p as any).hero_image_url || p.meta?.hero_image_url || p.meta?.heroImage || p.meta?.avatarUrl || undefined;
                const projectHeroUrl = rawHeroUrl && typeof rawHeroUrl === 'string' && !rawHeroUrl.startsWith('file://') ? rawHeroUrl : undefined;

                const projChannelId = `proj-${p.id || index}`;
                seenProjIds.add(projChannelId);

                const validProjId = isValidUUID(p.id) ? p.id : null;
                const validTenantId = isAdidaya
                    ? '0b29e53c-1419-4764-95e0-fc52c5ee45da'
                    : (isValidUUID(p.tenantId || (p as any).tenant_id) ? (p.tenantId || (p as any).tenant_id) : (isValidUUID(targetTenantId) ? targetTenantId : null));
                const validWorkspaceId = isAdidaya
                    ? 'f39364e8-1376-4ff7-a716-78277e8d25b3'
                    : (isValidUUID(p.workspaceId || (p as any).workspace_id) ? (p.workspaceId || (p as any).workspace_id) : (isValidUUID(targetWorkspaceId) ? targetWorkspaceId : null));

                projUpsertPayloads.push({
                    id: projChannelId,
                    name: projectName,
                    code: channelCode,
                    description: (p as any).description || `Project discussion for ${projectName}`,
                    category: 'project',
                    project_id: validProjId,
                    tenant_id: validTenantId,
                    workspace_id: validWorkspaceId,
                    is_archived: !!(p as any).isArchived,
                });

                projectChannels.push({
                    id: projChannelId,
                    code: channelCode,
                    name: projectName,
                    senderName: '',
                    lastMessageText: (p as any).description || 'No messages in this channel yet.',
                    time: '',
                    unreadCount: 0,
                    membersCount: 1,
                    category: 'project',
                    projectId: p.id,
                    avatarUrl: projectHeroUrl,
                    status: (p as any).isArchived ? 'archived' : 'active',
                    isRecent: false,
                    channelNumber: numVal,
                    membership: {
                        status: 'active',
                        role: isSuperAdmin ? 'admin' : 'member',
                        joinedAt: p.lastActivityAt || new Date().toISOString(),
                        canWrite: true,
                        canReadHistory: true,
                    },
                });
            });

            if (projUpsertPayloads.length > 0) {
                targetClient.from('chat_channels').upsert(projUpsertPayloads, { onConflict: 'id' }).then(() => {}, () => {});
            }
        }

        // Include any project channels already stored in chat_channels table
        if (chatChannelsRes.data) {
            chatChannelsRes.data.forEach((c: any) => {
                if ((c.category === 'project' || c.id.startsWith('proj-')) && !seenProjIds.has(c.id)) {
                    seenProjIds.add(c.id);
                    const codeNum = parseInt(c.code?.replace(/[^0-9]/g, '') || '1', 10) || 1;
                    const dbAvatar = c.meta?.avatar_url || c.meta?.heroImage;
                    projectChannels.push({
                        id: c.id,
                        code: c.code || `#${String(codeNum).padStart(3, '0')}-prj`,
                        name: c.name || 'Project Channel',
                        senderName: '',
                        lastMessageText: c.description || 'No messages in this channel yet.',
                        time: '',
                        unreadCount: 0,
                        membersCount: 1,
                        category: 'project',
                        projectId: c.project_id || c.id.replace('proj-', ''),
                        avatarUrl: dbAvatar,
                        status: c.is_archived ? 'archived' : 'active',
                        isRecent: false,
                        channelNumber: codeNum,
                        membership: {
                            status: 'active',
                            role: isSuperAdmin ? 'admin' : 'member',
                            joinedAt: c.created_at || new Date().toISOString(),
                            canWrite: true,
                            canReadHistory: true,
                        },
                    });
                }
            });
        }

        // 5. Manual & Custom Channels (Merge Supabase chat_channels + local cache with auto-repair of generic names)
        let manualChannels: ChatChannel[] = [];
        const seenManualIds = new Set<string>();

        const storedManualMap: Record<string, ChatChannel> = {};
        if (storedManual) {
            try {
                const parsed: ChatChannel[] = JSON.parse(storedManual);
                parsed.forEach(ch => {
                    if (ch && ch.id) storedManualMap[ch.id] = ch;
                });
            } catch {
                // ignore
            }
        }

        if (chatChannelsRes.data) {
            chatChannelsRes.data.forEach((c: any) => {
                if (
                    !seenDeptIds.has(c.id) &&
                    !seenProjIds.has(c.id) &&
                    c.id !== 'general-channel' &&
                    c.id !== '000-general' &&
                    c.category !== 'general'
                ) {
                    seenManualIds.add(c.id);
                    const localCh = storedManualMap[c.id];
                    let chName = c.name;
                    if (!chName || chName === 'Channel' || chName === 'New Channel' || chName.startsWith('custom-') || chName === c.id) {
                        chName = localCh?.name || c.meta?.name || c.meta?.title || (c.description ? c.description.slice(0, 24) : `Channel ${c.id.replace(/[^0-9]/g, '').slice(-4) || '1'}`);
                    }
                    let chCode = c.code;
                    if (!chCode || chCode === '#channel' || chCode.startsWith('#custom-') || chCode === `#${c.id.slice(0, 10)}`) {
                        const codeNum = c.id.replace(/[^0-9]/g, '').slice(-3) || '010';
                        const codeTag = (chName || 'chan').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 4);
                        chCode = localCh?.code || c.meta?.code || `#${codeNum}-${codeTag}`;
                    }
                    const chDesc = c.description || localCh?.description;

                    // If local channel had real name but DB had generic/ID name, auto-repair in DB
                    if ((c.name === 'Channel' || c.name === c.id || c.name?.startsWith('custom-')) && localCh?.name && !localCh.name.startsWith('custom-')) {
                        createOrUpdateChatChannel({
                            id: c.id,
                            name: localCh.name,
                            code: localCh.code || chCode,
                            description: localCh.description,
                            category: 'manual',
                            tenantId: c.tenant_id,
                            workspaceId: c.workspace_id,
                        }).catch(() => {});
                    }

                    manualChannels.push({
                        id: c.id,
                        code: chCode,
                        name: chName,
                        description: chDesc,
                        senderName: '',
                        lastMessageText: chDesc || 'No messages in this channel yet.',
                        time: '',
                        unreadCount: 0,
                        membersCount: 1,
                        category: 'manual',
                        status: c.is_archived ? 'archived' : 'active',
                        isRecent: true,
                        isCustom: true,
                        createdBy: c.created_by,
                        channelNumber: parseInt(chCode.replace(/[^0-9]/g, '') || '10', 10) || 10,
                        lastUpdatedAt: c.updated_at ? new Date(c.updated_at).getTime() : undefined,
                        membership: {
                            status: 'active',
                            role: 'admin',
                            canWrite: true,
                            canReadHistory: true,
                            joinedAt: c.created_at || new Date().toISOString(),
                        },
                    });
                }
            });
        }

        // Add any remaining local custom channels not yet in DB and sync them up
        Object.values(storedManualMap).forEach(ch => {
            if (!seenManualIds.has(ch.id) && (isSuperAdmin || ch.membership?.status !== 'none')) {
                seenManualIds.add(ch.id);
                manualChannels.push(ch);
                createOrUpdateChatChannel({
                    id: ch.id,
                    name: ch.name,
                    code: ch.code,
                    description: ch.description,
                    category: 'manual',
                    tenantId,
                    workspaceId,
                    userId,
                }).catch(() => {});
            }
        });

        // 6. Latest messages map and DB channel metadata map
        const dbChannelsMap: Record<string, any> = {};
        if (chatChannelsRes.data) {
            chatChannelsRes.data.forEach((c: any) => {
                if (c.id) dbChannelsMap[c.id] = c;
            });
        }

        const latestMsgMap: Record<string, { sender: string; senderUserId?: string; text: string; time: string; timestamp: number }> = {};
        if (recentMsgsRes.data) {
            recentMsgsRes.data.forEach((rawRow: DBChatMessageRow) => {
                const row = { ...rawRow, user_id: rawRow.user_id || (rawRow as any).sender_id, text: rawRow.text ?? (rawRow as any).content ?? '' };
                if (!latestMsgMap[row.channel_id]) {
                    const preview = formatMessagePreviewSnippet(row);
                    latestMsgMap[row.channel_id] = {
                        sender: resolvePreviewName(row.sender_name, row.user_id),
                        senderUserId: row.user_id || undefined,
                        text: preview,
                        time: row.created_at ? formatMessageTime(row.created_at) : '',
                        timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
                    };
                }
            });
        }

        // 7. Combine and attach snippets
        const allAccessible = [generalChannel, ...deptChannels, ...projectChannels, ...manualChannels];
        const enriched = await Promise.all(
            allAccessible.map(async (ch) => {
                const dbCh = dbChannelsMap[ch.id];
                // Do NOT let generic placeholder text overwrite actual department / project / general names
                let name = ch.name;
                if (
                    dbCh?.name &&
                    dbCh.name !== 'Department Channel' &&
                    dbCh.name !== 'Channel' &&
                    dbCh.name !== 'New Channel' &&
                    dbCh.name !== 'Project Channel' &&
                    !dbCh.name.startsWith('custom-') &&
                    dbCh.name !== dbCh.id &&
                    dbCh.name.trim().length > 0
                ) {
                    name = dbCh.name;
                }
                let code = ch.code;
                if (
                    dbCh?.code &&
                    dbCh.code !== '#dept' &&
                    dbCh.code !== '#channel' &&
                    dbCh.code !== '#proj' &&
                    !dbCh.code.startsWith('#custom-') &&
                    dbCh.code !== `#${dbCh.id?.slice(0, 10)}` &&
                    dbCh.code.trim().length > 0
                ) {
                    code = dbCh.code;
                }
                let description = dbCh?.description || ch.description || '';
                let lastMessageText = ch.lastMessageText || 'No messages in this channel yet.';
                // For project channels, prefer the project heroImage; DB meta only overrides with valid HTTPS
                const dbAvatar = dbCh?.meta?.avatar_url;
                const validDbAvatar = dbAvatar && typeof dbAvatar === 'string' && dbAvatar.startsWith('http') ? dbAvatar : undefined;
                let avatarUrl = ch.category === 'project'
                    ? (validDbAvatar || ch.avatarUrl)
                    : (validDbAvatar || dbAvatar || ch.avatarUrl);

                // Filter out file:// URIs — they don't work cross-device
                if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('file://')) {
                    avatarUrl = ch.avatarUrl; // fallback to original (project hero, etc.)
                }

                // Load custom metadata if channel was renamed/edited locally
                try {
                    const metaRaw = await AsyncStorage.getItem(`forma_channel_meta_v7_${wsKey}_${ch.id}`);
                    if (metaRaw) {
                        const parsed = JSON.parse(metaRaw);
                        if (parsed.name) name = parsed.name;
                        if (parsed.code) code = parsed.code;
                        if (parsed.description) description = parsed.description;
                    }
                    const localAvatar = await AsyncStorage.getItem(`forma_channel_avatar_v7_${wsKey}_${ch.id}`);
                    if (localAvatar && !avatarUrl && typeof localAvatar === 'string' && localAvatar.startsWith('http')) {
                        avatarUrl = localAvatar;
                    }
                } catch (_) {}

                const batchMsg = isAdidaya
                    ? (latestMsgMap[ch.id] || (ch.id === '000-general' || ch.id === '#000-gen' ? (latestMsgMap['000-general'] || latestMsgMap['#000-gen'] || latestMsgMap['gen']) : null))
                    : (latestMsgMap[ch.id] || (ch.id === 'general-channel' ? latestMsgMap['general-channel'] : null));

                if (batchMsg) {
                    return {
                        ...ch,
                        name,
                        code,
                        description,
                        avatarUrl,
                        senderName: resolvePreviewName(batchMsg.sender, batchMsg.senderUserId),
                        senderUserId: batchMsg.senderUserId,
                        lastMessageText: batchMsg.text || lastMessageText,
                        time: batchMsg.time,
                        isRecent: true,
                        lastUpdatedAt: batchMsg.timestamp,
                    };
                }
                return {
                    ...ch,
                    name,
                    code,
                    description,
                    avatarUrl,
                    lastMessageText,
                };
            })
        );

        const deletedChannelIds = await getDeletedChannelIds(wsKey);
        const validChannels = enriched.filter(ch => !deletedChannelIds.has(ch.id) && (!ch.code || !deletedChannelIds.has(ch.code)));

        // Cache result for 0ms next load
        memoryAccessibleChannelsCache[wsKey] = validChannels;
        AsyncStorage.setItem(`${ACCESSIBLE_CACHE_KEY}${wsKey}`, JSON.stringify(validChannels)).catch(() => {});

        return validChannels;
    } catch (err) {
        console.error('Error in getUserAccessibleChannels:', err);
        return memoryAccessibleChannelsCache[wsKey] || INITIAL_FALLBACK_CHANNELS;
    }
}

// ----------------------------------------------------------------------
// CHAT MESSAGES QUERY & MUTATION
// ----------------------------------------------------------------------

/**
 * Instantly get cached messages for a channel in 0ms (Stale-While-Revalidate)
 */
export async function getCachedChannelMessages(
    channelId: string,
    currentUserId?: string | null,
    membership?: ChannelMembershipInfo,
    tenantId?: string | null
): Promise<ChatMessage[]> {
    if (!channelId) return [];
    const isAdidaya = isAdidayaTenant(tenantId);
    const tenantKey = isAdidaya ? 'adidaya' : (tenantId || 'default');
    const effectiveChannelId = (channelId === 'general-channel' && isAdidaya) ? '000-general' : (channelId === '000-general' && !isAdidaya) ? 'general-channel' : channelId;
    const cacheKey = `${STORAGE_PREFIX}${tenantKey}_${effectiveChannelId}`;
    try {
        const deletedIds = await getUserDeletedMessageIds(currentUserId);
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            let parsed: ChatMessage[] = JSON.parse(cached);
            if (membership?.leftAt) {
                const cutoffTime = new Date(membership.leftAt).getTime();
                parsed = parsed.filter(msg => {
                    if (!msg.createdAt) return true;
                    return new Date(msg.createdAt).getTime() <= cutoffTime;
                });
            }
            return parsed
                .filter(msg => !deletedIds.has(msg.id))
                .map(msg => {
                    const prof = resolveProfile(msg.userId, msg.sender);
                    return {
                        ...msg,
                        sender: prof?.full_name || resolveFullName(msg.sender, msg.userId),
                        role: prof?.role || msg.role,
                        avatarUrl: prof?.avatar_url || msg.avatarUrl,
                        isSelf: currentUserId ? (msg.isSelf || false) : false,
                    };
                });
        }
    } catch {
        // ignore
    }
    return [];
}

/**
 * Fetch messages for a specific channel with Former Member access cutoff.
 * Rule 6: Former members can view history up to `left_at`, cannot see messages after `left_at`.
 */
export async function getChannelMessages(
    channelId: string,
    currentUserId?: string | null,
    membership?: ChannelMembershipInfo,
    tenantId?: string | null
): Promise<ChatMessage[]> {
    if (!channelId) return [];

    // If no access, reject
    if (membership && membership.status === 'none') {
        return [];
    }

    const isAdidaya = isAdidayaTenant(tenantId);
    const tenantKey = isAdidaya ? 'adidaya' : (tenantId || 'default');
    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;
    const effectiveChannelId = (channelId === 'general-channel' && isAdidaya) ? '000-general' : (channelId === '000-general' && !isAdidaya) ? 'general-channel' : channelId;
    const cacheKey = `${STORAGE_PREFIX}${tenantKey}_${effectiveChannelId}`;

    let remoteMessages: ChatMessage[] | null = null;

    try {
        // Pre-fetch profiles, user deleted message IDs, and locally marked edited IDs in parallel
        const [, deletedIds, editedIds, queryRes] = await Promise.all([
            getChatProfiles(),
            getUserDeletedMessageIds(currentUserId),
            getEditedMessageIds(),
            (() => {
                let q = targetClient
                    .from('chat_messages')
                    .select('*')
                    .eq('channel_id', effectiveChannelId)
                    .order('created_at', { ascending: true });

                if (!isAdidaya && isValidUUID(tenantId)) {
                    q = q.eq('tenant_id', tenantId);
                }

                if (membership?.leftAt) {
                    q = q.lte('created_at', membership.leftAt);
                }
                return q;
            })()
        ]);

        const { data, error } = queryRes;

        if (!error && data) {
            remoteMessages = data
                .filter((row: DBChatMessageRow) => !deletedIds.has(row.id))
                .map((row: DBChatMessageRow) => transformRowToChatMessage(row, currentUserId, editedIds));

            // Merge with local cached messages to preserve client metadata
            const cached = await AsyncStorage.getItem(cacheKey);
            const localList: ChatMessage[] = cached ? JSON.parse(cached) : [];
            const localMap = new Map(localList.map(m => [m.id, m]));

            const mergedRemote = remoteMessages.map(rem => {
                const loc = localMap.get(rem.id);
                const wasEditedLocally = editedIds.has(rem.id);
                if (loc) {
                    return {
                        ...rem,
                        isEdited: rem.isEdited || loc.isEdited || wasEditedLocally || false,
                        isForwarded: rem.isForwarded || loc.isForwarded || false,
                        forwardedFrom: rem.forwardedFrom || loc.forwardedFrom || undefined,
                    };
                }
                return {
                    ...rem,
                    isEdited: rem.isEdited || wasEditedLocally || false,
                };
            });

            const remoteIds = new Set(mergedRemote.map(m => m.id));
            const unsyncedLocals = localList.filter(m => !remoteIds.has(m.id) && !deletedIds.has(m.id));
            const merged = [...mergedRemote, ...unsyncedLocals];
            merged.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
            });

            // Cache locally strictly per tenant
            await AsyncStorage.setItem(cacheKey, JSON.stringify(merged));
            if (merged.length > 0) {
                const last = merged[merged.length - 1];
                await AsyncStorage.setItem(`${LAST_MSG_PREFIX}${tenantKey}_${effectiveChannelId}`, JSON.stringify({
                    sender: last.sender,
                    text: formatMessagePreviewSnippet(last),
                    time: last.time,
                    timestamp: last.createdAt ? new Date(last.createdAt).getTime() : Date.now(),
                }));
            }
            return merged;
        }
    } catch (err) {
        console.warn('Supabase chat query failed, reading local cache:', err);
    }

    // Fallback to local storage
    return getCachedChannelMessages(channelId, currentUserId, membership);
}

/**
 * Send a new chat message. Enforces active membership (Rule 5 & 6).
 */
/**
 * Ensure channel record exists in Supabase chat_channels before adding messages or members.
 */
export async function ensureChatChannelExists(
    channelId: string,
    metadata?: {
        name?: string;
        code?: string;
        category?: 'general' | 'department' | 'project' | 'manual';
        tenantId?: string | null;
        workspaceId?: string | null;
        userId?: string | null;
    }
): Promise<void> {
    if (!channelId) return;

    try {
        const rawTenantId = metadata?.tenantId;
        const isAdidaya = isAdidayaTenant(rawTenantId);
        const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;

        const validTenantId = isAdidaya
            ? '0b29e53c-1419-4764-95e0-fc52c5ee45da'
            : resolveValidTenantId(rawTenantId);
        const validWorkspaceId = isAdidaya
            ? 'f39364e8-1376-4ff7-a716-78277e8d25b3'
            : resolveValidWorkspaceId(metadata?.workspaceId, validTenantId);

        let category: 'general' | 'department' | 'project' | 'manual' = metadata?.category || 'manual';
        let code = metadata?.code;
        let name = metadata?.name;
        let deptId: string | null = null;
        let projId: string | null = null;

        if (channelId === 'general-channel' || channelId === '000-general' || channelId.includes('gen')) {
            category = 'general';
            code = code || '#000-gen';
            name = name || 'General Channel';
        } else if (channelId.startsWith('dept-')) {
            category = 'department';
            deptId = channelId.replace('dept-', '');
            if (!name || !code || name === 'Department Channel' || code === '#dept') {
                try {
                    const { data: deptData } = await targetClient
                        .from('organization_departments')
                        .select('id, name, code, cluster_code')
                        .eq('id', deptId)
                        .maybeSingle();
                    if (deptData) {
                        const numVal = parseInt(String(deptData.cluster_code ?? '1'), 10) || 1;
                        const codeNum = String(numVal).padStart(3, '0');
                        const codeTag = (deptData.code || deptData.name || 'dep').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                        code = `#${codeNum}-${codeTag}`.toLowerCase();
                        name = deptData.name || 'Department';
                    }
                } catch {
                    // ignore
                }
            }
            code = code || `#dept-${deptId.slice(0, 4)}`;
            name = name || 'Department';
        } else if (channelId.startsWith('proj-')) {
            category = 'project';
            projId = channelId.replace('proj-', '');
            if (!name || !code || name === 'Project Channel' || code === '#proj') {
                try {
                    const { data: projData } = await targetClient
                        .from('projects')
                        .select('id, title, name, project_name, number, code')
                        .eq('id', projId)
                        .maybeSingle();
                    if (projData) {
                        name = projData.title || projData.name || projData.project_name || 'Project';
                        code = `#${projData.code || projData.number || 'proj'}`;
                    }
                } catch {
                    // ignore
                }
            }
            code = code || `#proj-${projId.slice(0, 4)}`;
            name = name || 'Project';
        }

        // 1. Check if channel already exists in Supabase
        const { data: existing } = await targetClient
            .from('chat_channels')
            .select('id, name, code, tenant_id, workspace_id')
            .eq('id', channelId)
            .maybeSingle();

        if (existing) {
            const updates: any = {};
            if (!existing.tenant_id && validTenantId) {
                updates.tenant_id = validTenantId;
            }
            if (!existing.workspace_id && validWorkspaceId) {
                updates.workspace_id = validWorkspaceId;
            }
            if ((existing.name === 'Channel' || existing.name === existing.id || existing.name?.startsWith('custom-')) && name && !name.startsWith('custom-')) {
                updates.name = name;
                if (code && !code.startsWith('#custom-')) {
                    updates.code = code;
                }
            }
            if (Object.keys(updates).length > 0) {
                await targetClient.from('chat_channels').update(updates).eq('id', channelId);
            }
            return;
        }

        const upsertPayload: any = {
            id: channelId,
            name: name || (channelId === '000-general' || channelId === 'general-channel' ? 'General Channel' : channelId),
            code: code || (channelId === '000-general' || channelId === 'general-channel' ? '#000-gen' : `#${channelId.slice(0, 10)}`),
            tenant_id: validTenantId,
            workspace_id: validWorkspaceId,
            category: category,
            department_id: isValidUUID(deptId) ? deptId : null,
            project_id: isValidUUID(projId) ? projId : null,
            created_by: isValidUUID(metadata?.userId) ? metadata!.userId : null,
            is_archived: false,
        };

        await targetClient
            .from('chat_channels')
            .upsert(upsertPayload, { onConflict: 'id' });
    } catch (e) {
        // quiet fallback
    }
}

/**
 * Create or update a chat channel in Supabase and broadcast to all devices in realtime.
 */
export async function createOrUpdateChatChannel(channel: {
    id: string;
    name: string;
    code: string;
    description?: string;
    category?: ChannelCategory;
    tenantId?: string | null;
    workspaceId?: string | null;
    userId?: string | null;
}): Promise<void> {
    const rawTenantId = channel.tenantId;
    const isAdidaya = isAdidayaTenant(rawTenantId);
    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;

    const validTenantId = isAdidaya
        ? '0b29e53c-1419-4764-95e0-fc52c5ee45da'
        : resolveValidTenantId(rawTenantId);
    const validWorkspaceId = isAdidaya
        ? 'f39364e8-1376-4ff7-a716-78277e8d25b3'
        : resolveValidWorkspaceId(channel.workspaceId, validTenantId);

    const payload: any = {
        id: channel.id,
        name: channel.name,
        code: channel.code,
        description: channel.description || null,
        category: channel.category || 'manual',
        tenant_id: validTenantId,
        workspace_id: validWorkspaceId,
        created_by: isValidUUID(channel.userId) ? channel.userId : null,
        is_archived: false,
        updated_at: new Date().toISOString(),
    };

    try {
        await targetClient.from('chat_channels').upsert(payload, { onConflict: 'id' });

        // Broadcast realtime update to all devices
        const globalChan = targetClient.channel('global_chat_broadcast');
        if (typeof (globalChan as any).httpSend === 'function') {
            (globalChan as any).httpSend({
                type: 'broadcast',
                event: 'channel_activity',
                payload: { channelId: channel.id, isChannelUpdate: true },
            }).catch(() => {});
        } else {
            globalChan.send({
                type: 'broadcast',
                event: 'channel_activity',
                payload: { channelId: channel.id, isChannelUpdate: true },
            }).catch(() => {});
        }
    } catch (e) {
        console.warn('Failed to upsert chat_channels in Supabase:', e);
    }
}

export async function sendChatMessage(
    channelIdOrPayload: string | any,
    maybePayload?: {
        text?: string;
        message?: string;
        userId?: string | null;
        user_id?: string | null;
        senderName?: string;
        sender_name?: string;
        senderRole?: string;
        sender_role?: string;
        avatarBg?: string;
        avatar_bg?: string;
        workspaceId?: string | null;
        workspace_id?: string | null;
        tenantId?: string | null;
        tenant_id?: string | null;
        replyTo?: { messageId?: string; sender: string; text: string };
        attachment?: ChatAttachment;
        attachments?: ChatAttachment[];
        media?: ChatMedia;
        linkedRecord?: { type: string; title: string; id: string };
        isAnnouncement?: boolean;
        isForwarded?: boolean;
        forwardedFrom?: string;
        membership?: ChannelMembershipInfo;
    }
): Promise<ChatMessage> {
    const channelId = typeof channelIdOrPayload === 'string'
        ? channelIdOrPayload
        : (channelIdOrPayload?.channel_id || channelIdOrPayload?.channelId || '');
    
    const payload = (typeof channelIdOrPayload === 'object' && channelIdOrPayload !== null)
        ? channelIdOrPayload
        : (maybePayload || {});

    // Enforce Rule 5 & 6: Former members or non-members cannot send new messages
    if (payload.membership && !payload.membership.canWrite) {
        throw new Error('You do not have permission to send messages in this channel.');
    }

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();

    const attachmentsList = payload.attachments || (payload.attachment ? [payload.attachment] : []);

    const rawUserId = payload.userId || payload.user_id || null;
    const rawTenantId = payload.tenantId || payload.tenant_id || null;
    const rawWorkspaceId = payload.workspaceId || payload.workspace_id || null;

    const dbRow: any = {
        id: msgId,
        channel_id: channelId,
        workspace_id: isValidUUID(rawWorkspaceId) ? rawWorkspaceId : null,
        tenant_id: isValidUUID(rawTenantId) ? rawTenantId : null,
        user_id: isValidUUID(rawUserId) ? rawUserId : null,
        sender_name: payload.senderName || payload.sender_name || 'Member',
        sender_role: payload.senderRole || payload.sender_role || null,
        avatar_bg: payload.avatarBg || payload.avatar_bg || '#007AFF',
        text: payload.text || payload.message || '',
        is_pinned: false,
        is_saved: false,
        is_announcement: !!payload.isAnnouncement,
        is_forwarded: !!payload.isForwarded,
        forwarded_from: payload.forwardedFrom || null,
        reply_to: payload.replyTo || null,
        attachments: attachmentsList.length > 0 ? attachmentsList : null,
        media: payload.media || null,
        linked_record: payload.linkedRecord || null,
        reactions: [],
        created_at: nowIso,
        updated_at: nowIso,
    };

    const newChatMessage = transformRowToChatMessage(dbRow, payload.userId);
    newChatMessage.isForwarded = !!payload.isForwarded;
    newChatMessage.forwardedFrom = payload.forwardedFrom || undefined;

    const isAdidaya = isAdidayaTenant(rawTenantId);
    const tenantKey = isAdidaya ? 'adidaya' : (rawTenantId || 'default');
    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;
    const cacheKey = `${STORAGE_PREFIX}${tenantKey}_${channelId}`;

    // 2. Insert into Supabase
    try {
        await ensureChatChannelExists(channelId, {
            tenantId: payload.tenantId,
            workspaceId: payload.workspaceId,
            userId: payload.userId,
        });

        const { data: auth, error: authError } = await targetClient.auth.getUser();
        if (authError || !auth.user || auth.user.id !== rawUserId) throw new Error('Sesi Chat tidak valid. Silakan masuk kembali.');
        const storedAttachments = [...attachmentsList];
        if (payload.media && !storedAttachments.length) {
            const media = payload.media;
            const urls = media.thumbnails?.length ? media.thumbnails : [media.thumbnailUri];
            urls.filter(Boolean).forEach((url: string, index: number) => storedAttachments.push({
                id: msgId + '-' + index, name: media.title || 'Media', size: '', uri: url, url, type: media.type,
            } as ChatAttachment));
        }
        const storedRow = isAdidaya ? {
            id: msgId, channel_id: channelId, sender_id: auth.user.id,
            sender_name: dbRow.sender_name, sender_role: dbRow.sender_role,
            content: dbRow.text, is_pinned: false,
            attachments: storedAttachments.length ? storedAttachments : null,
            created_at: nowIso, updated_at: nowIso,
        } : dbRow;
        const { error } = await targetClient.from('chat_messages').insert(storedRow);
        if (error) throw new Error(error.message);
    // 1. Save to local storage cache immediately
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        const currentList: ChatMessage[] = cached ? JSON.parse(cached) : [];
        const updatedList = [...currentList, newChatMessage];
        await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedList));

        // Update last message
        await AsyncStorage.setItem(`${LAST_MSG_PREFIX}${tenantKey}_${channelId}`, JSON.stringify({
            sender: newChatMessage.sender,
            text: formatMessagePreviewSnippet(newChatMessage),
            time: newChatMessage.time,
            timestamp: Date.now(),
        }));
    } catch (e) {
        console.warn('Failed to cache message locally:', e);
    }



        // 3. Broadcast real-time message immediately via WebSocket/REST to all peer devices
        try {
            const roomChan = supabase.channel(`room_${channelId}`);
            if (typeof (roomChan as any).httpSend === 'function') {
                (roomChan as any).httpSend({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: newChatMessage,
                }).catch(() => {});
            } else {
                roomChan.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: newChatMessage,
                }).catch(() => {});
            }

            const globalChan = supabase.channel('global_chat_broadcast');
            if (typeof (globalChan as any).httpSend === 'function') {
                (globalChan as any).httpSend({
                    type: 'broadcast',
                    event: 'channel_activity',
                    payload: { channelId, lastMessage: newChatMessage },
                }).catch(() => {});
            } else {
                globalChan.send({
                    type: 'broadcast',
                    event: 'channel_activity',
                    payload: { channelId, lastMessage: newChatMessage },
                }).catch(() => {});
            }
        } catch (_) {}
    } catch (err) {
        console.warn('Chat message was not saved:', err);
        throw err;
    }

    return newChatMessage;
}

const USER_DELETED_MSGS_PREFIX = '@forma_user_deleted_msgs_';
const GLOBAL_DELETED_MSGS_KEY = '@forma_global_deleted_messages';

/**
 * Get message IDs that the current user deleted for themselves.
 */
export async function getUserDeletedMessageIds(userId?: string | null): Promise<Set<string>> {
    const set = new Set<string>();
    try {
        const globalStr = await AsyncStorage.getItem(GLOBAL_DELETED_MSGS_KEY);
        if (globalStr) {
            const arr: string[] = JSON.parse(globalStr);
            arr.forEach(id => set.add(id));
        }
    } catch (_) {}

    if (userId) {
        try {
            const local = await AsyncStorage.getItem(`${USER_DELETED_MSGS_PREFIX}${userId}`);
            if (local) {
                const arr: string[] = JSON.parse(local);
                arr.forEach(id => set.add(id));
            }
        } catch (_) {}

        try {
            // Query profiles meta for persistent cross-device deleted messages
            const { data } = await supabase
                .from('profiles')
                .select('meta')
                .eq('id', userId)
                .maybeSingle();
            if (data?.meta?.deleted_message_ids && Array.isArray(data.meta.deleted_message_ids)) {
                data.meta.deleted_message_ids.forEach((id: string) => set.add(id));
                AsyncStorage.setItem(`${USER_DELETED_MSGS_PREFIX}${userId}`, JSON.stringify(Array.from(set))).catch(() => {});
            }
        } catch (_) {}
    }

    return set;
}

/**
 * Delete a chat message for the current user across all their devices.
 */
export async function deleteChatMessageForMe(
    channelId: string,
    messageId: string,
    userId?: string | null,
    tenantId?: string | null
): Promise<void> {
    const cacheKey = getChannelStorageKey(channelId, tenantId);
    // 1. Remove from local channel message cache
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            const currentList: ChatMessage[] = JSON.parse(cached);
            const updated = currentList.filter(m => m.id !== messageId);
            await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
        }
    } catch (e) {
        console.warn('Error updating local cache on delete for me:', e);
    }

    // 2. Add to global & user deleted messages list locally
    try {
        let globalArr: string[] = [];
        const g = await AsyncStorage.getItem(GLOBAL_DELETED_MSGS_KEY);
        if (g) globalArr = JSON.parse(g);
        if (!globalArr.includes(messageId)) {
            globalArr.push(messageId);
            await AsyncStorage.setItem(GLOBAL_DELETED_MSGS_KEY, JSON.stringify(globalArr));
        }
    } catch (_) {}

    if (userId) {
        let deletedSet: string[] = [];
        try {
            const local = await AsyncStorage.getItem(`${USER_DELETED_MSGS_PREFIX}${userId}`);
            if (local) deletedSet = JSON.parse(local);
            if (!deletedSet.includes(messageId)) {
                deletedSet.push(messageId);
                await AsyncStorage.setItem(`${USER_DELETED_MSGS_PREFIX}${userId}`, JSON.stringify(deletedSet));
            }
        } catch (_) {}

        // 3. Persist to Supabase profiles meta
        try {
            const targetClient = getChannelTenantKey(tenantId) === 'adidaya' ? supabaseAdidaya : supabaseForma;
            const { data } = await targetClient
                .from('profiles')
                .select('meta')
                .eq('id', userId)
                .maybeSingle();
            const currentMeta = data?.meta || {};
            const remoteDeleted = Array.isArray(currentMeta.deleted_message_ids) ? [...currentMeta.deleted_message_ids] : [];
            if (!remoteDeleted.includes(messageId)) {
                remoteDeleted.push(messageId);
            }
            await targetClient
                .from('profiles')
                .update({ meta: { ...currentMeta, deleted_message_ids: remoteDeleted } })
                .eq('id', userId);
        } catch (err) {
            console.warn('Error updating remote user deleted messages on profiles:', err);
        }

        // 4. Realtime broadcast for all user's devices
        try {
            const channel = supabase.channel('global_chat_broadcast');
            if (typeof (channel as any).httpSend === 'function') {
                (channel as any).httpSend({
                    type: 'broadcast',
                    event: 'user_deleted_messages_updated',
                    payload: { userId, messageId, channelId },
                }).catch(() => {});
            } else {
                channel.send({
                    type: 'broadcast',
                    event: 'user_deleted_messages_updated',
                    payload: { userId, messageId, channelId },
                }).catch(() => {});
            }
        } catch (_) {}
    }
}

/**
 * Delete a chat message for everyone with a tombstone notice.
 */
export async function deleteChatMessageForEveryone(
    channelId: string,
    messageId: string,
    userId?: string | null,
    tenantId?: string | null
): Promise<void> {
    const deletedText = 'This message was deleted.';
    const cacheKey = getChannelStorageKey(channelId, tenantId);

    // 1. Update local cache
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            const currentList: ChatMessage[] = JSON.parse(cached);
            const updated = currentList.map(m => m.id === messageId ? {
                ...m,
                text: deletedText,
                isDeleted: true,
                hasMedia: false,
                media: undefined,
                attachment: undefined,
                attachments: undefined,
                replyTo: undefined,
                reactions: [],
                isPinned: false,
            } : m);
            await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
        }
    } catch (e) {
        console.warn('Error updating local cache on delete for everyone:', e);
    }

    // 2. Update Supabase
    try {
        const targetClient = getChannelTenantKey(tenantId) === 'adidaya' ? supabaseAdidaya : supabaseForma;
        await targetClient
            .from('chat_messages')
            .update({
                text: deletedText,
                attachments: [],
                media: null,
                reply_to: null,
                reactions: [],
                is_pinned: false,
            })
            .eq('id', messageId);
    } catch (err) {
        console.warn('Supabase delete for everyone error:', err);
    }
}

/**
 * Delete a chat message from Supabase and local cache.
 */
export async function deleteChatMessage(
    channelId: string,
    messageId: string,
    tenantId?: string | null
): Promise<void> {
    const cacheKey = getChannelStorageKey(channelId, tenantId);
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            const currentList: ChatMessage[] = JSON.parse(cached);
            const updated = currentList.filter(m => m.id !== messageId);
            await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
        }
    } catch (e) {
        console.warn('Error updating local cache on delete:', e);
    }

    try {
        const targetClient = getChannelTenantKey(tenantId) === 'adidaya' ? supabaseAdidaya : supabaseForma;
        await targetClient.from('chat_messages').delete().eq('id', messageId);
    } catch (err) {
        console.warn('Supabase delete error:', err);
    }
}

const DELETED_CHANNELS_KEY_PREFIX = '@forma_deleted_channel_ids_v6_';

export async function getDeletedChannelIds(tenantIdOrWsId?: string | null): Promise<Set<string>> {
    const isAdidaya = isAdidayaTenant(tenantIdOrWsId);
    const key = `${DELETED_CHANNELS_KEY_PREFIX}${isAdidaya ? 'adidaya' : (tenantIdOrWsId || 'default')}`;
    const set = new Set<string>();
    try {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
            const arr: string[] = JSON.parse(stored);
            arr.forEach(id => set.add(id));
        }
    } catch (_) {}
    return set;
}

/**
 * Permanently delete a chat channel in the target tenant's Supabase DB and local caches.
 */
export async function deleteChatChannel(
    channelId: string,
    channelCode?: string,
    workspaceId?: string | null
): Promise<void> {
    if (!channelId || channelId === 'general-channel' || channelId === '000-general' || channelId === '000-gen' || channelCode === '#000-gen') {
        return; // General channel cannot be deleted
    }

    const isAdidaya = isAdidayaTenant(workspaceId);
    const key = `${DELETED_CHANNELS_KEY_PREFIX}${isAdidaya ? 'adidaya' : (workspaceId || 'default')}`;
    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;

    try {
        // 1. Mark as deleted locally for this tenant
        const deletedSet = await getDeletedChannelIds(workspaceId);
        deletedSet.add(channelId);
        if (channelCode) deletedSet.add(channelCode);
        await AsyncStorage.setItem(key, JSON.stringify(Array.from(deletedSet)));

        // 2. Delete from the target tenant's DB only
        const idsToPurge = [channelId, channelCode].filter(Boolean) as string[];
        try {
            await targetClient.from('chat_messages').delete().in('channel_id', idsToPurge);
            await targetClient.from('chat_channels').delete().in('id', idsToPurge);
            if (channelCode) {
                await targetClient.from('chat_channels').delete().eq('code', channelCode);
            }
        } catch (_) {}

        // 3. Clear memory caches
        Object.keys(memoryAccessibleChannelsCache).forEach(k => delete memoryAccessibleChannelsCache[k]);

        // 3. Clean up all custom channel local storage keys
        const allKeys = await AsyncStorage.getAllKeys();
        const customChannelKeys = allKeys.filter(k => 
            k.startsWith('forma_chat_custom_channels_v2') || 
            k.startsWith(MANUAL_CHANNELS_KEY) || 
            k.startsWith(ACCESSIBLE_CACHE_KEY)
        );
        for (const k of customChannelKeys) {
            try {
                const stored = await AsyncStorage.getItem(k);
                if (stored) {
                    const list = JSON.parse(stored);
                    if (Array.isArray(list)) {
                        const updated = list.filter((ch: any) => ch.id !== channelId && ch.code !== channelCode);
                        await AsyncStorage.setItem(k, JSON.stringify(updated));
                    }
                }
            } catch (_) {}
        }

        // 4. Clean up channel metadata, avatars, messages, and member storage
        await Promise.all([
            AsyncStorage.removeItem(`${STORAGE_PREFIX}${channelId}`),
            AsyncStorage.removeItem(`forma_chat_messages_${channelId}`),
            AsyncStorage.removeItem(`forma_chat_last_msg_${channelId}`),
            AsyncStorage.removeItem(`forma_channel_meta_${channelId}`),
            AsyncStorage.removeItem(`forma_channel_avatar_${channelId}`),
            AsyncStorage.removeItem(`forma_channel_members_${channelId}`),
        ]);

        // 5. Query and delete attachment files from Supabase Storage
        const clients = Array.from(new Set([supabaseForma, supabaseAdidaya, supabase].filter(Boolean)));
        try {
            for (const client of clients) {
                const { data: msgs } = await client
                    .from('chat_messages')
                    .select('attachments, media')
                    .or(`channel_id.eq.${channelId}${channelCode ? `,channel_id.eq.${channelCode}` : ''}`);

                if (msgs && msgs.length > 0) {
                    const storagePathsToRemove: string[] = [];
                    msgs.forEach((m: any) => {
                        // Check attachments
                        if (Array.isArray(m.attachments)) {
                            m.attachments.forEach((att: any) => {
                                const fileUrl = att.url || att.uri;
                                if (fileUrl && typeof fileUrl === 'string') {
                                    const match = fileUrl.match(/\/storage\/v1\/object\/public\/(chat-attachments|chat|avatars|project-files)\/(.+)$/);
                                    if (match && match[2]) {
                                        storagePathsToRemove.push(decodeURIComponent(match[2]));
                                    }
                                }
                            });
                        }
                        // Check media
                        if (m.media) {
                            const mediaUrl = m.media.thumbnailUri || m.media.uri || m.media.url;
                            if (mediaUrl && typeof mediaUrl === 'string') {
                                const match = mediaUrl.match(/\/storage\/v1\/object\/public\/(chat-attachments|chat|avatars|project-files)\/(.+)$/);
                                if (match && match[2]) {
                                    storagePathsToRemove.push(decodeURIComponent(match[2]));
                                }
                            }
                            if (Array.isArray(m.media.thumbnails)) {
                                m.media.thumbnails.forEach((tUri: string) => {
                                    const match = tUri.match(/\/storage\/v1\/object\/public\/(chat-attachments|chat|avatars|project-files)\/(.+)$/);
                                    if (match && match[2]) {
                                        storagePathsToRemove.push(decodeURIComponent(match[2]));
                                    }
                                });
                            }
                        }
                    });

                    if (storagePathsToRemove.length > 0) {
                        const buckets = ['chat-attachments', 'chat', 'project-files', 'avatars'];
                        for (const b of buckets) {
                            await client.storage.from(b).remove(storagePathsToRemove).catch(() => {});
                        }
                    }
                }
            }
        } catch (storageDelErr) {
            console.warn('Storage cleanup error during channel delete:', storageDelErr);
        }

        // 6. Delete in Supabase Database (messages, members, channel)
        try {
            const cleanCode = (channelCode || '').replace(/^#/, '');
            const hashCode = cleanCode ? `#${cleanCode}` : '';
            const allIdentifiers = Array.from(new Set([
                channelId,
                channelCode,
                cleanCode,
                hashCode,
                channelId.replace(/^#/, ''),
                `#${channelId.replace(/^#/, '')}`,
            ].filter(Boolean))) as string[];

            for (const client of clients) {
                // Try stored procedure first if available
                await (client as any).rpc('delete_chat_channel_cascade', {
                    p_channel_id: channelId,
                    p_channel_code: channelCode || null,
                }).catch(() => {});

                const [msgDel, memDel, chanDelId, chanDelCode] = await Promise.allSettled([
                    client.from('chat_messages').delete().in('channel_id', allIdentifiers),
                    client.from('chat_channel_members').delete().in('channel_id', allIdentifiers),
                    client.from('chat_channels').delete().in('id', allIdentifiers),
                    client.from('chat_channels').delete().in('code', allIdentifiers),
                ]);

                console.log('[deleteChatChannel] DB delete result:', {
                    identifiers: allIdentifiers,
                    messages: msgDel.status,
                    members: memDel.status,
                    channelById: chanDelId.status,
                    channelByCode: chanDelCode.status,
                });
            }
        } catch (dbErr) {
            console.warn('Supabase DB delete error for channel:', dbErr);
        }

        // 7. Broadcast realtime delete notification
        try {
            const globalChan = supabase.channel('global_chat_broadcast');
            if (typeof (globalChan as any).httpSend === 'function') {
                (globalChan as any).httpSend({
                    type: 'broadcast',
                    event: 'channel_deleted',
                    payload: { channelId, channelCode },
                }).catch(() => {});
            } else {
                globalChan.send({
                    type: 'broadcast',
                    event: 'channel_deleted',
                    payload: { channelId, channelCode },
                }).catch(() => {});
            }
        } catch (_) {}
    } catch (err) {
        console.error('Error in deleteChatChannel:', err);
    }
}

const EDITED_MSGS_KEY = '@forma_all_edited_messages';

export async function getEditedMessageIds(): Promise<Set<string>> {
    const set = new Set<string>();
    try {
        const stored = await AsyncStorage.getItem(EDITED_MSGS_KEY);
        if (stored) {
            const arr: string[] = JSON.parse(stored);
            arr.forEach(id => set.add(id));
        }
    } catch (_) {}
    return set;
}

export async function markMessageEditedLocally(messageId: string): Promise<void> {
    try {
        const stored = await AsyncStorage.getItem(EDITED_MSGS_KEY);
        const arr: string[] = stored ? JSON.parse(stored) : [];
        if (!arr.includes(messageId)) {
            arr.push(messageId);
            await AsyncStorage.setItem(EDITED_MSGS_KEY, JSON.stringify(arr));
        }
    } catch (_) {}
}

/**
 * Update message text or status in Supabase and local cache.
 */
/**
 * Update message text or status in Supabase and local cache.
 */
export async function updateChatMessage(
    channelId: string,
    messageId: string,
    updates: Partial<ChatMessage>,
    tenantId?: string | null
): Promise<void> {
    if (updates.isEdited) {
        await markMessageEditedLocally(messageId);
    }

    const cacheKey = getChannelStorageKey(channelId, tenantId);
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            const currentList: ChatMessage[] = JSON.parse(cached);
            const updated = currentList.map(m => m.id === messageId ? { ...m, ...updates } : m);
            await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
        }
    } catch (e) {
        console.warn('Error updating local cache on update:', e);
    }

    try {
        const dbUpdates: any = {};
        if (updates.text !== undefined) dbUpdates.text = updates.text;
        if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
        if (updates.isSaved !== undefined) dbUpdates.is_saved = updates.isSaved;
        if (updates.reactions !== undefined) dbUpdates.reactions = updates.reactions;
        if (updates.isEdited) {
            dbUpdates.updated_at = new Date().toISOString();
        }

        const targetClient = getChannelTenantKey(tenantId) === 'adidaya' ? supabaseAdidaya : supabaseForma;
        await targetClient.from('chat_messages').update(dbUpdates).eq('id', messageId);

        // Realtime broadcast for peers
        try {
            const roomChan = supabase.channel(`room_${channelId}`);
            if (typeof (roomChan as any).httpSend === 'function') {
                (roomChan as any).httpSend({
                    type: 'broadcast',
                    event: 'message_updated',
                    payload: { id: messageId, ...updates },
                }).catch(() => {});
            } else {
                roomChan.send({
                    type: 'broadcast',
                    event: 'message_updated',
                    payload: { id: messageId, ...updates },
                }).catch(() => {});
            }
        } catch (_) {}
    } catch (err) {
        console.warn('Supabase update error:', err);
    }
}

/**
 * Toggle pin status on a message
 */
export async function toggleMessagePin(
    channelId: string,
    messageId: string,
    isPinned: boolean,
    tenantId?: string | null
): Promise<void> {
    await updateChatMessage(channelId, messageId, { isPinned }, tenantId);
}

/**
 * Toggle reaction on a message. Enforces 1 reaction per user per message.
 */
export async function toggleMessageReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string,
    tenantId?: string | null
): Promise<{ message: ChatMessage | null; isReacting: boolean }> {
    const cacheKey = getChannelStorageKey(channelId, tenantId);
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (!cached) return { message: null, isReacting: false };
        const currentList: ChatMessage[] = JSON.parse(cached);
        const target = currentList.find(m => m.id === messageId);
        if (!target) return { message: null, isReacting: false };

        let currentReactions = (target.reactions || []).map(r => ({
            emoji: r.emoji,
            count: r.count,
            users: Array.isArray(r.users) ? [...r.users] : [],
        }));

        // Find existing reaction for this user if any
        const prevReactionIndex = currentReactions.findIndex(r => r.users.includes(userId));
        let isReacting = false;

        if (prevReactionIndex >= 0) {
            const prevR = currentReactions[prevReactionIndex];
            if (prevR.emoji === emoji) {
                // Tapping same emoji -> unreact
                prevR.users = prevR.users.filter(u => u !== userId);
                prevR.count = prevR.users.length;
                isReacting = false;
            } else {
                // Tapping different emoji -> remove from old, add to new
                prevR.users = prevR.users.filter(u => u !== userId);
                prevR.count = prevR.users.length;

                const targetReaction = currentReactions.find(r => r.emoji === emoji);
                if (targetReaction) {
                    if (!targetReaction.users.includes(userId)) {
                        targetReaction.users.push(userId);
                        targetReaction.count = targetReaction.users.length;
                    }
                } else {
                    currentReactions.push({ emoji, count: 1, users: [userId] });
                }
                isReacting = true;
            }
        } else {
            // First reaction on this message by this user
            const targetReaction = currentReactions.find(r => r.emoji === emoji);
            if (targetReaction) {
                if (!targetReaction.users.includes(userId)) {
                    targetReaction.users.push(userId);
                    targetReaction.count = targetReaction.users.length;
                }
            } else {
                currentReactions.push({ emoji, count: 1, users: [userId] });
            }
            isReacting = true;
        }

        // Clean up 0 count reactions
        currentReactions = currentReactions.filter(r => r.count > 0 && r.users.length > 0);

        const myReactionObj = currentReactions.find(r => r.users.includes(userId));
        const updatedMsg: ChatMessage = {
            ...target,
            reactions: currentReactions,
            myReaction: myReactionObj?.emoji,
        };

        const updatedList = currentList.map(m => m.id === messageId ? updatedMsg : m);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedList));

        // Background update in Supabase
        const targetClient = getChannelTenantKey(tenantId) === 'adidaya' ? supabaseAdidaya : supabaseForma;
        targetClient.from('chat_messages').update({ reactions: currentReactions }).eq('id', messageId).then();

        return { message: updatedMsg, isReacting };
    } catch (e) {
        console.error('Error toggling reaction:', e);
        return { message: null, isReacting: false };
    }
}

/**
 * Get last message snippet for channel index list.
 * Checks Supabase remote DB first, then cached last message, then cached messages array.
 */
export async function getChannelLastMessage(
    channelId: string,
    aliasIds?: string[],
    context?: {
        userProfile?: UserProfile | null;
        userId?: string | null;
        tenantId?: string | null;
    }
): Promise<{ sender: string; text: string; time: string; timestamp: number } | null> {
    if (!channelId) return null;

    const isAdidaya = isAdidayaTenant(context?.tenantId);
    const channelIdsToCheck = [channelId];
    if (isAdidaya) {
        if (channelId === '000-general' || channelId === '#000-gen' || channelId === 'gen' || channelId === 'general-channel') {
            channelIdsToCheck.length = 0;
            channelIdsToCheck.push('000-general', '#000-gen', 'gen');
        } else if (channelId.startsWith('dept-')) {
            channelIdsToCheck.push(channelId.replace('dept-', ''));
        } else if (channelId.startsWith('proj-')) {
            channelIdsToCheck.push(channelId.replace('proj-', ''));
        }
    } else {
        if (channelId === 'general-channel' || channelId === '000-general' || channelId === '#000-gen') {
            channelIdsToCheck.length = 0;
            channelIdsToCheck.push('general-channel');
        } else if (channelId.startsWith('dept-')) {
            channelIdsToCheck.push(channelId.replace('dept-', ''));
        } else if (channelId.startsWith('proj-')) {
            channelIdsToCheck.push(channelId.replace('proj-', ''));
        }
    }

    const resolveSender = (name: string, senderUserId?: string | null): string => {
        return resolvePreviewName(name, senderUserId);
    };

    const targetClient = isAdidaya ? supabaseAdidaya : supabaseForma;

    // 1. Try querying Supabase chat_messages table
    try {
        let lastQuery = targetClient
            .from('chat_messages')
            .select('*')
            .in('channel_id', channelIdsToCheck);
        if (!isAdidaya) {
            const fTenant = resolveValidTenantId(context?.tenantId);
            if (!isValidUUID(fTenant)) return null;
            lastQuery = lastQuery.eq('tenant_id', fTenant);
        }
        const { data, error } = await lastQuery
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!error && data) {
            const previewText = formatMessagePreviewSnippet(data);
            const timeStr = data.created_at ? formatMessageTime(data.created_at) : '';
            const res = {
                sender: resolveSender(data.sender_name || '', data.user_id),
                text: previewText,
                time: timeStr,
                timestamp: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
            };

            // Cache locally for fast future loads
            AsyncStorage.setItem(getChannelLastMsgKey(channelId, context?.tenantId), JSON.stringify(res)).catch(() => {});
            return res;
        }
    } catch {
        // Fallback to local cache
    }

    // 2. Check local last message cache across possible aliases
    for (const cId of channelIdsToCheck) {
        try {
            const cached = await AsyncStorage.getItem(getChannelLastMsgKey(cId, context?.tenantId));
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && (parsed.text || parsed.sender)) {
                    return {
                        ...parsed,
                        sender: resolveSender(parsed.sender),
                    };
                }
            }
        } catch {
            // ignore
        }
    }

    // 3. Check cached messages full array
    for (const cId of channelIdsToCheck) {
        try {
            const cachedList = await AsyncStorage.getItem(getChannelStorageKey(cId, context?.tenantId));
            if (cachedList) {
                const list: ChatMessage[] = JSON.parse(cachedList);
                if (Array.isArray(list) && list.length > 0) {
                    const last = list[list.length - 1];
                    const previewText = formatMessagePreviewSnippet(last);
                    const res = {
                        sender: resolveSender(last.sender || ''),
                        text: previewText,
                        time: last.time || '',
                        timestamp: Date.now(),
                    };
                    AsyncStorage.setItem(getChannelLastMsgKey(channelId, context?.tenantId), JSON.stringify(res)).catch(() => {});
                    return res;
                }
            }
        } catch {
            // ignore
        }
    }

    return null;
}

/**
 * Subscribe to realtime messages for a channel (Broadcast + Postgres Changes)
 */
export function subscribeChannelMessages(
    channelId: string,
    onMessageChange: (incomingMsg?: ChatMessage) => void
) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId);
    const sanitizedRoom = (channelId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const channelName = `room_${sanitizedRoom}`;

    const clients = Array.from(new Set([supabaseForma, supabaseAdidaya].filter(Boolean)));
    const activeSubs: any[] = [];

    clients.forEach((client) => {
        try {
            const channel = client
                .channel(channelName, {
                    config: {
                        broadcast: { self: false },
                    },
                })
                .on('broadcast', { event: 'new_message' }, (payload: any) => {
                    if (payload?.payload) {
                        onMessageChange(payload.payload as ChatMessage);
                    } else {
                        onMessageChange();
                    }
                })
                .on('broadcast', { event: 'message_updated' }, (payload: any) => {
                    if (payload?.payload) {
                        onMessageChange(payload.payload as ChatMessage);
                    } else {
                        onMessageChange();
                    }
                })
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'chat_messages',
                        ...(isUuid ? { filter: `channel_id=eq.${channelId}` } : {}),
                    },
                    (payload: any) => {
                        if (payload?.new) {
                            const transformed = transformRowToChatMessage(payload.new as DBChatMessageRow);
                            if (!isUuid || transformed.channel_id === channelId || (transformed as any).channelId === channelId) {
                                onMessageChange(transformed);
                            }
                        } else {
                            onMessageChange();
                        }
                    }
                )
                .subscribe((status: any, err: any) => {
                    if (err) {
                        console.log('[Chat Realtime] Subscription status:', status);
                    }
                });

            activeSubs.push({ client, channel });
        } catch (e) {
            console.warn('[Chat Realtime] Error creating channel:', e);
        }
    });

    return () => {
        activeSubs.forEach(({ client, channel }) => {
            try {
                client.removeChannel(channel);
            } catch {}
        });
    };
}

/**
 * Subscribe to ALL chat message changes across workspace/tenant for real-time chat tab updates
 */
export function subscribeAllChatMessages(
    onNewMessageOrChange: (payload?: any) => void
) {
    const clients = Array.from(new Set([supabaseForma, supabaseAdidaya].filter(Boolean)));
    const activeSubs: any[] = [];

    clients.forEach((client, idx) => {
        const channelName = `global_chat_sub_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        try {
            const channel = client
                .channel(channelName, {
                    config: {
                        broadcast: { self: false },
                    },
                })
                .on('broadcast', { event: 'channel_activity' }, (payload: any) => {
                    onNewMessageOrChange(payload?.payload);
                })
                .on('broadcast', { event: 'channel_created' }, (payload: any) => {
                    onNewMessageOrChange(payload?.payload);
                })
                .on('broadcast', { event: 'channel_deleted' }, (payload: any) => {
                    onNewMessageOrChange({ ...payload?.payload, isChannelDeleted: true });
                })
                .on('broadcast', { event: 'user_prefs_updated' }, (payload: any) => {
                    onNewMessageOrChange({ ...payload?.payload, isPrefUpdate: true });
                })
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'chat_messages',
                    },
                    (payload: any) => {
                        onNewMessageOrChange(payload);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'chat_user_preferences',
                    },
                    (payload: any) => {
                        onNewMessageOrChange({ ...(payload?.new || {}), isPrefUpdate: true });
                    }
                )
                .subscribe((status: any, err: any) => {
                    if (err) {
                        console.log('[Chat Global Realtime] Subscription status:', status);
                    }
                });

            activeSubs.push({ client, channel });
        } catch (e) {
            console.warn('[Chat Global Realtime] Error creating channel:', e);
        }
    });

    return () => {
        activeSubs.forEach(({ client, channel }) => {
            try {
                client.removeChannel(channel);
            } catch {}
        });
    };
}

/**
 * Remove or mark a member as former member (Rule 6).
 * Sets left_at = now() and is_active = false.
 */
export async function removeChannelMember(
    channelId: string,
    userId: string
): Promise<void> {
    const nowIso = new Date().toISOString();
    const formerMembership: ChannelMembershipInfo = {
        status: 'former',
        leftAt: nowIso,
        canWrite: false,
        canReadHistory: true,
    };

    // Save locally
    await AsyncStorage.setItem(`${MEMBERSHIP_PREFIX}${channelId}_${userId}`, JSON.stringify(formerMembership));

    // Update in Supabase
    try {
        await supabase
            .from('chat_channel_members')
            .update({
                is_active: false,
                left_at: nowIso,
                updated_at: nowIso,
            })
            .eq('channel_id', channelId)
            .eq('user_id', userId);
    } catch (err) {
        console.warn('Error marking member as former in Supabase:', err);
    }
}
