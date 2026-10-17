import React, { useState } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatDepartmentCode } from '@/lib/api/financeSetup';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export interface CreateConsolidationPreviewSheetProps {
    visible: boolean;
    onClose: () => void;
    selectedRequests: any[];
    onConsolidationCreated?: (consolidation: any) => void;
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

function getDepartmentCode(request: any) {
    const project = typeof request.project === 'string' ? request.project : request.project?.project_code;
    return (
        formatDepartmentCode(
            request.department?.code || request.department_code || request.project_obj?.project_code || project
        ) || 'Unassigned'
    );
}

export const CreateConsolidationPreviewSheet: React.FC<CreateConsolidationPreviewSheetProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./CreateConsolidationPreviewSheet.ios').CreateConsolidationPreviewSheet;
        return <Comp {...props} />;
    }

    const { visible, onClose, selectedRequests = [], onConsolidationCreated } = props;
    const { resolvedTheme } = useTheme();
    const { createConsolidation, setActiveWorkflowTab } = useFinance();
    const [isCreating, setIsCreating] = useState(false);

    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const modalBg = isDark ? '#1C1C1E' : '#FFFFFF';

    const requestCount = selectedRequests.length;
    const totalAmount = selectedRequests.reduce((sum, request) => sum + (request.amount || 0), 0);
    const totalItems = selectedRequests.reduce((sum, request) => sum + (request.items?.length || 1), 0);

    const handleCreate = async () => {
        if (requestCount === 0) return;

        setIsCreating(true);
        try {
            const requestIds = selectedRequests.map((request) => request.id);
            const newConsolidation = await createConsolidation(requestIds);
            onClose();
            setActiveWorkflowTab('consolidation');
            onConsolidationCreated?.(newConsolidation);
            Alert.alert(
                'Consolidation Created',
                `Created ${newConsolidation?.document_number || 'consolidation'} with ${requestCount} requests.`
            );
        } catch (error: any) {
            Alert.alert('Creation Failed', error.message || 'Could not create consolidation.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={s.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View
                    style={[
                        s.dialogCard,
                        {
                            backgroundColor: modalBg,
                            borderColor: cardBorder,
                        },
                    ]}
                >
                    {/* Drawer Handle */}
                    <View
                        style={[
                            s.dragHandle,
                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)' },
                        ]}
                    />

                    {/* Header */}
                    <View style={s.headerRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={[s.titleText, { color: textColor }]}>
                                Create Consolidation
                            </Text>
                            <Text style={[s.subtitleText, { color: subtextColor }]}>
                                {`${requestCount} ${requestCount === 1 ? 'Request' : 'Requests'} to Consolidate`}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={s.closeButton}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <PlatformIcon name="xmark.circle.fill" size={24} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Content List */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollContent}
                    >
                        <View style={[s.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            {selectedRequests.map((request, idx) => {
                                const itemCount = request.items?.length || 1;
                                const isLast = idx === selectedRequests.length - 1;
                                return (
                                    <View
                                        key={request.id}
                                        style={[
                                            s.requestItem,
                                            !isLast && { borderBottomWidth: 1, borderBottomColor: cardBorder },
                                        ]}
                                    >
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <Text style={[s.requestRef, { color: textColor }]}>
                                                {request.shortRef || request.ref || request.cardRef || request.title || 'PR'}
                                            </Text>
                                            <Text style={[s.requestMeta, { color: subtextColor }]}>
                                                {`${getDepartmentCode(request)} · ${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}`}
                                            </Text>
                                        </View>
                                        <Text style={[s.requestAmount, { color: textColor }]}>
                                            {formatCurrency(request.amount || 0)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Summary Card */}
                        <View style={[s.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={s.summaryRow}>
                                <Text style={[s.summaryLabel, { color: subtextColor }]}>Total Items</Text>
                                <Text style={[s.summaryValue, { color: textColor }]}>{`${totalItems} Items`}</Text>
                            </View>
                            <View style={[s.summaryRow, { marginTop: 8 }]}>
                                <Text style={[s.summaryTotalLabel, { color: textColor }]}>Total Nominal</Text>
                                <Text style={[s.summaryTotalValue, { color: '#007AFF' }]}>
                                    {formatCurrency(totalAmount)}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={[s.actionRow, { borderTopColor: cardBorder }]}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={onClose}
                            style={[s.cancelBtn, { borderColor: cardBorder }]}
                        >
                            <Text style={[s.cancelBtnText, { color: textColor }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleCreate}
                            disabled={isCreating || requestCount === 0}
                            style={[
                                s.createBtn,
                                {
                                    backgroundColor: '#007AFF',
                                    opacity: isCreating || requestCount === 0 ? 0.6 : 1,
                                },
                            ]}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={s.createBtnText}>
                                    {`Create Consolidation (${requestCount})`}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    dialogCard: {
        width: '100%',
        maxWidth: 580,
        maxHeight: '90%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        gap: 16,
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
    },
    dragHandle: {
        width: 38,
        height: 4.5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 6,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitleText: {
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        gap: 12,
        paddingVertical: 4,
    },
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    requestRef: {
        fontSize: 15,
        fontWeight: '600',
    },
    requestMeta: {
        fontSize: 12,
    },
    requestAmount: {
        fontSize: 15,
        fontWeight: '600',
    },
    summaryCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    summaryTotalLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    summaryTotalValue: {
        fontSize: 17,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 14,
        borderTopWidth: 1,
    },
    cancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    createBtn: {
        flex: 1.5,
        height: 46,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default CreateConsolidationPreviewSheet;
