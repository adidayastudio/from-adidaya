import React, { useState, useMemo } from 'react';
import { View, Image as RNImage } from 'react-native';
import { SvgUri } from 'react-native-svg';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Button,
    Text as SwiftUIText,
    Image,
    TextField,
    GlassEffectContainer,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    cornerRadius,
    buttonStyle,
    glassEffect,
} from '@expo/ui/swift-ui/modifiers';
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
    const accentColor = activeTenant?.primary_color || '#007AFF';

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
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.7, 0.94]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={14} modifiers={[
                    padding({ top: 18, bottom: 28, leading: 20, trailing: 20 }),
                    background(isDark ? '#1C1C1E' : '#FFFFFF'),
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ bottom: 2 })]}>
                        <VStack alignment="leading" spacing={3}>
                            <SwiftUIText size={18} weight="bold" color={textColor}>
                                Forward Message
                            </SwiftUIText>
                            <SwiftUIText size={12} color={subtextColor}>
                                {`Forwarding ${messageCount} message${messageCount > 1 ? 's' : ''} to channel`}
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        {/* Stable Circular Glass Close Button */}
                        <GlassEffectContainer modifiers={[
                            frame({ width: 30, height: 30 }),
                            cornerRadius(15),
                            glassEffect({ shape: 'circle' })
                        ]}>
                            <Button
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                }}
                                modifiers={[
                                    buttonStyle('plain'),
                                    frame({ width: 30, height: 30 }),
                                ]}
                            >
                                <Image systemName="xmark" size={11} color={subtextColor} />
                            </Button>
                        </GlassEffectContainer>
                    </HStack>

                    {/* Search Field - Full Pill */}
                    <TextField
                        placeholder="Search channel or code..."
                        defaultValue={searchQuery}
                        onChangeText={setSearchQuery}
                        modifiers={[
                            padding({ top: 9, bottom: 9, leading: 16, trailing: 16 }),
                            background(isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                            cornerRadius(22),
                            frame({ maxWidth: Infinity }),
                        ]}
                    />

                    {/* Channels List */}
                    <VStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
                        {filteredChannels.map((channel, idx) => {
                            const logoUrl = channel.avatarUri || activeTenant?.branding_logo_url || activeTenant?.logo_url;

                            return (
                                <HStack
                                    key={`fwd-item-${channel.id}-${idx}`}
                                    alignment="center"
                                    spacing={12}
                                    modifiers={[
                                        padding({ top: 10, bottom: 10, leading: 12, trailing: 12 }),
                                        background(isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)'),
                                        cornerRadius(14),
                                        frame({ maxWidth: Infinity }),
                                    ]}
                                >
                                    {/* Left avatar circle: Channel Avatar -> Tenant Logo -> Fallback Icon */}
                                    <HStack
                                        alignment="center"
                                        modifiers={[
                                            frame({ width: 38, height: 38 }),
                                            background(logoUrl
                                                ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')
                                                : (isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)')
                                            ),
                                            cornerRadius(19),
                                        ]}
                                    >
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
                                            <Image systemName="bubble.left.and.bubble.right.fill" size={17} color={accentColor} />
                                        )}
                                    </HStack>

                                    {/* Code First, Name Second */}
                                    <VStack alignment="leading" spacing={2}>
                                        <SwiftUIText size={14} weight="bold" color={textColor}>
                                            {channel.code}
                                        </SwiftUIText>
                                        <SwiftUIText size={12} color={subtextColor}>
                                            {channel.name}
                                        </SwiftUIText>
                                    </VStack>

                                    <Spacer />

                                    {/* Standby Circular Glass Forward Button (44pt) */}
                                    <GlassEffectContainer modifiers={[
                                        frame({ width: 44, height: 44 }),
                                        cornerRadius(22),
                                        glassEffect({ shape: 'circle' })
                                    ]}>
                                        <Button
                                            onPress={() => {
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                onForwardToChannel(channel);
                                            }}
                                            modifiers={[
                                                buttonStyle('plain'),
                                                frame({ width: 44, height: 44 }),
                                            ]}
                                        >
                                            <Image systemName="arrowshape.turn.up.right" size={16} color={accentColor} />
                                        </Button>
                                    </GlassEffectContainer>
                                </HStack>
                            );
                        })}
                    </VStack>

                    {/* Spacer */}
                    <Spacer />
                </VStack>
            </BottomSheet>
        </Host>
    );
}
