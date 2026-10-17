import { useTheme } from '@/context/ThemeContext';
import { FormaBlue } from '@/constants/theme';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import React, { useState, useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import PlatformContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';

interface SwiftUIChatInputBarProps {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onAttach?: () => void;
    onAttachSelect?: (action: string) => void;
    hasAttachments?: boolean;
    isDark?: boolean;
    replyingTo?: {
        sender: string;
        text: string;
        onCancel: () => void;
    } | null;
}

const ATTACH_ACTIONS: ContextMenuAction[] = [
    { title: 'Take Photo', systemIcon: 'camera' },
    { title: 'Photo Library', systemIcon: 'photo.on.rectangle' },
    { title: 'Browse File', systemIcon: 'folder' },
];

export function SwiftUIChatInputBar({
    placeholder = 'Message...',
    value,
    onChangeText,
    onSend,
    onAttach,
    onAttachSelect,
    hasAttachments = false,
    isDark = false,
    replyingTo,
}: SwiftUIChatInputBarProps) {
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const textInputRef = useRef<TextInput>(null);
    const [inputHeight, setInputHeight] = useState(24);

    const hasTextOrMedia = Boolean(value && value.trim().length > 0) || hasAttachments;

    const handleSendPress = () => {
        if (!hasTextOrMedia) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setInputHeight(24);
        onSend();
    };

    return (
        <View style={styles.outerContainer}>
            {/* Reply Banner */}
            {replyingTo && (
                <View style={[
                    styles.replyBanner,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    }
                ]}>
                    <View style={styles.replyIconBadge}>
                        <PlatformIcon name="arrow.uturn.backward" size={13} tintColor={isDark ? FormaBlue[400] : FormaBlue[700]} />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 8 }}>
                        <Text style={[styles.replySender, { color: isDark ? FormaBlue[400] : FormaBlue[700] }]}>
                            Replying to {replyingTo.sender}
                        </Text>
                        <Text style={[styles.replyText, { color: subtextColor }]} numberOfLines={1}>
                            {replyingTo.text}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            replyingTo.onCancel();
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.replyCloseBtn}
                    >
                        <PlatformIcon name="xmark.circle.fill" size={18} tintColor={subtextColor} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Unified Floating Pill Action Bar */}
            <View style={[
                styles.pillContainer,
                {
                    backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                }
            ]}>
                {/* Left Attachment (+) Action */}
                {Platform.OS === 'web' && typeof window !== 'undefined' && !('ontouchstart' in window || ((navigator as any)?.maxTouchPoints && (navigator as any).maxTouchPoints > 1)) ? (
                    <TouchableOpacity
                        style={[
                            styles.inlineActionBtn,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                            }
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onAttachSelect?.('Browse File');
                        }}
                    >
                        <PlatformIcon
                            name="plus"
                            size={18}
                            tintColor={isDark ? FormaBlue[400] : FormaBlue[700]}
                        />
                    </TouchableOpacity>
                ) : (
                    <PlatformContextMenu
                        title="Attach"
                        actions={ATTACH_ACTIONS}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            onAttachSelect?.(e.nativeEvent.name);
                        }}
                    >
                        <View
                            style={[
                                styles.inlineActionBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                }
                            ]}
                        >
                            <PlatformIcon
                                name="plus"
                                size={18}
                                tintColor={isDark ? FormaBlue[400] : FormaBlue[700]}
                            />
                        </View>
                    </PlatformContextMenu>
                )}

                {/* Center Multiline Growing TextInput */}
                <TextInput
                    ref={textInputRef}
                    style={[
                        styles.textInput,
                        {
                            color: textColor,
                        }
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={subtextColor}
                    value={value}
                    onChangeText={onChangeText}
                    onContentSizeChange={(e) => {
                        const h = e.nativeEvent?.contentSize?.height;
                        if (h && typeof h === 'number' && h > 0) {
                            setInputHeight(Math.min(88, Math.max(24, h)));
                        }
                    }}
                    multiline
                    numberOfLines={1}
                    textAlignVertical="center"
                />

                {/* Right Send Action Button */}
                <TouchableOpacity
                    style={[
                        styles.inlineSendBtn,
                        {
                            backgroundColor: hasTextOrMedia
                                ? FormaBlue[700]
                                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                        }
                    ]}
                    onPress={handleSendPress}
                    disabled={!hasTextOrMedia}
                    activeOpacity={0.8}
                >
                    <PlatformIcon
                        name="arrow.up"
                        size={16}
                        tintColor={hasTextOrMedia ? '#FFFFFF' : (isDark ? '#636366' : '#8E8E93')}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        width: '100%',
        paddingHorizontal: 0,
        paddingBottom: 0,
        gap: 6,
    },
    replyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
    },
    replyIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 122, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    replySender: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 1,
    },
    replyText: {
        fontSize: 12,
    },
    replyCloseBtn: {
        padding: 2,
    },
    pillContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 22,
        borderWidth: StyleSheet.hairlineWidth,
        minHeight: 44,
        maxHeight: 116,
        paddingLeft: 5,
        paddingRight: 5,
        paddingVertical: 5,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        } : {}),
    },
    inlineActionBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    textInput: {
        flex: 1,
        fontSize: 14.5,
        lineHeight: 20,
        paddingHorizontal: 6,
        paddingTop: Platform.OS === 'web' ? 7 : (Platform.OS === 'ios' ? 7 : 4),
        paddingBottom: Platform.OS === 'web' ? 7 : (Platform.OS === 'ios' ? 7 : 4),
        minHeight: 34,
        maxHeight: 88, // 4 lines max (4 * 20px = 80px + 8px padding)
        ...(Platform.OS === 'web' ? {
            outlineStyle: 'none',
            resize: 'none',
            boxSizing: 'border-box',
            fieldSizing: 'content',
        } as any : {}),
    },
    inlineSendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
});

