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
import { TIMEZONE_OPTIONS, TimezoneOption } from '@/lib/api/financeSetup';

export interface FinanceTimezoneSheetProps {
    visible: boolean;
    onClose: () => void;
    selectedId: string;
    onSelect: (option: TimezoneOption) => void;
}

export const FinanceTimezoneSheet: React.FC<FinanceTimezoneSheetProps> = ({
    visible,
    onClose,
    selectedId,
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

    const filteredTimezones = useMemo(() => {
        if (!searchQuery.trim()) return TIMEZONE_OPTIONS;
        const q = searchQuery.toLowerCase().trim();
        return TIMEZONE_OPTIONS.filter(
            (tz) =>
                tz.id.toLowerCase().includes(q) ||
                tz.label.toLowerCase().includes(q) ||
                tz.region.toLowerCase().includes(q) ||
                tz.gmtOffset.toLowerCase().includes(q)
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
                                Select Time Zone
                            </SwiftUIText>
                            <SwiftUIText size={13} weight="regular" color={subtextColor}>
                                Used for Finance dates, due dates & schedules
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
                            placeholder="Search timezone, city, or GMT offset..."
                            defaultValue={searchQuery}
                            onChangeText={setSearchQuery}
                            modifiers={[
                                frame({ maxWidth: Infinity }),
                                tint('#007AFF'),
                            ]}
                        />
                    </HStack>

                    {/* Timezone List */}
                    <List
                        listStyle="plain"
                        modifiers={[
                            frame({ maxHeight: 520 }),
                            background(sheetBg),
                        ]}
                    >
                        {filteredTimezones.map((item) => {
                            const isSelected = item.id === selectedId;
                            const activeBg = isDark
                                ? 'rgba(0, 122, 255, 0.18)'
                                : 'rgba(0, 122, 255, 0.10)';

                            return (
                                <Button
                                    key={item.id}
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
                                        {/* Offset Badge */}
                                        <HStack
                                            alignment="center"
                                            modifiers={[
                                                padding({ top: 6, bottom: 6, leading: 8, trailing: 8 }),
                                                background(isSelected ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')),
                                                cornerRadius(8),
                                                frame({ minWidth: 64 }),
                                            ]}
                                        >
                                            <SwiftUIText
                                                size={12}
                                                weight="bold"
                                                color={isSelected ? '#FFFFFF' : textColor}
                                            >
                                                {item.gmtOffset}
                                            </SwiftUIText>
                                        </HStack>

                                        {/* Label & Region */}
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText size={15} weight="medium" color={textColor}>
                                                {item.label}
                                            </SwiftUIText>
                                            <SwiftUIText size={12} weight="regular" color={subtextColor}>
                                                {item.region}
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

export const FinanceTimezoneSheetIOS = FinanceTimezoneSheet;
