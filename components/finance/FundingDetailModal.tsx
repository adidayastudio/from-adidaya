import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Modal, ScrollView, Alert, Clipboard, Dimensions, Platform, ActivityIndicator, Animated, useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { supabase } from '@/lib/supabase';
import { PlatformIcon } from '../ui/PlatformIcon';
import { GlassView } from '../ui/GlassView';

interface FundingDetailModalProps {
    visible: boolean;
    onClose: () => void;
    source: any | null;
    matchedTransactions: any[];
    onEdit: (source: any) => void;
    isEmbedded?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FundingDetailModal: React.FC<FundingDetailModalProps> = ({
    visible,
    onClose,
    source,
    matchedTransactions = [],
    onEdit,
    isEmbedded = false,
}) => {
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const { refreshData } = useFinance();
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible, slideAnim, fadeAnim]);

    const handleDismiss = () => {
        if (Platform.OS === 'web' && !isEmbedded) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: false,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }),
            ]).start(() => {
                onClose();
            });
        } else {
            onClose();
        }
    };

    if (!source) return null;

    const formatCurrency = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return String(amount);
        return `Rp ${num.toLocaleString('id-ID')}`;
    };

    const copyAccountNumber = () => {
        if (!source.account_number) return;
        try {
            Clipboard.setString(String(source.account_number));
            Alert.alert('Success', 'Account number copied to clipboard');
        } catch { }
    };

    const handleToggleActive = async () => {
        const nextActive = !source.is_active;
        try {
            const { error } = await supabase
                .from('funding_sources')
                .update({ is_active: nextActive })
                .eq('id', source.id);
                
            if (error) throw error;
            
            Alert.alert('Success', `Account ${nextActive ? 'activated' : 'deactivated'} successfully.`);
            await refreshData();
            onClose();
        } catch (error: any) {
            console.error("Toggle active error:", error);
            Alert.alert('Error', error.message || 'Failed to update account status.');
        }
    };

    const handleDelete = () => {
        setDeleteConfirmVisible(true);
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase
                .from('funding_sources')
                .delete()
                .eq('id', source.id);
                
            if (error) throw error;
            
            setDeleteConfirmVisible(false);
            Alert.alert('Success', 'Funding source deleted.');
            await refreshData();
            onClose();
        } catch (error: any) {
            console.error("Delete error:", error);
            Alert.alert('Error', error.message || 'Failed to delete funding source.');
        } finally {
            setDeleting(false);
        }
    };

    const getProviderColor = (provider: string) => {
        const p = (provider || '').toUpperCase();
        if (p.includes('BCA')) return '#003882';
        if (p.includes('MANDIRI')) return '#FFC800';
        if (p.includes('BRI')) return '#00A4E4';
        if (p.includes('BNI')) return '#008080';
        return '#8E8E93';
    };

    const providerColor = getProviderColor(source.provider);

    const renderInnerContent = () => (
        <View
            style={isEmbedded ? [s.embeddedContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }] : {
                flex: 1,
                width: '100%',
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            }}
        >
            {/* Header */}
            <View style={[s.header, isEmbedded && { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={{ flex: 1 }}>
                    <View style={s.badgeRow}>
                        <View style={[s.providerBadge, { backgroundColor: providerColor + '20' }]}>
                            <Text style={[s.providerBadgeText, { color: providerColor }]}>
                                {(source.provider || 'Source').toUpperCase()}
                            </Text>
                        </View>
                        {!source.is_active && (
                            <View style={[s.inactiveBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                <Text style={[s.inactiveBadgeText, { color: '#8E8E93' }]}>INACTIVE</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[s.title, { color: textColor }]} numberOfLines={1}>
                        {source.name || 'Account'}
                    </Text>
                </View>
                {!isEmbedded && (
                    <TouchableOpacity onPress={handleDismiss} style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Account Details Card */}
                        <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>ACCOUNT DETAILS</Text>
                            
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Bank Provider</Text>
                                <Text style={[s.infoValue, { color: textColor, fontWeight: '700' }]}>{source.provider || '-'}</Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                            
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Account Name</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{source.name || '-'}</Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                            
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Account Number</Text>
                                <View style={s.numberContainer}>
                                    <Text style={[s.infoValue, { color: textColor, fontWeight: '700' }]}>{source.account_number || '-'}</Text>
                                    {source.account_number && (
                                        <TouchableOpacity onPress={copyAccountNumber} hitSlop={15} style={s.copyBtn}>
                                            <PlatformIcon name="doc.on.doc" size={12} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Currency</Text>
                                <Text style={[s.infoValue, { color: textColor, fontWeight: '500' }]}>{source.currency || 'IDR'}</Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Account Type</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{source.type || 'Savings'}</Text>
                            </View>
                        </View>

                        {/* Balance Card */}
                        <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>AVAILABLE BALANCE</Text>
                            <Text style={[s.balanceValue, { color: source.balance < 0 ? '#FF3B30' : '#34C759' }]}>
                                {formatCurrency(source.balance || 0)}
                            </Text>
                        </View>

                        {/* Matched Transactions */}
                        <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>TRANSACTION MATCHING</Text>
                            
                            {matchedTransactions.length === 0 ? (
                                <View style={s.emptyState}>
                                    <PlatformIcon name="clock.arrow.2.circlepath" size={24} tintColor={subtextColor} style={{ opacity: 0.5, marginBottom: 8 }} />
                                    <Text style={{ color: subtextColor, fontSize: 13, fontWeight: '500' }}>No matched paid transactions found.</Text>
                                </View>
                            ) : (
                                matchedTransactions.map((tx, idx) => (
                                    <View key={tx.id}>
                                        {idx > 0 && <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                                        <View style={s.txItem}>
                                            <View style={{ flex: 1, marginRight: 12 }}>
                                                <Text style={[s.txRef, { color: textColor }]}>{tx.ref}</Text>
                                                <Text style={[s.txMeta, { color: subtextColor }]} numberOfLines={1}>
                                                    {tx.title} • {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                </Text>
                                            </View>
                                            <Text style={s.txAmount}>
                                                -{formatCurrency(tx.amount)}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>

                    {/* Action Footer */}
                    <View style={s.footer}>
                        <View style={s.actionRow}>
                            <TouchableOpacity onPress={handleDelete} style={[s.actionBtn, s.deleteBtn, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.08)' }]}>
                                <PlatformIcon name="trash" size={20} tintColor="#FF3B30" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleToggleActive}
                                style={[
                                    s.actionBtn,
                                    s.toggleBtn,
                                    {
                                        backgroundColor: source.is_active
                                            ? (isDark ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.08)')
                                            : (isDark ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.08)'),
                                        borderColor: source.is_active ? 'rgba(255, 149, 0, 0.15)' : 'rgba(52, 199, 89, 0.15)'
                                    }
                                ]}
                            >
                                <Text style={[s.toggleBtnText, { color: source.is_active ? '#FF9500' : '#34C759' }]}>
                                    {source.is_active ? 'Deactivate' : 'Activate'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => onEdit(source)} style={[s.editBtn, { backgroundColor: '#007AFF' }]}>
                            <Text style={s.editBtnText}>Edit Details</Text>
                        </TouchableOpacity>
                    </View>
        </View>
    );

    const renderDeleteModal = () => (
        <Modal
            visible={deleteConfirmVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDeleteConfirmVisible(false)}
        >
            <View style={s.confirmOverlay}>
                <View
                    style={[
                        s.confirmContent,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                        }
                    ]}
                >
                    <Text style={[s.confirmTitle, { color: textColor }]}>Confirm Delete</Text>
                    <Text style={[s.confirmDescription, { color: subtextColor }]}>
                        Are you sure you want to delete this funding source? This action cannot be undone.
                    </Text>

                    <View style={s.confirmActions}>
                        <TouchableOpacity
                            style={[s.confirmBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                            onPress={() => setDeleteConfirmVisible(false)}
                            disabled={deleting}
                        >
                            <Text style={[s.confirmBtnText, { color: textColor }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.confirmBtn, { backgroundColor: '#FF3B30' }]}
                            onPress={confirmDelete}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={[s.confirmBtnText, { color: '#FFFFFF' }]}>Delete</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                {renderInnerContent()}
                {renderDeleteModal()}
            </View>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss} statusBarTranslucent={true}>
            <View style={[s.overlay, isDesktop && s.modalOverlayWeb]}>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>
                <Animated.View
                    style={[
                        s.drawerSheet,
                        isDesktop && s.modalContentWeb,
                        {
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 500 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 0 : 600, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {renderInnerContent()}
                </Animated.View>
                {renderDeleteModal()}
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    embeddedContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    drawerSheet: {
        height: '92%',
        width: '100%',
        borderRadius: Platform.OS === 'ios' ? 56 : 40,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 16 : 10,
        overflow: 'hidden',
        paddingTop: 16,
    },
    modalOverlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    modalContentWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 480,
        maxWidth: 'calc(100% - 24px)' as any,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 1,
        height: 'calc(100% - 24px)' as any,
        maxHeight: 'none' as any,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08)',
        } as any) : {}),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    providerBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    providerBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    inactiveBadge: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    inactiveBadgeText: {
        color: '#FF3B30',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 16,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    numberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    copyBtn: {
        padding: 4,
    },
    balanceValue: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        paddingVertical: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
    txItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    txRef: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    txMeta: {
        fontSize: 12,
        fontWeight: '500',
    },
    txAmount: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        gap: 10,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteBtn: {
        width: 56,
    },
    toggleBtn: {
        flex: 1,
        borderWidth: 1,
    },
    toggleBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    editBtn: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmContent: {
        width: 320,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        alignItems: 'center',
    },
    confirmTitle: {
        fontSize: 19,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    confirmDescription: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 24,
    },
    confirmActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    confirmBtn: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
