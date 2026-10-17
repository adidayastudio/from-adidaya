import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SwiftUIUnsavedBanner } from '@/components/ui/SwiftUIUnsavedBanner';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// Safe lazy loading of SwiftUI components
let SwiftUIHost: any = null;
let SwiftUIButton: any = null;
let SwiftUIText: any = null;
let swiftModifiers: any = null;
if (Platform.OS === 'ios') {
    try {
        const SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIHost = SwiftUI.Host;
        SwiftUIButton = SwiftUI.Button;
        SwiftUIText = SwiftUI.Text;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

export default function AccountScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const { profile, refreshProfile } = useUserContext();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const bgColor = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)';
    const intensity = isDark ? 10 : 25;

    const isAdminOrSuperAdmin = profile?.role === 'superadmin' || profile?.role === 'admin' || profile?.role === 'administrator';

    // Per-section active edit state
    const [activeSection, setActiveSection] = useState<'account_type' | 'performance' | 'account_info' | null>(null);
    const [fullName, setFullName] = useState('');
    const [nickname, setNickname] = useState('');
    const [accountType, setAccountType] = useState<'human' | 'system'>('human');
    const [includeInPerformance, setIncludeInPerformance] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setNickname(profile.nickname || '');
            setAccountType((profile as any).account_type === 'system' ? 'system' : 'human');
            setIncludeInPerformance((profile as any).include_in_performance !== false);
        }
    }, [profile]);

    const handleCancelAll = () => {
        if (profile) {
            setFullName(profile.full_name || '');
            setNickname(profile.nickname || '');
            setAccountType((profile as any).account_type === 'system' ? 'system' : 'human');
            setIncludeInPerformance((profile as any).include_in_performance !== false);
        }
        setActiveSection(null);
    };

    const handleCancelSection = (section: 'account_type' | 'performance' | 'account_info') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (profile) {
            if (section === 'account_type') {
                setAccountType((profile as any).account_type === 'system' ? 'system' : 'human');
            } else if (section === 'performance') {
                setIncludeInPerformance((profile as any).include_in_performance !== false);
            } else if (section === 'account_info') {
                setFullName(profile.full_name || '');
                setNickname(profile.nickname || '');
            }
        }
        setActiveSection(null);
    };

    const handleToggleSection = (section: 'account_type' | 'performance' | 'account_info') => {
        if (activeSection === section) {
            handleCancelSection(section);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSection(section);
        }
    };

    const handleSave = async () => {
        if (!profile?.id) return;
        if (!fullName.trim()) {
            Alert.alert('Validation Error', 'Full Name cannot be empty.');
            return;
        }
        setSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const updatePayload: Record<string, any> = {
                full_name: fullName.trim(),
                nickname: nickname.trim() || null
            };

            if (isAdminOrSuperAdmin) {
                updatePayload.account_type = accountType;
                updatePayload.include_in_performance = accountType === 'system' ? false : includeInPerformance;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', profile.id);
            if (error) throw error;
            await refreshProfile();
            setActiveSection(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Profile details updated successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const EditButton = ({ isEditingSection, onPress }: { isEditingSection: boolean; onPress: () => void }) => {
        if (Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIText && swiftModifiers) {
            return (
                <View style={{ height: 22, width: 64 }}>
                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                        <SwiftUIButton
                            onPress={onPress}
                            controlSize="mini"
                            variant="glassProminent"
                            color="#007AFF"
                        >
                            <SwiftUIText size={11} weight="semibold" color="#FFFFFF">
                                {isEditingSection ? 'Cancel' : 'Edit'}
                            </SwiftUIText>
                        </SwiftUIButton>
                    </SwiftUIHost>
                </View>
            );
        }

        return (
            <TouchableOpacity
                style={[
                    s.editButtonGlass,
                    {
                        backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)',
                        borderColor: isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0, 122, 255, 0.18)'
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Text style={[s.editTextGlass, { color: isDark ? '#409CFF' : '#007AFF' }]}>
                    {isEditingSection ? 'Cancel' : 'Edit'}
                </Text>
            </TouchableOpacity>
        );
    };

    const originalAccountType = ((profile as any)?.account_type === 'system' ? 'system' : 'human');
    const originalIncludePerf = ((profile as any)?.include_in_performance !== false);

    const hasChanges = (
        fullName !== (profile?.full_name || '') ||
        nickname !== (profile?.nickname || '') ||
        (isAdminOrSuperAdmin && (
            accountType !== originalAccountType ||
            includeInPerformance !== originalIncludePerf
        ))
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Account',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                }}
            />

            <ScrollView
                style={[s.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: insets.bottom + 90,
                    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 16,
                    gap: 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. ACCOUNT TYPE SECTION */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70', flex: 1 }]}>Account Type</Text>
                        {isAdminOrSuperAdmin && (
                            <EditButton
                                isEditingSection={activeSection === 'account_type'}
                                onPress={() => handleToggleSection('account_type')}
                            />
                        )}
                    </View>

                    {activeSection === 'account_type' ? (
                        /* Admin Editing: Clean rows with icons and mutually exclusive toggle Switches */
                        <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                            {/* Human Account Row */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <LinearGradient
                                        colors={isDark ? ['#1C1C1E', '#000000'] : ['#007AFF', '#0056B3']}
                                        style={s.iconBoxSmall}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <PlatformIcon name="person.crop.circle.fill" size={16} tintColor={isDark ? '#007AFF' : '#FFF'} />
                                    </LinearGradient>
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={[s.rowTitle, { color: textColor }]}>Human Account</Text>
                                        <Text style={[s.rowSubtitle, { color: subtextColor }]}>A real person with full profile capabilities.</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={accountType === 'human'}
                                    onValueChange={(val) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        const newType = val ? 'human' : 'system';
                                        setAccountType(newType);
                                        if (newType === 'system') {
                                            setIncludeInPerformance(false);
                                        }
                                    }}
                                    trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#007AFF' }}
                                />
                            </View>

                            <View style={[s.separator, { backgroundColor: borderColor }]} />

                            {/* System Account Row */}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <LinearGradient
                                        colors={isDark ? ['#2C1A4D', '#1A0E30'] : ['#5856D6', '#3634A3']}
                                        style={s.iconBoxSmall}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <PlatformIcon name="cpu.fill" size={16} tintColor={isDark ? '#AF52DE' : '#FFF'} />
                                    </LinearGradient>
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={[s.rowTitle, { color: textColor }]}>System Account</Text>
                                        <Text style={[s.rowSubtitle, { color: subtextColor }]}>Automated agent or service identity.</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={accountType === 'system'}
                                    onValueChange={(val) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        const newType = val ? 'system' : 'human';
                                        setAccountType(newType);
                                        if (newType === 'system') {
                                            setIncludeInPerformance(false);
                                        }
                                    }}
                                    trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#5856D6' }}
                                />
                            </View>
                        </GlassView>
                    ) : (
                        /* Read-only status card */
                        <GlassView intensity={intensity} style={[s.cardPill, { backgroundColor: bgColor }]}>
                            <View style={s.cardPillRow}>
                                <LinearGradient
                                    colors={
                                        accountType === 'system'
                                            ? (isDark ? ['#2C1A4D', '#1A0E30'] : ['#5856D6', '#3634A3'])
                                            : (isDark ? ['#1C1C1E', '#000000'] : ['#007AFF', '#0056B3'])
                                    }
                                    style={s.iconBoxSmall}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <PlatformIcon
                                        name={accountType === 'system' ? "cpu.fill" : "person.crop.circle.fill"}
                                        size={16}
                                        tintColor={accountType === 'system' ? (isDark ? '#AF52DE' : '#FFF') : (isDark ? '#007AFF' : '#FFF')}
                                    />
                                </LinearGradient>
                                <View style={s.cardText}>
                                    <Text style={[s.rowTitle, { color: textColor }]}>
                                        {accountType === 'system' ? 'System Account' : 'Human Account'}
                                    </Text>
                                    <Text style={[s.rowSubtitle, { color: subtextColor }]}>
                                        {accountType === 'system'
                                            ? 'Automated agent or service identity.'
                                            : 'A real person with full profile capabilities.'}
                                    </Text>
                                </View>
                                {!isAdminOrSuperAdmin && (
                                    <PlatformIcon name="lock.fill" size={14} tintColor={subtextColor} />
                                )}
                            </View>
                        </GlassView>
                    )}

                    <Text style={[s.sectionFooter, { color: subtextColor }]}>
                        Determines how this identity functions in the system.
                    </Text>
                </View>

                {/* 2. PERFORMANCE CONFIGURATION SECTION */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70', flex: 1 }]}>Performance</Text>
                        {isAdminOrSuperAdmin && accountType !== 'system' && (
                            <EditButton
                                isEditingSection={activeSection === 'performance'}
                                onPress={() => handleToggleSection('performance')}
                            />
                        )}
                    </View>

                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        {/* Include in Performance Row */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="checkmark.shield" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Include in Performance</Text>
                            </View>

                            {activeSection === 'performance' ? (
                                <Switch
                                    value={accountType === 'system' ? false : includeInPerformance}
                                    disabled={accountType === 'system'}
                                    onValueChange={(val) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setIncludeInPerformance(val);
                                    }}
                                    trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#007AFF' }}
                                />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[s.rowValue, { color: (accountType === 'system' || !includeInPerformance) ? subtextColor : '#34C759', fontWeight: '500' }]}>
                                        {(accountType === 'system' || !includeInPerformance) ? 'Excluded' : 'Enabled'}
                                    </Text>
                                    {!isAdminOrSuperAdmin && (
                                        <PlatformIcon name="lock.fill" size={14} tintColor={subtextColor} />
                                    )}
                                </View>
                            )}
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />

                        {/* Performance Index Row */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="target" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Performance Index</Text>
                            </View>
                            <View style={[s.badgeLabel, { backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)' }]}>
                                <Text style={s.badgeLabelText}>NO DATA</Text>
                            </View>
                        </View>
                    </GlassView>
                    <Text style={[s.sectionFooter, { color: subtextColor }]}>
                        This account will appear in performance indexes, timesheets, and people analytics.
                    </Text>
                </View>

                {/* 3. ACCOUNT INFORMATION SECTION */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70', flex: 1 }]}>Account Information</Text>
                        <EditButton
                            isEditingSection={activeSection === 'account_info'}
                            onPress={() => handleToggleSection('account_info')}
                        />
                    </View>

                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        {/* Full Name */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="person" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Full Name</Text>
                            </View>
                            {activeSection === 'account_info' ? (
                                <TextInput
                                    style={[
                                        s.seamlessInput,
                                        { color: textColor }
                                    ]}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Enter full name"
                                    placeholderTextColor={subtextColor}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    selectionColor="#007AFF"
                                />
                            ) : (
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile?.full_name || '—'}</Text>
                            )}
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />

                        {/* Nickname */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="at" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Nickname</Text>
                            </View>
                            {activeSection === 'account_info' ? (
                                <TextInput
                                    style={[
                                        s.seamlessInput,
                                        { color: textColor }
                                    ]}
                                    value={nickname}
                                    onChangeText={setNickname}
                                    placeholder="Enter nickname"
                                    placeholderTextColor={subtextColor}
                                    autoCorrect={false}
                                    selectionColor="#007AFF"
                                />
                            ) : (
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile?.nickname || '—'}</Text>
                            )}
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />

                        {/* Email Address with clean line-break at @ */}
                        <View style={[s.formRow, { alignItems: 'flex-start', paddingVertical: 12 }]}>
                            <View style={[s.rowLeft, { marginTop: 2 }]}>
                                <PlatformIcon name="envelope" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Email Address</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                                {(() => {
                                    const email = profile?.email;
                                    if (!email) return <Text style={[s.rowValue, { color: subtextColor }]}>—</Text>;
                                    const atIndex = email.indexOf('@');
                                    if (atIndex > 0) {
                                        const localPart = email.slice(0, atIndex);
                                        const domainPart = email.slice(atIndex);
                                        return (
                                            <Text style={[s.rowValue, { color: subtextColor, textAlign: 'right', fontSize: 14, lineHeight: 18 }]} numberOfLines={2}>
                                                <Text style={{ fontWeight: '500', color: isDark ? '#E5E5EA' : '#1C1C1E' }}>{localPart}</Text>
                                                {'\n'}
                                                <Text style={{ color: subtextColor, fontSize: 13 }}>{domainPart}</Text>
                                            </Text>
                                        );
                                    }
                                    return <Text style={[s.rowValue, { color: subtextColor, textAlign: 'right' }]}>{email}</Text>;
                                })()}
                            </View>
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />

                        {/* Password */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="key" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Password</Text>
                            </View>
                            <View style={s.passwordRow}>
                                {[...Array(8)].map((_, i) => (
                                    <View key={i} style={[s.passwordDot, { backgroundColor: subtextColor }]} />
                                ))}
                            </View>
                        </View>
                    </GlassView>

                    <Text style={[s.sectionFooter, { color: subtextColor }]}>
                        To reset password, please contact your administrator.
                    </Text>
                </View>
            </ScrollView>

            {/* NATIVE SWIFTUI LIQUID GLASS CONTAINER ACTION BANNER */}
            {hasChanges && (
                <View style={[s.floatingBannerContainer, { bottom: Math.max(insets.bottom + 12, 24) }]}>
                    <SwiftUIUnsavedBanner
                        onCancel={handleCancelAll}
                        onSave={handleSave}
                        saving={saving}
                        isDark={isDark}
                        title="Unsaved changes"
                    />
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    section: { gap: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
    sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
    sectionFooter: { fontSize: 12, lineHeight: 16, paddingHorizontal: 4, marginTop: 4 },
    editButtonGlass: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, borderWidth: 0.5, justifyContent: 'center', alignItems: 'center' },
    editTextGlass: { fontSize: 12, fontWeight: '600' },

    card: { borderRadius: 24, overflow: 'hidden' },
    cardPill: { borderRadius: 24, overflow: 'hidden' },
    cardPillRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
    iconBoxSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
    rowSubtitle: { fontSize: 12 },

    // Form Table Row
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 42,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    rowValue: {
        fontSize: 15,
        fontWeight: '400',
    },

    badgeLabel: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
    badgeLabelText: { color: '#007AFF', fontSize: 11, fontWeight: '700' },

    passwordRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    passwordDot: { width: 6, height: 6, borderRadius: 3 },

    // Clean seamless iOS input styling (no border capsule, zero tracking spacing issues)
    seamlessInput: {
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'right',
        flex: 1,
        paddingVertical: 0,
        paddingHorizontal: 0,
        marginLeft: 12,
        letterSpacing: 0,
    },

    // Authentic Liquid Glass Floating Banner
    floatingBannerContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 999,
    },
});
