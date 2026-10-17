import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    LayoutAnimation,
    UIManager,
    Alert,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    ResourcesNumberingSettings,
    ResourceTypeCode,
    TransactionTypeCode,
    ResourceNumberingRule,
    TransactionNumberingRule,
    TRANSACTION_PATTERN_OPTIONS,
    TRANSACTION_RESET_OPTIONS,
    generateResourceCodePreview,
    generateTransactionCodePreview,
} from '@/lib/api/resourcesSetup';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ResourcesNumberingCodesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ResourcesNumberingSettings;
    onUpdateSettings: (newSettings: ResourcesNumberingSettings) => void;
}

export function ResourcesNumberingCodesSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    onUpdateSettings,
}: ResourcesNumberingCodesSectionProps) {
    const [expandedResource, setExpandedResource] = useState<ResourceTypeCode | null>('material');
    const [expandedTransaction, setExpandedTransaction] = useState<TransactionTypeCode | null>('receiving');

    const toggleResource = (type: ResourceTypeCode) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedResource((prev) => (prev === type ? null : type));
    };

    const toggleTransaction = (type: TransactionTypeCode) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedTransaction((prev) => (prev === type ? null : type));
    };

    // Check duplicate prefixes
    const duplicatePrefixes = useMemo(() => {
        const allPrefixes = [
            ...Object.values(settings.resourceRules).map((r) => r.prefix.trim().toUpperCase()),
            ...Object.values(settings.transactionRules).map((t) => t.prefix.trim().toUpperCase()),
        ];
        return allPrefixes.filter((item, index) => allPrefixes.indexOf(item) !== index && item !== '');
    }, [settings]);

    const handleUpdateResourcePrefix = (type: ResourceTypeCode, prefix: string) => {
        const updatedRule: ResourceNumberingRule = {
            ...settings.resourceRules[type],
            prefix: prefix.toUpperCase().slice(0, 2),
        };
        onUpdateSettings({
            ...settings,
            resourceRules: {
                ...settings.resourceRules,
                [type]: updatedRule,
            },
        });
    };

    const handleUpdateTransactionPrefix = (type: TransactionTypeCode, prefix: string) => {
        const updatedRule: TransactionNumberingRule = {
            ...settings.transactionRules[type],
            prefix: prefix.toUpperCase().slice(0, 2),
        };
        onUpdateSettings({
            ...settings,
            transactionRules: {
                ...settings.transactionRules,
                [type]: updatedRule,
            },
        });
    };

    const handleSelectTransactionPattern = (type: TransactionTypeCode, event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = TRANSACTION_PATTERN_OPTIONS.find((o) => o.label === name) || TRANSACTION_PATTERN_OPTIONS[index];
        if (item) {
            const updatedRule: TransactionNumberingRule = {
                ...settings.transactionRules[type],
                pattern: item.value as any,
            };
            onUpdateSettings({
                ...settings,
                transactionRules: {
                    ...settings.transactionRules,
                    [type]: updatedRule,
                },
            });
        }
    };

    const handleSelectTransactionReset = (type: TransactionTypeCode, event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = TRANSACTION_RESET_OPTIONS.find((o) => o.title === name) || TRANSACTION_RESET_OPTIONS[index];
        if (item) {
            const updatedRule: TransactionNumberingRule = {
                ...settings.transactionRules[type],
                resetRule: item.value as any,
            };
            onUpdateSettings({
                ...settings,
                transactionRules: {
                    ...settings.transactionRules,
                    [type]: updatedRule,
                },
            });
        }
    };

    const resourceTypes: ResourceTypeCode[] = ['material', 'tool', 'asset', 'service'];
    const transactionTypes: TransactionTypeCode[] = ['receiving', 'transfer', 'adjustment', 'retirement'];

    return (
        <View style={s.container}>
            {/* Duplicate Prefix Warning Banner */}
            {duplicatePrefixes.length > 0 && (
                <GlassView
                    intensity={isDark ? 10 : 20}
                    style={[
                        s.warningCard,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,59,48,0.12)'
                                : 'rgba(255,59,48,0.08)',
                            borderColor: isDark
                                ? 'rgba(255,59,48,0.25)'
                                : 'rgba(255,59,48,0.2)',
                        },
                    ]}
                >
                    <PlatformIcon
                        name="exclamationmark.triangle.fill"
                        size={18}
                        tintColor="#FF3B30"
                    />
                    <Text style={[s.warningText, { color: isDark ? '#FF6961' : '#D70015' }]}>
                        Duplicate code prefix detected: {duplicatePrefixes.join(', ')}. Unique prefixes prevent numbering collisions.
                    </Text>
                </GlassView>
            )}

            {/* ============================================================ */}
            {/* SECTION 1 — Resource Master Codes */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Resource Codes
                </Text>

                <View style={s.cardsWrapper}>
                    {resourceTypes.map((type) => {
                        const rule = settings.resourceRules[type];
                        const isExpanded = expandedResource === type;
                        const previewCode = generateResourceCodePreview(rule);

                        const catStr = String(rule.sampleCategorySeq).padStart(rule.categoryDigits, '0');
                        const subStr = String(rule.sampleSubcategorySeq).padStart(rule.subcategoryDigits, '0');
                        const itemStr = String(rule.sampleItemSeq).padStart(rule.itemDigits, '0');
                        const instStr = String(rule.sampleInstanceSeq).padStart(rule.instanceDigits, '0');

                        return (
                            <GlassView
                                key={type}
                                intensity={isDark ? 10 : 25}
                                style={[
                                    s.card,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.02)'
                                            : 'rgba(255,255,255,0.7)',
                                    },
                                ]}
                            >
                                <TouchableOpacity
                                    style={s.cardHeaderRow}
                                    onPress={() => toggleResource(type)}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.cardHeaderTitleCol}>
                                        <Text style={[s.cardTitle, { color: textColor }]}>
                                            {rule.name}
                                        </Text>
                                    </View>

                                    <View style={s.cardHeaderRightCol}>
                                        <View style={s.previewBadge}>
                                            <Text style={s.previewBadgeText}>{previewCode}</Text>
                                        </View>
                                        <PlatformIcon
                                            name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                            size={14}
                                            tintColor={subtextColor}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={s.expandedBody}>
                                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                        {/* Prefix Input Row */}
                                        <View style={s.formRow}>
                                            <View style={s.formLabelCol}>
                                                <Text style={[s.formLabel, { color: textColor }]}>Code Prefix</Text>
                                                <Text style={[s.formSublabel, { color: subtextColor }]}>
                                                    Short identifier for {rule.name.toLowerCase()}
                                                </Text>
                                            </View>
                                            <TextInput
                                                style={[
                                                    s.prefixInput,
                                                    {
                                                        color: textColor,
                                                        borderColor: isDark ? '#333' : '#E5E5EA',
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF',
                                                    },
                                                ]}
                                                value={rule.prefix}
                                                onChangeText={(txt) => handleUpdateResourcePrefix(type, txt)}
                                                maxLength={2}
                                                autoCapitalize="characters"
                                            />
                                        </View>

                                        {/* Hierarchy Breakdown Info */}
                                        <View style={s.hierarchyBox}>
                                            <Text style={[s.hierarchyTitle, { color: subtextColor }]}>
                                                CODE STRUCTURE BREAKDOWN
                                            </Text>
                                            <View style={s.hierarchySegmentsRow}>
                                                <View style={s.segBlock}>
                                                    <Text style={[s.segCode, { color: '#007AFF' }]}>{rule.prefix}</Text>
                                                    <Text style={[s.segName, { color: subtextColor }]}>Prefix</Text>
                                                </View>
                                                <Text style={[s.segDash, { color: subtextColor }]}>-</Text>
                                                <View style={s.segBlock}>
                                                    <Text style={[s.segCode, { color: textColor }]}>{catStr}</Text>
                                                    <Text style={[s.segName, { color: subtextColor }]}>Category</Text>
                                                </View>
                                                <View style={s.segBlock}>
                                                    <Text style={[s.segCode, { color: textColor }]}>{subStr}</Text>
                                                    <Text style={[s.segName, { color: subtextColor }]}>Subcategory</Text>
                                                </View>
                                                <View style={s.segBlock}>
                                                    <Text style={[s.segCode, { color: textColor }]}>{itemStr}</Text>
                                                    <Text style={[s.segName, { color: subtextColor }]}>SKU Detail</Text>
                                                </View>
                                                <View style={s.segBlock}>
                                                    <Text style={[s.segCode, { color: textColor }]}>{instStr}</Text>
                                                    <Text style={[s.segName, { color: subtextColor }]}>Instance</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Hierarchy Reset Rule Info */}
                                        <View style={s.infoNoteRow}>
                                            <PlatformIcon name="arrow.triangle.2.circlepath" size={13} tintColor="#007AFF" />
                                            <Text style={[s.infoNoteText, { color: subtextColor }]}>
                                                Category and Subcategory sequences reset inside their parent hierarchy.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </GlassView>
                        );
                    })}
                </View>
            </View>

            {/* ============================================================ */}
            {/* SECTION 2 — Transaction Codes */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Transaction Codes
                </Text>

                <View style={s.cardsWrapper}>
                    {transactionTypes.map((type) => {
                        const rule = settings.transactionRules[type];
                        const isExpanded = expandedTransaction === type;

                        const now = new Date();
                        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                        const nextYear = new Date(now.getFullYear() + 1, 0, 1);

                        const currentPreview = generateTransactionCodePreview(rule, now, 1);
                        const nextMonthPreview = generateTransactionCodePreview(rule, nextMonth, 2);
                        const nextYearPreview = generateTransactionCodePreview(rule, nextYear, 1);

                        const currentPatternMeta = TRANSACTION_PATTERN_OPTIONS.find(
                            (p) => p.value === rule.pattern
                        ) || TRANSACTION_PATTERN_OPTIONS[0];

                        const currentResetMeta = TRANSACTION_RESET_OPTIONS.find(
                            (r) => r.value === rule.resetRule
                        ) || TRANSACTION_RESET_OPTIONS[0];

                        const patternActions: ContextMenuAction[] = TRANSACTION_PATTERN_OPTIONS.map((item) => ({
                            title: item.label,
                            subtitle: item.example,
                            state: item.value === rule.pattern ? 'on' : 'off',
                        }));

                        const resetActions: ContextMenuAction[] = TRANSACTION_RESET_OPTIONS.map((item) => ({
                            title: item.title,
                            subtitle: item.description,
                            state: item.value === rule.resetRule ? 'on' : 'off',
                        }));

                        return (
                            <GlassView
                                key={type}
                                intensity={isDark ? 10 : 25}
                                style={[
                                    s.card,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.02)'
                                            : 'rgba(255,255,255,0.7)',
                                    },
                                ]}
                            >
                                <TouchableOpacity
                                    style={s.cardHeaderRow}
                                    onPress={() => toggleTransaction(type)}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.cardHeaderTitleCol}>
                                        <Text style={[s.cardTitle, { color: textColor }]}>
                                            {rule.name}
                                        </Text>
                                    </View>

                                    <View style={s.cardHeaderRightCol}>
                                        <View
                                            style={[
                                                s.previewBadge,
                                                { backgroundColor: 'rgba(52,199,89,0.12)' },
                                            ]}
                                        >
                                            <Text style={[s.previewBadgeText, { color: '#34C759' }]}>
                                                {currentPreview}
                                            </Text>
                                        </View>
                                        <PlatformIcon
                                            name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                            size={14}
                                            tintColor={subtextColor}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={s.expandedBody}>
                                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                        {/* Prefix Input */}
                                        <View style={s.formRow}>
                                            <View style={s.formLabelCol}>
                                                <Text style={[s.formLabel, { color: textColor }]}>Prefix</Text>
                                                <Text style={[s.formSublabel, { color: subtextColor }]}>
                                                    Transaction prefix code
                                                </Text>
                                            </View>
                                            <TextInput
                                                style={[
                                                    s.prefixInput,
                                                    {
                                                        color: textColor,
                                                        borderColor: isDark ? '#333' : '#E5E5EA',
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF',
                                                    },
                                                ]}
                                                value={rule.prefix}
                                                onChangeText={(txt) => handleUpdateTransactionPrefix(type, txt)}
                                                maxLength={2}
                                                autoCapitalize="characters"
                                            />
                                        </View>

                                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                        {/* Pattern Selector */}
                                        <ContextMenu
                                            actions={patternActions}
                                            onPress={(e) => handleSelectTransactionPattern(type, e)}
                                            dropdownMenuMode={true}
                                        >
                                            <View style={s.pickerRow}>
                                                <View style={s.formLabelCol}>
                                                    <Text style={[s.formLabel, { color: textColor }]}>
                                                        Number Pattern
                                                    </Text>
                                                    <Text style={[s.formSublabel, { color: subtextColor }]}>
                                                        Year/month and sequential digits
                                                    </Text>
                                                </View>
                                                <View style={s.pickerValueCol}>
                                                    <Text style={[s.pickerValueText, { color: '#007AFF' }]}>
                                                        {currentPatternMeta.value}
                                                    </Text>
                                                    <PlatformIcon
                                                        name="chevron.up.chevron.down"
                                                        size={12}
                                                        tintColor="#007AFF"
                                                    />
                                                </View>
                                            </View>
                                        </ContextMenu>

                                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                        {/* Reset Rule Selector */}
                                        <ContextMenu
                                            actions={resetActions}
                                            onPress={(e) => handleSelectTransactionReset(type, e)}
                                            dropdownMenuMode={true}
                                        >
                                            <View style={s.pickerRow}>
                                                <View style={s.formLabelCol}>
                                                    <Text style={[s.formLabel, { color: textColor }]}>
                                                        Sequence Reset Rule
                                                    </Text>
                                                    <Text style={[s.formSublabel, { color: subtextColor }]}>
                                                        When sequence resets back to 1
                                                    </Text>
                                                </View>
                                                <View style={s.pickerValueCol}>
                                                    <Text style={[s.pickerValueText, { color: '#007AFF' }]}>
                                                        {currentResetMeta.title.replace(' Reset', '')}
                                                    </Text>
                                                    <PlatformIcon
                                                        name="chevron.up.chevron.down"
                                                        size={12}
                                                        tintColor="#007AFF"
                                                    />
                                                </View>
                                            </View>
                                        </ContextMenu>

                                        {/* Live Multi-Period Timeline Preview */}
                                        <View
                                            style={[
                                                s.previewCard,
                                                {
                                                    backgroundColor: isDark
                                                        ? 'rgba(0,122,255,0.06)'
                                                        : 'rgba(0,122,255,0.04)',
                                                    borderColor: isDark
                                                        ? 'rgba(0,122,255,0.18)'
                                                        : 'rgba(0,122,255,0.12)',
                                                },
                                            ]}
                                        >
                                            <Text style={[s.previewCardHeader, { color: textColor }]}>
                                                Sequence Progression Example
                                            </Text>
                                            <View style={s.previewTimeline}>
                                                <View style={s.timelineItem}>
                                                    <Text style={[s.timelineLabel, { color: subtextColor }]}>Month 1</Text>
                                                    <Text style={[s.timelineCode, { color: textColor }]}>{currentPreview}</Text>
                                                </View>
                                                <PlatformIcon name="arrow.right" size={12} tintColor="#007AFF" />
                                                <View style={s.timelineItem}>
                                                    <Text style={[s.timelineLabel, { color: subtextColor }]}>Next Month</Text>
                                                    <Text style={[s.timelineCode, { color: textColor }]}>{nextMonthPreview}</Text>
                                                </View>
                                                <PlatformIcon name="arrow.right" size={12} tintColor="#007AFF" />
                                                <View style={s.timelineItem}>
                                                    <Text style={[s.timelineLabel, { color: subtextColor }]}>Next Year</Text>
                                                    <Text style={[s.timelineCode, { color: '#34C759' }]}>{nextYearPreview}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </GlassView>
                        );
                    })}
                </View>
            </View>

            {/* Safety Caption */}
            <View style={s.captionBox}>
                <PlatformIcon name="checkmark.shield.fill" size={14} tintColor="#34C759" />
                <Text style={[s.captionText, { color: subtextColor }]}>
                    Changes to numbering rules will only apply to future records. Existing historical codes will never be modified.
                </Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 18,
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
        paddingHorizontal: 6,
    },
    cardsWrapper: {
        gap: 10,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    cardHeaderTitleCol: {
        flex: 1,
        gap: 2,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    cardSubtitle: {
        fontSize: 12,
    },
    cardHeaderRightCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    previewBadge: {
        backgroundColor: 'rgba(0,122,255,0.10)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    previewBadgeText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#007AFF',
    },
    expandedBody: {
        paddingBottom: 14,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    formLabelCol: {
        flex: 1,
        gap: 2,
    },
    formLabel: {
        fontSize: 14.5,
        fontWeight: '500',
    },
    formSublabel: {
        fontSize: 12,
    },
    prefixInput: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderRadius: 8,
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        minWidth: 54,
    },
    hierarchyBox: {
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.02)',
        gap: 8,
    },
    hierarchyTitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    hierarchySegmentsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    segBlock: {
        alignItems: 'center',
        gap: 2,
    },
    segCode: {
        fontSize: 14,
        fontWeight: '700',
    },
    segName: {
        fontSize: 10,
    },
    segDash: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
    },
    infoNoteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 8,
    },
    infoNoteText: {
        fontSize: 12,
        lineHeight: 16,
        flex: 1,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    pickerValueCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pickerValueText: {
        fontSize: 14,
        fontWeight: '600',
    },
    previewCard: {
        marginHorizontal: 16,
        marginTop: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 8,
    },
    previewCardHeader: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    previewTimeline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timelineItem: {
        alignItems: 'center',
        gap: 2,
    },
    timelineLabel: {
        fontSize: 10.5,
    },
    timelineCode: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    warningText: {
        fontSize: 12.5,
        lineHeight: 17,
        flex: 1,
        fontWeight: '500',
    },
    captionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        gap: 8,
        marginTop: 4,
    },
    captionText: {
        fontSize: 12,
        lineHeight: 16,
        flex: 1,
    },
});
