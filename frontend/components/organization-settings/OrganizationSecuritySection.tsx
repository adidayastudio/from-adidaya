import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    ActionSheetIOS,
    Modal,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { PillButton } from '@/components/ui/PillButton';
import { IOSSwitch } from '@/components/ui/IOSSwitch';

export interface SecuritySettings {
    requireComplexPassword: boolean;
    rotatePassword: boolean;
    rotationInterval: string;
    alwaysLoggedIn: boolean;
    idleTimeout: string;
    maxSessionDuration: string;
    twoFactorEnabled: boolean;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
    requireComplexPassword: true,
    rotatePassword: false,
    rotationInterval: '90 Days',
    alwaysLoggedIn: true,
    idleTimeout: '15 Minutes',
    maxSessionDuration: '24 Hours',
    twoFactorEnabled: false,
};

interface OrganizationSecuritySectionProps {
    security: SecuritySettings;
    setSecurity: React.Dispatch<React.SetStateAction<SecuritySettings>>;
    user: any;
    primaryColor?: string;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cardBgColor: string;
    borderColor: string;
}

const ROTATION_OPTIONS = ['30 Days', '60 Days', '90 Days', '1 Year'];
const IDLE_OPTIONS = ['5 Minutes', '15 Minutes', '30 Minutes', '1 Hour', '4 Hours', '8 Hours'];
const MAX_SESSION_OPTIONS = ['12 Hours', '24 Hours', '7 Days', '14 Days', '30 Days', 'Never'];

export const OrganizationSecuritySection: React.FC<OrganizationSecuritySectionProps> = ({
    security,
    setSecurity,
    user,
    isDark,
    textColor,
    subtextColor,
    cardBgColor,
}) => {

    const [isSendingReset, setIsSendingReset] = useState(false);
    const [pickerModalVisible, setPickerModalVisible] = useState(false);
    const [pickerType, setPickerType] = useState<'rotation' | 'idle' | 'session'>('idle');

    const handleSelectPicker = (type: 'rotation' | 'idle' | 'session') => {
        Haptics.selectionAsync();
        let options: string[] = [];
        let title = '';

        if (type === 'rotation') {
            options = ROTATION_OPTIONS;
            title = 'Select Password Rotation Interval';
        } else if (type === 'idle') {
            options = IDLE_OPTIONS;
            title = 'Select Idle Timeout';
        } else {
            options = MAX_SESSION_OPTIONS;
            title = 'Select Max Session Duration';
        }

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title,
                    options: [...options, 'Cancel'],
                    cancelButtonIndex: options.length,
                },
                (buttonIndex) => {
                    if (buttonIndex < options.length) {
                        Haptics.selectionAsync();
                        const selected = options[buttonIndex];
                        setSecurity((prev) => {
                            if (type === 'rotation') return { ...prev, rotationInterval: selected };
                            if (type === 'idle') return { ...prev, idleTimeout: selected };
                            return { ...prev, maxSessionDuration: selected };
                        });
                    }
                }
            );
        } else {
            setPickerType(type);
            setPickerModalVisible(true);
        }
    };

    const handleResetPassword = async () => {
        if (!user?.email) {
            Alert.alert('Error', 'User email was not detected.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSendingReset(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Reset Link Sent',
                `Password reset instructions have been dispatched to: ${user.email}`
            );
        } catch (e: any) {
            Alert.alert('Failed to Send Reset', e.message || 'An unexpected error occurred.');
        } finally {
            setIsSendingReset(false);
        }
    };

    const separatorColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const chevronColor = isDark ? '#64748B' : '#C7C7CC';

    const renderHeader = (title: string) => (
        <Text style={[styles.sectionHeader, { color: subtextColor }]}>{title}</Text>
    );

    const getOptionsForModal = () => {
        if (pickerType === 'rotation') return ROTATION_OPTIONS;
        if (pickerType === 'idle') return IDLE_OPTIONS;
        return MAX_SESSION_OPTIONS;
    };

    const getCurrentValueForModal = () => {
        if (pickerType === 'rotation') return security.rotationInterval;
        if (pickerType === 'idle') return security.idleTimeout;
        return security.maxSessionDuration;
    };

    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
            {/* 1. PASSWORD POLICY */}
            <View style={styles.section}>
                {renderHeader('Password Policy')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {/* Row 1: Enforce Complex Password */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <View style={styles.rowTextContainer}>
                                <Text style={[styles.rowLabel, { color: textColor }]}>
                                    Enforce Complex Password
                                </Text>
                                <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                                    Require 8+ chars with uppercase, numbers & symbols
                                </Text>
                            </View>
                        </View>
                        <IOSSwitch
                            value={security.requireComplexPassword}
                            isDark={isDark}
                            size={26}
                            activeColor="#34C759"
                            onValueChange={(val) => {
                                setSecurity((prev) => ({ ...prev, requireComplexPassword: val }));
                            }}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Row 2: Password Rotation Toggle */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="refresh-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <View style={styles.rowTextContainer}>
                                <Text style={[styles.rowLabel, { color: textColor }]}>
                                    Password Rotation
                                </Text>
                                <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                                    Require periodic password updates for security
                                </Text>
                            </View>
                        </View>
                        <IOSSwitch
                            value={security.rotatePassword}
                            isDark={isDark}
                            size={26}
                            activeColor="#34C759"
                            onValueChange={(val) => {
                                setSecurity((prev) => ({ ...prev, rotatePassword: val }));
                            }}
                        />
                    </View>

                    {/* Sub-row: Rotation Interval Preset Selector (Only when Rotation is enabled) */}
                    {security.rotatePassword && (
                        <>
                            <View style={[styles.separator, { backgroundColor: separatorColor }]} />
                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={() => handleSelectPicker('rotation')}
                                style={styles.formRow}
                            >
                                <View style={styles.rowLeft}>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={18}
                                        color={isDark ? '#94A3B8' : '#64748B'}
                                        style={styles.rowIcon}
                                    />
                                    <View style={styles.rowTextContainer}>
                                        <Text style={[styles.rowLabel, { color: textColor }]}>
                                            Rotation Interval
                                        </Text>
                                        <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                                            Preset: 30, 60, 90 days, or 1 year
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.nativeValueWrap}>
                                    <Text style={[styles.nativeValueText, { color: subtextColor }]}>
                                        {security.rotationInterval}
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={15}
                                        color={chevronColor}
                                    />
                                </View>
                            </TouchableOpacity>
                        </>
                    )}

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Row 3: Send Password Reset Link (Full Email without truncation) */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="mail-unread-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <View style={styles.rowTextContainer}>
                                <Text style={[styles.rowLabel, { color: textColor }]}>
                                    Reset Password
                                </Text>
                                <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                                    {user?.email ? `Send link to ${user.email}` : 'Send reset link to your email'}
                                </Text>
                            </View>
                        </View>
                        {isSendingReset ? (
                            <ActivityIndicator size="small" color={textColor} />
                        ) : (
                            <PillButton
                                label="Send Link"
                                onPress={handleResetPassword}
                                size="sm"
                                variant="tinted"
                                color="blue"
                            />
                        )}
                    </View>
                </View>
            </View>

            {/* 2. LOGIN SESSION TIMEOUT */}
            <View style={styles.section}>
                {renderHeader('Login Session Timeout')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {/* Row 1: Always Stay Logged In Toggle */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="infinite-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <View style={styles.rowTextContainer}>
                                <Text style={[styles.rowLabel, { color: textColor }]}>
                                    Always Stay Logged In
                                </Text>
                                <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                                    Keep session active without frequent re-login prompts
                                </Text>
                            </View>
                        </View>
                        <IOSSwitch
                            value={security.alwaysLoggedIn}
                            isDark={isDark}
                            size={26}
                            activeColor="#34C759"
                            onValueChange={(val) => {
                                setSecurity((prev) => ({ ...prev, alwaysLoggedIn: val }));
                            }}
                        />
                    </View>

                    {/* Show Session Limits when not always logged in */}
                    {!security.alwaysLoggedIn && (
                        <>
                            <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                            {/* Row 2: Idle Timeout (Native iOS disclosure style) */}
                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={() => handleSelectPicker('idle')}
                                style={styles.formRow}
                            >
                                <View style={styles.rowLeft}>
                                    <Ionicons
                                        name="timer-outline"
                                        size={18}
                                        color={isDark ? '#94A3B8' : '#64748B'}
                                        style={styles.rowIcon}
                                    />
                                    <View style={styles.rowTextContainer}>
                                        <Text style={[styles.rowLabel, { color: textColor }]}>
                                            Idle Timeout
                                        </Text>
                                        <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                                            Locks session after inactivity (no screen touches)
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.nativeValueWrap}>
                                    <Text style={[styles.nativeValueText, { color: subtextColor }]}>
                                        {security.idleTimeout}
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={15}
                                        color={chevronColor}
                                    />
                                </View>
                            </TouchableOpacity>

                            <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                            {/* Row 3: Max Session Duration (Native iOS disclosure style) */}
                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={() => handleSelectPicker('session')}
                                style={styles.formRow}
                            >
                                <View style={styles.rowLeft}>
                                    <Ionicons
                                        name="hourglass-outline"
                                        size={18}
                                        color={isDark ? '#94A3B8' : '#64748B'}
                                        style={styles.rowIcon}
                                    />
                                    <View style={styles.rowTextContainer}>
                                        <Text style={[styles.rowLabel, { color: textColor }]}>
                                            Max Session Duration
                                        </Text>
                                        <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                                            Forces full re-login after period regardless of activity
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.nativeValueWrap}>
                                    <Text style={[styles.nativeValueText, { color: subtextColor }]}>
                                        {security.maxSessionDuration}
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={15}
                                        color={chevronColor}
                                    />
                                </View>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* 3. TWO-FACTOR AUTHENTICATION (2FA) */}
            <View style={styles.section}>
                {renderHeader('Two-Factor Authentication (2FA)')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {/* Row 1: Two Factor Authentication Toggle */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="shield-half-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <View style={styles.rowTextContainer}>
                                <Text style={[styles.rowLabel, { color: textColor }]}>
                                    Two-Factor Authentication
                                </Text>
                                <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                                    Verification OTP delivered via registered Email or WhatsApp
                                </Text>
                            </View>
                        </View>
                        <IOSSwitch
                            value={security.twoFactorEnabled}
                            isDark={isDark}
                            size={26}
                            activeColor="#34C759"
                            onValueChange={(val) => {
                                setSecurity((prev) => ({ ...prev, twoFactorEnabled: val }));
                                if (val) {
                                    Alert.alert(
                                        '2FA Protection Enabled',
                                        'Users in this organization will receive a 6-digit OTP code to their verified Email / WhatsApp upon login.'
                                    );
                                }
                            }}
                        />
                    </View>
                </View>
            </View>

            {/* Android / Web Picker Modal */}
            {pickerModalVisible && (
                <Modal
                    transparent
                    animationType="fade"
                    visible={pickerModalVisible}
                    onRequestClose={() => setPickerModalVisible(false)}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setPickerModalVisible(false)}
                    >
                        <View
                            style={[
                                styles.modalContent,
                                { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                            ]}
                        >
                            <Text style={[styles.modalTitle, { color: textColor }]}>
                                {pickerType === 'rotation'
                                    ? 'Select Password Rotation'
                                    : pickerType === 'idle'
                                    ? 'Select Idle Timeout'
                                    : 'Select Max Session Duration'}
                            </Text>
                            {getOptionsForModal().map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    style={styles.modalOption}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSecurity((prev) => {
                                            if (pickerType === 'rotation') return { ...prev, rotationInterval: opt };
                                            if (pickerType === 'idle') return { ...prev, idleTimeout: opt };
                                            return { ...prev, maxSessionDuration: opt };
                                        });
                                        setPickerModalVisible(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            { color: textColor },
                                            getCurrentValueForModal() === opt && {
                                                color: '#10B981',
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Modal>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 20,
    },
    section: {
        gap: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.1,
        paddingHorizontal: 6,
    },
    card: {
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 4,
        overflow: 'hidden',
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
        paddingVertical: 10,
        gap: 12,
    },
    dangerInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    rowIcon: {
        width: 22,
        textAlign: 'center',
    },
    rowTextContainer: {
        flex: 1,
        gap: 2,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    rowSubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    nativeValueWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    nativeValueText: {
        fontSize: 15,
        fontWeight: '400',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 34,
    },
    switchControl: {
        transform: Platform.OS === 'ios' ? [{ scaleX: 0.85 }, { scaleY: 0.85 }] : [],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        padding: 20,
        gap: 8,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    modalOption: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    modalOptionText: {
        fontSize: 15,
    },
});
