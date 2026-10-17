import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    Alert,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { useUserContext } from '@/context/UserProvider';
import { supabase } from '@/lib/supabase';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { SwiftUISearchBar } from '@/components/chat/SwiftUISearchBar';
import { SwiftUIToastHUD } from '@/components/ui/SwiftUIToastHUD';
import { SwiftUIUnsavedBanner } from '@/components/ui/SwiftUIUnsavedBanner';
import { SwiftUITeamMemberSheet } from '@/components/team/SwiftUITeamMemberSheet';
import { OrganizationLegalSection, LegalTab } from '@/components/organization-settings/OrganizationLegalSection';

import {
    OrganizationSetupGroup,
    SettingCategory,
    TeamMember,
    PermissionKey,
    RoleId,
} from './types';
import { OrganizationGeneralSection } from './OrganizationGeneralSection';
import { OrganizationAccountSection } from './OrganizationAccountSection';
import { OrganizationTeamSection, TeamSortOption } from './OrganizationTeamSection';
import {
    OrganizationRolesSection,
    INITIAL_ROLE_DEFS,
} from './OrganizationRolesSection';
import { OrganizationNotificationsSection } from './OrganizationNotificationsSection';
import {
    OrganizationSecuritySection,
    DEFAULT_SECURITY_SETTINGS,
    SecuritySettings,
} from './OrganizationSecuritySection';
import { OrganizationIntegrationsSection } from './OrganizationIntegrationsSection';

export const SETTINGS_CATEGORIES: SettingCategory[] = [
    // 1. General Group
    {
        id: 'general',
        group: 'general',
        title: 'General',
        description: 'Identity, geofence radius, coordinates & contact',
        subtitle: 'Identity, theme, contact, and location',
        icon: 'slider.horizontal.3',
        color: '#64748B',
        gradientColors: ['#64748B', '#475569'],
        badges: ['Identity', 'Theme', 'Contact', 'Location'],
    },
    {
        id: 'account',
        group: 'general',
        title: 'My Account',
        description: 'Personal profile & authenticated session details',
        subtitle: 'Personal profile and session details',
        icon: 'person.fill',
        color: '#007AFF',
        gradientColors: ['#30A2FF', '#007AFF'],
        badges: ['Email', 'Role Badge'],
    },

    // 2. Team & Access Group
    {
        id: 'team',
        group: 'access',
        title: 'Team',
        description: 'Members, invitations, roles & join codes',
        subtitle: 'Members, invitations, and join codes',
        icon: 'person.2.fill',
        color: '#007AFF',
        gradientColors: ['#30A2FF', '#007AFF'],
        badges: ['Member', 'Invitations'],
    },
    {
        id: 'roles',
        group: 'access',
        title: 'Roles',
        description: 'Role hierarchy levels & permission matrix comparison',
        subtitle: 'Role hierarchy and permissions matrix',
        icon: 'shield.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
        badges: ['Permission', 'Matrix'],
    },

    // 3. Security & Preferences Group
    {
        id: 'notifications',
        group: 'system',
        title: 'Notifications',
        description: 'Device push alerts & scheduled email digests',
        subtitle: 'Push alerts and scheduled email digests',
        icon: 'bell.badge.fill',
        color: '#FF3B30',
        gradientColors: ['#FF453A', '#D70015'],
        badges: ['Push Alert', 'Email Digest'],
    },
    {
        id: 'security',
        group: 'system',
        title: 'Security',
        description: 'Password policy, session timeout & danger zone',
        subtitle: 'Password policy, session timeout, and 2FA',
        icon: 'lock.fill',
        color: '#AF52DE',
        gradientColors: ['#BF5AF2', '#9839CF'],
        badges: ['Password', 'Session Timeout', '2FA'],
    },
];

export const GROUP_TITLES: Record<OrganizationSetupGroup, string> = {
    general: 'General',
    access: 'Team & Access',
    system: 'Security & Preferences',
};

const DEFAULT_NOTIFICATIONS: Record<string, boolean> = {
    pushAlerts: true,
    emailDigests: true,
};

const getInitialRoleDefaults = (): Record<RoleId, Record<PermissionKey, boolean>> => {
    const initial: any = {};
    INITIAL_ROLE_DEFS.forEach((r) => {
        initial[r.id] = { ...r.defaultPermissions };
    });
    return initial;
};

interface OrganizationSettingsMasterDetailProps {
    initialCategory?: string;
    onCategoryChange?: (id: string) => void;
}

export const OrganizationSettingsMasterDetail: React.FC<OrganizationSettingsMasterDetailProps> = ({
    initialCategory = 'general',
    onCategoryChange,
}) => {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { activeTenant, updateTenant, tenantRole, isSuperAdmin } = useTenantContext();
    const { user, profile, signOut } = useUserContext();

    const [activeCategory, setActiveCategory] = useState<string>(initialCategory || 'general');

    useEffect(() => {
        if (initialCategory && initialCategory !== activeCategory) {
            setActiveCategory(initialCategory);
        }
    }, [initialCategory]);

    const handleSelectCategory = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveCategory(id);
        if (onCategoryChange) {
            onCategoryChange(id);
        }
    };

    // Permissions & Roles
    const normalizedRole = (tenantRole || '').toLowerCase().trim();
    const isSuperOrAdmin = isSuperAdmin ||
        normalizedRole.includes('admin') ||
        normalizedRole.includes('owner') ||
        normalizedRole.includes('super') ||
        normalizedRole.includes('lead');
    const isViewer = !isSuperOrAdmin && normalizedRole.includes('view');
    const canEditGeneral = isSuperOrAdmin;
    const isGeneralReadOnly = !canEditGeneral;

    const visibleCategories = useMemo(() => {
        if (isViewer) {
            return SETTINGS_CATEGORIES.filter((c) =>
                ['account', 'roles', 'notifications', 'security'].includes(c.id)
            );
        }
        return SETTINGS_CATEGORIES;
    }, [isViewer]);

    // Toast HUD State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    }, []);

    const openLegalSheet = (tab: LegalTab) => {
        Haptics.selectionAsync();
        setActiveCategory(tab);
        onCategoryChange?.(tab);
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 1. General Settings State
    // ──────────────────────────────────────────────────────────────────────────
    const [name, setName] = useState('');
    const [companyCode, setCompanyCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#007AFF');
    const [customHex, setCustomHex] = useState('0036F8');
    const [address, setAddress] = useState('');
    const [gmapsUrl, setGmapsUrl] = useState('');
    const [latitudeInput, setLatitudeInput] = useState('');
    const [longitudeInput, setLongitudeInput] = useState('');
    const [selectedRadius, setSelectedRadius] = useState<number>(50);
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [savingGeneral, setSavingGeneral] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        if (activeTenant) {
            setName(activeTenant.branding_name || activeTenant.name || '');
            setCompanyCode(activeTenant.company_code || '');
            setJoinCode(activeTenant.join_code || '');
            setLogoUrl(activeTenant.branding_logo_url || activeTenant.logo_url || null);
            const color = activeTenant.primary_color || '#007AFF';
            setPrimaryColor(color);
            setCustomHex(color.replace('#', ''));
            setAddress(activeTenant.address || '');
            setGmapsUrl(activeTenant.gmaps_url || '');
            if ((activeTenant as any).latitude != null) setLatitudeInput(String((activeTenant as any).latitude));
            if ((activeTenant as any).longitude != null) setLongitudeInput(String((activeTenant as any).longitude));
            if ((activeTenant as any).attendance_radius != null) setSelectedRadius(Number((activeTenant as any).attendance_radius));
            setContactPhone(activeTenant.contact_phone || '');
            setContactEmail(activeTenant.contact_email || '');
        }
    }, [activeTenant]);

    const hasGeneralChanges = !isGeneralReadOnly && activeTenant && (
        name !== (activeTenant.branding_name || activeTenant.name || '') ||
        companyCode !== (activeTenant.company_code || '') ||
        logoUrl !== (activeTenant.branding_logo_url || activeTenant.logo_url || null) ||
        primaryColor.toUpperCase() !== (activeTenant.primary_color || '#007AFF').toUpperCase() ||
        address !== (activeTenant.address || '') ||
        gmapsUrl !== (activeTenant.gmaps_url || '') ||
        latitudeInput !== String((activeTenant as any).latitude || '') ||
        longitudeInput !== String((activeTenant as any).longitude || '') ||
        selectedRadius !== Number((activeTenant as any).attendance_radius || 50) ||
        contactPhone !== (activeTenant.contact_phone || '') ||
        contactEmail !== (activeTenant.contact_email || '')
    );

    const handleDiscardGeneralChanges = () => {
        if (activeTenant) {
            setName(activeTenant.branding_name || activeTenant.name || '');
            setCompanyCode(activeTenant.company_code || '');
            setLogoUrl(activeTenant.branding_logo_url || activeTenant.logo_url || null);
            const color = activeTenant.primary_color || '#007AFF';
            setPrimaryColor(color);
            setCustomHex(color.replace('#', ''));
            setAddress(activeTenant.address || '');
            setGmapsUrl(activeTenant.gmaps_url || '');
            setLatitudeInput((activeTenant as any).latitude != null ? String((activeTenant as any).latitude) : '');
            setLongitudeInput((activeTenant as any).longitude != null ? String((activeTenant as any).longitude) : '');
            setSelectedRadius((activeTenant as any).attendance_radius != null ? Number((activeTenant as any).attendance_radius) : 50);
            setContactPhone(activeTenant.contact_phone || '');
            setContactEmail(activeTenant.contact_email || '');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePickLogo = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
            setLogoUrl(res.assets[0].uri);
            Haptics.selectionAsync();
        }
    };

    const handleGetCurrentLocation = async () => {
        try {
            setIsLocating(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to detect GPS coordinates.');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLatitudeInput(loc.coords.latitude.toFixed(6));
            setLongitudeInput(loc.coords.longitude.toFixed(6));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to get current location.');
        } finally {
            setIsLocating(false);
        }
    };

    const handleGmapsChange = (url: string) => {
        setGmapsUrl(url);
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            setLatitudeInput(match[1]);
            setLongitudeInput(match[2]);
        }
    };

    const handleSaveGeneralChanges = async () => {
        if (!activeTenant?.id) return;
        setSavingGeneral(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const updates: any = {
                name: name.trim(),
                branding_name: name.trim(),
                company_code: companyCode.trim().toUpperCase(),
                primary_color: primaryColor,
                address: address.trim(),
                gmaps_url: gmapsUrl.trim(),
                latitude: latitudeInput ? parseFloat(latitudeInput) : null,
                longitude: longitudeInput ? parseFloat(longitudeInput) : null,
                attendance_radius: selectedRadius,
                contact_phone: contactPhone.trim(),
                contact_email: contactEmail.trim(),
                branding_logo_url: logoUrl,
                updated_at: new Date().toISOString(),
            };

            const res = await updateTenant(activeTenant.id, updates);
            if (res?.error) {
                console.error('Update tenant error:', res.error);
                Alert.alert('Error', res.error);
                return;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Organization settings saved');
        } catch (err: any) {
            console.error('Save changes error:', err);
            Alert.alert('Error', err.message || 'Failed to save changes.');
        } finally {
            setSavingGeneral(false);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Team State
    // ──────────────────────────────────────────────────────────────────────────
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [sortBy, setSortBy] = useState<TeamSortOption>('role');
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [isSubmittingMember, setIsSubmittingMember] = useState(false);

    const fetchTeamMembers = useCallback(async () => {
        setLoadingMembers(true);
        try {
            const tenantId = activeTenant?.id || '00000000-0000-0000-0000-000000000001';

            // 1. Fetch tenant_members and profiles in parallel
            const [{ data: tmData, error: tmErr }, { data: allProfiles, error: profErr }] = await Promise.all([
                supabase
                    .from('tenant_members')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('profiles')
                    .select('*'),
            ]);

            if (tmErr) console.warn('tenant_members query warning:', tmErr);
            if (profErr) console.warn('profiles query warning:', profErr);

            const profileMap = new Map<string, any>();
            (allProfiles || []).forEach((p: any) => {
                if (p?.id) profileMap.set(p.id, p);
            });

            const memberMap = new Map<string, TeamMember>();

            // Filter tenant members strictly for active tenant
            const filteredTm = (tmData || []).filter((m: any) => !activeTenant?.id || m.tenant_id === activeTenant.id);

            // Populate from tenant_members
            filteredTm.forEach((m: any) => {
                const uid = m.user_id || m.id;
                if (!uid) return;
                const p = profileMap.get(uid) || {};
                const isTest = (p.full_name || '').toLowerCase().includes('test_') ||
                               (p.email || m.email || '').toLowerCase().includes('test_') ||
                               (p.email || m.email || '').toLowerCase().includes('testuser');
                if (isTest) return;

                let resolvedName = p.full_name || p.display_name || p.name || p.username;
                if (!resolvedName && (p.email || m.email)) {
                    const emailStr = p.email || m.email || '';
                    resolvedName = emailStr.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                }
                if (!resolvedName) resolvedName = 'Team Member';

                const resolvedRole = m.role || (p.role === 'superadmin' ? 'Super Admin' : p.role === 'admin' ? 'Admin' : 'Member');

                memberMap.set(uid, {
                    id: m.id || uid,
                    user_id: uid,
                    email: p.email || m.email || 'No email',
                    role: resolvedRole,
                    status: (m.status || p.status || 'active') as any,
                    profile: {
                        id: p.id || uid,
                        full_name: resolvedName,
                        avatar_url: p.avatar_url || p.avatarUrl,
                        email: p.email || m.email,
                    },
                });
            });

            // Populate profiles explicitly linked to this tenant
            if (activeTenant?.id) {
                (allProfiles || []).forEach((p: any) => {
                    if (!p.id || memberMap.has(p.id)) return;
                    const isTest = (p.full_name || '').toLowerCase().includes('test_') ||
                                   (p.email || '').toLowerCase().includes('test_') ||
                                   (p.email || '').toLowerCase().includes('testuser');
                    if (isTest) return;

                    if (p.tenant_id === activeTenant.id || p.workspace_id === activeTenant.id) {
                        let resolvedName = p.full_name || p.display_name || p.name || p.username;
                        if (!resolvedName && p.email) {
                            resolvedName = p.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                        }
                        if (!resolvedName) resolvedName = 'Team Member';

                        const resolvedRole = p.role === 'superadmin' ? 'Super Admin' : p.role === 'admin' ? 'Admin' : 'Member';
                        memberMap.set(p.id, {
                            id: p.id,
                            user_id: p.id,
                            email: p.email || 'No email',
                            role: resolvedRole,
                            status: (p.status || 'active') as any,
                            profile: {
                                id: p.id,
                                full_name: resolvedName,
                                avatar_url: p.avatar_url || p.avatarUrl,
                                email: p.email,
                            },
                        });
                    }
                });
            }

            // Ensure logged in user is present if user context exists and has membership
            if (user?.id && !memberMap.has(user.id) && isSuperAdmin) {
                let currentName = profile?.full_name || profile?.nickname || profile?.username;
                if (!currentName && user.email) {
                    currentName = user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                }
                if (!currentName) currentName = 'Team Member';

                memberMap.set(user.id, {
                    id: user.id,
                    user_id: user.id,
                    email: user.email || 'No email',
                    role: 'Super Admin',
                    status: 'active',
                    profile: {
                        id: user.id,
                        full_name: currentName,
                        avatar_url: profile?.avatarUrl,
                        email: user.email,
                    },
                });
            }

            setTeamMembers(Array.from(memberMap.values()));
        } catch (err: any) {
            console.error('Fetch team error:', err);
        } finally {
            setLoadingMembers(false);
        }
    }, [activeTenant?.id, user?.id, profile, isSuperAdmin, tenantRole]);

    useEffect(() => {
        if (activeCategory === 'team') {
            fetchTeamMembers();
        }
    }, [activeCategory, fetchTeamMembers]);

    const handleSaveMember = async (data: { fullName?: string; name?: string; email: string; role: string; password?: string; status?: string }) => {
        const tenantId = activeTenant?.id || '00000000-0000-0000-0000-000000000001';
        setIsSubmittingMember(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const memberName = data.fullName || data.name || data.email.split('@')[0];
        const normalizedEmail = data.email.trim().toLowerCase();
        const role = data.role || 'Member';
        const status = data.status || 'active';

        try {
            if (editingMember) {
                const uid = editingMember.user_id || editingMember.id;

                // 1. Update or upsert tenant_members
                await supabase
                    .from('tenant_members')
                    .upsert({
                        tenant_id: tenantId,
                        user_id: uid,
                        role,
                        status,
                    }, { onConflict: 'tenant_id,user_id' });

                // 2. Update profile name and status
                if (uid) {
                    await supabase
                        .from('profiles')
                        .update({
                            full_name: memberName,
                            status,
                        })
                        .eq('id', uid);
                }

                showToast('Member updated successfully');
            } else {
                // Try create-team-member edge function
                let createdViaFunction = false;
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        const { data: fnRes, error: fnErr } = await supabase.functions.invoke('create-team-member', {
                            headers: { Authorization: `Bearer ${session.access_token}` },
                            body: {
                                tenantId,
                                fullName: memberName,
                                email: normalizedEmail,
                                password: data.password || 'Forma123456!',
                                role,
                                status,
                            },
                        });
                        if (!fnErr) {
                            createdViaFunction = true;
                        }
                    }
                } catch (fnEx) {
                    console.warn('Edge function invoke skipped or failed, using client fallback:', fnEx);
                }

                if (!createdViaFunction) {
                    // Check if profile exists with this email
                    const { data: existingProf } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', normalizedEmail)
                        .maybeSingle();

                    if (existingProf?.id) {
                        await supabase
                            .from('tenant_members')
                            .upsert({
                                tenant_id: tenantId,
                                user_id: existingProf.id,
                                role,
                                status,
                            }, { onConflict: 'tenant_id,user_id' });
                    } else {
                        // Create profile directly
                        const newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                        await supabase
                            .from('profiles')
                            .insert({
                                id: newUid,
                                email: normalizedEmail,
                                full_name: memberName,
                                role: role.toLowerCase(),
                                status,
                            });

                        await supabase
                            .from('tenant_members')
                            .insert({
                                tenant_id: tenantId,
                                user_id: newUid,
                                role,
                                status,
                            });
                    }
                }

                showToast('Member added successfully');
            }

            setIsAddMemberOpen(false);
            setEditingMember(null);
            fetchTeamMembers();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save member.');
        } finally {
            setIsSubmittingMember(false);
        }
    };

    const handleDeleteMember = (member: TeamMember) => {
        const memberDisplayName = member.profile?.full_name || member.email || 'Team Member';
        const uid = member.user_id || member.id;
        const tenantId = activeTenant?.id || '00000000-0000-0000-0000-000000000001';

        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${memberDisplayName} from the organization?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase
                                .from('tenant_members')
                                .delete()
                                .eq('tenant_id', tenantId)
                                .eq('user_id', uid);

                            showToast('Member removed');
                            fetchTeamMembers();
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to remove member.');
                        }
                    },
                },
            ]
        );
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Roles State
    // ──────────────────────────────────────────────────────────────────────────
    const [rolePerms, setRolePerms] = useState<Record<RoleId, Record<PermissionKey, boolean>>>(getInitialRoleDefaults());
    const [savedRolePerms, setSavedRolePerms] = useState<Record<RoleId, Record<PermissionKey, boolean>>>(getInitialRoleDefaults());
    const [savingRoles, setSavingRoles] = useState(false);

    const rolesStorageKey = `@tenant_roles_${activeTenant?.id || 'default'}`;

    useEffect(() => {
        const loadRoles = async () => {
            try {
                const val = await AsyncStorage.getItem(rolesStorageKey);
                if (val) {
                    const parsed = JSON.parse(val);
                    setRolePerms(parsed);
                    setSavedRolePerms(parsed);
                }
            } catch (e) {
                // pass
            }
        };
        if (activeCategory === 'roles') {
            loadRoles();
        }
    }, [activeCategory, rolesStorageKey]);

    const handleTogglePermission = (roleId: RoleId, permKey: PermissionKey) => {
        Haptics.selectionAsync();
        setRolePerms((prev) => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [permKey]: !prev[roleId]?.[permKey],
            },
        }));
    };

    const hasRoleChanges = useMemo(() => {
        return JSON.stringify(rolePerms) !== JSON.stringify(savedRolePerms);
    }, [rolePerms, savedRolePerms]);

    const handleDiscardRoleChanges = () => {
        setRolePerms(savedRolePerms);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSaveRoleChanges = async () => {
        setSavingRoles(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await AsyncStorage.setItem(rolesStorageKey, JSON.stringify(rolePerms));
            setSavedRolePerms(rolePerms);
            showToast('Role permissions saved');
        } catch (e: any) {
            Alert.alert('Error', 'Failed to save role permissions.');
        } finally {
            setSavingRoles(false);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Notifications State
    // ──────────────────────────────────────────────────────────────────────────
    const notifsStorageKey = `@tenant_notifs_${activeTenant?.id || 'default'}`;
    const [savedNotifications, setSavedNotifications] = useState<Record<string, boolean>>(DEFAULT_NOTIFICATIONS);
    const [notifications, setNotifications] = useState<Record<string, boolean>>(DEFAULT_NOTIFICATIONS);
    const [savingNotifs, setSavingNotifs] = useState(false);

    useEffect(() => {
        const loadNotifs = async () => {
            try {
                const val = await AsyncStorage.getItem(notifsStorageKey);
                if (val) {
                    const parsed = JSON.parse(val);
                    setNotifications(parsed);
                    setSavedNotifications(parsed);
                }
            } catch (e) {
                // pass
            }
        };
        if (activeCategory === 'notifications') {
            loadNotifs();
        }
    }, [activeCategory, notifsStorageKey]);

    const hasNotifChanges = useMemo(() => {
        return JSON.stringify(notifications) !== JSON.stringify(savedNotifications);
    }, [notifications, savedNotifications]);

    const handleDiscardNotifChanges = () => {
        setNotifications(savedNotifications);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSaveNotifChanges = async () => {
        setSavingNotifs(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await AsyncStorage.setItem(notifsStorageKey, JSON.stringify(notifications));
            setSavedNotifications(notifications);
            showToast('Notification preferences saved');
        } catch (e: any) {
            Alert.alert('Error', 'Failed to save notification preferences.');
        } finally {
            setSavingNotifs(false);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Security State
    // ──────────────────────────────────────────────────────────────────────────
    const secStorageKey = `@tenant_security_${activeTenant?.id || 'default'}`;
    const [savedSecurity, setSavedSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
    const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
    const [savingSecurity, setSavingSecurity] = useState(false);

    useEffect(() => {
        const loadSec = async () => {
            try {
                const val = await AsyncStorage.getItem(secStorageKey);
                if (val) {
                    const parsed = JSON.parse(val);
                    setSecurity(parsed);
                    setSavedSecurity(parsed);
                }
            } catch (e) {
                // pass
            }
        };
        if (activeCategory === 'security') {
            loadSec();
        }
    }, [activeCategory, secStorageKey]);

    const hasSecurityChanges = useMemo(() => {
        return JSON.stringify(security) !== JSON.stringify(savedSecurity);
    }, [security, savedSecurity]);

    const handleDiscardSecurityChanges = () => {
        setSecurity(savedSecurity);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSaveSecurityChanges = async () => {
        setSavingSecurity(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await AsyncStorage.setItem(secStorageKey, JSON.stringify(security));
            setSavedSecurity(security);
            showToast('Security settings saved');
        } catch (e: any) {
            Alert.alert('Error', 'Failed to save security settings.');
        } finally {
            setSavingSecurity(false);
        }
    };

    // Sign out handler
    const handleSignOut = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Sign Out', 'Are you sure you want to sign out from this account?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    if (signOut) signOut();
                    router.replace('/login');
                },
            },
        ]);
    };

    // Active Category Config
    const currentCategoryConfig = useMemo(() => {
        if (activeCategory === 'about') {
            return {
                id: 'about',
                group: 'general' as OrganizationSetupGroup,
                title: 'About Forma',
                subtitle: 'Enterprise operational OS architecture & version',
                description: 'Enterprise operational OS architecture & version',
                icon: 'info.circle',
                color: '#007AFF',
                gradientColors: ['#007AFF', '#0026B8'],
                badges: ['Version', 'Architecture'],
            };
        }
        if (activeCategory === 'terms') {
            return {
                id: 'terms',
                group: 'general' as OrganizationSetupGroup,
                title: 'Terms of Service',
                subtitle: 'Enterprise service agreement & policies',
                description: 'Enterprise service agreement & policies',
                icon: 'doc.text',
                color: '#007AFF',
                gradientColors: ['#007AFF', '#0026B8'],
                badges: ['Terms', 'Policies'],
            };
        }
        if (activeCategory === 'privacy') {
            return {
                id: 'privacy',
                group: 'general' as OrganizationSetupGroup,
                title: 'Privacy Policy',
                subtitle: 'Data sovereignty, telemetry & global compliance',
                description: 'Data sovereignty, telemetry & global compliance',
                icon: 'hand.raised',
                color: '#007AFF',
                gradientColors: ['#007AFF', '#0026B8'],
                badges: ['Privacy', 'GDPR', 'Compliance'],
            };
        }
        return SETTINGS_CATEGORIES.find((c) => c.id === activeCategory) || SETTINGS_CATEGORIES[0];
    }, [activeCategory]);

    // Header Toolbar Actions
    const toolbarActions: HeaderToolbarAction[] = useMemo(() => {
        if (activeCategory === 'general') {
            if (hasGeneralChanges) {
                return [
                    {
                        id: 'save-general',
                        title: savingGeneral ? 'Saving...' : 'Save Changes',
                        icon: 'checkmark-circle',
                        image: 'checkmark.circle.fill',
                        tintColor: '#007AFF',
                        isPrimary: true,
                        onPress: handleSaveGeneralChanges,
                    },
                ];
            }
        } else if (activeCategory === 'team') {
            const actions: HeaderToolbarAction[] = [];

            // 1. Search action
            actions.push({
                id: 'search',
                title: 'Search',
                icon: 'search',
                image: 'magnifyingglass',
                onPress: () => {
                    Haptics.selectionAsync();
                    setIsSearchVisible((prev) => !prev);
                },
            });

            // 2. Sort/Filter Context Menu action
            const sortActions: ContextMenuAction[] = [
                {
                    title: 'Role',
                    systemIcon: 'person.badge.key',
                    state: sortBy === 'role' ? 'on' : 'off',
                },
                {
                    title: 'Name (A to Z)',
                    systemIcon: 'arrow.up',
                    state: sortBy === 'name_asc' ? 'on' : 'off',
                },
                {
                    title: 'Name (Z to A)',
                    systemIcon: 'arrow.down',
                    state: sortBy === 'name_desc' ? 'on' : 'off',
                },
            ];

            actions.push({
                id: 'sort',
                title: 'Sort Members',
                icon: 'swap-vertical',
                image: 'arrow.up.arrow.down',
                menuActions: sortActions,
                onMenuPress: (e: any) => {
                    const index = e.nativeEvent.index;
                    if (index === 0) setSortBy('role');
                    else if (index === 1) setSortBy('name_asc');
                    else if (index === 2) setSortBy('name_desc');
                    Haptics.selectionAsync();
                },
            });

            // 3. Add Member action (primary Electric Blue)
            if (isSuperOrAdmin) {
                actions.push({
                    id: 'add-member',
                    title: 'Add Member',
                    icon: 'add',
                    image: 'plus',
                    tintColor: '#007AFF',
                    isPrimary: true,
                    onPress: () => {
                        Haptics.selectionAsync();
                        setEditingMember(null);
                        setIsAddMemberOpen(true);
                    },
                });
            }
            return actions;
        } else if (activeCategory === 'roles') {
            if (hasRoleChanges && isSuperOrAdmin) {
                return [
                    {
                        id: 'save-roles',
                        title: savingRoles ? 'Saving...' : 'Save Permissions',
                        icon: 'checkmark-circle',
                        image: 'checkmark.circle.fill',
                        tintColor: '#007AFF',
                        isPrimary: true,
                        onPress: handleSaveRoleChanges,
                    },
                ];
            }
        } else if (activeCategory === 'notifications') {
            if (hasNotifChanges) {
                return [
                    {
                        id: 'save-notifs',
                        title: savingNotifs ? 'Saving...' : 'Save Preferences',
                        icon: 'checkmark-circle',
                        image: 'checkmark.circle.fill',
                        tintColor: '#007AFF',
                        isPrimary: true,
                        onPress: handleSaveNotifChanges,
                    },
                ];
            }
        } else if (activeCategory === 'security') {
            if (hasSecurityChanges) {
                return [
                    {
                        id: 'save-sec',
                        title: savingSecurity ? 'Saving...' : 'Save Security',
                        icon: 'checkmark-circle',
                        image: 'checkmark.circle.fill',
                        tintColor: '#007AFF',
                        isPrimary: true,
                        onPress: handleSaveSecurityChanges,
                    },
                ];
            }
        }
        return [];
    }, [
        activeCategory,
        hasGeneralChanges,
        savingGeneral,
        isSuperOrAdmin,
        sortBy,
        isSearchVisible,
        hasRoleChanges,
        savingRoles,
        hasNotifChanges,
        savingNotifs,
        hasSecurityChanges,
        savingSecurity,
    ]);

    // Colors
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const formaBlue = isDark ? '#4D82FF' : '#007AFF';

    const renderActiveSection = () => {
        switch (activeCategory) {
            case 'general':
                return (
                    <OrganizationGeneralSection
                        name={name}
                        setName={setName}
                        companyCode={companyCode}
                        setCompanyCode={setCompanyCode}
                        joinCode={joinCode}
                        logoUrl={logoUrl}
                        handlePickLogo={handlePickLogo}
                        initials={(name || activeTenant?.name || 'AD').slice(0, 2).toUpperCase()}
                        primaryColor={primaryColor}
                        setPrimaryColor={(val) => {
                            setPrimaryColor(val);
                            setCustomHex(val.replace('#', ''));
                        }}
                        customHex={customHex}
                        setCustomHex={(val) => {
                            setCustomHex(val);
                            if (val.length === 6) setPrimaryColor(`#${val}`);
                        }}
                        address={address}
                        setAddress={setAddress}
                        gmapsUrl={gmapsUrl}
                        handleGmapsChange={handleGmapsChange}
                        latitudeInput={latitudeInput}
                        setLatitudeInput={setLatitudeInput}
                        longitudeInput={longitudeInput}
                        setLongitudeInput={setLongitudeInput}
                        selectedRadius={selectedRadius}
                        setSelectedRadius={setSelectedRadius}
                        isLocating={isLocating}
                        handleGetCurrentLocation={handleGetCurrentLocation}
                        contactPhone={contactPhone}
                        setContactPhone={setContactPhone}
                        contactEmail={contactEmail}
                        setContactEmail={setContactEmail}
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        readOnly={isGeneralReadOnly}
                        onCopySuccess={(msg) => showToast(msg)}
                    />
                );

            case 'account':
                return (
                    <OrganizationAccountSection
                        user={user}
                        profile={profile}
                        activeTenant={activeTenant}
                        tenantRole={tenantRole}
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        cardBgColor={cardBgColor}
                        primaryColor={formaBlue}
                    />
                );

            case 'team':
                return (
                    <View style={{ gap: 16 }}>
                        <OrganizationTeamSection
                            teamMembers={teamMembers}
                            loadingMembers={loadingMembers}
                            memberSearch={memberSearch}
                            sortBy={sortBy}
                            isDark={isDark}
                            textColor={textColor}
                            subtextColor={subtextColor}
                            cardBgColor={cardBgColor}
                            primaryColor={formaBlue}
                            activeTenant={activeTenant}
                            onAddMember={() => {
                                setEditingMember(null);
                                setIsAddMemberOpen(true);
                            }}
                            onEditMember={(member) => {
                                setEditingMember(member);
                                setIsAddMemberOpen(true);
                            }}
                            onDeleteMember={handleDeleteMember}
                            canManageMembers={isSuperOrAdmin}
                        />
                    </View>
                );

            case 'roles':
                return (
                    <OrganizationRolesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        cardBgColor={cardBgColor}
                        borderColor={borderColor}
                        primaryColor={formaBlue}
                        rolePerms={rolePerms}
                        onTogglePermission={handleTogglePermission}
                        canManageRoles={isSuperOrAdmin}
                        currentRole={tenantRole}
                    />
                );

            case 'notifications':
                return (
                    <OrganizationNotificationsSection
                        notifications={notifications}
                        setNotifications={setNotifications}
                        primaryColor={formaBlue}
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        cardBgColor={cardBgColor}
                        borderColor={borderColor}
                        userEmail={user?.email}
                    />
                );

            case 'security':
                return (
                    <OrganizationSecuritySection
                        security={security}
                        setSecurity={setSecurity}
                        user={user}
                        primaryColor={formaBlue}
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        cardBgColor={cardBgColor}
                        borderColor={borderColor}
                        canDeleteOrg={isSuperAdmin}
                    />
                );

            case 'integrations':
                return (
                    <OrganizationIntegrationsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        cardBgColor={cardBgColor}
                        primaryColor={formaBlue}
                    />
                );

            case 'about':
            case 'terms':
            case 'privacy':
            case 'legal':
                return (
                    <OrganizationLegalSection
                        initialTab={
                            activeCategory === 'terms'
                                ? 'terms'
                                : activeCategory === 'privacy'
                                ? 'privacy'
                                : 'about'
                        }
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        cardBgColor={cardBgColor}
                        borderColor={borderColor}
                        onTabChange={(newTab) => {
                            setActiveCategory(newTab);
                            onCategoryChange?.(newTab);
                        }}
                    />
                );

            default:
                return null;
        }
    };

    const groups: OrganizationSetupGroup[] = ['general', 'access', 'system'];

    return (
        <View style={[styles.splitRoot, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            {/* ════════════════════════════════════════════════════════════════════
                LEFT PANE: ORGANIZATION SETTINGS MENU (Identical to Finance Setup)
               ════════════════════════════════════════════════════════════════════ */}
            <View style={[styles.splitLeftPane, { borderRightColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                {/* Header with Title */}
                <View style={styles.splitListHeader}>
                    <View style={styles.splitListHeaderTitleRow}>
                        <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>
                            Organization Settings
                        </Text>
                    </View>
                </View>

                {/* Categories List */}
                <ScrollView
                    style={styles.splitListScroll}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={true}
                >
                    <View style={{ gap: 20 }}>
                        {groups.map((grp) => {
                            const items = visibleCategories.filter((item) => item.group === grp);
                            if (items.length === 0) return null;
                            const title = GROUP_TITLES[grp];

                            return (
                                <View key={grp} style={styles.menuListContainer}>
                                    <Text style={[styles.menuListHeader, { color: subtextColor }]}>
                                        {title}
                                    </Text>
                                    <View
                                        style={[
                                            styles.menuList,
                                            {
                                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                                borderWidth: 1,
                                                borderColor: isDark
                                                    ? 'rgba(255,255,255,0.08)'
                                                    : 'rgba(0,0,0,0.04)',
                                            },
                                        ]}
                                    >
                                        {items.map((item, index) => {
                                            const isSelected = activeCategory === item.id;
                                            const isLast = index === items.length - 1;
                                            const subtitle = item.subtitle || item.badges?.join(', ');

                                            return (
                                                <View key={item.id}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.menuRow,
                                                            isSelected && {
                                                                backgroundColor: isDark
                                                                    ? 'rgba(0, 122, 255, 0.16)'
                                                                    : 'rgba(0, 122, 255, 0.08)',
                                                            },
                                                        ]}
                                                        onPress={() => handleSelectCategory(item.id)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <LinearGradient
                                                            colors={isDark ? ['#1C1C1E', '#000000'] : (item.gradientColors || ['#64748B', '#475569'])}
                                                            style={styles.menuIconBox}
                                                            start={{ x: 0, y: 0 }}
                                                            end={{ x: 1, y: 1 }}
                                                        >
                                                            <PlatformIcon
                                                                name={item.icon as any}
                                                                size={16}
                                                                tintColor={isDark ? (item.color || '#FFF') : '#FFF'}
                                                            />
                                                        </LinearGradient>
                                                        <View style={styles.menuRowContent}>
                                                            <Text style={[styles.menuRowTitle, { color: textColor }]}>
                                                                {item.title}
                                                            </Text>
                                                            <Text
                                                                style={[styles.menuRowSubtitle, { color: subtextColor }]}
                                                                numberOfLines={1}
                                                            >
                                                                {subtitle}
                                                            </Text>
                                                        </View>
                                                        <PlatformIcon
                                                            name="chevron.right"
                                                            size={14}
                                                            tintColor={
                                                                isSelected
                                                                    ? '#007AFF'
                                                                    : isDark
                                                                    ? 'rgba(255,255,255,0.25)'
                                                                    : 'rgba(0,0,0,0.25)'
                                                            }
                                                        />
                                                    </TouchableOpacity>
                                                    {!isLast && (
                                                        <View
                                                            style={[
                                                                styles.indentedDivider,
                                                                {
                                                                    backgroundColor: isDark
                                                                        ? 'rgba(255,255,255,0.06)'
                                                                        : 'rgba(0,0,0,0.06)',
                                                                },
                                                            ]}
                                                        />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}

                        {/* DEDICATED SIGN OUT PILL BUTTON */}
                        <View style={styles.logoutWrapper}>
                            <TouchableOpacity
                                activeOpacity={0.75}
                                onPress={handleSignOut}
                                style={[
                                    styles.logoutPillButton,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(239, 68, 68, 0.12)'
                                            : 'rgba(239, 68, 68, 0.08)',
                                    },
                                ]}
                            >
                                <PlatformIcon
                                    name="rectangle.portrait.and.arrow.right"
                                    size={15}
                                    tintColor="#EF4444"
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.logoutButtonText}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>

                        {/* FOOTER LEGAL LINKS */}
                        <View style={styles.footerLinksRow}>
                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={() => openLegalSheet('about')}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                            >
                                <Text style={[styles.footerLinkText, { color: subtextColor }]}>
                                    About Forma
                                </Text>
                            </TouchableOpacity>

                            <Text style={[styles.footerDot, { color: subtextColor }]}>·</Text>

                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={() => openLegalSheet('terms')}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                            >
                                <Text style={[styles.footerLinkText, { color: subtextColor }]}>
                                    Terms
                                </Text>
                            </TouchableOpacity>

                            <Text style={[styles.footerDot, { color: subtextColor }]}>·</Text>

                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={() => openLegalSheet('privacy')}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                            >
                                <Text style={[styles.footerLinkText, { color: subtextColor }]}>
                                    Privacy
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* ════════════════════════════════════════════════════════════════════
                RIGHT PANE: ACTIVE SETTING DETAILS (Identical to Finance Setup Detail)
               ════════════════════════════════════════════════════════════════════ */}
            <View style={[styles.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                {/* Header Row */}
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: textColor }]}>
                            {currentCategoryConfig.title}
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                            {currentCategoryConfig.subtitle || currentCategoryConfig.description}
                        </Text>
                    </View>

                    {toolbarActions.length > 0 && (
                        <HeaderToolbar
                            key={`toolbar-${activeCategory}`}
                            actions={toolbarActions}
                            isDark={isDark}
                            textColor={textColor}
                            maxDirectActions={3}
                            primaryActionTextColor="#007AFF"
                        />
                    )}
                </View>

                {/* Floating Search Bar for Team (Truly floating solid pill, no transparency clipping) */}
                {activeCategory === 'team' && isSearchVisible && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 68,
                            left: 24,
                            right: 24,
                            zIndex: 50,
                        }}
                    >
                        <SwiftUISearchBar
                            placeholder="Search member by name, email, or role..."
                            value={memberSearch}
                            onChangeText={setMemberSearch}
                            onClear={(hadText) => {
                                if (!hadText) {
                                    setIsSearchVisible(false);
                                }
                            }}
                            isDark={isDark}
                            showClearButton={true}
                            style={{
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: isDark ? 0.35 : 0.07,
                                shadowRadius: 12,
                                elevation: 4,
                            }}
                        />
                    </View>
                )}

                {/* Content Viewport */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingTop: activeCategory === 'team' && isSearchVisible ? 76 : 20,
                        paddingBottom: 100,
                        paddingHorizontal: 24,
                        width: '100%',
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {renderActiveSection()}
                </ScrollView>

                {/* Floating Unsaved Changes Banner */}
                {hasGeneralChanges && activeCategory === 'general' && (
                    <View style={styles.unsavedBannerWrapper}>
                        <SwiftUIUnsavedBanner
                            saving={savingGeneral}
                            onSave={handleSaveGeneralChanges}
                            onCancel={handleDiscardGeneralChanges}
                            isDark={isDark}
                            title="Unsaved changes"
                        />
                    </View>
                )}
                {hasRoleChanges && activeCategory === 'roles' && (
                    <View style={styles.unsavedBannerWrapper}>
                        <SwiftUIUnsavedBanner
                            saving={savingRoles}
                            onSave={handleSaveRoleChanges}
                            onCancel={handleDiscardRoleChanges}
                            isDark={isDark}
                            title="Unsaved permissions"
                        />
                    </View>
                )}
                {hasNotifChanges && activeCategory === 'notifications' && (
                    <View style={styles.unsavedBannerWrapper}>
                        <SwiftUIUnsavedBanner
                            saving={savingNotifs}
                            onSave={handleSaveNotifChanges}
                            onCancel={handleDiscardNotifChanges}
                            isDark={isDark}
                            title="Unsaved preferences"
                        />
                    </View>
                )}
                {hasSecurityChanges && activeCategory === 'security' && (
                    <View style={styles.unsavedBannerWrapper}>
                        <SwiftUIUnsavedBanner
                            saving={savingSecurity}
                            onSave={handleSaveSecurityChanges}
                            onCancel={handleDiscardSecurityChanges}
                            isDark={isDark}
                            title="Unsaved security"
                        />
                    </View>
                )}
            </View>

            {/* TEAM MEMBER MODAL / SHEET */}
            {isAddMemberOpen && (
                <SwiftUITeamMemberSheet
                    isOpened={isAddMemberOpen}
                    visible={isAddMemberOpen}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    editMember={editingMember}
                    editingMember={editingMember}
                    isSubmitting={isSubmittingMember}
                    onClose={() => {
                        setIsAddMemberOpen(false);
                        setEditingMember(null);
                    }}
                    onSubmit={handleSaveMember}
                />
            )}



            {/* FLOATING TOAST HUD OVERLAY */}
            {!!toastMessage && (
                <View style={styles.toastWrapper} pointerEvents="none">
                    <SwiftUIToastHUD message={toastMessage} isDark={isDark} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        borderRightWidth: StyleSheet.hairlineWidth,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    splitListHeader: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 0,
    },
    splitListHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    splitListHeaderTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    splitListScroll: {
        flex: 1,
        height: '100%',
    },
    menuListContainer: {
        gap: 8,
    },
    menuListHeader: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    menuList: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 12,
    },
    menuIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuRowContent: {
        flex: 1,
        gap: 1,
    },
    menuRowTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    menuRowSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
    indentedDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 60,
        marginRight: 0,
    },
    logoutWrapper: {
        marginTop: 8,
        alignItems: 'center',
    },
    logoutPillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        paddingHorizontal: 24,
        borderRadius: 999,
        width: '100%',
    },
    logoutButtonText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    footerLinksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 8,
        gap: 6,
    },
    footerLinkText: {
        fontSize: 11,
        fontWeight: '500',
    },
    footerDot: {
        fontSize: 11,
        opacity: 0.6,
    },
    splitRightPane: {
        flex: 2,
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 0,
        gap: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    unsavedBannerWrapper: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        alignItems: 'center',
        zIndex: 99,
    },
    toastWrapper: {
        position: 'absolute',
        top: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 99999,
    },
});
