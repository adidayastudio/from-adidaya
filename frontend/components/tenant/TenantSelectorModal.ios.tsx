import React, { memo, useEffect } from 'react';
import { View, Image as RNImage } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Image,
    Button
} from '@expo/ui/swift-ui';
import { 
    padding, 
    background, 
    ignoreSafeArea, 
    frame, 
    cornerRadius, 
    buttonStyle 
} from '@expo/ui/swift-ui/modifiers';
import { useTenantContext, Tenant } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export interface TenantSelectorModalProps {
    visible?: boolean;
    isOpened?: boolean;
    onClose: () => void;
    onSelectTenant?: (tenant: Tenant) => void;
    title?: string;
    subtitle?: string;
}

export const TenantSelectorModal: React.FC<TenantSelectorModalProps> = memo(({
    visible,
    isOpened,
    onClose,
    onSelectTenant,
    title = 'Select Organization',
    subtitle = 'Switch to another tenant workspace'
}) => {
    const sheetOpened = isOpened !== undefined ? isOpened : !!visible;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { tenants, activeTenant, switchTenant, refreshTenants } = useTenantContext();
    const router = useRouter();

    useEffect(() => {
        if (sheetOpened) {
            refreshTenants();
        }
    }, [sheetOpened]);

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const chevronColor = isDark ? '#8E8E93' : '#AEAEB2';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 120, 128, 0.08)';

    const primaryBlue = '#007AFF';
    const accentBlue = isDark ? '#38BDF8' : '#007AFF';
    const blueBadgeBg = isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(0, 122, 255, 0.12)';

    // Dynamic height based on tenant count
    const detentHeight = tenants.length === 0 ? 0.35 : Math.min(0.68, 0.38 + tenants.length * 0.11);

    const circleIconModifiers = (bgColor: string) => [
        frame({ width: 44, height: 44 }),
        background(bgColor),
        cornerRadius(22)
    ];

    const handleSelect = async (t: Tenant) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await switchTenant(t.id);
        if (onSelectTenant) onSelectTenant(t);
        onClose();
    };

    const handleCreateNew = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/tenant-setup' as any);
    };

    const handleJoinCode = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/join-tenant' as any);
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={sheetOpened}
                presentationDetents={[detentHeight]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background('clear'),
                    frame({ maxWidth: Infinity }),
                    padding({ bottom: 20 })
                ]}>
                    {/* Header - Aligned identically to Finance / Resources drawer */}
                    <HStack alignment="center" modifiers={[padding({ top: 6, leading: 20, trailing: 20, bottom: 6 })]}>
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                {title}
                            </SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>
                                {subtitle}
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Cards Container */}
                    <VStack spacing={10} alignment="leading" modifiers={[padding({ horizontal: 20, top: 4, bottom: 10 })]}>
                        {/* Existing Organization List */}
                        {tenants.map(item => {
                            const isSelected = activeTenant?.id === item.id;
                            const brandColor = item.primary_color || primaryBlue;
                            const logoUrl = item.branding_logo_url || item.logo_url;
                            const words = (item.branding_name || item.name || '').trim().split(/\s+/).filter(Boolean);
                            const initials = words.length > 0
                                ? words.map(w => w[0]).join('').toUpperCase().slice(0, 3)
                                : 'FM';
                            const displayJoinCode = item.join_code || (item.company_code && item.company_code.length > 3 ? item.company_code : null);

                            return (
                                <Button
                                    key={item.id}
                                    onPress={() => handleSelect(item)}
                                    modifiers={[
                                        buttonStyle('plain'),
                                        frame({ maxWidth: Infinity })
                                    ]}
                                >
                                    <HStack alignment="center" spacing={14} modifiers={[
                                        padding({ top: 12, bottom: 12, leading: 14, trailing: 14 }),
                                        background(cardBg),
                                        cornerRadius(16),
                                        frame({ maxWidth: Infinity })
                                    ]}>
                                        {/* Brand Avatar (Strictly 42x42 SwiftUI frame) */}
                                        <HStack alignment="center" modifiers={[
                                            frame({ width: 42, height: 42 }),
                                            background(brandColor),
                                            cornerRadius(12)
                                        ]}>
                                            {logoUrl || (item.name || '').toLowerCase().includes('adidaya') || (item.company_code || '').toLowerCase() === 'ady' ? (
                                                <Host style={{ width: 42, height: 42 }}>
                                                    <View style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: brandColor }}>
                                                        {logoUrl ? (
                                                            logoUrl.toLowerCase().endsWith('.svg') || logoUrl.includes('.svg') ? (
                                                                <SvgUri uri={logoUrl} width={42} height={42} />
                                                            ) : (
                                                                <RNImage
                                                                    source={{ uri: logoUrl }}
                                                                    style={{ width: 42, height: 42, borderRadius: 12 }}
                                                                    resizeMode="cover"
                                                                />
                                                            )
                                                        ) : (
                                                            <RNImage
                                                                source={require('@/assets/images/logo-adidaya-red.png')}
                                                                style={{ width: 32, height: 32 }}
                                                                resizeMode="contain"
                                                            />
                                                        )}
                                                    </View>
                                                </Host>
                                            ) : (
                                                <>
                                                    <Spacer />
                                                    <SwiftUIText size={initials.length >= 3 ? 12 : 14} weight="bold" color="#FFFFFF">
                                                        {initials}
                                                    </SwiftUIText>
                                                    <Spacer />
                                                </>
                                            )}
                                        </HStack>

                                        {/* Tenant Details */}
                                        <VStack alignment="leading" spacing={3}>
                                            <HStack alignment="center" spacing={8}>
                                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                    {item.name}
                                                </SwiftUIText>
                                                {item.company_code ? (
                                                    <HStack modifiers={[
                                                        padding({ horizontal: 6, vertical: 2 }),
                                                        background(blueBadgeBg),
                                                        cornerRadius(6)
                                                    ]}>
                                                        <SwiftUIText size={11} weight="bold" color={accentBlue}>
                                                            {item.company_code}
                                                        </SwiftUIText>
                                                    </HStack>
                                                ) : null}
                                            </HStack>
                                            <SwiftUIText size={12} color={subtextColor}>
                                                {displayJoinCode
                                                    ? `Role: ${item.role || 'Member'} • Join: ${displayJoinCode}`
                                                    : `Role: ${item.role || 'Member'}`}
                                            </SwiftUIText>
                                        </VStack>

                                        <Spacer />

                                        {/* Checkmark or Chevron */}
                                        {isSelected ? (
                                            <Image
                                                systemName="checkmark.circle.fill"
                                                size={20}
                                                color={primaryBlue}
                                            />
                                        ) : (
                                            <Image
                                                systemName="chevron.right"
                                                size={14}
                                                color={chevronColor}
                                            />
                                        )}
                                    </HStack>
                                </Button>
                            );
                        })}

                        {/* Extra Separation Space Between Org List and Actions */}
                        {tenants.length > 0 && (
                            <HStack modifiers={[frame({ height: 10 })]}>
                                <Spacer />
                            </HStack>
                        )}

                        {/* Option 1: Join with Code */}
                        <Button
                            onPress={handleJoinCode}
                            modifiers={[
                                buttonStyle('plain'),
                                frame({ maxWidth: Infinity })
                            ]}
                        >
                            <HStack alignment="center" spacing={14} modifiers={[
                                padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                background(cardBg),
                                cornerRadius(16),
                                frame({ maxWidth: Infinity })
                            ]}>
                                <Image 
                                    systemName="key.fill" 
                                    size={18} 
                                    color={accentBlue} 
                                    modifiers={circleIconModifiers(blueBadgeBg)} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Join with Code
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Enter 6-character code from your admin
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 2: Setup Organization */}
                        <Button
                            onPress={handleCreateNew}
                            modifiers={[
                                buttonStyle('plain'),
                                frame({ maxWidth: Infinity })
                            ]}
                        >
                            <HStack alignment="center" spacing={14} modifiers={[
                                padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                background(cardBg),
                                cornerRadius(16),
                                frame({ maxWidth: Infinity })
                            ]}>
                                <Image 
                                    systemName="building.2.fill" 
                                    size={18} 
                                    color={primaryBlue} 
                                    modifiers={circleIconModifiers('rgba(0, 122, 255, 0.14)')} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Setup Organization
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Create a new company & team workspace
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
});
