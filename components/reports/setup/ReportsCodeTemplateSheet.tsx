import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    CODE_TEMPLATE_TOKENS,
    ReportsDocumentRulesSettings,
    generateReportDocCodePreview,
} from '@/lib/api/reportsSetup';

interface ReportsCodeTemplateSheetProps {
    visible: boolean;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    rules: ReportsDocumentRulesSettings;
    onClose: () => void;
    onSave: (newTemplate: string) => void;
}

export function ReportsCodeTemplateSheet({
    visible,
    isDark,
    textColor,
    subtextColor,
    rules,
    onClose,
    onSave,
}: ReportsCodeTemplateSheetProps) {
    const insets = useSafeAreaInsets();
    const [template, setTemplate] = useState(rules.codeTemplate);

    // Live preview
    const preview = generateReportDocCodePreview({
        ...rules,
        codeTemplate: template,
    });

    const handleInsertToken = (token: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTemplate((prev) => (prev ? `${prev}-${token}` : token));
    };

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(template);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.sheetWrapper}
                >
                    <GlassView
                        intensity={isDark ? 30 : 60}
                        style={[
                            styles.sheetContainer,
                            {
                                backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(242,242,247,0.92)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                paddingBottom: Math.max(insets.bottom, 16),
                            },
                        ]}
                    >
                        {/* Grabber Handle */}
                        <View style={styles.handleContainer}>
                            <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }]} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: textColor }]}>Code Template</Text>
                            <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                                <Text style={styles.doneText}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.scrollArea}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Live Preview Box */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Preview</Text>
                                <GlassView
                                    intensity={isDark ? 15 : 25}
                                    style={[
                                        styles.previewCard,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)' },
                                    ]}
                                >
                                    <Text style={[styles.previewCode, { color: textColor }]}>{preview}</Text>
                                    <Text style={[styles.previewSub, { color: subtextColor }]}>Generated sample document number</Text>
                                </GlassView>
                            </View>

                            {/* Template Input */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Code Pattern</Text>
                                <View
                                    style={[
                                        styles.inputBox,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
                                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                        },
                                    ]}
                                >
                                    <TextInput
                                        style={[styles.input, { color: textColor }]}
                                        value={template}
                                        onChangeText={setTemplate}
                                        placeholder="[REPORT]-[TENANT]-[YY]-[SEQ]"
                                        placeholderTextColor={subtextColor}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                    />
                                    {template.length > 0 && (
                                        <TouchableOpacity onPress={() => setTemplate('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                            <PlatformIcon name="xmark.circle.fill" size={16} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Available Tokens */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Available Tokens (Tap to insert)</Text>
                                <View style={styles.chipsWrap}>
                                    {CODE_TEMPLATE_TOKENS.map((item) => (
                                        <TouchableOpacity
                                            key={item.token}
                                            style={[
                                                styles.chip,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
                                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                                },
                                            ]}
                                            onPress={() => handleInsertToken(item.token)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.chipToken, { color: textColor }]}>{item.token}</Text>
                                            <Text style={[styles.chipLabel, { color: subtextColor }]}>{item.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </GlassView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheetWrapper: {
        maxHeight: '85%',
        height: '85%',
    },
    sheetContainer: {
        flex: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    grabber: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerBtn: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    cancelText: {
        fontSize: 16,
        color: '#007AFF',
    },
    doneText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 18,
    },
    block: {
        gap: 8,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 4,
        letterSpacing: -0.1,
    },
    previewCard: {
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    previewCode: {
        fontSize: 22,
        fontWeight: '600',
        letterSpacing: 0.5,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    previewSub: {
        fontSize: 12,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        gap: 2,
    },
    chipToken: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    chipLabel: {
        fontSize: 11,
    },
});
