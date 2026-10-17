import React, { useState, useEffect, useMemo } from 'react';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    TextField,
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
    tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { CURRENCY_OPTIONS, CurrencyOption } from '@/lib/api/financeSetup';

export interface FinanceCurrencySheetProps {
    visible: boolean;
    onClose: () => void;
    selectedCode: string;
    onSelect: (option: CurrencyOption) => void;
}

export const FinanceCurrencySheet: React.FC<FinanceCurrencySheetProps> = ({
    visible,
    onClose,
    selectedCode,
    onSelect,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const sheetBg = 'clear';

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!visible) {
            setSearchQuery('');
        }
    }, [visible]);

    const filteredCurrencies = useMemo(() => {
        if (!searchQuery.trim()) return CURRENCY_OPTIONS;
        const q = searchQuery.toLowerCase().trim();
        return CURRENCY_OPTIONS.filter(
            (c) =>
                c.code.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q) ||
                c.symbol.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    return (
        <Host
            style={{ position: 'absolute', width: 0, height: 0 }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85]}
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
                                Select Base Currency
                            </SwiftUIText>
                            <SwiftUIText size={13} weight="regular" color={subtextColor}>
                                Default currency used across Finance
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

                    {/* Search Field */}
                    <HStack
                        alignment="center"
                        spacing={8}
                        modifiers={[
                            padding({ horizontal: 16, vertical: 10 }),
                            background(isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)'),
                            cornerRadius(16),
                            padding({ horizontal: 20, bottom: 12 }),
                        ]}
                    >
                        <Image systemName="magnifyingglass" size={16} color={subtextColor} />
                        <TextField
                            placeholder="Search currency code, name or symbol..."
                            defaultValue={searchQuery}
                            onChangeText={setSearchQuery}
                            modifiers={[
                                frame({ maxWidth: Infinity }),
                                tint('#007AFF'),
                            ]}
                        />
                    </HStack>

                    {/* Currency List */}
                    <List
                        listStyle="plain"
                        modifiers={[
                            frame({ maxHeight: 520 }),
                            background(sheetBg),
                        ]}
                    >
                        {filteredCurrencies.map((item) => {
                            const isSelected = item.code === selectedCode;
                            const activeBg = isDark
                                ? 'rgba(0, 122, 255, 0.18)'
                                : 'rgba(0, 122, 255, 0.10)';

                            return (
                                <Button
                                    key={item.code}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        onSelect(item);
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
                                        {/* Code Badge */}
                                        <HStack
                                            alignment="center"
                                            modifiers={[
                                                padding({ top: 6, bottom: 6, leading: 8, trailing: 8 }),
                                                background(isSelected ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')),
                                                cornerRadius(8),
                                                frame({ minWidth: 46 }),
                                            ]}
                                        >
                                            <SwiftUIText
                                                size={13}
                                                weight="bold"
                                                color={isSelected ? '#FFFFFF' : textColor}
                                            >
                                                {item.code}
                                            </SwiftUIText>
                                        </HStack>

                                        {/* Name & Symbol */}
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText size={15} weight="medium" color={textColor}>
                                                {item.name}
                                            </SwiftUIText>
                                            <SwiftUIText size={12} weight="regular" color={subtextColor}>
                                                {`Symbol: ${item.symbol}`}
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

export const FinanceCurrencySheetIOS = FinanceCurrencySheet;
