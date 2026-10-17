import React from 'react';
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
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ProjectTypeTemplate } from '@/lib/api/templates';

export interface SwiftUIScopePickerSheetProps {
    isOpened: boolean;
    onClose: () => void;
    scopes: ProjectTypeTemplate[];
    selectedScope: ProjectTypeTemplate | null;
    onSelectScope: (scope: ProjectTypeTemplate) => void;
}

export const SwiftUIScopePickerSheet: React.FC<SwiftUIScopePickerSheetProps> = ({
    isOpened,
    onClose,
    scopes,
    selectedScope,
    onSelectScope,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';

    // Calculate height dynamically to "fit to content"
    const screenHeight = Dimensions.get('window').height;
    const itemCount = scopes.length || 4;
    const headerHeight = 50;
    const itemHeight = 44;
    const itemSpacing = 8;
    const listBottomPadding = 20;
    const bottomSafeArea = 34; // Manual safe area offset since we use ignoreSafeArea
    const calculatedHeight = headerHeight + (itemCount * itemHeight) + (Math.max(0, itemCount - 1) * itemSpacing) + listBottomPadding + bottomSafeArea;
    const detentFraction = Math.min(0.9, Math.max(0.15, calculatedHeight / screenHeight));

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[detentFraction]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'all' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 8, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={20} weight="bold" color={textColor}>
                            Select Scope
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Native SwiftUI List items inside a clean VStack */}
                    <VStack alignment="leading" spacing={8} modifiers={[
                        padding({ horizontal: 20, bottom: 20 }),
                        background('clear')
                    ]}>
                        {scopes.map((sc) => {
                            const isSelected = selectedScope?.projectTypeId === sc.projectTypeId;
                            const activeBg = isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.08)';
                            return (
                                <Button
                                    key={sc.id}
                                    onPress={() => {
                                        onSelectScope(sc);
                                        onClose();
                                    }}
                                    modifiers={[
                                        buttonStyle('plain'),
                                        frame({ maxWidth: Infinity })
                                    ]}
                                >
                                    <HStack alignment="center" spacing={12} modifiers={[
                                        padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                        background(isSelected ? activeBg : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')),
                                        cornerRadius(10),
                                    ]}>
                                        {/* Scope Code Badge (Pill) */}
                                        <HStack alignment="center" modifiers={[
                                            padding({ horizontal: 10, vertical: 4 }),
                                            background(isSelected ? '#FF3B30' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')),
                                            cornerRadius(12)
                                        ]}>
                                            <SwiftUIText size={12} weight="bold" color={isSelected ? '#FFFFFF' : textColor}>
                                                {sc.code || ''}
                                            </SwiftUIText>
                                        </HStack>

                                        {/* Scope Name/Label */}
                                        <SwiftUIText size={15} weight="medium" color={isSelected ? '#FF3B30' : textColor}>
                                            {sc.name}
                                        </SwiftUIText>

                                        <Spacer />

                                        {isSelected && (
                                            <Image systemName="checkmark" size={16} color="#FF3B30" />
                                        )}
                                    </HStack>
                                </Button>
                            );
                        })}
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
