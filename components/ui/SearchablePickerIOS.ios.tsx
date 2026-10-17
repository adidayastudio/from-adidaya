import React, { useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Image,
    Button,
    List,
    TextField
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle, disabled } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';

export interface PickerItem {
    id: string;
    label: string;
    sublabel?: string;
    icon?: string;
}

interface SearchablePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (item: PickerItem) => void;
    items: PickerItem[];
    title: string;
    placeholder?: string;
    selectedId?: string;
    tintColor?: string;
}

export function SearchablePicker({
    visible,
    onClose,
    onSelect,
    items,
    title,
    placeholder = "Search...",
    selectedId,
    tintColor
}: SearchablePickerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [searchQuery, setSearchQuery] = useState('');

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';

    const activeColor = tintColor || '#007AFF';
    const activeBg = useMemo(() => {
        if (activeColor.startsWith('#')) {
            const r = parseInt(activeColor.slice(1, 3), 16);
            const g = parseInt(activeColor.slice(3, 5), 16);
            const b = parseInt(activeColor.slice(5, 7), 16);
            const opacity = isDark ? 0.18 : 0.10;
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        return isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)';
    }, [activeColor, isDark]);

    useEffect(() => {
        if (!visible) {
            setSearchQuery('');
        }
    }, [visible]);

    const filteredItems = useMemo(() => {
        return items.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [items, searchQuery]);

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet 
                isOpened={visible}
                presentationDetents={[0.85]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) {
                        onClose();
                    }
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'all' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 10, leading: 24, trailing: 24, bottom: 16 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {title}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Search Bar */}
                    <HStack alignment="center" spacing={8} modifiers={[
                        padding({ horizontal: 16, vertical: 10 }),
                        background(isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)'),
                        cornerRadius(16),
                        padding({ horizontal: 24, bottom: 12 }),
                    ]}>
                        <Image systemName="magnifyingglass" size={18} color={subtextColor} />
                        <TextField
                            placeholder={placeholder}
                            defaultValue={searchQuery}
                            onChangeText={setSearchQuery}
                            modifiers={[
                                frame({ maxWidth: Infinity }),
                                tint(activeColor)
                            ]}
                        />
                    </HStack>

                    {/* List */}
                    <List listStyle="plain" modifiers={[
                        frame({ maxHeight: 480 }),
                        background(sheetBg)
                    ]}>
                        {filteredItems.length === 0 ? (
                            <VStack alignment="center" spacing={8} modifiers={[padding({ vertical: 40 })]}>
                                <SwiftUIText size={16} color={subtextColor}>
                                    No results found
                                </SwiftUIText>
                            </VStack>
                        ) : (
                            filteredItems.map((item) => {
                                const isSelected = item.id === selectedId;
                                return (
                                    <Button
                                        key={item.id}
                                        onPress={() => {
                                            if (item.id === 'LOADING') return;
                                            onSelect(item);
                                            onClose();
                                        }}
                                        modifiers={[
                                            buttonStyle('plain'),
                                            padding({ vertical: 4, horizontal: 24 }),
                                            disabled(item.id === 'LOADING')
                                        ]}
                                    >
                                        <HStack alignment="center" spacing={12} modifiers={[
                                            padding({ top: 12, bottom: 12, leading: 16, trailing: 16 }),
                                            background(isSelected ? activeBg : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)')),
                                            cornerRadius(16),
                                        ]}>
                                            {item.sublabel && (
                                                <HStack alignment="center" modifiers={[
                                                    padding({ horizontal: 10, vertical: 3 }),
                                                    background(isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                                                    cornerRadius(20),
                                                ]}>
                                                    <SwiftUIText size={11} weight="bold" color={textColor}>
                                                        {item.sublabel}
                                                    </SwiftUIText>
                                                </HStack>
                                            )}
                                            
                                            <SwiftUIText size={16} weight="semibold" color={isSelected ? activeColor : textColor}>
                                                {item.label}
                                            </SwiftUIText>
                                            
                                            <Spacer />
                                            
                                            {isSelected && (
                                                <Image systemName="checkmark" size={18} color={activeColor} />
                                            )}
                                        </HStack>
                                    </Button>
                                );
                            })
                        )}
                    </List>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
