import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
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
    frame,
    background,
    ignoreSafeArea,
    tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    FinanceNotificationTemplate,
    FINANCE_TEMPLATE_VARIABLES,
    DEFAULT_FINANCE_TEMPLATES,
    interpolateFinanceTemplate,
} from '@/lib/api/financeSetup';

export interface FinanceTemplateEditSheetProps {
    visible: boolean;
    onClose: () => void;
    template: FinanceNotificationTemplate | null;
    onSave: (updated: FinanceNotificationTemplate) => void;
}

export function FinanceTemplateEditSheet({
    visible,
    onClose,
    template,
    onSave,
}: FinanceTemplateEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    const [titleTemplate, setTitleTemplate] = useState('');
    const [bodyTemplate, setBodyTemplate] = useState('');

    useEffect(() => {
        if (visible && template) {
            setTitleTemplate(template.titleTemplate || '');
            setBodyTemplate(template.bodyTemplate || '');
        }
    }, [visible, template]);

    const previewTitle = useMemo(() => {
        return interpolateFinanceTemplate(titleTemplate);
    }, [titleTemplate]);

    const previewBody = useMemo(() => {
        return interpolateFinanceTemplate(bodyTemplate);
    }, [bodyTemplate]);

    const handleInsertVariableToBody = (tag: string) => {
        Haptics.selectionAsync();
        setBodyTemplate((prev) => (prev ? `${prev} ${tag}` : tag));
    };

    const handleResetToDefault = () => {
        if (!template) return;
        const defaultTpl = DEFAULT_FINANCE_TEMPLATES[template.id] || DEFAULT_FINANCE_TEMPLATES[template.eventKey];
        if (defaultTpl) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setTitleTemplate(defaultTpl.titleTemplate);
            setBodyTemplate(defaultTpl.bodyTemplate);
        }
    };

    const handleSave = () => {
        if (!template) return;
        if (!titleTemplate.trim() || !bodyTemplate.trim()) {
            Alert.alert('Validation Error', 'Title and message body templates cannot be blank.');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated: FinanceNotificationTemplate = {
            ...template,
            titleTemplate: titleTemplate.trim(),
            bodyTemplate: bodyTemplate.trim(),
        };

        onSave(updated);
        onClose();
    };

    if (!template) return null;

    const fullPreviewTitle = `🔔 ${previewTitle || 'Notification Title Preview'}`;

    return (
        <Host
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                pointerEvents: visible ? 'auto' : 'none',
            }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
                presentationDetents={[0.88, 0.96]}
                presentationDragIndicator="hidden"
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        background('clear'),
                        ignoreSafeArea({ regions: 'all', edges: 'bottom' }),
                        frame({ maxWidth: 9999, maxHeight: 9999 }),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, trailing: 20, bottom: 12 }),
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
                            <SwiftUIText size={16} color={subtextColor}>
                                Cancel
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <VStack alignment="center" spacing={2}>
                            <SwiftUIText size={17} weight="bold" color={textColor}>
                                {template.name}
                            </SwiftUIText>
                            <SwiftUIText size={11} color={subtextColor}>
                                Notification Template
                            </SwiftUIText>
                        </VStack>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={handleSave}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Form */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Live Preview Card */}
                        <Section title="Live Preview">
                            <VStack alignment="leading" spacing={6} modifiers={[padding({ vertical: 4 })]}>
                                <HStack alignment="center" spacing={6}>
                                    <SwiftUIText size={15} weight="bold" color={textColor}>
                                        {fullPreviewTitle}
                                    </SwiftUIText>
                                </HStack>
                                <SwiftUIText size={13} color={subtextColor}>
                                    {previewBody || 'Message body preview will appear here.'}
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Template Content Editor */}
                        <Section title="Notification Content">
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 2 })]}>
                                <SwiftUIText size={12} color={subtextColor}>
                                    Title Template
                                </SwiftUIText>
                                <TextField
                                    defaultValue={titleTemplate}
                                    onChangeText={(val: string) => setTitleTemplate(val)}
                                    placeholder="e.g. Approval Required: {{document_type}} {{document_number}}"
                                    modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                />
                            </VStack>

                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={12} color={subtextColor}>
                                    Message Body
                                </SwiftUIText>
                                <TextField
                                    defaultValue={bodyTemplate}
                                    onChangeText={(val: string) => setBodyTemplate(val)}
                                    placeholder="Enter message template..."
                                    modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                />
                            </VStack>
                        </Section>

                        {/* Insertable Variables */}
                        <Section title="Available Variables">
                            {FINANCE_TEMPLATE_VARIABLES.map((v) => (
                                <Button
                                    key={v.tag}
                                    variant="plain"
                                    onPress={() => handleInsertVariableToBody(v.tag)}
                                >
                                    <HStack alignment="center">
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                                {v.tag}
                                            </SwiftUIText>
                                            <SwiftUIText size={11} color={subtextColor}>
                                                {v.description}
                                            </SwiftUIText>
                                        </VStack>
                                        <Spacer />
                                        <SwiftUIText size={12} color={subtextColor}>
                                            Insert +
                                        </SwiftUIText>
                                    </HStack>
                                </Button>
                            ))}
                        </Section>

                        {/* Reset to Default Action */}
                        <Section>
                            <Button
                                variant="plain"
                                onPress={handleResetToDefault}
                            >
                                <SwiftUIText size={15} color="#FF3B30">
                                    Reset to Default Template
                                </SwiftUIText>
                            </Button>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
