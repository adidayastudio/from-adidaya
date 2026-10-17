import React, { useState, useEffect, useMemo } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { PurchasingConsolidationItem } from '@/lib/api/financeConsolidation';
import { getFinanceStatusColor } from '@/lib/financeStatusPresentation';
import { formatDepartmentCode } from '@/lib/api/financeSetup';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface SwiftUIConsolidationRequestDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    consolidation: PurchasingConsolidationItem | null;
    request: any | null;
    onChanged?: (request: any | null) => void;
    canProcessPayment?: boolean;
    onProcessPayment?: (request: any) => void;
    isPaymentMode?: boolean;
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

export const SwiftUIConsolidationRequestDetailSheet: React.FC<SwiftUIConsolidationRequestDetailSheetProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./SwiftUIConsolidationRequestDetailSheet.ios').SwiftUIConsolidationRequestDetailSheet;
        return <Comp {...props} />;
    }

    const {
        isOpened,
        onClose,
        consolidation,
        request,
        onChanged,
    } = props;

    const { resolvedTheme } = useTheme();
    const { updateConsolidationRequest, removeRequestFromConsolidation } = useFinance();

    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const inputBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const modalBg = isDark ? '#1C1C1E' : '#FFFFFF';

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [items, setItems] = useState<any[]>([]);
    const [vendor, setVendor] = useState('');
    const [bank, setBank] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [consolidationNotes, setConsolidationNotes] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [discountValue, setDiscountValue] = useState('');

    useEffect(() => {
        if (!request || !isOpened) return;
        setIsEditing(false);

        const requestItems = (request.items || []).map((item: any) => ({ ...item }));
        setItems(
            requestItems.length
                ? requestItems
                : [
                      {
                          id: 'legacy-item',
                          name: request.title || request.description || 'Requested Item',
                          qty: Number(request.quantity) || 1,
                          unit: request.unit || 'pcs',
                          unit_price: Number(request.subtotal_amount ?? request.amount) || 0,
                          total: Number(request.subtotal_amount ?? request.amount) || 0,
                      },
                  ]
        );
        setVendor(request.vendor || '');
        setBank(request.beneficiary_bank || '');
        setAccountNumber(request.beneficiary_number || '');
        setAccountName(request.beneficiary_name || '');
        setInvoiceNumber(request.consolidation_invoice_number || request.invoice_number || '');
        setConsolidationNotes(request.consolidation_notes || '');
        setTaxRate(request.tax_rate != null ? String(request.tax_rate) : '');
        setDiscountValue(request.discount_value != null ? String(request.discount_value) : '');
    }, [request, isOpened]);

    if (!request || !consolidation) return null;

    const original = request._originalRequest || request;
    const editable = ['Draft', 'Revision'].includes(consolidation.status);

    const subtotal = items.reduce(
        (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unit_price) || 0),
        0
    );
    const numDiscount = Number(discountValue) || 0;
    const discountedSubtotal = Math.max(0, subtotal - numDiscount);
    const numTaxRate = Number(taxRate) || 0;
    const taxAmount = (discountedSubtotal * numTaxRate) / 100;
    const totalAmount = discountedSubtotal + taxAmount;

    const requestRef = request.shortRef || request.ref || request.cardRef || 'PR';
    const deptCode =
        formatDepartmentCode(
            original.department?.code || original.department_code || original.project_obj?.project_code || original.project
        ) || 'Unassigned';

    const handleUpdateItem = (index: number, field: string, val: any) => {
        setItems((current) =>
            current.map((it, idx) => {
                if (idx !== index) return it;
                const updated = { ...it, [field]: val };
                if (field === 'qty' || field === 'unit_price') {
                    const q = field === 'qty' ? Number(val) || 0 : Number(it.qty) || 0;
                    const p = field === 'unit_price' ? Number(val) || 0 : Number(it.unit_price) || 0;
                    updated.total = q * p;
                }
                return updated;
            })
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const values = {
                items: items.map((item) => ({
                    qty: Number(item.qty) || 0,
                    unit: item.unit || 'pcs',
                    unit_price: Number(item.unit_price) || 0,
                    total: (Number(item.qty) || 0) * (Number(item.unit_price) || 0),
                    name: item.name,
                })),
                amount: totalAmount,
                subtotal_amount: subtotal,
                discount_value: numDiscount,
                discount_amount: numDiscount,
                tax_rate: numTaxRate,
                tax_amount: taxAmount,
                vendor: vendor.trim(),
                beneficiary_bank: bank.trim(),
                beneficiary_number: accountNumber.trim(),
                beneficiary_name: accountName.trim(),
                consolidation_invoice_number: invoiceNumber.trim(),
                consolidation_notes: consolidationNotes.trim(),
            };

            await updateConsolidationRequest(consolidation.id, request.id, values);

            onChanged?.({
                ...request,
                ...values,
                _consolidationUpdated: true,
                _originalRequest: original,
            });

            setIsEditing(false);
            Alert.alert('Saved', 'Consolidation request updated successfully.');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveFromConsolidation = () => {
        Alert.alert(
            'Remove Request',
            `Remove ${requestRef} from Consolidation ${consolidation.document_number}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeRequestFromConsolidation(consolidation.id, request.id);
                            onChanged?.(null);
                            onClose();
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to remove request.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal
            visible={isOpened}
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
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[s.titleText, { color: textColor }]}>
                                    {requestRef}
                                </Text>
                                {request._consolidationUpdated && (
                                    <View style={s.badgeUpdated}>
                                        <Text style={s.badgeUpdatedText}>Edited in Consolidation</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[s.subtitleText, { color: subtextColor }]}>
                                {request.title || request.description || 'Purchase Request'} · {deptCode}
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

                    {/* Scrollable Body */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollContent}
                    >
                        {/* Note explaining local consolidation override */}
                        <View style={[s.infoNotice, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <PlatformIcon name="info.circle" size={16} tintColor="#007AFF" />
                            <Text style={[s.infoNoticeText, { color: subtextColor }]}>
                                Modifications here apply exclusively to this consolidation order and will not alter the original request.
                            </Text>
                        </View>

                        {/* Items Section */}
                        <View style={[s.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={s.sectionHeader}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>Items & Quantities</Text>
                                <Text style={[s.sectionSubhead, { color: subtextColor }]}>
                                    {`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                                </Text>
                            </View>

                            {items.map((item, idx) => (
                                <View
                                    key={item.id || idx}
                                    style={[
                                        s.itemCard,
                                        idx > 0 && { borderTopWidth: 1, borderTopColor: cardBorder, paddingTop: 10 },
                                    ]}
                                >
                                    <Text style={[s.itemName, { color: textColor }]}>
                                        {item.name || `Item ${idx + 1}`}
                                    </Text>

                                    {isEditing ? (
                                        <View style={s.editItemRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Qty</Text>
                                                <TextInput
                                                    style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                    keyboardType="numeric"
                                                    value={String(item.qty || '')}
                                                    onChangeText={(v) => handleUpdateItem(idx, 'qty', v)}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Unit</Text>
                                                <TextInput
                                                    style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                    value={item.unit || 'pcs'}
                                                    onChangeText={(v) => handleUpdateItem(idx, 'unit', v)}
                                                />
                                            </View>
                                            <View style={{ flex: 1.8 }}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Unit Price (Rp)</Text>
                                                <TextInput
                                                    style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                    keyboardType="numeric"
                                                    value={String(item.unit_price || '')}
                                                    onChangeText={(v) => handleUpdateItem(idx, 'unit_price', v)}
                                                />
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={s.viewItemRow}>
                                            <Text style={[s.itemQtyText, { color: subtextColor }]}>
                                                {`${item.qty} ${item.unit || 'pcs'} × ${formatCurrency(item.unit_price || 0)}`}
                                            </Text>
                                            <Text style={[s.itemTotalText, { color: textColor }]}>
                                                {formatCurrency((item.qty || 0) * (item.unit_price || 0))}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}

                            {/* Summary Calculation */}
                            <View style={[s.summaryContainer, { borderTopWidth: 1, borderTopColor: cardBorder }]}>
                                <View style={s.summaryLine}>
                                    <Text style={[s.summaryLineLabel, { color: subtextColor }]}>Subtotal</Text>
                                    <Text style={[s.summaryLineVal, { color: textColor }]}>{formatCurrency(subtotal)}</Text>
                                </View>

                                {isEditing ? (
                                    <View style={s.editDiscountRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.inputLabel, { color: subtextColor }]}>Discount (Rp)</Text>
                                            <TextInput
                                                style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={subtextColor}
                                                value={discountValue}
                                                onChangeText={setDiscountValue}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.inputLabel, { color: subtextColor }]}>Tax Rate (%)</Text>
                                            <TextInput
                                                style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={subtextColor}
                                                value={taxRate}
                                                onChangeText={setTaxRate}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        {numDiscount > 0 && (
                                            <View style={s.summaryLine}>
                                                <Text style={[s.summaryLineLabel, { color: subtextColor }]}>Discount</Text>
                                                <Text style={[s.summaryLineVal, { color: '#FF9500' }]}>{`-${formatCurrency(numDiscount)}`}</Text>
                                            </View>
                                        )}
                                        {taxAmount > 0 && (
                                            <View style={s.summaryLine}>
                                                <Text style={[s.summaryLineLabel, { color: subtextColor }]}>{`Tax (${numTaxRate}%)`}</Text>
                                                <Text style={[s.summaryLineVal, { color: textColor }]}>{formatCurrency(taxAmount)}</Text>
                                            </View>
                                        )}
                                    </>
                                )}

                                <View style={[s.summaryLine, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: cardBorder }]}>
                                    <Text style={[s.totalLabel, { color: textColor }]}>Consolidated Total</Text>
                                    <Text style={[s.totalVal, { color: '#007AFF' }]}>{formatCurrency(totalAmount)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Vendor & Beneficiary Account */}
                        <View style={[s.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>Vendor & Payment Details</Text>

                            {isEditing ? (
                                <View style={{ gap: 10, marginTop: 4 }}>
                                    <View>
                                        <Text style={[s.inputLabel, { color: subtextColor }]}>Vendor Name</Text>
                                        <TextInput
                                            style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                            placeholder="e.g. Toko Alat Kantor"
                                            placeholderTextColor={subtextColor}
                                            value={vendor}
                                            onChangeText={setVendor}
                                        />
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.inputLabel, { color: subtextColor }]}>Bank Name</Text>
                                            <TextInput
                                                style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                placeholder="BCA / Mandiri"
                                                placeholderTextColor={subtextColor}
                                                value={bank}
                                                onChangeText={setBank}
                                            />
                                        </View>
                                        <View style={{ flex: 1.5 }}>
                                            <Text style={[s.inputLabel, { color: subtextColor }]}>Account Number</Text>
                                            <TextInput
                                                style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                                placeholder="1234567890"
                                                placeholderTextColor={subtextColor}
                                                value={accountNumber}
                                                onChangeText={setAccountNumber}
                                            />
                                        </View>
                                    </View>
                                    <View>
                                        <Text style={[s.inputLabel, { color: subtextColor }]}>Account Name</Text>
                                        <TextInput
                                            style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                            placeholder="Account holder name"
                                            placeholderTextColor={subtextColor}
                                            value={accountName}
                                            onChangeText={setAccountName}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={{ gap: 6, marginTop: 4 }}>
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoRowLabel, { color: subtextColor }]}>Vendor</Text>
                                        <Text style={[s.infoRowVal, { color: textColor }]}>{vendor || '—'}</Text>
                                    </View>
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoRowLabel, { color: subtextColor }]}>Beneficiary Bank</Text>
                                        <Text style={[s.infoRowVal, { color: textColor }]}>{bank || '—'}</Text>
                                    </View>
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoRowLabel, { color: subtextColor }]}>Account Number</Text>
                                        <Text style={[s.infoRowVal, { color: textColor }]}>{accountNumber || '—'}</Text>
                                    </View>
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoRowLabel, { color: subtextColor }]}>Account Name</Text>
                                        <Text style={[s.infoRowVal, { color: textColor }]}>{accountName || '—'}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Invoice & Consolidation Notes */}
                        <View style={[s.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>Invoice & Notes</Text>

                            {isEditing ? (
                                <View style={{ gap: 10, marginTop: 4 }}>
                                    <View>
                                        <Text style={[s.inputLabel, { color: subtextColor }]}>Invoice Number</Text>
                                        <TextInput
                                            style={[s.inputBox, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                            placeholder="INV-00123"
                                            placeholderTextColor={subtextColor}
                                            value={invoiceNumber}
                                            onChangeText={setInvoiceNumber}
                                        />
                                    </View>
                                    <View>
                                        <Text style={[s.inputLabel, { color: subtextColor }]}>Consolidation Notes</Text>
                                        <TextInput
                                            style={[s.inputBoxArea, { backgroundColor: inputBg, color: textColor, borderColor: cardBorder }]}
                                            multiline
                                            numberOfLines={3}
                                            placeholder="Notes specific to this consolidated item..."
                                            placeholderTextColor={subtextColor}
                                            value={consolidationNotes}
                                            onChangeText={setConsolidationNotes}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={{ gap: 6, marginTop: 4 }}>
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoRowLabel, { color: subtextColor }]}>Invoice Number</Text>
                                        <Text style={[s.infoRowVal, { color: textColor }]}>{invoiceNumber || '—'}</Text>
                                    </View>
                                    {consolidationNotes ? (
                                        <View style={{ marginTop: 4 }}>
                                            <Text style={[s.infoRowLabel, { color: subtextColor, marginBottom: 2 }]}>Notes</Text>
                                            <Text style={[s.notesText, { color: textColor }]}>{consolidationNotes}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Bottom Actions */}
                    <View style={[s.actionRow, { borderTopColor: cardBorder }]}>
                        {isEditing ? (
                            <>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => setIsEditing(false)}
                                    disabled={saving}
                                    style={[s.actionBtn, { borderColor: cardBorder }]}
                                >
                                    <Text style={[s.actionBtnText, { color: textColor }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={handleSave}
                                    disabled={saving}
                                    style={[s.actionBtnPrimary, { backgroundColor: '#007AFF' }]}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={s.actionBtnPrimaryText}>Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {editable && (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={handleRemoveFromConsolidation}
                                        style={[s.actionBtn, { borderColor: cardBorder }]}
                                    >
                                        <Text style={[s.actionBtnText, { color: '#FF3B30' }]}>Remove</Text>
                                    </TouchableOpacity>
                                )}
                                {editable ? (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => setIsEditing(true)}
                                        style={[s.actionBtnPrimary, { backgroundColor: '#007AFF' }]}
                                    >
                                        <PlatformIcon name="pencil" size={14} tintColor="#FFFFFF" />
                                        <Text style={s.actionBtnPrimaryText}>Edit in Consolidation</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={onClose}
                                        style={[s.actionBtnPrimary, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }]}
                                    >
                                        <Text style={[s.actionBtnText, { color: textColor }]}>Close</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
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
        gap: 14,
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
    badgeUpdated: {
        backgroundColor: 'rgba(255, 149, 0, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    badgeUpdatedText: {
        color: '#FF9500',
        fontSize: 11,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        gap: 12,
        paddingVertical: 4,
    },
    infoNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 8,
    },
    infoNoticeText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
    },
    sectionCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionSubhead: {
        fontSize: 12,
    },
    itemCard: {
        paddingVertical: 4,
        gap: 6,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
    },
    viewItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemQtyText: {
        fontSize: 13,
    },
    itemTotalText: {
        fontSize: 14,
        fontWeight: '600',
    },
    editItemRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    inputBox: {
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        fontSize: 13,
    },
    inputBoxArea: {
        minHeight: 64,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        textAlignVertical: 'top',
    },
    summaryContainer: {
        marginTop: 6,
        paddingTop: 8,
        gap: 6,
    },
    summaryLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLineLabel: {
        fontSize: 13,
    },
    summaryLineVal: {
        fontSize: 13,
        fontWeight: '500',
    },
    editDiscountRow: {
        flexDirection: 'row',
        gap: 10,
        marginVertical: 4,
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    totalVal: {
        fontSize: 17,
        fontWeight: '700',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
    },
    infoRowLabel: {
        fontSize: 13,
    },
    infoRowVal: {
        fontSize: 13,
        fontWeight: '500',
    },
    notesText: {
        fontSize: 13,
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 14,
        borderTopWidth: 1,
    },
    actionBtn: {
        flex: 1,
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    actionBtnPrimary: {
        flex: 1.5,
        height: 46,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    actionBtnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default SwiftUIConsolidationRequestDetailSheet;
