import React, { useState, useEffect } from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    StatusBar as RNStatusBar,
    View,
    Alert,
    Keyboard,
    LayoutAnimation,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { SwiftUIUnsavedBanner } from '@/components/ui/SwiftUIUnsavedBanner';
import {
    OrganizationRolesSection,
    INITIAL_ROLE_DEFS,
} from '@/components/organization-settings/OrganizationRolesSection';
import { PermissionKey, RoleId } from '@/components/organization-settings/types';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';

const getInitialDefaults = (): Record<RoleId, Record<PermissionKey, boolean>> => {
    const initial: any = {};
    INITIAL_ROLE_DEFS.forEach((r) => {
        initial[r.id] = { ...r.defaultPermissions };
    });
    return initial;
};

export default function OrganizationRolesScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { activeTenant, tenantRole, isSuperAdmin } = useTenantContext();

    useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace('/(tabs)/home/organization-settings/roles');
        }
    }, [isDesktopWeb]);

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    useEffect(() => {
        const showListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsKeyboardVisible(true);
            }
        );
        const hideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsKeyboardVisible(false);
            }
        );
        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    const normalizedRole = (tenantRole || '').toLowerCase().trim();
    const canManageRoles = isSuperAdmin || 
        normalizedRole.includes('admin') || 
        normalizedRole.includes('owner') || 
        normalizedRole.includes('super');

    const storageKey = `@tenant_role_perms_${activeTenant?.id || 'default'}`;

    const [savedRolePerms, setSavedRolePerms] = useState<Record<RoleId, Record<PermissionKey, boolean>>>(getInitialDefaults);
    const [rolePerms, setRolePerms] = useState<Record<RoleId, Record<PermissionKey, boolean>>>(getInitialDefaults);
    const [activeEditRoleId, setActiveEditRoleId] = useState<RoleId | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load persisted permissions on mount
    useEffect(() => {
        let isMounted = true;
        const loadPersisted = async () => {
            try {
                const localData = await AsyncStorage.getItem(storageKey);
                if (localData && isMounted) {
                    const parsed = JSON.parse(localData);
                    const merged = { ...getInitialDefaults(), ...parsed };
                    setSavedRolePerms(merged);
                    setRolePerms(merged);
                }
            } catch (err) {
                console.error('Failed to load role permissions:', err);
            }
        };

        loadPersisted();
        return () => {
            isMounted = false;
        };
    }, [storageKey]);

    const hasChanges = canManageRoles && activeEditRoleId !== null && JSON.stringify(rolePerms[activeEditRoleId]) !== JSON.stringify(savedRolePerms[activeEditRoleId]);

    const handleTogglePermission = (roleId: RoleId, permKey: PermissionKey) => {
        if (!canManageRoles) return;

        const role = INITIAL_ROLE_DEFS.find((r) => r.id === roleId);
        if (role?.isLocked) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Role Locked', `${role.title} permissions are system-locked and cannot be modified.`);
            return;
        }

        if (activeEditRoleId && activeEditRoleId !== roleId && hasChanges) {
            const activeRoleName = INITIAL_ROLE_DEFS.find((r) => r.id === activeEditRoleId)?.title;
            Alert.alert(
                'Unsaved Changes',
                `Please save or discard changes for "${activeRoleName}" before modifying another role.`
            );
            return;
        }

        Haptics.selectionAsync();
        setActiveEditRoleId(roleId);
        setRolePerms((prev) => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [permKey]: !prev[roleId]?.[permKey],
            },
        }));
    };

    const handleSaveRoleChanges = async () => {
        if (!activeEditRoleId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSaving(true);
        try {
            const clonedPerms = JSON.parse(JSON.stringify(rolePerms));
            
            // 1. Persist to AsyncStorage
            await AsyncStorage.setItem(storageKey, JSON.stringify(clonedPerms));
            
            // 2. Optional: Try saving to Supabase if tenant exists
            if (activeTenant?.id) {
                try {
                    await supabase.from('tenants').update({
                        updated_at: new Date().toISOString(),
                    }).eq('id', activeTenant.id);
                } catch {
                    // non-fatal
                }
            }

            // 3. Update saved state
            setSavedRolePerms(clonedPerms);
            const savedRoleTitle = INITIAL_ROLE_DEFS.find((r) => r.id === activeEditRoleId)?.title;
            setActiveEditRoleId(null);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Changes Saved', `Permissions for "${savedRoleTitle}" have been updated successfully.`);
        } catch (e: any) {
            console.error('Error saving role perms:', e);
            Alert.alert('Error', e.message || 'Failed to save role permissions.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRolePerms(JSON.parse(JSON.stringify(savedRolePerms)));
        setActiveEditRoleId(null);
    };

    const currentRoleTitle = activeEditRoleId
        ? INITIAL_ROLE_DEFS.find((r) => r.id === activeEditRoleId)?.title
        : '';

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const primaryColor = activeTenant?.primary_color || '#10B981';

    const bannerTopPosition = Platform.OS === 'android'
        ? (RNStatusBar.currentHeight || 24) + 60
        : insets.top + 48;

    const bannerBottomPosition = (insets.bottom || 0) + 16;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Roles',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                }}
            />

            <ScrollView
                style={[styles.container, { backgroundColor: bgColor }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: insets.bottom + (hasChanges ? 90 : 40),
                    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 84 : 16,
                    gap: 16,
                }}
                showsVerticalScrollIndicator={false}
            >
                <OrganizationRolesSection
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    cardBgColor={cardBgColor}
                    borderColor={borderColor}
                    primaryColor={primaryColor}
                    rolePerms={rolePerms}
                    onTogglePermission={handleTogglePermission}
                    canManageRoles={canManageRoles}
                    currentRole={tenantRole || 'member'}
                />
            </ScrollView>

            {/* Floating Unsaved Changes Banner */}
            {hasChanges && (
                <View
                    style={[
                        styles.unsavedBannerWrapper,
                        isKeyboardVisible
                            ? { top: bannerTopPosition }
                            : { bottom: bannerBottomPosition }
                    ]}
                >
                    <SwiftUIUnsavedBanner
                        onCancel={handleDiscardChanges}
                        onSave={handleSaveRoleChanges}
                        saving={isSaving}
                        isDark={isDark}
                        title={`Unsaved changes (${currentRoleTitle})`}
                    />
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    unsavedBannerWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 999,
    },
});
