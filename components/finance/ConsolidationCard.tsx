import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, Layout } from 'react-native-reanimated';
import { GlassView } from '@/components/ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import {
    FinanceDocumentRulesSettings,
    formatDepartmentCode,
    generateDocumentCode,
} from '@/lib/api/financeSetup';
import { PurchasingConsolidationItem } from '@/lib/api/financeConsolidation';
import { getFinanceStatusColor } from '@/lib/financeStatusPresentation';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface ConsolidationCardProps {
    item: PurchasingConsolidationItem;
    documentRules: FinanceDocumentRulesSettings;
    onPress: () => void;
    onRequestPress?: (request: any) => void;
    isPaymentMode?: boolean;
    selectedRequestIds?: string[];
    onSelectAllRequestsInConsolidation?: (consolidation: PurchasingConsolidationItem) => void;
}

function formatCurrency(amount: number) {
    const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value).replace('IDR', 'Rp');
}

function formatDate(dateStr?: string) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function getRequestStatus(request: any) {
    if (request.financial_status === 'PAID' || request.status === 'Paid') return 'Paid';
    if (Number(request._paid_amount || 0) > 0 || request.financial_status === 'PARTIALLY_PAID') return 'Partially Paid';
    if (request.approval_status === 'APPROVED') return 'Approved';
    if (request.approval_status === 'SUBMITTED') return 'Pending';
    return request.status || 'Approved';
}

function getRequestDepartmentCode(request: any) {
    const project = typeof request.project === 'string' ? request.project : request.project?.project_code;
    return formatDepartmentCode(
        request.department?.code || request.department_code || request.project_obj?.project_code || project
    ) || 'NA';
}

function getDynamicDocumentNumber(item: PurchasingConsolidationItem, documentRules: FinanceDocumentRulesSettings) {
    const sequence = item.document_number?.match(/(\d+)$/)?.[1];
    if (!sequence) return item.document_number;
    return generateDocumentCode(
        'purchasing_consolidation',
        new Date(item.created_at),
        Number(sequence),
        documentRules
    );
}

export const ConsolidationCard: React.FC<ConsolidationCardProps> = ({
    item,
    documentRules,
    onPress,
    onRequestPress,
    isPaymentMode = false,
    selectedRequestIds = [],
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const parentBg = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.92)';
    const childBg = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.88)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const connectorColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';
    const [isExpanded, setIsExpanded] = useState(false);
    const scale = useSharedValue(1);
    const animatedCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const requests = item.requests || [];
    const paidRequestsCount = requests.filter(request => request.financial_status === 'PAID' || request.status === 'Paid').length;
    const displayStatus = isPaymentMode && item.status === 'Approved' ? 'Pending' : item.status;
    const documentNumber = getDynamicDocumentNumber(item, documentRules);
    const requestSummary = isPaymentMode
        ? `${paidRequestsCount} / ${requests.length} Requests Paid`
        : `${requests.length} ${requests.length === 1 ? 'Request' : 'Requests'} · ${item.items_count || 0} Items`;

    const handleCardPress = () => {
        if (requests.length > 0) {
            setIsExpanded(prev => !prev);
        } else {
            onPress();
        }
    };

    return (
        <Animated.View style={[styles.wrapper, animatedCardStyle]} layout={Layout.springify()}>
            <GlassView
                intensity={isDark ? 10 : 25}
                style={[styles.parentCard, { backgroundColor: parentBg, borderColor }]}
            >
                <Pressable
                    onPress={handleCardPress}
                    onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 300 }); }}
                    onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                    style={styles.parentTouchable}
                >
                    <View style={styles.itemRow}>
                        <View style={styles.itemLeftCol}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>{documentNumber}</Text>
                                <TouchableOpacity
                                    activeOpacity={0.6}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onPress();
                                    }}
                                >
                                    <PlatformIcon name="info.circle" size={15} tintColor={subtextColor} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.itemMetaRow}>
                                <Text style={[styles.itemMetaText, { color: subtextColor }]}>
                                    {requestSummary} · {formatDate(item.created_at)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.itemRightCol}>
                            <Text style={[styles.itemAmount, { color: textColor }]}>
                                {isPaymentMode && displayStatus === 'Partially Paid'
                                    ? `${formatCurrency(Math.max(0, item.total_amount - item.total_paid_amount))} left`
                                    : formatCurrency(item.total_amount)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginTop: 2 }}>
                                <Text style={[styles.itemStatus, { color: getFinanceStatusColor(displayStatus, isDark) }]}>{displayStatus}</Text>
                                {requests.length > 0 && (
                                    <PlatformIcon
                                        name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                        size={12}
                                        tintColor={subtextColor}
                                    />
                                )}
                            </View>
                        </View>
                    </View>
                </Pressable>
            </GlassView>

            {isExpanded && requests.length > 0 && (
                <View style={styles.childrenWrapper}>
                    <View style={[styles.connector, { backgroundColor: connectorColor }]} />
                    <View style={styles.childrenContainer}>
                        {requests.map((request: any) => {
                            const status = getRequestStatus(request);
                            const isSelected = selectedRequestIds.includes(request.id);
                            return (
                                <GlassView
                                    key={request.id}
                                    intensity={isDark ? 10 : 25}
                                    style={[
                                        styles.childCard,
                                        {
                                            backgroundColor: childBg,
                                            borderColor: isSelected ? '#007AFF' : borderColor,
                                            borderWidth: isSelected ? 1.5 : StyleSheet.hairlineWidth,
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isSelected }}
                                        onPress={() => {
                                            onRequestPress?.(request);
                                        }}
                                    >
                                        <View style={styles.itemRow}>
                                            <View style={styles.itemLeftCol}>
                                                <Text style={[styles.childTitle, { color: textColor }]} numberOfLines={1}>
                                                    {request.title || request.description || 'Purchase Request'}
                                                </Text>
                                                <View style={styles.itemMetaRow}>
                                                    <View style={styles.summaryBadge}>
                                                        <Text style={[styles.summaryBadgeText, { color: subtextColor }]}>
                                                            {getRequestDepartmentCode(request)}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.childMetaText, { color: subtextColor }]} numberOfLines={1}>
                                                        {request.shortRef || request.ref || request.cardRef || 'PR'} · {formatDate(request.date || request.created_at)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.itemRightCol}>
                                                <Text style={[styles.childAmount, { color: textColor }]}>
                                                    {Number(request._paid_amount || 0) > 0 && Number(request._paid_amount || 0) < Number(request.amount || 0)
                                                        ? `${formatCurrency(Number(request.amount || 0) - Number(request._paid_amount || 0))} left`
                                                        : formatCurrency(request.amount || 0)}
                                                </Text>
                                                <Text style={[styles.childStatus, { color: getFinanceStatusColor(status, isDark) }]}>{status}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </GlassView>
                            );
                        })}

                        {/* View/Manage Full Consolidation Button */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={onPress}
                            style={[
                                styles.manageConsolidationBtn,
                                {
                                    backgroundColor: childBg,
                                    borderColor,
                                },
                            ]}
                        >
                            <PlatformIcon name="doc.text.magnifyingglass" size={14} tintColor="#007AFF" />
                            <Text style={[styles.manageConsolidationText, { color: '#007AFF' }]}>
                                Manage Consolidation
                            </Text>
                            <PlatformIcon name="chevron.right" size={12} tintColor={subtextColor} />
                        </TouchableOpacity>

                    </View>
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 12,
        gap: 8,
    },
    parentCard: {
        borderRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
    },
    parentTouchable: {
        padding: 16,
        paddingBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemLeftCol: {
        flex: 1,
        marginRight: 12,
    },
    itemRightCol: {
        alignItems: 'flex-end',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    itemMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    summaryBadge: {
        backgroundColor: 'rgba(142,142,147,0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        marginRight: 8,
    },
    summaryBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    itemMetaText: {
        flex: 1,
        fontSize: 13,
    },
    itemAmount: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    itemStatus: {
        fontSize: 12,
        fontWeight: '700',
    },
    childrenWrapper: {
        flexDirection: 'row',
        paddingLeft: 14,
        gap: 12,
    },
    connector: {
        width: 2,
        borderRadius: 1,
        marginVertical: 4,
    },
    childrenContainer: {
        flex: 1,
        gap: 10,
    },
    childCard: {
        borderRadius: 16,
        overflow: 'hidden',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    childTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    childMetaText: {
        flex: 1,
        fontSize: 11,
    },
    childAmount: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    childStatus: {
        fontSize: 11,
        fontWeight: '700',
    },
    paySelectedButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        borderRadius: 16,
    },
    paySelectedText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    manageConsolidationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 8,
        marginTop: 2,
    },
    manageConsolidationText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
});
