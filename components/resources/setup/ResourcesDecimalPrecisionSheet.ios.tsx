import React from 'react';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Image,
    List,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    frame,
    cornerRadius,
    buttonStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { QUANTITY_PRECISION_OPTIONS } from '@/lib/api/resourcesSetup';

export interface ResourcesDecimalPrecisionSheetProps {
    visible: boolean;
    onClose: () => void;
    selectedPrecision: number;
    onSelect: (precision: number) => void;
}

export const ResourcesDecimalPrecisionSheet: React.FC<ResourcesDecimalPrecisionSheetProps> = ({
    visible,
    onClose,
    selectedPrecision,
    onSelect,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const sheetBg = 'clear';

    return (
        <Host
            style={{ position: 'absolute', width: 0, height: 0 }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.6, 0.85]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 20, leading: 20, trailing: 20, bottom: 12 }),
                        ]}
                    >
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                Quantity Precision
                            </SwiftUIText>
                            <SwiftUIText size={13} weight="regular" color={subtextColor}>
                                Number of decimal places shown for stock & resource quantities
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

                    {/* Precision List */}
                    <List
                        listStyle="plain"
                        modifiers={[
                            frame({ maxHeight: 420 }),
                            background(sheetBg),
                        ]}
                    >
                        {QUANTITY_PRECISION_OPTIONS.map((item) => {
                            const isSelected = item.value === selectedPrecision;
                            const activeBg = isDark
                                ? 'rgba(0, 122, 255, 0.18)'
                                : 'rgba(0, 122, 255, 0.10)';

                            return (
                                <Button
                                    key={item.value}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        onSelect(item.value);
                                        onClose();
                                    }}
                                    modifiers={[
                                        buttonStyle('plain'),
                                        frame({ maxWidth: Infinity }),
                                    ]}
                                >
                                    <HStack
                                        alignment="center"
                                        spacing={12}
                                        modifiers={[
                                            padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                            background(isSelected ? activeBg : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')),
                                            cornerRadius(12),
                                        ]}
                                    >
                                        {/* Icon Box */}
                                        <HStack
                                            alignment="center"
                                            modifiers={[
                                                padding({ top: 6, bottom: 6, leading: 8, trailing: 8 }),
                                                background(isSelected ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')),
                                                cornerRadius(8),
                                                frame({ minWidth: 40 }),
                                            ]}
                                        >
                                            <SwiftUIText
                                                size={13}
                                                weight="bold"
                                                color={isSelected ? '#FFFFFF' : textColor}
                                            >
                                                {`.${item.value}`}
                                            </SwiftUIText>
                                        </HStack>

                                        {/* Label & Description */}
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText size={15} weight="medium" color={textColor}>
                                                {item.label}
                                            </SwiftUIText>
                                            <SwiftUIText size={12} weight="regular" color={subtextColor}>
                                                {item.description}
                                            </SwiftUIText>
                                        </VStack>

                                        <Spacer />

                                        {isSelected && (
                                            <Image
                                                systemName="checkmark.circle.fill"
                                                size={20}
                                                color="#007AFF"
                                            />
                                        )}
                                    </HStack>
                                </Button>
                            );
                        })}
                    </List>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
