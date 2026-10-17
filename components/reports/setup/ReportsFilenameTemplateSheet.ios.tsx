import React, { useState, useEffect } from 'react';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    TextField,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    frame,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    FILENAME_TEMPLATE_TOKENS,
    ReportsDocumentRulesSettings,
    ReportsGeneralSettings,
    generateReportFilenamePreview,
} from '@/lib/api/reportsSetup';

interface ReportsFilenameTemplateSheetProps {
    visible: boolean;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    rules: ReportsDocumentRulesSettings;
    generalSettings?: ReportsGeneralSettings;
    onClose: () => void;
    onSave: (newTemplate: string) => void;
}

export function ReportsFilenameTemplateSheet({
    visible,
    rules,
    generalSettings,
    onClose,
    onSave,
}: ReportsFilenameTemplateSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    const [template, setTemplate] = useState(rules.filenameTemplate);

    useEffect(() => {
        if (visible) {
            setTemplate(rules.filenameTemplate);
        }
    }, [visible, rules.filenameTemplate]);

    // Live preview calculation
    const preview = generateReportFilenamePreview(
        {
            ...rules,
            filenameTemplate: template,
        },
        generalSettings
    );

    const handleInsertToken = (token: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTemplate((prev) => (prev ? `${prev}_${token}` : token));
    };

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(template);
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                    ]}
                >
                    {/* Header Bar */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} color="#007AFF">
                                Cancel
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            Filename Template
                        </SwiftUIText>

                        <Spacer />

                        <Button variant="plain" onPress={handleSave}>
                            <SwiftUIText size={16} weight="bold" color="#007AFF">
                                Done
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Form */}
                    <Form modifiers={[background('clear')]}>
                        <Section title="Preview">
                            <SwiftUIText size={15} weight="medium" design="monospaced" color={textColor}>
                                {preview}
                            </SwiftUIText>
                        </Section>

                        <Section title="Filename Pattern">
                            <TextField
                                key={`fn-tmpl-${template}`}
                                defaultValue={template}
                                onChangeText={setTemplate}
                                placeholder="[REPORT_NAME]_[PERIOD]_[DOC_NO]"
                            />
                        </Section>

                        <Section title="Available Tokens (Tap to insert)">
                            {FILENAME_TEMPLATE_TOKENS.map((item) => (
                                <HStack key={item.token} alignment="center">
                                    <VStack alignment="leading" spacing={2}>
                                        <SwiftUIText size={15} weight="medium" design="monospaced" color={textColor}>
                                            {item.token}
                                        </SwiftUIText>
                                        <SwiftUIText size={12} color={subtextColor}>
                                            {item.label}
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                    <Button
                                        variant="bordered"
                                        onPress={() => handleInsertToken(item.token)}
                                    >
                                        <SwiftUIText size={13} weight="semibold" color="#007AFF">
                                            Insert
                                        </SwiftUIText>
                                    </Button>
                                </HStack>
                            ))}
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
