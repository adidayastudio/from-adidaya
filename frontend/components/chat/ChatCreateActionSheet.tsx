import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import { FormaBlue } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface ChatSourceMessage {
    id: string;
    sender: string;
    text: string;
    time: string;
    roomName?: string;
    attachmentName?: string;
}

export interface DestinationType {
    id: 'task' | 'action' | 'pr' | 'reimbursement' | 'resource' | 'dailylog' | 'report';
    name: string;
    subtitle: string;
    icon: string;
    sfSymbol: string;
    accentColor: string;
    prefix: string;
}

const DESTINATION_TYPES: DestinationType[] = [
    {
        id: 'task',
        name: 'Task',
        subtitle: 'Assign to project member with due date',
        icon: 'checkmark-circle-outline',
        sfSymbol: 'checkmark.circle',
        accentColor: '#34C759',
        prefix: '✓ Task',
    },
    {
        id: 'action',
        name: 'Action Item',
        subtitle: 'Channel-level follow-up & checklist item',
        icon: 'flag-outline',
        sfSymbol: 'flag',
        accentColor: '#FF9500',
        prefix: 'Action',
    },
    {
        id: 'pr',
        name: 'Purchase Request',
        subtitle: 'Material or procurement request workflow',
        icon: 'cart-outline',
        sfSymbol: 'cart',
        accentColor: FormaBlue[600],
        prefix: 'PR',
    },
    {
        id: 'reimbursement',
        name: 'Reimbursement',
        subtitle: 'Claim project expense or petty cash',
        icon: 'cash-outline',
        sfSymbol: 'banknote',
        accentColor: '#30B0C7',
        prefix: 'Reimburse',
    },
    {
        id: 'resource',
        name: 'Resource Request',
        subtitle: 'Request equipment, vehicle, or tool allocation',
        icon: 'cube-outline',
        sfSymbol: 'cube',
        accentColor: '#AF52DE',
        prefix: 'Resource',
    },
    {
        id: 'dailylog',
        name: 'Daily Log Entry',
        subtitle: 'Record site progress or incident in daily journal',
        icon: 'book-outline',
        sfSymbol: 'book.closed',
        accentColor: '#FF9500',
        prefix: 'Daily Log',
    },
    {
        id: 'report',
        name: 'Report Item / Issue',
        subtitle: 'Flag site observation, defect, or safety item',
        icon: 'alert-circle-outline',
        sfSymbol: 'exclamationmark.triangle',
        accentColor: '#FF3B30',
        prefix: 'Report',
    },
];

interface ChatCreateActionSheetProps {
    visible: boolean;
    onClose: () => void;
    sourceMessage: ChatSourceMessage | null;
    onCreate: (destination: DestinationType, title: string) => void;
}

export function ChatCreateActionSheet({
    visible,
    onClose,
    sourceMessage,
    onCreate,
}: ChatCreateActionSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const [selectedType, setSelectedType] = useState<DestinationType>(DESTINATION_TYPES[0]);
    const [titleInput, setTitleInput] = useState('');

    React.useEffect(() => {
        if (sourceMessage) {
            // Pre-fill a concise title derived from message text
            const firstLine = sourceMessage.text.split('\n')[0].trim();
            const clean = firstLine.length > 55 ? `${firstLine.substring(0, 52)}...` : firstLine;
            setTitleInput(clean);
            setSelectedType(DESTINATION_TYPES[0]);
        }
    }, [sourceMessage]);

    if (!sourceMessage) return null;

    const handleConfirm = () => {
        if (!titleInput.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCreate(selectedType, titleInput.trim());
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View
                    style={[
                        styles.sheetContainer,
                        {
                            backgroundColor: sheetBg,
                            paddingBottom: Math.max(insets.bottom, 16) + 10,
                        },
                    ]}
                >
                    {/* Sheet Handle */}
                    <View style={styles.handleWrapper}>
                        <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
                    </View>

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.headerTitle, { color: textColor }]}>Create in Forma</Text>
                            <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                                Convert chat message into structured work
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={18} color={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={styles.scrollArea}
                        contentContainerStyle={{ gap: 16 }}
                    >
                        {/* Source Message Reference Card */}
                        <View style={[styles.sourceCard, { backgroundColor: cardBg, borderColor }]}>
                            <View style={styles.sourceHeader}>
                                <Ionicons name="chatbubble-ellipses-outline" size={14} color={FormaBlue[600]} />
                                <Text style={[styles.sourceHeaderText, { color: FormaBlue[600] }]}>
                                    SOURCE MESSAGE · {sourceMessage.sender} ({sourceMessage.time})
                                </Text>
                            </View>
                            <Text style={[styles.sourceMessageText, { color: textColor }]} numberOfLines={3}>
                                "{sourceMessage.text}"
                            </Text>
                        </View>

                        {/* Title Input */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.sectionLabel, { color: subtextColor }]}>TITLE / SUMMARY</Text>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    {
                                        backgroundColor: cardBg,
                                        borderColor,
                                        color: textColor,
                                    },
                                ]}
                                value={titleInput}
                                onChangeText={setTitleInput}
                                placeholder="Enter title or summary..."
                                placeholderTextColor={subtextColor}
                                returnKeyType="done"
                            />
                        </View>

                        {/* Destination Types Selector */}
                        <View style={styles.destinationsSection}>
                            <Text style={[styles.sectionLabel, { color: subtextColor }]}>DESTINATION TYPE</Text>
                            <View style={styles.destinationsGrid}>
                                {DESTINATION_TYPES.map((type) => {
                                    const isSelected = selectedType.id === type.id;
                                    return (
                                        <TouchableOpacity
                                            key={type.id}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSelectedType(type);
                                            }}
                                            style={[
                                                styles.destCard,
                                                {
                                                    backgroundColor: isSelected
                                                        ? (isDark ? 'rgba(10, 132, 255,0.18)' : 'rgba(0, 122, 255,0.08)')
                                                        : cardBg,
                                                    borderColor: isSelected ? FormaBlue[700] : borderColor,
                                                    borderWidth: isSelected ? 1.5 : 1,
                                                },
                                            ]}
                                        >
                                            <View style={[styles.destIconBadge, { backgroundColor: `${type.accentColor}20` }]}>
                                                <PlatformIcon
                                                    name={type.sfSymbol || type.icon}
                                                    size={18}
                                                    tintColor={type.accentColor}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.destTitle, { color: textColor, fontWeight: isSelected ? '700' : '600' }]}>
                                                    {type.name}
                                                </Text>
                                                <Text style={[styles.destSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                                    {type.subtitle}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={20} color={FormaBlue[700]} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Action Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleConfirm}
                        disabled={!titleInput.trim()}
                        style={[
                            styles.confirmButton,
                            {
                                backgroundColor: titleInput.trim() ? FormaBlue[700] : (isDark ? '#3A3A3C' : '#C7C7CC'),
                            },
                        ]}
                    >
                        <Text style={styles.confirmButtonText}>
                            Create {selectedType.name}
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 20,
    },
    handleWrapper: {
        alignItems: 'center',
        marginBottom: 12,
    },
    sheetHandle: {
        width: 36,
        height: 5,
        borderRadius: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 12.5,
        marginTop: 2,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollArea: {
        maxHeight: 440,
    },
    sourceCard: {
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderLeftWidth: 3.5,
        borderLeftColor: FormaBlue[700],
        gap: 6,
    },
    sourceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sourceHeaderText: {
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    sourceMessageText: {
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    inputSection: {
        gap: 6,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    textInput: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    destinationsSection: {
        gap: 8,
    },
    destinationsGrid: {
        gap: 8,
    },
    destCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        gap: 12,
    },
    destIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    destTitle: {
        fontSize: 14,
        marginBottom: 2,
    },
    destSubtitle: {
        fontSize: 11.5,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
        marginTop: 14,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
