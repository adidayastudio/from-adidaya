import React, { useState, useEffect } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    ActivityIndicator,
    Alert,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

import Animated, {
    FadeIn,
    FadeOut,
    SlideInRight,
    SlideOutRight,
    SlideInDown,
    SlideOutDown,
} from 'react-native-reanimated';

import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';

const ROLE_OPTIONS = ['Member', 'Super Admin', 'Admin', 'Viewer', 'System'] as const;
const STATUS_OPTIONS = ['Active', 'Inactive', 'Archived'] as const;

const getRoleColor = (roleStr?: string) => {
    const r = (roleStr || '').toLowerCase();
    if (r.includes('super')) return '#EF4444';
    if (r.includes('admin')) return '#3B82F6';
    if (r.includes('member') || r.includes('staff')) return '#10B981';
    if (r.includes('view')) return '#F59E0B';
    if (r.includes('system')) return '#64748B';
    return '#007AFF';
};

export interface SwiftUITeamMemberSheetProps {
    isOpened?: boolean;
    visible?: boolean;
    onClose: () => void;
    onSubmit: (data: {
        fullName: string;
        email: string;
        role: string;
        password?: string;
        status?: string;
        name?: string;
    }) => Promise<void>;
    isSubmitting: boolean;
    editMember?: any | null;
    editingMember?: any | null;
    isDark?: boolean;
    textColor?: string;
    subtextColor?: string;
}

export const SwiftUITeamMemberSheet: React.FC<SwiftUITeamMemberSheetProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./SwiftUITeamMemberSheet.ios').SwiftUITeamMemberSheet;
        return <Comp {...props} />;
    }

    const isOpened = Boolean(props.isOpened ?? props.visible);
    const editMember = props.editMember ?? props.editingMember ?? null;
    const { onClose, onSubmit, isSubmitting } = props;
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = props.isDark ?? resolvedTheme === 'dark';

    const isEditMode = !!editMember?.id;
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? '#2C2C2E' : '#F2F2F7';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<typeof ROLE_OPTIONS[number]>('Member');
    const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>('Active');
    const [password, setPassword] = useState('Forma123456!');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (editMember) {
            setFullName(editMember.profile?.full_name || editMember.profile?.username || '');
            setEmail(editMember.profile?.email || editMember.email || '');
            const currentRole = (editMember.role || '').toLowerCase();
            const matched = ROLE_OPTIONS.find(
                (r) => r.toLowerCase() === currentRole || (r === 'System' && currentRole === 'sistem')
            );
            setRole(matched || 'Member');
            const currentStatus = (editMember.status || 'active').toLowerCase();
            const matchedStatus = STATUS_OPTIONS.find(
                (s) => s.toLowerCase() === currentStatus
            );
            setStatus(matchedStatus || 'Active');
        } else {
            setFullName('');
            setEmail('');
            setRole('Member');
            setStatus('Active');
            setPassword('Forma123456!');
        }
    }, [editMember, isOpened]);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Required Field', 'Please enter member full name.');
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid login email address.');
            return;
        }
        if (!isEditMode && (!password || password.length < 6)) {
            Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await onSubmit({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            role,
            status: status.toLowerCase(),
            password: !isEditMode ? password : undefined,
        });
    };

    const roleActions: ContextMenuAction[] = ROLE_OPTIONS.map((r) => ({
        title: r,
        systemIcon: r === 'Super Admin' ? 'shield.fill' : r === 'Admin' ? 'person.badge.key.fill' : r === 'Viewer' ? 'eye.fill' : r === 'System' ? 'cpu' : 'person.fill',
        state: role === r ? 'on' : 'off',
    }));

    const statusActions: ContextMenuAction[] = STATUS_OPTIONS.map((s) => ({
        title: s,
        systemIcon: s === 'Active' ? 'checkmark.circle.fill' : s === 'Archived' ? 'archivebox.fill' : 'xmark.circle.fill',
        state: status === s ? 'on' : 'off',
    }));

    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' || width >= 768;

    return (
        <Modal
            visible={isOpened}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
            navigationBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[
                    styles.modalOverlay,
                    isDesktop && styles.desktopOverlay,
                ]}
            >
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={styles.backdrop}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                </Animated.View>

                <Animated.View
                    entering={isDesktop ? SlideInRight.springify().damping(22).stiffness(180).mass(0.8) : SlideInDown.springify().damping(22).stiffness(180).mass(0.8)}
                    exiting={isDesktop ? SlideOutRight.duration(200) : SlideOutDown.duration(200)}
                    style={[
                        styles.drawerContainer,
                        isDesktop ? styles.desktopDrawer : styles.mobileDrawer,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            paddingBottom: isDesktop ? 24 : Math.max(insets.bottom, 16),
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={[styles.headerTitle, { color: textColor }]}>
                                {isEditMode ? 'Edit Member' : 'New Member'}
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                                {isEditMode ? 'Update member role and account details' : 'Add a user to this organization'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[
                                styles.closeButton,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                            ]}
                        >
                            <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Form Body */}
                    <ScrollView
                        style={styles.scrollBody}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: subtextColor }]}>Full Name</Text>
                            <TextInput
                                style={[
                                    styles.pillInput,
                                    {
                                        backgroundColor: cardBg,
                                        color: textColor,
                                        borderColor,
                                    },
                                ]}
                                placeholder="Full Name"
                                placeholderTextColor={subtextColor}
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>

                        {/* Email */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: subtextColor }]}>Email Address</Text>
                            <TextInput
                                style={[
                                    styles.pillInput,
                                    {
                                        backgroundColor: cardBg,
                                        color: isEditMode ? subtextColor : textColor,
                                        borderColor,
                                    },
                                ]}
                                placeholder="Email Address"
                                placeholderTextColor={subtextColor}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!isEditMode}
                            />
                        </View>

                        {/* Role Selection (ContextMenu Pill) */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: subtextColor }]}>Organization Role</Text>
                            <ContextMenu
                                dropdownMenuMode={true}
                                actions={roleActions}
                                onPress={(e: any) => {
                                    const actionTitle = e.nativeEvent.name || roleActions[e.nativeEvent.index]?.title;
                                    if (actionTitle && ROLE_OPTIONS.includes(actionTitle as any)) {
                                        Haptics.selectionAsync();
                                        setRole(actionTitle as any);
                                    }
                                }}
                            >
                                <View
                                    style={[
                                        styles.pillSelectRow,
                                        {
                                            backgroundColor: cardBg,
                                            borderColor,
                                        },
                                    ]}
                                >
                                    <View style={styles.pillSelectContent}>
                                        <View style={[styles.roleEmblemDot, { backgroundColor: getRoleColor(role) }]} />
                                        <Text style={[styles.pillSelectText, { color: textColor }]}>
                                            {role}
                                        </Text>
                                    </View>
                                    <PlatformIcon name="chevron.down" size={14} tintColor={subtextColor} />
                                </View>
                            </ContextMenu>
                        </View>

                        {/* Status Selection (Edit Mode Only - ContextMenu Pill) */}
                        {isEditMode && (
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: subtextColor }]}>Status</Text>
                                <ContextMenu
                                    dropdownMenuMode={true}
                                    actions={statusActions}
                                    onPress={(e: any) => {
                                        const actionTitle = e.nativeEvent.name || statusActions[e.nativeEvent.index]?.title;
                                        if (actionTitle && STATUS_OPTIONS.includes(actionTitle as any)) {
                                            Haptics.selectionAsync();
                                            setStatus(actionTitle as any);
                                        }
                                    }}
                                >
                                    <View
                                        style={[
                                            styles.pillSelectRow,
                                            {
                                                backgroundColor: cardBg,
                                                borderColor,
                                            },
                                        ]}
                                    >
                                        <View style={styles.pillSelectContent}>
                                            <View
                                                style={[
                                                    styles.roleEmblemDot,
                                                    {
                                                        backgroundColor:
                                                            status === 'Active'
                                                                ? '#10B981'
                                                                : status === 'Archived'
                                                                ? '#8E8E93'
                                                                : '#EF4444',
                                                    },
                                                ]}
                                            />
                                            <Text style={[styles.pillSelectText, { color: textColor }]}>
                                                {status}
                                            </Text>
                                        </View>
                                        <PlatformIcon name="chevron.down" size={14} tintColor={subtextColor} />
                                    </View>
                                </ContextMenu>
                            </View>
                        )}

                        {/* Password (New Member Only - Pill input) */}
                        {!isEditMode && (
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: subtextColor }]}>Temporary Password</Text>
                                <View style={styles.passwordRow}>
                                    <TextInput
                                        style={[
                                            styles.pillInput,
                                            {
                                                backgroundColor: cardBg,
                                                color: textColor,
                                                borderColor,
                                                paddingRight: 48,
                                            },
                                        ]}
                                        placeholder="Password"
                                        placeholderTextColor={subtextColor}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <PlatformIcon
                                            name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                                            size={18}
                                            tintColor={subtextColor}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Pinned Bottom Submit Button Footer */}
                    <View style={styles.footerContainer}>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isSubmitting}
                            style={[
                                styles.submitButton,
                                { backgroundColor: '#007AFF', opacity: isSubmitting ? 0.7 : 1 },
                            ]}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {isEditMode ? 'Save Changes' : 'Create Member'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    desktopOverlay: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: 16,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    drawerContainer: {
        shadowColor: '#000',
        shadowOffset: { width: -6, height: 16 },
        shadowOpacity: 0.28,
        shadowRadius: 32,
        elevation: 20,
        display: 'flex',
        flexDirection: 'column',
    },
    mobileDrawer: {
        maxHeight: '90%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    desktopDrawer: {
        width: 480,
        maxWidth: '100%',
        height: '100%',
        maxHeight: '100%',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 4,
        paddingBottom: 16,
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
    },
    pillInput: {
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 20,
        fontSize: 15,
        borderWidth: 1,
    },
    pillSelectRow: {
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pillSelectContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    roleEmblemDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    pillSelectText: {
        fontSize: 15,
        fontWeight: '600',
    },
    passwordRow: {
        position: 'relative',
        justifyContent: 'center',
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerContainer: {
        paddingTop: 16,
    },
    submitButton: {
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default SwiftUITeamMemberSheet;
