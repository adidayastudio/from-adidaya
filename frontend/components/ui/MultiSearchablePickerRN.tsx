import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    TouchableWithoutFeedback,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderCircleButton } from './HeaderCircleButton';
import { FormaBlue } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export interface PickerItem {
    id: string;
    label: string;
    sublabel?: string;
    icon?: string;
}

export interface MultiSearchablePickerProps {
    visible: boolean;
    onClose: () => void;
    onSave: (items: PickerItem[]) => void;
    items: PickerItem[];
    title: string;
    placeholder?: string;
    selectedIds: string[];
    tintColor?: string;
    emptyTitle?: string;
    emptySubtitle?: string;
}

export function MultiSearchablePicker({
    visible,
    onClose,
    onSave,
    items,
    title,
    placeholder = "Search...",
    selectedIds = [],
    tintColor,
    emptyTitle,
    emptySubtitle,
}: MultiSearchablePickerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isWeb = Platform.OS === 'web';

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';

    const activeColor = tintColor || '#0036F8';
    const activeBg = isDark ? 'rgba(0,54,248,0.18)' : 'rgba(0,54,248,0.08)';

    useEffect(() => {
        if (visible) {
            setSearchQuery('');
            setLocalSelectedIds(selectedIds);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 1,
                    friction: 9,
                    tension: 65,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible, selectedIds]);

    const handleAnimatedClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 160,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 160,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const filteredItems = useMemo(() => {
        return items.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [items, searchQuery]);

    const toggleSelection = (itemId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLocalSelectedIds(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            } else {
                return [...prev, itemId];
            }
        });
    };

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const selectedItems = items.filter(item => localSelectedIds.includes(item.id));
        onSave(selectedItems);
        handleAnimatedClose();
    };

    return (
        <Modal visible={visible} animationType="none" transparent statusBarTranslucent={true} onRequestClose={handleAnimatedClose}>
            <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
                <TouchableWithoutFeedback onPress={handleAnimatedClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        isWeb ? styles.drawerWeb : styles.content,
                        {
                            backgroundColor: cardBg,
                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isWeb ? 460 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isWeb ? 0 : 350, 0],
                                    }),
                                },
                            ],
                        }
                    ]}
                >
                    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                            <HeaderCircleButton
                                type="close"
                                onPress={handleAnimatedClose}
                                isDark={isDark}
                                size={32}
                            />
                        </View>

                        {/* Search Bar */}
                        <View style={[styles.searchBar, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                            borderWidth: 1,
                        }]}>
                            <Ionicons name="search" size={18} color={subtextColor} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.searchInput, { color: textColor }]}
                                placeholder={placeholder}
                                placeholderTextColor="#8E8E93"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        {/* List */}
                        <FlatList
                            data={filteredItems}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 80, paddingVertical: 4 }}
                            renderItem={({ item }) => {
                                const isSelected = localSelectedIds.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        onPress={() => toggleSelection(item.id)}
                                        style={[
                                            styles.itemRow,
                                            {
                                                backgroundColor: isSelected 
                                                    ? activeBg 
                                                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                                                borderColor: isSelected
                                                    ? activeColor
                                                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                                borderWidth: 1,
                                            }
                                        ]}
                                    >
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            {item.sublabel && (
                                                <View style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                                                    <Text style={[styles.codeText, { color: textColor }]}>
                                                        {item.sublabel}
                                                    </Text>
                                                </View>
                                            )}
                                            <Text style={[styles.itemLabel, { color: isSelected ? activeColor : textColor }]} numberOfLines={1}>
                                                {item.label}
                                            </Text>
                                        </View>
                                        <Ionicons 
                                            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                                            size={22} 
                                            color={isSelected ? activeColor : subtextColor} 
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={() => {
                                const isSearching = searchQuery.trim().length > 0;
                                const isListEmpty = items.length === 0;
                                const titleText = isSearching
                                    ? "No results found"
                                    : (emptyTitle || (isListEmpty ? "No people in this department" : "No results found"));
                                const subtitleText = isSearching
                                    ? `No results matching "${searchQuery}"`
                                    : (emptySubtitle || (isListEmpty ? "Select another project or department to assign tasks" : "Try searching with a different keyword"));

                                return (
                                    <View style={styles.emptyState}>
                                        <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                            <Ionicons 
                                                name={isSearching ? "search-outline" : "people-outline"} 
                                                size={26} 
                                                color={subtextColor} 
                                            />
                                        </View>
                                        <Text style={[styles.emptyText, { color: textColor }]}>
                                            {titleText}
                                        </Text>
                                        <Text style={[styles.emptySubtext, { color: subtextColor }]}>
                                            {subtitleText}
                                        </Text>
                                    </View>
                                );
                            }}
                        />

                        {/* Save Action Footer */}
                        <View style={[styles.footerSection, { 
                            backgroundColor: cardBg,
                            paddingBottom: isWeb ? 16 : Math.max(insets.bottom, 16),
                        }]}>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSave}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.saveBtnText}>Save Selection ({localSelectedIds.length})</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlayWeb: {
        position: 'relative',
        justifyContent: 'flex-start',
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
    drawerWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 440,
        maxWidth: 'calc(100% - 24px)' as any,
        height: 'calc(100% - 24px)' as any,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35), 0 4px 16px rgba(0, 0, 0, 0.15)',
        } as any) : {}),
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
        fontWeight: '400',
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
        paddingVertical: 48,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 15.5,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 13,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 18,
    },
    footerSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    saveBtn: {
        height: 50,
        borderRadius: 25,
        backgroundColor: FormaBlue[700],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    }
});
