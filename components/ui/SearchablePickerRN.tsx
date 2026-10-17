import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    SectionList,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderCircleButton } from './HeaderCircleButton';

export interface PickerItem {
    id: string;
    label: string;
    sublabel?: string;
    icon?: string;
    type?: string;
}

export interface PickerSection {
    title: string;
    data: PickerItem[];
}

export interface SearchablePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (item: PickerItem) => void;
    items?: PickerItem[];
    sections?: PickerSection[];
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
    sections,
    title,
    placeholder = "Search...",
    selectedId,
    tintColor
}: SearchablePickerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';

    const activeColor = tintColor || '#0036F8';
    const activeBg = isDark ? 'rgba(0,54,248,0.18)' : 'rgba(0,54,248,0.08)';

    useEffect(() => {
        if (visible) {
            setSearchQuery('');
        }
    }, [visible]);

    const filteredSections = useMemo(() => {
        if (sections && sections.length > 0) {
            return sections
                .map(sec => ({
                    title: sec.title,
                    data: sec.data.filter(item =>
                        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                }))
                .filter(sec => sec.data.length > 0);
        }
        return null;
    }, [sections, searchQuery]);

    const filteredItems = useMemo(() => {
        if (filteredSections) return [];
        const sourceItems = items || [];
        return sourceItems.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [items, filteredSections, searchQuery]);

    const renderItemRow = (item: PickerItem) => {
        const isSelected = item.id === selectedId;
        return (
            <TouchableOpacity
                key={item.id}
                disabled={item.id === 'LOADING'}
                onPress={() => {
                    if (item.id === 'LOADING') return;
                    onSelect(item);
                    onClose();
                }}
                style={[
                    styles.itemRow,
                    {
                        backgroundColor: isSelected 
                            ? activeBg 
                            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)')
                    }
                ]}
            >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {item.sublabel && (
                        <View style={[styles.codeBadge, { backgroundColor: isSelected ? activeColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') }]}>
                            <Text style={[styles.codeText, { color: isSelected ? '#FFFFFF' : textColor }]}>
                                {item.sublabel}
                            </Text>
                        </View>
                    )}
                    <Text style={[styles.itemLabel, { color: isSelected ? activeColor : textColor }]} numberOfLines={1}>
                        {item.label}
                    </Text>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark" size={20} color={activeColor} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View
                    style={[
                        styles.content,
                        {
                            backgroundColor: cardBg,
                            paddingBottom: Math.max(insets.bottom, 16) + 8,
                        }
                    ]}
                >
                    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                            <HeaderCircleButton
                                type="close"
                                onPress={onClose}
                                isDark={isDark}
                                size={32}
                            />
                        </View>

                        {/* Search Bar */}
                        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' }]}>
                            <Ionicons name="search" size={18} color={subtextColor} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.searchInput, { color: textColor }]}
                                placeholder={placeholder}
                                placeholderTextColor={subtextColor}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        {/* List */}
                        {filteredSections ? (
                            <SectionList
                                sections={filteredSections}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingVertical: 4 }}
                                renderSectionHeader={({ section: { title } }) => (
                                    <View style={styles.sectionHeaderContainer}>
                                        <Text style={[styles.sectionHeaderText, { color: subtextColor }]}>
                                            {title}
                                        </Text>
                                    </View>
                                )}
                                renderItem={({ item }) => renderItemRow(item)}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyState}>
                                        <Text style={[styles.emptyText, { color: subtextColor }]}>No results found</Text>
                                    </View>
                                )}
                            />
                        ) : (
                            <FlatList
                                data={filteredItems}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingVertical: 4 }}
                                renderItem={({ item }) => renderItemRow(item)}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyState}>
                                        <Text style={[styles.emptyText, { color: subtextColor }]}>No results found</Text>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    content: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        height: '75%',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 9999,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        padding: 0,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 9999,
        marginBottom: 6,
    },
    itemLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    codeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    emptyState: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
    sectionHeaderContainer: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 6,
        marginBottom: 2,
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
});
