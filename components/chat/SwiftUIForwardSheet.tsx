import React, { useState, useMemo, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Animated,
    Platform,
    TouchableWithoutFeedback,
    Image as RNImage,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import {
    Host,
    HStack as SwiftUIHStack,
    Spacer as SwiftUISpacer,
    GlassEffectContainer as SwiftUIGlassEffectContainer,
    frame,
    cornerRadius,
    glassEffect,
} from '@/lib/swiftui';
import { GlassEffectContainer } from '@/components/ui/GlassEffectContainer';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { FormaBlue } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { useTenantContext } from '@/context/TenantContext';

export interface ForwardChannel {
    id: string;
    code: string;
    name: string;
    icon?: string;
    avatarBg?: string;
    avatarUri?: string | null;
}

interface SwiftUIForwardSheetProps {
    visible: boolean;
    onClose: () => void;
    messageCount?: number;
    channels: ForwardChannel[];
    onForwardToChannel: (channel: ForwardChannel) => void;
    isDark?: boolean;
}

export const BouncyGlassCircleButton = ({
    onPress,
    disabled = false,
    isDark = false,
    size = 44,
    children,
}: {
    onPress?: () => void;
    disabled?: boolean;
    isDark?: boolean;
    size?: number;
    children?: React.ReactNode;
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(scaleAnim, {
            toValue: 0.88,
            useNativeDriver: true,
            friction: 7,
            tension: 300,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
            tension: 200,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.35 : 1 }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                activeOpacity={1}
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                {Platform.OS === 'ios' ? (
                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                        <SwiftUIGlassEffectContainer modifiers={[
                            frame({ width: size, height: size }),
                            cornerRadius(size / 2),
                            glassEffect({ shape: 'circle' })
                        ]}>
                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: size, height: size })]}>
                                <SwiftUISpacer />
                            </SwiftUIHStack>
                        </SwiftUIGlassEffectContainer>
                    </Host>
                ) : (
                    <View
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                borderRadius: size / 2,
                                backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                            }
                        ]}
                    />
                )}
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
};

export function SwiftUIForwardSheet({
    visible,
    onClose,
    messageCount = 1,
    channels,
    onForwardToChannel,
    isDark = false,
}: SwiftUIForwardSheetProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { activeTenant } = useTenantContext();

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const inputBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const rowBg = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.5)';
    const accentColor = activeTenant?.primary_color || FormaBlue[500];

    const filteredChannels = useMemo(() => {
        const uniqueMap = new Map<string, ForwardChannel>();
        (channels || []).forEach(c => {
            if (c?.id && !uniqueMap.has(c.id)) {
                uniqueMap.set(c.id, c);
            }
        });
        const unique = Array.from(uniqueMap.values());
        if (!searchQuery.trim()) return unique;
        const q = searchQuery.toLowerCase();
        return unique.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }, [channels, searchQuery]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>

                <View style={styles.sheetWrapper}>
                    <GlassEffectContainer
                        borderRadius={32}
                        intensity={85}
                        tint="systemMaterial"
                        style={styles.sheetContainer}
                    >
                        <View style={styles.sheetContent}>
                            {/* Drag Handle Indicator */}
                            <View style={styles.handle} />

                            {/* Header */}
                            <View style={styles.header}>
                                <View style={{ flex: 1, paddingRight: 12 }}>
                                    <Text style={[styles.title, { color: textColor }]}>Forward Message</Text>
                                    <Text style={[styles.subtitle, { color: subtextColor }]}>
                                        Forwarding {messageCount} message{messageCount > 1 ? 's' : ''} to channel
                                    </Text>
                                </View>
                                <BouncyGlassCircleButton
                                    onPress={onClose}
                                    isDark={isDark}
                                    size={44}
                                >
                                    <PlatformIcon name="xmark" size={16} tintColor={textColor} />
                                </BouncyGlassCircleButton>
                            </View>

                            {/* Search Field */}
                            <View style={[styles.searchBox, { backgroundColor: inputBg }]}>
                                <PlatformIcon name="magnifyingglass" size={16} tintColor={subtextColor} />
                                <TextInput
                                    placeholder="Search channel or code..."
                                    placeholderTextColor={subtextColor}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    style={[styles.searchInput, { color: textColor }]}
                                />
                            </View>

                            {/* Channels List */}
                            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                                {filteredChannels.map((channel) => {
                                    const logoUrl = channel.avatarUri || activeTenant?.branding_logo_url || activeTenant?.logo_url;

                                    return (
                                        <View
                                            key={channel.id}
                                            style={[styles.channelRow, { backgroundColor: rowBg }]}
                                        >
                                            <View style={[
                                                styles.iconCircle,
                                                {
                                                    backgroundColor: logoUrl
                                                        ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')
                                                        : (isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)')
                                                }
                                            ]}>
                                                {logoUrl ? (
                                                    <View style={{ width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                                        {logoUrl.toLowerCase().endsWith('.svg') || logoUrl.includes('.svg') ? (
                                                            <SvgUri uri={logoUrl} width={30} height={30} />
                                                        ) : (
                                                            <RNImage
                                                                source={{ uri: logoUrl }}
                                                                style={{ width: 38, height: 38, borderRadius: 19 }}
                                                                resizeMode={channel.avatarUri ? 'cover' : 'contain'}
                                                            />
                                                        )}
                                                    </View>
                                                ) : (
                                                    <PlatformIcon name="bubble.left.and.bubble.right.fill" size={18} tintColor={isDark ? FormaBlue[400] : FormaBlue[700]} />
                                                )}
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                                                <Text style={[styles.channelCode, { color: textColor }]}>{channel.code}</Text>
                                                <Text style={[styles.channelName, { color: subtextColor }]}>{channel.name}</Text>
                                            </View>
                                            <BouncyGlassCircleButton
                                                onPress={() => {
                                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                    onForwardToChannel(channel);
                                                }}
                                                isDark={isDark}
                                                size={44}
                                            >
                                                <PlatformIcon name="arrowshape.turn.up.right" size={18} tintColor={isDark ? FormaBlue[400] : FormaBlue[700]} />
                                            </BouncyGlassCircleButton>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </GlassEffectContainer>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
    },
    sheetWrapper: {
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    sheetContainer: {
        width: '100%',
    },
    sheetContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 38,
    },
    handle: {
        width: 38,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(128,128,128,0.4)',
        alignSelf: 'center',
        marginBottom: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        paddingHorizontal: 16,
        height: 44,
        marginBottom: 14,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        marginBottom: 8,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelCode: {
        fontSize: 15,
        fontWeight: '700',
    },
    channelName: {
        fontSize: 12,
        marginTop: 1,
    },
});
