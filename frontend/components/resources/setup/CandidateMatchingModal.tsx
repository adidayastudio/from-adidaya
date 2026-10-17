import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import {
    ItemMasterRecord,
    UnmatchedItemCandidate,
} from '@/lib/api/resourcesItemMaster';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface CandidateMatchingModalProps {
    visible: boolean;
    onClose: () => void;
    candidate: UnmatchedItemCandidate | null;
    itemMasters: ItemMasterRecord[];
    onMatchExisting: (candidateId: string, masterId: string, variantId?: string, skuId?: string) => void;
    onCreateNewFromCandidate: (candidate: UnmatchedItemCandidate) => void;
    onIgnoreCandidate: (candidateId: string) => void;
}

export function CandidateMatchingModal({
    visible,
    onClose,
    candidate,
    itemMasters,
    onMatchExisting,
    onCreateNewFromCandidate,
    onIgnoreCandidate,
}: CandidateMatchingModalProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [selectedMasterId, setSelectedMasterId] = useState<string>(
        candidate?.suggestedMasterId || (itemMasters[0]?.id || '')
    );
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
        candidate?.suggestedVariantId
    );
    const [selectedSkuId, setSelectedSkuId] = useState<string | undefined>(
        candidate?.suggestedSkuId
    );

    if (!candidate) return null;

    const currentMaster = itemMasters.find((m) => m.id === selectedMasterId) || itemMasters[0];
    const variants = currentMaster?.variants || [];
    const currentVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];
    const skus = currentVariant?.skus || [];
    const currentSku = skus.find((s) => s.id === selectedSkuId) || skus[0];

    const badgeMeta = currentMaster ? getResourceBadgeMeta(currentMaster.resourceType) : null;

    const handleConfirmMatch = () => {
        if (!currentMaster) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onMatchExisting(
            candidate.id,
            currentMaster.id,
            currentVariant?.id,
            currentSku?.id
        );
        onClose();
    };

    const handleCreateNew = () => {
        Haptics.selectionAsync();
        onClose();
        onCreateNewFromCandidate(candidate);
    };

    const handleIgnore = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onIgnoreCandidate(candidate.id);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
            >
                {/* Header */}
                <View
                    style={[
                        s.header,
                        {
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8,
                        },
                    ]}
                >
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <Text style={[s.headerBtn, { color: subtextColor }]}>Close</Text>
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: textColor }]}>Item Normalization</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 32 },
                    ]}
                >
                    {/* Unmatched Candidate Source Card */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Raw Entry From Finance</Text>
                    <View
                        style={[
                            s.card,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.candidateHeaderRow}>
                            <View style={[s.sourceTag, { backgroundColor: isDark ? 'rgba(255,149,0,0.12)' : '#FFF3E0' }]}>
                                <PlatformIcon name="doc.text.fill" size={12} tintColor="#FF9500" />
                                <Text style={s.sourceTagText}>{candidate.sourceTransactionType}</Text>
                            </View>
                            <Text style={[s.docNumber, { color: subtextColor }]}>{candidate.sourceDocumentNumber}</Text>
                        </View>
                        <Text style={[s.rawItemName, { color: textColor }]}>"{candidate.rawName}"</Text>
                        {candidate.amount !== undefined && (
                            <Text style={[s.amountText, { color: subtextColor }]}>
                                Recorded amount: Rp {candidate.amount.toLocaleString('id-ID')} · {candidate.sourceDate}
                            </Text>
                        )}
                    </View>

                    {/* Notice */}
                    <View
                        style={[
                            s.noticeBox,
                            { backgroundColor: isDark ? 'rgba(0,122,255,0.1)' : '#EBF5FF' },
                        ]}
                    >
                        <PlatformIcon name="info.circle.fill" size={14} tintColor="#007AFF" />
                        <Text style={[s.noticeText, { color: isDark ? '#64B5F6' : '#0055B3' }]}>
                            Matching will not alter past Finance records, but standardizes future item suggestions and cost history.
                        </Text>
                    </View>

                    {/* Match to Canonical Hierarchy */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Match to Canonical Master</Text>
                    <View
                        style={[
                            s.card,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        {/* 1. Item Master Selector */}
                        <ContextMenu
                            actions={itemMasters.map((m) => ({
                                title: m.name,
                                subtitle: `${m.code} · ${m.resourceType}`,
                                state: selectedMasterId === m.id ? 'on' : 'off',
                            }))}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                const chosen = itemMasters[e.nativeEvent.index];
                                if (chosen) {
                                    setSelectedMasterId(chosen.id);
                                    setSelectedVariantId(chosen.variants[0]?.id);
                                    setSelectedSkuId(chosen.variants[0]?.skus[0]?.id);
                                }
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Item Master</Text>
                                <View style={s.selectValueBox}>
                                    {badgeMeta && (
                                        <PlatformIcon
                                            name={badgeMeta.icon as any}
                                            size={12}
                                            tintColor={badgeMeta.iconColor}
                                        />
                                    )}
                                    <Text style={[s.selectValueText, { color: textColor }]}>
                                        {currentMaster?.name || 'Select Item'}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        {variants.length > 0 && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                {/* 2. Brand / Variant Selector */}
                                <ContextMenu
                                    actions={variants.map((v) => ({
                                        title: v.brandName,
                                        subtitle: `${v.skus.length} SKUs`,
                                        state: (selectedVariantId || variants[0]?.id) === v.id ? 'on' : 'off',
                                    }))}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        Haptics.selectionAsync();
                                        const chosen = variants[e.nativeEvent.index];
                                        if (chosen) {
                                            setSelectedVariantId(chosen.id);
                                            setSelectedSkuId(chosen.skus[0]?.id);
                                        }
                                    }}
                                >
                                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                        <Text style={[s.inputLabel, { color: textColor }]}>Brand / Variant</Text>
                                        <View style={s.selectValueBox}>
                                            <Text style={[s.selectValueText, { color: textColor }]}>
                                                {currentVariant?.brandName || 'Select Brand'}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </TouchableOpacity>
                                </ContextMenu>
                            </>
                        )}

                        {skus.length > 0 && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                {/* 3. SKU / Detail Selector */}
                                <ContextMenu
                                    actions={skus.map((s) => ({
                                        title: s.code,
                                        subtitle: s.name,
                                        state: (selectedSkuId || skus[0]?.id) === s.id ? 'on' : 'off',
                                    }))}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        Haptics.selectionAsync();
                                        const chosen = skus[e.nativeEvent.index];
                                        if (chosen) {
                                            setSelectedSkuId(chosen.id);
                                        }
                                    }}
                                >
                                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                        <Text style={[s.inputLabel, { color: textColor }]}>SKU / Detail</Text>
                                        <View style={s.selectValueBox}>
                                            <Text style={[s.selectValueText, { color: textColor }]}>
                                                {currentSku?.code || 'Select SKU'}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </TouchableOpacity>
                                </ContextMenu>
                            </>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={s.actionCol}>
                        <TouchableOpacity
                            style={[s.primaryBtn, { backgroundColor: '#007AFF' }]}
                            onPress={handleConfirmMatch}
                            activeOpacity={0.8}
                        >
                            <PlatformIcon name="link" size={16} tintColor="#FFFFFF" />
                            <Text style={s.primaryBtnText}>Match to Existing Item</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                s.secondaryBtn,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' },
                            ]}
                            onPress={handleCreateNew}
                            activeOpacity={0.7}
                        >
                            <PlatformIcon name="plus" size={15} tintColor={textColor} />
                            <Text style={[s.secondaryBtnText, { color: textColor }]}>Create New Item Master</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                s.secondaryBtn,
                                { backgroundColor: isDark ? 'rgba(255,59,48,0.08)' : '#FFF0EF' },
                            ]}
                            onPress={handleIgnore}
                            activeOpacity={0.7}
                        >
                            <PlatformIcon name="xmark" size={14} tintColor="#FF3B30" />
                            <Text style={[s.secondaryBtnText, { color: '#FF3B30' }]}>Dismiss Candidate</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    headerBtn: {
        fontSize: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
        marginBottom: 6,
        marginTop: 12,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    candidateHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sourceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
    },
    sourceTagText: {
        color: '#FF9500',
        fontSize: 12,
        fontWeight: '600',
    },
    docNumber: {
        fontSize: 12,
        fontWeight: '500',
    },
    rawItemName: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    amountText: {
        fontSize: 13,
    },
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        gap: 8,
    },
    noticeText: {
        fontSize: 12.5,
        lineHeight: 17,
        flex: 1,
        fontWeight: '400',
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    selectValueText: {
        fontSize: 15,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 6,
    },
    actionCol: {
        marginTop: 24,
        gap: 10,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 14,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
