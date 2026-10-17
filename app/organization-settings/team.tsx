import React, { useState, useEffect, useRef } from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    Alert,
    StatusBar as RNStatusBar,
    View,
    Keyboard,
    KeyboardAvoidingView,
    TouchableOpacity,
    Animated,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import {
    supabase,
} from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { SwiftUISearchBar } from '@/components/chat/SwiftUISearchBar';
import { SwiftUITeamMemberSheet } from '@/components/team/SwiftUITeamMemberSheet';
import { TeamMember } from '@/components/organization-settings/types';
import { OrganizationTeamSection, TeamSortOption } from '@/components/organization-settings/OrganizationTeamSection';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';

export default function OrganizationTeamScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { activeTenant, tenantRole, isSuperAdmin } = useTenantContext();

    useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace('/(tabs)/home/organization-settings/team');
        }
    }, [isDesktopWeb]);

    const normalizedRole = (tenantRole || '').toLowerCase().trim();
    const isSuperOrAdmin = isSuperAdmin || 
        normalizedRole.includes('admin') || 
        normalizedRole.includes('owner') || 
        normalizedRole.includes('super');
    const isViewer = !isSuperOrAdmin && normalizedRole.includes('view');

    useEffect(() => {
        if (isViewer) {
            Alert.alert('Access Restricted', 'Viewers do not have access to Organization Team Settings.');
            router.replace('/organization-settings');
        }
    }, [isViewer]);

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [sortBy, setSortBy] = useState<TeamSortOption>('role');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const isSearching = isSearchFocused || keyboardHeight > 0;
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [isSubmittingMember, setIsSubmittingMember] = useState(false);

    const defaultBottom = (insets.bottom || 0) + 12;
    const bottomAnim = useRef(new Animated.Value(defaultBottom)).current;

    const resetSearchPosition = () => {
        Keyboard.dismiss();
        setIsSearchFocused(false);
        setKeyboardHeight(0);
        Animated.timing(bottomAnim, {
            toValue: (insets.bottom || 0) + 12,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    useEffect(() => {
        const defaultB = (insets.bottom || 0) + 12;
        if (keyboardHeight === 0) {
            bottomAnim.setValue(defaultB);
        }
    }, [insets.bottom, keyboardHeight]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            const h = e.endCoordinates?.height || 0;
            setKeyboardHeight(h);
            const targetBottom = h + (Platform.OS === 'ios' ? 12 : 20);
            if (Platform.OS === 'ios' && e.duration) {
                Animated.timing(bottomAnim, {
                    toValue: targetBottom,
                    duration: e.duration,
                    useNativeDriver: false,
                }).start();
            } else {
                bottomAnim.setValue(targetBottom);
            }
        });

        const hideSub = Keyboard.addListener(hideEvent, (e) => {
            setKeyboardHeight(0);
            setIsSearchFocused(false);
            const targetBottom = (insets.bottom || 0) + 12;
            if (Platform.OS === 'ios' && e?.duration) {
                Animated.timing(bottomAnim, {
                    toValue: targetBottom,
                    duration: e.duration,
                    useNativeDriver: false,
                }).start();
            } else {
                bottomAnim.setValue(targetBottom);
            }
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [insets.bottom]);

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const primaryColor = activeTenant?.primary_color || '#007AFF';

    const fetchTeamMembers = async () => {
        if (!activeTenant?.id) return;
        setLoadingMembers(true);
        try {
            const { data: members, error: mError } = await supabase
                .from('tenant_members')
                .select('id, role, status, user_id, created_at')
                .eq('tenant_id', activeTenant.id)
                .order('created_at', { ascending: false });

            if (mError) throw mError;

            if (members && members.length > 0) {
                const userIds = members.map((m: any) => m.user_id).filter(Boolean);
                const { data: profiles, error: pError } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, email, avatar_url, phone, status')
                    .in('id', userIds);

                if (pError) console.error('Error fetching profiles:', pError);

                const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
                const enriched: TeamMember[] = members.map((m: any) => {
                    const prof = profileMap.get(m.user_id);
                    return {
                        id: m.id,
                        tenant_id: activeTenant.id,
                        user_id: m.user_id,
                        role: m.role,
                        status: m.status,
                        created_at: m.created_at,
                        full_name: prof?.full_name || 'Anonymous User',
                        email: prof?.email || 'No email',
                        avatar_url: prof?.avatar_url,
                        phone: prof?.phone,
                        profile: prof,
                    };
                });
                setTeamMembers(enriched);
            } else {
                setTeamMembers([]);
            }
        } catch (err) {
            console.error('Fetch team members error:', err);
        } finally {
            setLoadingMembers(false);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, [activeTenant?.id]);

    const handleDeleteMember = async (member: TeamMember) => {
        if (!member.id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { error } = await supabase
                .from('tenant_members')
                .delete()
                .eq('id', member.id);

            if (error) throw error;

            setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Member removed from organization.');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to remove member.');
        }
    };

    const handleSubmitMember = async (data: any) => {
        if (!activeTenant?.id) return;
        setIsSubmittingMember(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (editingMember) {
                const { error: updateError } = await supabase
                    .from('tenant_members')
                    .update({
                        role: data.role,
                        status: data.status,
                    })
                    .eq('id', editingMember.id);

                if (updateError) throw updateError;

                if (editingMember.user_id) {
                    await supabase
                        .from('profiles')
                        .update({
                            full_name: data.fullName,
                            phone: data.phone,
                            status: data.status,
                        })
                        .eq('id', editingMember.user_id);
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Member updated successfully.');
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) throw new Error('Please sign in again.');

                const { error: createError } = await supabase.functions.invoke('create-team-member', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                    body: {
                        tenantId: activeTenant.id,
                        fullName: data.fullName.trim(),
                        email: data.email.trim().toLowerCase(),
                        password: data.password,
                        role: data.role,
                        status: data.status || 'active',
                    },
                });

                if (createError) {
                    const details = await createError.context?.json?.().catch(() => null);
                    throw new Error(details?.error || details?.message || details?.msg || createError.message);
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Member added successfully.');
            }

            setIsAddMemberOpen(false);
            setEditingMember(null);
            fetchTeamMembers();
        } catch (err: any) {
            console.error('Submit member error:', err);
            Alert.alert('Error', err.message || 'Failed to submit member.');
        } finally {
            setIsSubmittingMember(false);
        }
    };

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

    const handleSortContextMenu = (e: any) => {
        const index = e.nativeEvent.index;
        if (index === 0) setSortBy('role');
        else if (index === 1) setSortBy('name_asc');
        else if (index === 2) setSortBy('name_desc');
        Haptics.selectionAsync();
    };

    return (
        <View style={styles.screenWrapper}>
            <Stack.Screen
                options={{
                    headerTitle: 'Team',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : bgColor },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                    headerRight: isSuperOrAdmin
                        ? () => (
                            <View style={{ marginRight: Platform.OS === 'web' ? 12 : 0 }}>
                                <HeaderToolbar
                                    actions={[
                                        {
                                            id: 'add-member',
                                            title: 'Add Member',
                                            icon: 'add',
                                            image: 'plus',
                                            isPrimary: true,
                                            tintColor: '#0036F8',
                                            onPress: () => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setEditingMember(null);
                                                setIsAddMemberOpen(true);
                                            },
                                        },
                                    ]}
                                    isDark={isDark}
                                    textColor={textColor}
                                    primaryActionTextColor="#0036F8"
                                />
                            </View>
                        )
                        : undefined,
                }}
            />

            <ScrollView
                style={[styles.container, { backgroundColor: bgColor }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: insets.bottom + 90,
                    paddingTop: 16,
                    gap: 16,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={resetSearchPosition}
                onTouchStart={() => {
                    if (keyboardHeight > 0 || isSearchFocused) {
                        resetSearchPosition();
                    }
                }}
            >
                <OrganizationTeamSection
                    teamMembers={teamMembers}
                    loadingMembers={loadingMembers}
                    memberSearch={memberSearch}
                    sortBy={sortBy}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    cardBgColor={cardBgColor}
                    primaryColor={primaryColor}
                    activeTenant={activeTenant}
                    canManageMembers={isSuperOrAdmin}
                    onAddMember={() => {
                        resetSearchPosition();
                        if (!isSuperOrAdmin) return;
                        setEditingMember(null);
                        setIsAddMemberOpen(true);
                    }}
                    onEditMember={(member) => {
                        resetSearchPosition();
                        if (!isSuperOrAdmin) return;
                        setEditingMember(member);
                        setIsAddMemberOpen(true);
                    }}
                    onDeleteMember={(member) => {
                        resetSearchPosition();
                        handleDeleteMember(member);
                    }}
                />
            </ScrollView>

            {/* FLOATING BOTTOM LIQUID GLASS SEARCH BAR & SORT (TEAM) */}
            <Animated.View
                style={[
                    styles.bottomSearchBarWrapper,
                    {
                        bottom: bottomAnim,
                    },
                ]}
            >
                <View style={{ flex: 1, minWidth: 0 }}>
                    <SwiftUISearchBar
                        placeholder="Search member by name, email, or role..."
                        value={memberSearch}
                        onChangeText={setMemberSearch}
                        onClear={() => {
                            setMemberSearch('');
                            setIsSearchFocused(false);
                            bottomAnim.setValue((insets.bottom || 0) + 12);
                            Keyboard.dismiss();
                        }}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => {
                            setIsSearchFocused(false);
                            bottomAnim.setValue((insets.bottom || 0) + 12);
                        }}
                        isDark={isDark}
                        showClearButton={isSearching}
                    />
                </View>
                {!isSearching && (
                    <View style={styles.sortButtonWrapper}>
                        <ContextMenu
                            actions={sortActions}
                            dropdownMenuMode={true}
                            onPress={handleSortContextMenu}
                            style={styles.sortIconButton}
                        >
                            <GlassView
                                intensity={85}
                                tint={isDark ? 'dark' : 'light'}
                                style={[
                                    styles.sortIconButton,
                                    {
                                        backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.88)',
                                    },
                                ]}
                            >
                                <PlatformIcon
                                    name="arrow.up.arrow.down"
                                    size={20}
                                    tintColor={textColor}
                                    fallback={<Ionicons name="swap-vertical" size={20} color={textColor} />}
                                />
                            </GlassView>
                        </ContextMenu>
                    </View>
                )}
            </Animated.View>

            {/* TRUE LIQUID GLASS TEAM MEMBER DRAWER */}
            <SwiftUITeamMemberSheet
                isOpened={isAddMemberOpen}
                onClose={() => {
                    if (!isSubmittingMember) {
                        setIsAddMemberOpen(false);
                        setEditingMember(null);
                    }
                }}
                onSubmit={handleSubmitMember}
                isSubmitting={isSubmittingMember}
                editMember={editingMember}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    headerAddBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomSearchBarWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 99,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sortButtonWrapper: {
        width: 52,
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        flexShrink: 0,
    },
    sortIconButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
});
