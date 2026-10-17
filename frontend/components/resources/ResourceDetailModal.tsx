import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import {
    CatalogResource,
    ProjectStock,
    generateResourceCode,
    smartCapitalize,
    formatUnit,
    deriveStatus,
    STATUS_MAP,
} from './mockData';

export interface ResourceDetailModalProps {
    visible?: boolean;
    isOpened?: boolean;
    onClose: () => void;
    item: CatalogResource | null;
    projectStock?: ProjectStock[];
    onBatchOrder?: (item: CatalogResource) => void;
    onBulkTransfer?: (item: CatalogResource) => void;
    isEmbedded?: boolean;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = (props) => {
    const {
        visible,
        isOpened,
        onClose,
        item,
        projectStock = [],
        onBatchOrder,
        onBulkTransfer,
        isEmbedded = false,
    } = props;

    if (Platform.OS === 'ios' && !isEmbedded) {
        const Comp = require('./ResourceDetailModal.ios').ResourceDetailModal || require('./ResourceDetailModal.ios').default;
        return <Comp {...props} />;
    }

    const isVisible = Boolean(isOpened ?? visible);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    if (!item) return null;

    const code = generateResourceCode(item);
    const displayName = smartCapitalize(item.name);
    const formattedUnit = formatUnit(item.unit);
    const totalQuantity = (projectStock || []).reduce((acc, curr) => acc + curr.quantity, 0);
    const status = deriveStatus(item, projectStock || []);
    const statusTheme = STATUS_MAP[status] || STATUS_MAP['In Stock'];
    const statusColor = statusTheme?.color || '#34C759';

    const handleBatchOrder = () => {
        Haptics.selectionAsync();
        if (onBatchOrder) {
            onBatchOrder(item);
        } else {
            Alert.alert('Batch Order', `Create batch order for ${displayName}.`);
        }
    };

    const handleBulkTransfer = () => {
        Haptics.selectionAsync();
        if (onBulkTransfer) {
            onBulkTransfer(item);
        } else {
            Alert.alert('Bulk Transfer', `Initiate transfer for ${displayName}.`);
        }
    };

    const renderContent = () => (
        <View style={isEmbedded ? [styles.embeddedContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }] : [styles.modalSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            {/* Header */}
            <View style={[styles.header, isEmbedded && { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <View style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.1)' }]}>
                            <Text style={styles.codeBadgeText}>{code}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{status}</Text>
                        </View>
                    </View>
                    <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
                        {displayName}
                    </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, isEmbedded && { paddingHorizontal: 24, paddingBottom: 48, maxWidth: 840, width: '100%', alignSelf: 'center' }]} showsVerticalScrollIndicator={true}>
                {/* Stock Overview Card */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.cardTitle, { color: subtextColor }]}>STOCK & SPECIFICATION</Text>
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: subtextColor }]}>Category</Text>
                        <Text style={[styles.value, { color: '#007AFF', textTransform: 'capitalize' }]}>{item.category || '-'}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: subtextColor }]}>Sub-Category</Text>
                        <Text style={[styles.value, { color: textColor }]}>{item.subcategory || '-'}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: subtextColor }]}>Group</Text>
                        <Text style={[styles.value, { color: textColor }]}>{item.group_name || '-'}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: subtextColor }]}>Total Quantity</Text>
                        <Text style={[styles.value, { color: textColor, fontWeight: '700' }]}>
                            {totalQuantity} {formattedUnit}
                        </Text>
                    </View>
                </View>

                {/* Project Breakdown Card */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.cardTitle, { color: subtextColor }]}>PROJECT ALLOCATION</Text>
                    {projectStock.length === 0 ? (
                        <Text style={{ color: subtextColor, fontStyle: 'italic', paddingVertical: 8 }}>
                            No active project inventory recorded for this item.
                        </Text>
                    ) : (
                        projectStock.map((stock, idx) => (
                            <React.Fragment key={`${stock.project}-${idx}`}>
                                {idx > 0 && <View style={[styles.divider, { backgroundColor: borderColor }]} />}
                                <View style={styles.row}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.stockProject, { color: textColor }]}>{stock.project}</Text>
                                        {stock.lastUpdated && (
                                            <Text style={[styles.stockUpdated, { color: subtextColor }]}>
                                                Updated {stock.lastUpdated}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={[styles.stockQty, { color: textColor }]}>
                                        {stock.quantity} {formattedUnit}
                                    </Text>
                                </View>
                            </React.Fragment>
                        ))
                    )}
                </View>

                {/* Description Card */}
                {item.description ? (
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.cardTitle, { color: subtextColor }]}>DESCRIPTION</Text>
                        <Text style={[styles.descText, { color: textColor }]}>{item.description}</Text>
                    </View>
                ) : null}
            </ScrollView>

            {/* Footer Actions */}
            <View style={[styles.footer, isEmbedded && { maxWidth: 840, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 24 }]}>
                <TouchableOpacity onPress={handleBatchOrder} style={[styles.actionBtn, { backgroundColor: '#007AFF' }]}>
                    <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Batch Order</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleBulkTransfer} style={[styles.secondaryActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="swap-horizontal" size={18} color={textColor} />
                    <Text style={[styles.secondaryActionBtnText, { color: textColor }]}>Transfer</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                {renderContent()}
            </View>
        );
    }

    return (
        <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
                {renderContent()}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    embeddedContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        maxHeight: '90%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    codeBadgeText: {
        color: '#007AFF',
        fontSize: 12,
        fontWeight: '800',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    scrollContent: {
        padding: 20,
        gap: 16,
    },
    card: {
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 18,
    },
    cardTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 4,
    },
    stockProject: {
        fontSize: 14,
        fontWeight: '600',
    },
    stockUpdated: {
        fontSize: 11,
        marginTop: 2,
    },
    stockQty: {
        fontSize: 15,
        fontWeight: '700',
    },
    descText: {
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 24,
        gap: 8,
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 24,
        gap: 8,
    },
    secondaryActionBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ResourceDetailModal;
