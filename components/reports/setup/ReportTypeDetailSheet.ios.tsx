import React, { useState } from 'react';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    TextField,
    Picker,
    Switch,
    Image,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    frame,
    foregroundColor,
    cornerRadius,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ReportType, ActivityTemplate } from '../types';
import { NOTION_COLORS, NOTION_ICONS } from './CategoryDetailSheet';

export interface ReportTypeDetailSheetProps {
    visible: boolean;
    reportType: ReportType | null;
    onClose: () => void;
    onSave?: (updated: ReportType) => void;
    onSelectActivity?: (activity: ActivityTemplate) => void;
    onAddActivity?: (reportTypeId: string) => void;
}

const CATEGORY_OPTIONS = [
    'Facility & Operations',
    'Housekeeping',
    'HSE & Safety',
    'General',
    'Construction',
    'Custom'
];

const SUMMARY_CYCLES = ['Daily', 'Weekly', 'Biweekly', 'Monthly'];
const DOC_FORMATS = ['Standard PDF Summary', 'Excel Spreadsheet'];

export const COLOR_GRADIENTS: Record<string, [string, string]> = {
    '#10B981': ['#34D399', '#059669'], // Emerald
    '#14B8A6': ['#2DD4BF', '#0F766E'], // Teal
    '#0284C7': ['#38BDF8', '#0369A1'], // Sky Blue
    '#06B6D4': ['#22D3EE', '#0891B2'], // Cyan
    '#F59E0B': ['#FBBF24', '#D97706'], // Amber
    '#6366F1': ['#818CF8', '#4338CA'], // Indigo
    '#8B5CF6': ['#A78BFA', '#6D28D9'], // Purple
    '#EC4899': ['#F472B6', '#BE185D'], // Pink
    '#F43F5E': ['#FB7185', '#E11D48'], // Rose
    '#64748B': ['#94A3B8', '#475569'], // Slate
    '#0EA5E9': ['#38BDF8', '#0284C7'], // Ocean
};

export function getTwoToneGradient(color: string, colorEnd?: string): [string, string] {
    if (color && COLOR_GRADIENTS[color]) {
        return COLOR_GRADIENTS[color];
    }
    if (colorEnd && colorEnd !== color) {
        return [color, colorEnd];
    }
    return [color || '#007AFF', colorEnd || color || '#0051A8'];
}

export function ReportTypeDetailSheet({
    visible,
    reportType,
    onClose,
    onSave,
    onSelectActivity,
    onAddActivity,
}: ReportTypeDetailSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    // Editable fields synced immediately with active report type
    const [editingReportTypeId, setEditingReportTypeId] = useState<string | null>(null);
    const [name, setName] = useState(reportType?.name || '');
    const [prefixCode, setPrefixCode] = useState(
        reportType?.codePrefix || (reportType?.id === 'rep_maintenance' ? 'MNT' : reportType?.id === 'rep_cleaning' ? 'CLN' : reportType?.id === 'rep_energy' ? 'NRG' : reportType?.id === 'rep_sanitation' ? 'SAN' : reportType?.id === 'rep_hse_audit' ? 'HSE' : 'REP')
    );
    const [categoryIndex, setCategoryIndex] = useState(
        reportType ? Math.max(0, CATEGORY_OPTIONS.indexOf(reportType.category)) : 0
    );
    const [selectedIcon, setSelectedIcon] = useState(reportType?.icon || 'doc.text.fill');
    const [selectedColor, setSelectedColor] = useState(reportType?.color || '#10B981');
    const [description, setDescription] = useState(reportType?.shortDescription || '');
    const [cycleIndex, setCycleIndex] = useState(1); // Weekly
    const [formatIndex, setFormatIndex] = useState(0);
    const [autoGenerate, setAutoGenerate] = useState(true);

    if (reportType && reportType.id !== editingReportTypeId) {
        setEditingReportTypeId(reportType.id);
        setName(reportType.name || '');
        const defaultPrefix = reportType.codePrefix || (reportType.id === 'rep_maintenance' ? 'MNT' : reportType.id === 'rep_cleaning' ? 'CLN' : reportType.id === 'rep_energy' ? 'NRG' : reportType.id === 'rep_sanitation' ? 'SAN' : reportType.id === 'rep_hse_audit' ? 'HSE' : 'REP');
        setPrefixCode(defaultPrefix);
        const cIdx = CATEGORY_OPTIONS.indexOf(reportType.category);
        setCategoryIndex(cIdx >= 0 ? cIdx : 0);
        setSelectedIcon(reportType.icon || 'doc.text.fill');
        setSelectedColor(reportType.color || '#10B981');
        setDescription(reportType.shortDescription || '');
        setCycleIndex(1);
        setFormatIndex(0);
        setAutoGenerate(true);
    }

    const handleSave = () => {
        if (!reportType) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const gradient = getTwoToneGradient(selectedColor);
        const updated: ReportType = {
            ...reportType,
            name: name.trim() || reportType.name,
            category: CATEGORY_OPTIONS[categoryIndex] || reportType.category,
            codePrefix: prefixCode.trim().toUpperCase() || 'REP',
            icon: selectedIcon,
            color: selectedColor,
            colorEnd: gradient[1],
            shortDescription: description.trim(),
        };
        if (onSave) {
            onSave(updated);
        }
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible && !!reportType}
                presentationDetents={[0.88]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                {reportType ? (
                    <VStack
                        spacing={0}
                        modifiers={[
                            ignoreSafeArea({ edges: 'bottom' }),
                            background('clear'),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        {/* Header */}
                        <HStack
                            alignment="center"
                            modifiers={[
                                padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                                frame({ maxWidth: 9999 }),
                                background('clear'),
                            ]}
                        >
                            <Button
                                variant="plain"
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                }}
                                modifiers={[foregroundColor(subtextColor)]}
                            >
                                <SwiftUIText size={17} color={subtextColor}>Cancel</SwiftUIText>
                            </Button>
                            <Spacer />
                            <SwiftUIText size={17} weight="bold" color={textColor}>
                                Report Type Template
                            </SwiftUIText>
                            <Spacer />
                            <Button
                                variant="plain"
                                onPress={handleSave}
                                modifiers={[foregroundColor('#007AFF')]}
                            >
                                <SwiftUIText size={17} weight="bold" color="#007AFF">Save</SwiftUIText>
                            </Button>
                        </HStack>

                        <Form modifiers={[frame({ maxWidth: 9999 }), background('clear')]}>
                            {/* Section 1: Hero Preview */}
                            <Section>
                                <HStack alignment="center" modifiers={[padding({ top: 4, bottom: 4 })]}>
                                    <VStack
                                        alignment="center"
                                        modifiers={[
                                            background(`${selectedColor}22`),
                                            cornerRadius(16),
                                            padding({ all: 10 }),
                                            frame({ width: 52, height: 52 }),
                                        ]}
                                    >
                                        <Image systemName={selectedIcon as any} size={28} color={selectedColor} />
                                    </VStack>
                                    <Spacer />
                                    <VStack spacing={3} alignment="leading">
                                        <SwiftUIText size={16} weight="bold" color={textColor}>
                                            {name.trim() || 'Report Type Name'}
                                        </SwiftUIText>
                                        <SwiftUIText size={12} color={selectedColor} weight="bold">
                                            {`${prefixCode ? prefixCode.toUpperCase() : 'REP'} • ${CATEGORY_OPTIONS[categoryIndex]}`}
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                </HStack>
                            </Section>

                            {/* Section 2: Report Category & Identity */}
                            <Section
                                title="Report Category & Identity"
                            >
                                <Picker
                                    label="Category"
                                    selectedIndex={categoryIndex}
                                    options={CATEGORY_OPTIONS}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.selectionAsync();
                                        setCategoryIndex(index);
                                    }}
                                    variant="menu"
                                />
                                <TextField
                                    key={`rt-name-${reportType.id}-${reportType.name}`}
                                    defaultValue={name}
                                    onChangeText={setName}
                                    placeholder="Template Name"
                                />
                                <TextField
                                    key={`rt-prefix-${reportType.id}-${prefixCode}`}
                                    defaultValue={prefixCode}
                                    onChangeText={(val) => setPrefixCode(val.toUpperCase().slice(0, 4))}
                                    placeholder="Prefix Code (e.g. MNT, CLN)"
                                />
                            </Section>

                            {/* Section 3: Theme Color Palette */}
                            <Section title="Theme Color Palette">
                                <HStack alignment="center" modifiers={[padding({ top: 4, bottom: 4 })]}>
                                    {NOTION_COLORS.slice(0, 5).map((col) => (
                                        <React.Fragment key={col}>
                                            <Button
                                                variant="plain"
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setSelectedColor(col);
                                                }}
                                            >
                                                <Image
                                                    systemName={selectedColor === col ? 'checkmark.circle.fill' : 'circle.fill'}
                                                    size={28}
                                                    color={col}
                                                />
                                            </Button>
                                            <Spacer />
                                        </React.Fragment>
                                    ))}
                                </HStack>
                                <HStack alignment="center" modifiers={[padding({ top: 4, bottom: 4 })]}>
                                    {NOTION_COLORS.slice(5, 10).map((col) => (
                                        <React.Fragment key={col}>
                                            <Button
                                                variant="plain"
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setSelectedColor(col);
                                                }}
                                            >
                                                <Image
                                                    systemName={selectedColor === col ? 'checkmark.circle.fill' : 'circle.fill'}
                                                    size={28}
                                                    color={col}
                                                />
                                            </Button>
                                            <Spacer />
                                        </React.Fragment>
                                    ))}
                                </HStack>
                            </Section>

                            {/* Section 4: Icon Library */}
                            <Section
                                title="Icon Library"
                            >
                                {[0, 6, 12, 18, 24, 30].map((startIndex) => (
                                    <HStack key={startIndex} alignment="center" modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        {NOTION_ICONS.slice(startIndex, startIndex + 6).map((iconSym) => (
                                            <React.Fragment key={iconSym}>
                                                <Button
                                                    variant="plain"
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setSelectedIcon(iconSym);
                                                    }}
                                                >
                                                    <VStack
                                                        alignment="center"
                                                        modifiers={[
                                                            padding({ all: 7 }),
                                                            background(selectedIcon === iconSym ? `${selectedColor}25` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')),
                                                            cornerRadius(10),
                                                            frame({ width: 42, height: 42 }),
                                                        ]}
                                                    >
                                                        <Image
                                                            systemName={iconSym as any}
                                                            size={20}
                                                            color={selectedIcon === iconSym ? selectedColor : (isDark ? '#E5E5EA' : '#3C3C43')}
                                                        />
                                                    </VStack>
                                                </Button>
                                                <Spacer />
                                            </React.Fragment>
                                        ))}
                                    </HStack>
                                ))}
                            </Section>

                            {/* Section 5: Reporting & Document Defaults */}
                            <Section title="Reporting & Document Defaults">
                                <Picker
                                    label="Summary Cycle"
                                    selectedIndex={cycleIndex}
                                    options={SUMMARY_CYCLES}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.selectionAsync();
                                        setCycleIndex(index);
                                    }}
                                    variant="menu"
                                />
                                <Picker
                                    label="Document Format"
                                    selectedIndex={formatIndex}
                                    options={DOC_FORMATS}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.selectionAsync();
                                        setFormatIndex(index);
                                    }}
                                    variant="menu"
                                />
                                <Switch
                                    value={autoGenerate}
                                    onValueChange={setAutoGenerate}
                                    label="Auto-Generate Periodic Summary"
                                />
                            </Section>

                            {/* Section 6: Associated Activities */}
                            <Section
                                title={`Configured Activities (${reportType.activities.length})`}
                            >
                                {reportType.activities.map((act) => (
                                    <HStack key={act.id} alignment="center" modifiers={[padding({ top: 4, bottom: 4 })]}>
                                        <VStack spacing={2} alignment="leading">
                                            <SwiftUIText weight="semibold" color={textColor}>
                                                {act.name}
                                            </SwiftUIText>
                                            <SwiftUIText size={12} color={subtextColor}>
                                                {`${act.frequency} • ${act.fields.length} form fields`}
                                            </SwiftUIText>
                                        </VStack>
                                        <Spacer />
                                        <Button
                                            variant="plain"
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                if (onSelectActivity) {
                                                    onSelectActivity(act);
                                                }
                                            }}
                                            modifiers={[foregroundColor('#007AFF')]}
                                        >
                                            <SwiftUIText size={14} color="#007AFF">Edit Form</SwiftUIText>
                                        </Button>
                                    </HStack>
                                ))}

                                {onAddActivity && (
                                    <Button
                                        variant="plain"
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onAddActivity(reportType.id);
                                        }}
                                        modifiers={[foregroundColor('#007AFF')]}
                                    >
                                        <SwiftUIText weight="bold" color="#007AFF">+ Add Activity Routine</SwiftUIText>
                                    </Button>
                                )}
                            </Section>
                        </Form>
                    </VStack>
                ) : (
                    <VStack spacing={0} modifiers={[frame({ width: 0, height: 0 })]}>
                        <SwiftUIText color="clear"> </SwiftUIText>
                    </VStack>
                )}
            </BottomSheet>
        </Host>
    );
}

export const ReportTypeDetailSheetIOS = ReportTypeDetailSheet;
