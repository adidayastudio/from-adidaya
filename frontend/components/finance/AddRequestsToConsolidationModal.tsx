import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { isRequestEligibleForConsolidation, PurchasingConsolidationItem } from '@/lib/api/financeConsolidation';

interface AddRequestsToConsolidationModalProps {
    visible: boolean;
    onClose: () => void;
    consolidation: PurchasingConsolidationItem | null;
}

function formatCurrency(amount: number) {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val).replace('IDR', 'Rp');
}

export const AddRequestsToConsolidationModal: React.FC<AddRequestsToConsolidationModalProps> = ({
    visible,
    onClose,
    consolidation,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? '#2C2C2E' : '#F2F2F7';
    const dividerCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const { teamPurchasing, consolidations, addRequestsToConsolidation } = useFinance();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const eligibleRequests = useMemo(() => {
        if (!consolidation) return [];
        const currentMemberIds = new Set(consolidation.request_ids || []);
        return teamPurchasing.filter(req => {
            if (currentMemberIds.has(req.id)) return false;
            return isRequestEligibleForConsolidation(req, undefined, consolidations);
        });
    }, [teamPurchasing, consolidations, consolidation]);

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleAdd = async () => {
        if (!consolidation || selectedIds.length === 0) return;

        setIsSaving(true);
        try {
            await addRequestsToConsolidation(consolidation.id, selectedIds);
            setSelectedIds([]);
            onClose();
            Alert.alert('Success', `Added ${selectedIds.length} requests to ${consolidation.document_number}.`);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to add requests');
        } finally {
            setIsSaving(false);
        }
    };

    if (!consolidation) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: dividerCol }]}>
                    <View>
                        <Text style={[styles.title, { color: textColor }]}>Add Requests</Text>
                        <Text style={[styles.subtitle, { color: subtextColor }]}>
                            {consolidation.document_number} · {selectedIds.length} selected
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={onClose}
                        style={[styles.closeButton, { backgroundColor: cardBg }]}
                    >
                        <Ionicons name="close" size={20} color={textColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
                    {eligibleRequests.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Eligible Requests</Text>
                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                All approved requests are already part of an active consolidation.
                            </Text>
                        </View>
                    ) : (
                        eligibleRequests.map(req => {
                            const isSelected = selectedIds.includes(req.id);
                            return (
                                <TouchableOpacity
                                    key={req.id}
                                    onPress={() => toggleSelect(req.id)}
                                    style={[
                                        styles.reqItem,
                                        {
                                            backgroundColor: cardBg,
                                            borderColor: isSelected ? '#007AFF' : dividerCol,
                                        }
                                    ]}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: isSelected ? '#007AFF' : subtextColor },
                                        isSelected && { backgroundColor: '#007AFF' }
                                    ]}>
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                        )}
                                    </View>

                                    <View style={styles.reqItemInfo}>
                                        <View style={styles.reqItemTop}>
                                            <Text style={[styles.reqRef, { color: textColor }]}>
                                                {req.cardRef || req.shortRef || req.ref || 'PR'}
                                            </Text>
                                            <Text style={[styles.reqAmount, { color: textColor }]}>
                                                {formatCurrency(req.amount || 0)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.reqMeta, { color: subtextColor }]}>
                                            {req.items?.length || 1} {(req.items?.length || 1) === 1 ? 'Item' : 'Items'}
                                            {req.department?.name ? ` · ${req.department.name}` : ''}
                                            {req.vendor ? ` · ${req.vendor}` : ''}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>

                {eligibleRequests.length > 0 && (
                    <View style={[styles.footer, { borderTopColor: dividerCol, backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                        <TouchableOpacity
                            disabled={isSaving || selectedIds.length === 0}
                            onPress={handleAdd}
                            style={[
                                styles.addButton,
                                { backgroundColor: '#007AFF', opacity: (isSaving || selectedIds.length === 0) ? 0.6 : 1 }
                            ]}
                        >
                            <Text style={styles.addButtonText}>
                                Add {selectedIds.length} Selected Requests
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
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
    scrollContent: {
        flex: 1,
    },
    scrollInner: {
        padding: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    reqItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 5,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    reqItemInfo: {
        flex: 1,
    },
    reqItemTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    reqRef: {
        fontSize: 14,
        fontWeight: '600',
    },
    reqAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
    reqMeta: {
        fontSize: 12,
    },
    footer: {
        padding: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    addButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
