import React, { memo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '@/components/ui/GlassView';
import { useTheme } from '@/context/ThemeContext';

export interface SwiftUIResourceActionsSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSelectNewResource: () => void;
    onSelectNewReceiving: () => void;
    onSelectNewTransfer: () => void;
    onSelectStockAdjustment: () => void;
    onSelectAiCleanup?: () => void;
    isManager?: boolean;
}

export const SwiftUIResourceActionsSheet: React.FC<SwiftUIResourceActionsSheetProps> = memo(({
    isOpened,
    onClose,
    onSelectNewResource,
    onSelectNewReceiving,
    onSelectNewTransfer,
    onSelectStockAdjustment,
    onSelectAiCleanup,
    isManager = true,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const chevronColor = isDark ? '#8E8E93' : '#AEAEB2';

    const blueColor = '#007AFF';
    const blueBadgeBg = isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)';
    const greenColor = '#34C759';
    const greenBadgeBg = isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.12)';
    const orangeColor = isDark ? '#FF9F0A' : '#FF9500';
    const orangeBadgeBg = isDark ? 'rgba(255, 159, 10, 0.22)' : 'rgba(255, 149, 0, 0.12)';
    const purpleColor = isDark ? '#BF5AF2' : '#AF52DE';
    const purpleBadgeBg = isDark ? 'rgba(191, 90, 242, 0.22)' : 'rgba(175, 82, 222, 0.12)';

    return (
        <Modal 
            visible={isOpened} 
            transparent={true} 
            animationType="slide" 
            onRequestClose={onClose} 
            statusBarTranslucent={true}
        >
            <View style={styles.drawerOverlay}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <GlassView 
                    intensity={60} 
                    tint={isDark ? 'dark' : 'light'} 
                    style={[
                        styles.drawerContentSheet, 
                        { backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)' }
                    ]}
                >
                    <View style={styles.drawerHeader}>
                        <Text style={[styles.drawerHeaderTitle, { color: textColor }]}>Resource Actions</Text>
                        <TouchableOpacity 
                            style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={20} color={subtextColor} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.drawerContent}>
                        {/* New Resource */}
                        <TouchableOpacity 
                            style={[styles.typeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 120, 128, 0.08)' }]} 
                            activeOpacity={0.7}
                            onPress={() => { onClose(); onSelectNewResource(); }}
                        >
                            <View style={[styles.typeIconContainer, { backgroundColor: blueBadgeBg }]}>
                                <Ionicons name="add-circle" size={22} color={blueColor} />
                            </View>
                            <View style={styles.typeTextContainer}>
                                <Text style={[styles.typeTitle, { color: textColor }]}>New Resource</Text>
                                <Text style={[styles.typeDesc, { color: subtextColor }]}>Register material, tool, asset, or service to catalog</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                        </TouchableOpacity>

                        {/* New Receiving */}
                        <TouchableOpacity 
                            style={[styles.typeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 120, 128, 0.08)' }]} 
                            activeOpacity={0.7}
                            onPress={() => { onClose(); onSelectNewReceiving(); }}
                        >
                            <View style={[styles.typeIconContainer, { backgroundColor: greenBadgeBg }]}>
                                <Ionicons name="cube" size={22} color={greenColor} />
                            </View>
                            <View style={styles.typeTextContainer}>
                                <Text style={[styles.typeTitle, { color: textColor }]}>New Receiving</Text>
                                <Text style={[styles.typeDesc, { color: subtextColor }]}>Confirm delivery or log incoming PO shipment</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                        </TouchableOpacity>

                        {/* New Transfer */}
                        <TouchableOpacity 
                            style={[styles.typeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 120, 128, 0.08)' }]} 
                            activeOpacity={0.7}
                            onPress={() => { onClose(); onSelectNewTransfer(); }}
                        >
                            <View style={[styles.typeIconContainer, { backgroundColor: purpleBadgeBg }]}>
                                <Ionicons name="swap-horizontal" size={22} color={purpleColor} />
                            </View>
                            <View style={styles.typeTextContainer}>
                                <Text style={[styles.typeTitle, { color: textColor }]}>New Transfer</Text>
                                <Text style={[styles.typeDesc, { color: subtextColor }]}>Transfer stock between locations or handover custody</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                        </TouchableOpacity>

                        {/* Stock Adjustment */}
                        <TouchableOpacity 
                            style={[styles.typeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 120, 128, 0.08)' }]} 
                            activeOpacity={0.7}
                            onPress={() => { onClose(); onSelectStockAdjustment(); }}
                        >
                            <View style={[styles.typeIconContainer, { backgroundColor: orangeBadgeBg }]}>
                                <Ionicons name="create-outline" size={22} color={orangeColor} />
                            </View>
                            <View style={styles.typeTextContainer}>
                                <Text style={[styles.typeTitle, { color: textColor }]}>Stock Adjustment</Text>
                                <Text style={[styles.typeDesc, { color: subtextColor }]}>Cycle count reconciliation or quantity adjustments</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                        </TouchableOpacity>

                        {/* AI Cleanup */}
                        {isManager && onSelectAiCleanup && (
                            <TouchableOpacity 
                                style={[styles.typeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 120, 128, 0.08)' }]} 
                                activeOpacity={0.7}
                                onPress={() => { onClose(); onSelectAiCleanup(); }}
                            >
                                <View style={[styles.typeIconContainer, { backgroundColor: blueBadgeBg }]}>
                                    <Ionicons name="sparkles-outline" size={22} color={blueColor} />
                                </View>
                                <View style={styles.typeTextContainer}>
                                    <Text style={[styles.typeTitle, { color: textColor }]}>AI Cleanup</Text>
                                    <Text style={[styles.typeDesc, { color: subtextColor }]}>Scan and merge catalog duplicate items using AI</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </GlassView>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    drawerContentSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 34,
        maxHeight: '75%',
        overflow: 'hidden',
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    drawerHeaderTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    drawerContent: {
        paddingHorizontal: 20,
        gap: 10,
        paddingTop: 4,
        paddingBottom: 20,
    },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        gap: 14,
    },
    typeIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeTextContainer: {
        flex: 1,
    },
    typeTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    typeDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
});
