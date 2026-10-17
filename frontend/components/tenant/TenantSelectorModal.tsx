import React, { useEffect } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image as RNImage,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTenantContext, Tenant } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SvgUri } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export interface TenantSelectorModalProps {
    visible?: boolean;
    isOpened?: boolean;
    onClose: () => void;
    onSelectTenant?: (tenant: Tenant) => void;
    title?: string;
    subtitle?: string;
    [key: string]: any;
}

export const TenantSelectorModal: React.FC<TenantSelectorModalProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./TenantSelectorModal.ios').TenantSelectorModal;
        return <Comp {...props} />;
    }

    const {
        visible,
        isOpened,
        onClose,
        onSelectTenant,
        title = 'Select Organization',
        subtitle = 'Switch to another tenant workspace',
    } = props;

    const sheetOpened = isOpened !== undefined ? isOpened : !!visible;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { tenants, activeTenant, switchTenant, refreshTenants } = useTenantContext();
    const router = useRouter();

    useEffect(() => {
        if (sheetOpened) {
            refreshTenants();
        }
    }, [sheetOpened]);

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const primaryBlue = '#007AFF';
    const accentBlue = isDark ? '#38BDF8' : '#007AFF';
    const blueBadgeBg = isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(0, 122, 255, 0.12)';

    const handleSelect = async (t: Tenant) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await switchTenant(t.id);
        if (onSelectTenant) onSelectTenant(t);
        onClose();
    };

    const handleCreateNew = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/tenant-setup' as any);
    };

    const handleJoinCode = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/join-tenant' as any);
    };

    return (
        <Modal
            visible={sheetOpened}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
            navigationBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View
                    style={[
                        styles.drawerContainer,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                            paddingBottom: Math.max(insets.bottom, 20),
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={[styles.headerTitle, { color: textColor }]}>
                                {title}
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                                {subtitle}
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

                    {/* Content List */}
                    <ScrollView
                        style={styles.scrollBody}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Organization List */}
                        {tenants.map((item) => {
                            const isSelected = activeTenant?.id === item.id;
                            const brandColor = item.primary_color || primaryBlue;
                            const logoUrl = item.branding_logo_url || item.logo_url;
                            const words = (item.branding_name || item.name || '').trim().split(/\s+/).filter(Boolean);
                            const initials = words.length > 0
                                ? words.map((w) => w[0]).join('').toUpperCase().slice(0, 3)
                                : 'FM';
                            const displayJoinCode = item.join_code || (item.company_code && item.company_code.length > 3 ? item.company_code : null);

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.tenantCard,
                                        {
                                            backgroundColor: cardBg,
                                            borderColor,
                                        },
                                    ]}
                                    onPress={() => handleSelect(item)}
                                    activeOpacity={0.7}
                                >
                                    {/* Brand Logo / Avatar */}
                                    <View style={[styles.brandAvatar, { backgroundColor: brandColor }]}>
                                        {logoUrl ? (
                                            logoUrl.toLowerCase().endsWith('.svg') || logoUrl.includes('.svg') ? (
                                                <SvgUri uri={logoUrl} width={42} height={42} />
                                            ) : (
                                                <RNImage
                                                    source={{ uri: logoUrl }}
                                                    style={styles.brandImage}
                                                    resizeMode="cover"
                                                />
                                            )
                                        ) : (item.name || '').toLowerCase().includes('adidaya') || (item.company_code || '').toLowerCase() === 'ady' ? (
                                            <RNImage
                                                source={require('@/assets/images/logo-adidaya-red.png')}
                                                style={{ width: 30, height: 30 }}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <Text style={styles.initialsText}>{initials}</Text>
                                        )}
                                    </View>

                                    {/* Tenant Info */}
                                    <View style={styles.tenantInfoCol}>
                                        <View style={styles.tenantNameRow}>
                                            <Text style={[styles.tenantNameText, { color: textColor }]} numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            {item.company_code && (
                                                <View style={[styles.companyCodeBadge, { backgroundColor: blueBadgeBg }]}>
                                                    <Text style={[styles.companyCodeText, { color: accentBlue }]}>
                                                        {item.company_code}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.tenantSubtext, { color: subtextColor }]} numberOfLines={1}>
                                            {displayJoinCode
                                                ? `Role: ${item.role || 'Member'} • Join: ${displayJoinCode}`
                                                : `Role: ${item.role || 'Member'}`}
                                        </Text>
                                    </View>

                                    {/* Checkmark or Chevron */}
                                    {isSelected ? (
                                        <PlatformIcon name="checkmark.circle.fill" size={20} tintColor={primaryBlue} />
                                    ) : (
                                        <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}

                        {/* Extra Separator */}
                        {tenants.length > 0 && <View style={{ height: 4 }} />}

                        {/* Option 1: Join with Code */}
                        <TouchableOpacity
                            style={[
                                styles.actionCard,
                                {
                                    backgroundColor: cardBg,
                                    borderColor,
                                },
                            ]}
                            onPress={handleJoinCode}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIconWrap, { backgroundColor: blueBadgeBg }]}>
                                <PlatformIcon name="key.fill" size={18} tintColor={accentBlue} />
                            </View>
                            <View style={styles.actionTextCol}>
                                <Text style={[styles.actionTitle, { color: textColor }]}>
                                    Join with Code
                                </Text>
                                <Text style={[styles.actionSubtitle, { color: subtextColor }]}>
                                    Enter 6-character code from your admin
                                </Text>
                            </View>
                            <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>

                        {/* Option 2: Setup Organization */}
                        <TouchableOpacity
                            style={[
                                styles.actionCard,
                                {
                                    backgroundColor: cardBg,
                                    borderColor,
                                },
                            ]}
                            onPress={handleCreateNew}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(0, 122, 255, 0.12)' }]}>
                                <PlatformIcon name="building.2.fill" size={18} tintColor={primaryBlue} />
                            </View>
                            <View style={styles.actionTextCol}>
                                <Text style={[styles.actionTitle, { color: textColor }]}>
                                    Setup Organization
                                </Text>
                                <Text style={[styles.actionSubtitle, { color: subtextColor }]}>
                                    Create a new company & team workspace
                                </Text>
                            </View>
                            <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        ...Platform.select({
            web: {
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
            },
            default: {
                justifyContent: 'flex-end',
            },
        }),
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    drawerContainer: {
        maxHeight: '90%',
        paddingHorizontal: 20,
        paddingTop: 18,
        ...Platform.select({
            web: {
                width: '100%',
                maxWidth: 420,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                paddingBottom: 20,
            },
            default: {
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
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
        flexGrow: 0,
    },
    scrollContent: {
        paddingTop: 2,
        paddingBottom: 24,
        gap: 10,
    },
    tenantCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        gap: 12,
    },
    brandAvatar: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    brandImage: {
        width: 42,
        height: 42,
        borderRadius: 12,
    },
    initialsText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    tenantInfoCol: {
        flex: 1,
        justifyContent: 'center',
    },
    tenantNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    tenantNameText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    companyCodeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    companyCodeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    tenantSubtext: {
        fontSize: 12,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        gap: 14,
    },
    actionIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTextCol: {
        flex: 1,
        justifyContent: 'center',
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 12.5,
    },
});

export default TenantSelectorModal;
