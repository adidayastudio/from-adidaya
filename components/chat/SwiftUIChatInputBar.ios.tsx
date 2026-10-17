import { FormaBlue } from '@/constants/theme';
import { 
    Host,
    VStack,
    HStack, 
    Spacer,
    Button,
    GlassEffectContainer,
    Image,
    TextField,
} from '@expo/ui/swift-ui';
import { padding, frame, glassEffect, cornerRadius, buttonStyle, background, scaleEffect, animation, Animation } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Keyboard, Platform, TouchableOpacity } from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';

interface SwiftUIChatInputBarProps {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onAttach?: () => void;
    onAttachSelect?: (action: string) => void;
    hasAttachments?: boolean;
    isDark?: boolean;
}

const ATTACH_ACTIONS: ContextMenuAction[] = [
    { title: 'Browse File', systemIcon: 'folder' },
    { title: 'Photo Library', systemIcon: 'photo.on.rectangle' },
    { title: 'Take Photo', systemIcon: 'camera' },
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
}: SwiftUIChatInputBarProps) {
    const textFieldRef = useRef<any>(null);
    const shouldFocusRef = useRef<boolean>(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isPlusPressed, setIsPlusPressed] = useState(false);
    const [isSendPressed, setIsSendPressed] = useState(false);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, () => {
            setIsKeyboardVisible(true);
            setIsFocused(true);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setIsKeyboardVisible(false);
            setIsFocused(false);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const isExpanded = isKeyboardVisible || isFocused || Boolean(value.trim()) || Boolean(hasAttachments);
    const isSendable = Boolean(value.trim()) || Boolean(hasAttachments);

    // Auto-focus on native TextField right after expand transition
    useEffect(() => {
        if (isExpanded && shouldFocusRef.current) {
            shouldFocusRef.current = false;
            const timer = setTimeout(() => {
                requestAnimationFrame(() => {
                    if (textFieldRef.current && typeof textFieldRef.current.focus === 'function') {
                        textFieldRef.current.focus();
                    }
                });
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    // Calculate line count (max 4 lines)
    const lineCount = useMemo(() => {
        if (!value) return 1;
        const newlines = (value.match(/\n/g) || []).length + 1;
        const charWrap = Math.ceil(value.length / 28);
        return Math.min(4, Math.max(newlines, charWrap, 1));
    }, [value]);

    // Snug, proportional height calculations with balanced padding on all sides:
    // Collapsed idle pill: 54
    // Expanded (1 line): 14 top + 28 text + 8 gap + 34 btn + 12 bottom = 96
    // +22pt per extra line up to 4 lines (max 162)
    const currentHeight = !isExpanded ? 54 : Math.min(162, 96 + (lineCount - 1) * 22);
    const textHeight = !isExpanded ? 36 : Math.min(94, 28 + (lineCount - 1) * 22);
    const currentRadius = 27;

    // Smooth Spring Height Animation
    const animatedHeight = useRef(new Animated.Value(54)).current;

    useEffect(() => {
        Animated.spring(animatedHeight, {
            toValue: currentHeight,
            friction: 9,
            tension: 240,
            useNativeDriver: false,
        }).start();
    }, [currentHeight]);

    const handleSendPress = () => {
        if (isSendable) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsSendPressed(true);
            setTimeout(() => setIsSendPressed(false), 150);
            onSend();
        }
    };

    const handleExpandInput = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        shouldFocusRef.current = true;
        setIsFocused(true);
    };

    return (
        <Animated.View style={[styles.container, { height: animatedHeight }]}>
            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                <GlassEffectContainer modifiers={[
                    frame({ maxWidth: Infinity, height: currentHeight }),
                    cornerRadius(currentRadius),
                ]}>
                    {isExpanded ? (
                        /* Expanded 2-Tier ChatGPT Layout */
                        <VStack spacing={0} modifiers={[
                            frame({ maxWidth: Infinity, height: currentHeight }),
                            glassEffect({ shape: 'rectangle' }),
                            cornerRadius(currentRadius),
                        ]}>
                            {/* Top Tier: Multi-line text field */}
                            <HStack alignment="top" modifiers={[
                                frame({ maxWidth: Infinity, height: textHeight }),
                                padding({ top: 14, leading: 16, trailing: 16 })
                            ]}>
                                <TextField
                                    ref={textFieldRef}
                                    key="expanded-input"
                                    placeholder={placeholder}
                                    defaultValue={value}
                                    onChangeText={onChangeText}
                                    multiline={true}
                                    numberOfLines={4}
                                    allowNewlines={true}
                                    modifiers={[
                                        frame({ maxWidth: Infinity, height: textHeight })
                                    ]}
                                />
                            </HStack>

                            <Spacer />

                            {/* Bottom Tier: Action Buttons with dedicated bottom & horizontal margin */}
                            <HStack alignment="center" modifiers={[
                                frame({ maxWidth: Infinity, height: 48 }),
                                padding({ bottom: 14, leading: 16, trailing: 16 })
                            ]}>
                                {/* Bottom-Left (+) Circular Button */}
                                <GlassEffectContainer modifiers={[
                                    frame({ width: 34, height: 34 }),
                                    cornerRadius(17),
                                    glassEffect({ shape: 'circle' }),
                                    scaleEffect(isPlusPressed ? 0.86 : 1.0),
                                    animation(Animation.spring(), isPlusPressed)
                                ]}>
                                    <Button
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onAttach?.();
                                        }}
                                        modifiers={[
                                            buttonStyle('plain'),
                                            frame({ width: 34, height: 34 }),
                                        ]}
                                    >
                                        <Image systemName="plus" size={16} color={FormaBlue[700]} />
                                    </Button>
                                </GlassEffectContainer>

                                <Spacer />

                                {/* Bottom-Right (↑) Send Button */}
                                {isSendable ? (
                                    <HStack alignment="center" modifiers={[
                                        frame({ width: 34, height: 34 }),
                                        background(FormaBlue[700]),
                                        cornerRadius(17),
                                        scaleEffect(isSendPressed ? 0.86 : 1.0),
                                        animation(Animation.spring(), isSendPressed)
                                    ]}>
                                        <Button
                                            onPress={handleSendPress}
                                            modifiers={[
                                                buttonStyle('plain'),
                                                frame({ width: 34, height: 34 }),
                                            ]}
                                        >
                                            <Image systemName="arrow.up" size={15} color="#FFFFFF" />
                                        </Button>
                                    </HStack>
                                ) : (
                                    <GlassEffectContainer modifiers={[
                                        frame({ width: 34, height: 34 }),
                                        cornerRadius(17),
                                        glassEffect({ shape: 'circle' })
                                    ]}>
                                        <Button
                                            onPress={() => {}}
                                            modifiers={[
                                                buttonStyle('plain'),
                                                frame({ width: 34, height: 34 }),
                                            ]}
                                        >
                                            <Image systemName="arrow.up" size={14} color="#8E8E93" />
                                        </Button>
                                    </GlassEffectContainer>
                                )}
                            </HStack>
                        </VStack>
                    ) : (
                        /* Collapsed Single-Row Pill Layout */
                        <HStack alignment="center" spacing={10} modifiers={[
                            padding({ top: 9, bottom: 9, leading: 10, trailing: 10 }),
                            frame({ maxWidth: Infinity, height: 54 }),
                            glassEffect({ shape: 'capsule' })
                        ]}>
                            {/* Left attachment (+) circular button */}
                            <GlassEffectContainer modifiers={[
                                frame({ width: 36, height: 36 }),
                                cornerRadius(18),
                                glassEffect({ shape: 'circle' }),
                                scaleEffect(isPlusPressed ? 0.86 : 1.0),
                                animation(Animation.spring(), isPlusPressed)
                            ]}>
                                <Button
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onAttach?.();
                                    }}
                                    modifiers={[
                                        buttonStyle('plain'),
                                        frame({ width: 36, height: 36 }),
                                    ]}
                                >
                                    <Image systemName="plus" size={17} color={FormaBlue[700]} />
                                </Button>
                            </GlassEffectContainer>

                            <Spacer />

                            {/* Right send arrow (↑) circular button */}
                            {isSendable ? (
                                <HStack alignment="center" modifiers={[
                                    frame({ width: 36, height: 36 }),
                                    background(FormaBlue[700]),
                                    cornerRadius(18),
                                    scaleEffect(isSendPressed ? 0.86 : 1.0),
                                    animation(Animation.spring(), isSendPressed)
                                ]}>
                                    <Button
                                        onPress={handleSendPress}
                                        modifiers={[
                                            buttonStyle('plain'),
                                            frame({ width: 36, height: 36 }),
                                        ]}
                                    >
                                        <Image systemName="arrow.up" size={15} color="#FFFFFF" />
                                    </Button>
                                </HStack>
                            ) : (
                                <GlassEffectContainer modifiers={[
                                    frame({ width: 36, height: 36 }),
                                    cornerRadius(18),
                                    glassEffect({ shape: 'circle' })
                                ]}>
                                    <Button
                                        onPress={handleExpandInput}
                                        modifiers={[
                                            buttonStyle('plain'),
                                            frame({ width: 36, height: 36 }),
                                        ]}
                                    >
                                        <Image systemName="arrow.up" size={14} color="#8E8E93" />
                                    </Button>
                                </GlassEffectContainer>
                            )}
                        </HStack>
                    )}
                </GlassEffectContainer>
            </Host>

            {/* Click-to-Expand Overlay for Collapsed State */}
            {!isExpanded && (
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleExpandInput}
                    style={styles.collapsedTapArea}
                >
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.collapsedPlaceholderText,
                            { color: isDark ? '#8E8E93' : '#8E8E93' }
                        ]}
                    >
                        {placeholder}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Native Pull-Down ContextMenu Overlay on Plus Button */}
            <View style={[
                styles.contextMenuAnchor,
                isExpanded ? styles.contextMenuAnchorExpanded : styles.contextMenuAnchorCollapsed
            ]} pointerEvents="box-none">
                <ContextMenu
                    actions={ATTACH_ACTIONS}
                    onPress={(e) => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onAttachSelect?.(e.nativeEvent.name);
                    }}
                    dropdownMenuMode={true}
                >
                    <TouchableOpacity
                        activeOpacity={0.6}
                        style={styles.transparentTrigger}
                    />
                </ContextMenu>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    collapsedTapArea: {
        position: 'absolute',
        top: 0,
        left: 56,
        right: 56,
        height: 54,
        justifyContent: 'center',
    },
    collapsedPlaceholderText: {
        fontSize: 16,
        fontWeight: '400',
    },
    contextMenuAnchor: {
        position: 'absolute',
        left: 10,
        width: 38,
        height: 38,
    },
    contextMenuAnchorCollapsed: {
        left: 10,
        top: 8,
    },
    contextMenuAnchorExpanded: {
        left: 16,
        bottom: 14,
    },
    transparentTrigger: {
        width: 38,
        height: 38,
    },
});
