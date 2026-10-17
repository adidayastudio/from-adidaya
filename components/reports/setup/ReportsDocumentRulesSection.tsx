import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    TouchableOpacity,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    ReportsDocumentRulesSettings,
    ReportsGeneralSettings,
    generateReportDocCodePreview,
    generateReportFilenamePreview,
} from '@/lib/api/reportsSetup';
import { ReportsCodeTemplateSheet } from './ReportsCodeTemplateSheet';
import { ReportsFilenameTemplateSheet } from './ReportsFilenameTemplateSheet';
import { ReportsStartingNumberSheet } from './ReportsStartingNumberSheet';

interface ReportsDocumentRulesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    rules: ReportsDocumentRulesSettings;
    generalSettings?: ReportsGeneralSettings;
    onUpdateRules: (newRules: ReportsDocumentRulesSettings) => void;
}

const NUMBERING_SCOPE_OPTIONS = [
    { value: 'per_report_type', label: 'Per Report Type' },
    { value: 'workspace_wide', label: 'Workspace-wide' },
];

const SEQUENCE_LENGTH_OPTIONS = [
    { value: 3, label: '3 Digits (001)' },
    { value: 4, label: '4 Digits (0001)' },
    { value: 5, label: '5 Digits (00001)' },
    { value: 6, label: '6 Digits (000001)' },
];

const SEQUENCE_RESET_OPTIONS = [
    { value: 'never', label: 'Never', subtitle: 'Continuous increment without reset' },
    { value: 'annually', label: 'Annually', subtitle: 'Resets every January 1' },
    { value: 'monthly', label: 'Monthly', subtitle: 'Resets on the 1st of every month' },
    { value: 'daily', label: 'Daily', subtitle: 'Resets every day at 00:00' },
];

const REVISION_OPTIONS = [
    { value: 'off', label: 'Off', subtitle: 'Standard sequential code only' },
    { value: 'numeric', label: 'Numeric', subtitle: 'R0, R1, R2...' },
    { value: 'alphabetic', label: 'Alphabetic', subtitle: 'Rev A, Rev B, Rev C...' },
    { value: 'version', label: 'Version', subtitle: 'v1.0, v1.1, v2.0...' },
];

export function ReportsDocumentRulesSection({
    isDark,
    textColor,
    subtextColor,
    rules,
    generalSettings,
    onUpdateRules,
}: ReportsDocumentRulesSectionProps) {
    const [codeSheetVisible, setCodeSheetVisible] = useState(false);
    const [filenameSheetVisible, setFilenameSheetVisible] = useState(false);
    const [startingNumSheetVisible, setStartingNumSheetVisible] = useState(false);

    const chevronColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';

    // Live previews
    const nextDocCodePreview = generateReportDocCodePreview(rules);
    const filenamePreview = generateReportFilenamePreview(rules, generalSettings, 'Maintenance', 'Sep-2026', nextDocCodePreview);

    // ContextMenu actions
    const scopeActions: ContextMenuAction[] = useMemo(() => {
        return NUMBERING_SCOPE_OPTIONS.map((item) => ({
            title: item.label,
            state: item.value === rules.numberingScope ? 'on' : 'off',
        }));
    }, [rules.numberingScope]);

    const lengthActions: ContextMenuAction[] = useMemo(() => {
        return SEQUENCE_LENGTH_OPTIONS.map((item) => ({
            title: item.label,
            state: item.value === rules.sequenceLength ? 'on' : 'off',
        }));
    }, [rules.sequenceLength]);

    const resetActions: ContextMenuAction[] = useMemo(() => {
        return SEQUENCE_RESET_OPTIONS.map((item) => ({
            title: item.label,
            subtitle: item.subtitle,
            state: item.value === rules.sequenceReset ? 'on' : 'off',
        }));
    }, [rules.sequenceReset]);

    const revisionActions: ContextMenuAction[] = useMemo(() => {
        return REVISION_OPTIONS.map((item) => ({
            title: item.label,
            subtitle: item.subtitle,
            state: item.value === rules.revisionNumbering ? 'on' : 'off',
        }));
    }, [rules.revisionNumbering]);

    const dividerStyle = [
        s.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
    ];

    const currentResetMeta = SEQUENCE_RESET_OPTIONS.find((r) => r.value === rules.sequenceReset) || SEQUENCE_RESET_OPTIONS[1];
    const currentScopeMeta = NUMBERING_SCOPE_OPTIONS.find((s) => s.value === rules.numberingScope) || NUMBERING_SCOPE_OPTIONS[0];
    const currentLengthMeta = SEQUENCE_LENGTH_OPTIONS.find((l) => l.value === rules.sequenceLength) || SEQUENCE_LENGTH_OPTIONS[1];
    const currentRevMeta = REVISION_OPTIONS.find((r) => r.value === rules.revisionNumbering) || REVISION_OPTIONS[0];

    return (
        <View style={s.container}>
            {/* SECTION 1 — Document Numbering */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Document Numbering
                </Text>

                <GlassView
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
                    {/* Numbering Scope */}
                    <ContextMenu
                        actions={scopeActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const idx = e.nativeEvent.index;
                            const item = NUMBERING_SCOPE_OPTIONS[idx] || NUMBERING_SCOPE_OPTIONS[0];
                            onUpdateRules({ ...rules, numberingScope: item.value as any });
                        }}
                    >
                        <View style={s.rowButton}>
                            <Text style={[s.settingTitle, { color: textColor }]}>Numbering Scope</Text>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: subtextColor }]}>
                                    {currentScopeMeta.label}
                                </Text>
                                <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={chevronColor} />
                            </View>
                        </View>
                    </ContextMenu>

                    <View style={dividerStyle} />

                    {/* Code Template (Stacked with full-width line & inline preview) */}
                    <TouchableOpacity
                        style={s.stackedRowButton}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setCodeSheetVisible(true);
                        }}
                    >
                        <View style={s.stackedHeaderRow}>
                            <Text style={[s.settingTitle, { color: textColor }]}>Code Template</Text>
                            <PlatformIcon name="chevron.right" size={14} tintColor={chevronColor} />
                        </View>
                        
                        <View style={[s.patternBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            <Text style={[s.patternText, { color: textColor }]}>
                                {rules.codeTemplate}
                            </Text>
                        </View>

                        <Text style={[s.previewSubtext, { color: subtextColor }]}>
                            Preview: <Text style={{ color: textColor, fontWeight: '500' }}>{nextDocCodePreview}</Text>
                        </Text>
                    </TouchableOpacity>
                </GlassView>
            </View>

            {/* SECTION 2 — Sequence */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Sequence
                </Text>

                <GlassView
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
                    {/* Sequence Length */}
                    <ContextMenu
                        actions={lengthActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const idx = e.nativeEvent.index;
                            const item = SEQUENCE_LENGTH_OPTIONS[idx] || SEQUENCE_LENGTH_OPTIONS[1];
                            onUpdateRules({ ...rules, sequenceLength: item.value });
                        }}
                    >
                        <View style={s.rowButton}>
                            <Text style={[s.settingTitle, { color: textColor }]}>Sequence Length</Text>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: subtextColor }]}>
                                    {currentLengthMeta.label}
                                </Text>
                                <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={chevronColor} />
                            </View>
                        </View>
                    </ContextMenu>

                    <View style={dividerStyle} />

                    {/* Starting Number */}
                    <TouchableOpacity
                        style={s.rowButton}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setStartingNumSheetVisible(true);
                        }}
                    >
                        <Text style={[s.settingTitle, { color: textColor }]}>Starting Number</Text>
                        <View style={s.valueCol}>
                            <Text style={[s.valueText, { color: subtextColor }]}>
                                {rules.startingNumber}
                            </Text>
                            <PlatformIcon name="chevron.right" size={14} tintColor={chevronColor} />
                        </View>
                    </TouchableOpacity>

                    <View style={dividerStyle} />

                    {/* Sequence Reset */}
                    <ContextMenu
                        actions={resetActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const idx = e.nativeEvent.index;
                            const item = SEQUENCE_RESET_OPTIONS[idx] || SEQUENCE_RESET_OPTIONS[1];
                            onUpdateRules({ ...rules, sequenceReset: item.value as any });
                        }}
                    >
                        <View style={s.rowButton}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={[s.settingTitle, { color: textColor }]}>Reset Cycle</Text>
                                {!!currentResetMeta.subtitle && (
                                    <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                        {currentResetMeta.subtitle}
                                    </Text>
                                )}
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: subtextColor }]}>
                                    {currentResetMeta.label}
                                </Text>
                                <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={chevronColor} />
                            </View>
                        </View>
                    </ContextMenu>
                </GlassView>
            </View>

            {/* SECTION 3 — File Naming */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    File Naming
                </Text>

                <GlassView
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
                    {/* Filename Template (Stacked with full-width line & clean preview) */}
                    <TouchableOpacity
                        style={s.stackedRowButton}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setFilenameSheetVisible(true);
                        }}
                    >
                        <View style={s.stackedHeaderRow}>
                            <Text style={[s.settingTitle, { color: textColor }]}>Filename Template</Text>
                            <PlatformIcon name="chevron.right" size={14} tintColor={chevronColor} />
                        </View>

                        <View style={[s.patternBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            <Text style={[s.patternText, { color: textColor }]}>
                                {rules.filenameTemplate}
                            </Text>
                        </View>

                        <Text style={[s.previewSubtext, { color: subtextColor }]} numberOfLines={2}>
                            Preview: <Text style={{ color: textColor, fontWeight: '500' }}>{filenamePreview}</Text>
                        </Text>
                    </TouchableOpacity>
                </GlassView>
            </View>

            {/* SECTION 4 — Revision */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Revision
                </Text>

                <GlassView
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
                    {/* Revision Numbering */}
                    <ContextMenu
                        actions={revisionActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const idx = e.nativeEvent.index;
                            const item = REVISION_OPTIONS[idx] || REVISION_OPTIONS[0];
                            onUpdateRules({ ...rules, revisionNumbering: item.value as any });
                        }}
                    >
                        <View style={s.rowButton}>
                            <Text style={[s.settingTitle, { color: textColor }]}>Revision Numbering</Text>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: subtextColor }]}>
                                    {currentRevMeta.label}
                                </Text>
                                <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={chevronColor} />
                            </View>
                        </View>
                    </ContextMenu>

                    {rules.revisionNumbering !== 'off' && (
                        <>
                            <View style={dividerStyle} />
                            <View style={s.rowButton}>
                                <Text style={[s.settingTitle, { color: textColor }]}>Revision Suffix Sample</Text>
                                <Text style={[s.previewValue, { color: subtextColor }]}>
                                    {rules.revisionNumbering === 'numeric'
                                        ? '-R1'
                                        : rules.revisionNumbering === 'alphabetic'
                                        ? '-Rev A'
                                        : '-v1.0'}
                                </Text>
                            </View>
                        </>
                    )}
                </GlassView>
            </View>

            {/* Token & Value Editor Sheets */}
            <ReportsCodeTemplateSheet
                visible={codeSheetVisible}
                isDark={isDark}
                textColor={textColor}
                subtextColor={subtextColor}
                rules={rules}
                onClose={() => setCodeSheetVisible(false)}
                onSave={(newTemplate) => onUpdateRules({ ...rules, codeTemplate: newTemplate })}
            />

            <ReportsFilenameTemplateSheet
                visible={filenameSheetVisible}
                isDark={isDark}
                textColor={textColor}
                subtextColor={subtextColor}
                rules={rules}
                generalSettings={generalSettings}
                onClose={() => setFilenameSheetVisible(false)}
                onSave={(newTemplate) => onUpdateRules({ ...rules, filenameTemplate: newTemplate })}
            />

            <ReportsStartingNumberSheet
                visible={startingNumSheetVisible}
                isDark={isDark}
                textColor={textColor}
                subtextColor={subtextColor}
                currentValue={rules.startingNumber}
                onClose={() => setStartingNumSheetVisible(false)}
                onSave={(newNum) => onUpdateRules({ ...rules, startingNumber: newNum })}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    rowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    stackedRowButton: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 8,
    },
    stackedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    patternBox: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    patternText: {
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '500',
    },
    previewSubtext: {
        fontSize: 12,
        marginTop: 2,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: -0.2,
    },
    settingSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    valueCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    valueText: {
        fontSize: 15,
        fontWeight: '400',
    },
    previewValue: {
        fontSize: 15,
        fontWeight: '400',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
