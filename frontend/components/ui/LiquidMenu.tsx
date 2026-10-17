import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface MenuItem {
    id: string;
    title: string;
    icon?: string; // Ionicon name
    symbol?: string; // SF Symbol name
    isActive?: boolean;
    isDestructive?: boolean;
    onPress: () => void;
    showCheckmark?: boolean;
}

export interface MenuSection {
    id: string;
    title?: string;
    items: MenuItem[];
}

interface LiquidMenuProps {
    isVisible: boolean;
    onClose: () => void;
    sections: MenuSection[];
    triggerLayout?: { x: number, y: number, width: number, height: number };
    align?: 'left' | 'right';
}

export function LiquidMenu({ isVisible, onClose, sections, triggerLayout, align = 'right' }: LiquidMenuProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const scale = useSharedValue(0.9);
    const opacity = useSharedValue(0);

    // Track which sections are collapsed
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isVisible) {
            // "Zoom out" effect slightly, tight spring (snappy but not overly bouncy)
            scale.value = withSpring(1, {
                damping: 24,
                stiffness: 250,
                mass: 0.5
            });
            opacity.value = withTiming(1, { duration: 150 });
        } else {
            scale.value = withTiming(0.9, { duration: 120 });
            opacity.value = withTiming(0, { duration: 120 });
        }
    }, [isVisible]);

    const toggleSection = (sectionId: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    // Calculate position with safe area constraints
    const menuWidth = 240;
    const isValidLayout = triggerLayout && triggerLayout.width > 0 && triggerLayout.height > 0;

    // Position below trigger or fallback
    const baseTop = isValidLayout ? triggerLayout.y + triggerLayout.height + 8 : insets.top + 60;

    // Constraint: BATAS ATAS (Jangan melebihi layar/status bar)
    // Even if trigger is very high, we force it to respect insets.top + margin
    const top = Math.max(baseTop, insets.top + 8);

    // Horizontal positioning
    const left = isValidLayout ? Math.max(8, triggerLayout.x) : 16;
    const right = isValidLayout ? Math.max(8, SCREEN_WIDTH - (triggerLayout.x + triggerLayout.width)) : 16;

    // BATAS BAWAH (Screen height - bottom insets - safety margin)
    const maxHeight = SCREEN_HEIGHT - top - insets.bottom - 40;

    return (
        <Modal
            transparent
            visible={isVisible}
            onRequestClose={onClose}
            animationType="none"
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View
                    style={[
                        styles.menuWrapper,
                        {
                            top,
                            width: menuWidth,
                            maxHeight,
                            ...(align === 'left' ? { left } : { right }),
                        },
                        animatedStyle,
                    ]}
                >
                    <BlurView
                        intensity={65}
                        tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                        style={StyleSheet.absoluteFill}
                    />
                    <ScrollView
                        style={styles.internalContainer}
                        contentContainerStyle={{ paddingVertical: 4 }}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {sections.map((section, sIdx) => {
                            const isCollapsed = collapsedSections[section.id];
                            return (
                                <View key={section.id} style={sIdx > 0 && styles.sectionSeparator}>
                                    {section.title && (
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => toggleSection(section.id)}
                                            style={styles.sectionHeader}
                                        >
                                            <Text style={[styles.sectionTitle, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
                                                {section.title.toUpperCase()}
                                            </Text>
                                            <Ionicons
                                                name={isCollapsed ? "chevron-forward" : "chevron-down"}
                                                size={12}
                                                color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                            />
                                        </TouchableOpacity>
                                    )}

                                    {!isCollapsed && section.items.map((item, iIdx) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.menuItem}
                                            onPress={() => {
                                                item.onPress();
                                                onClose();
                                            }}
                                            activeOpacity={0.6}
                                        >
                                            <View style={styles.itemRow}>
                                                {/* Left: Checkmark */}
                                                <View style={styles.checkmarkIconSlot}>
                                                    {item.isActive && (
                                                        <Ionicons name="checkmark" size={16} color={isDark ? '#FFF' : '#007AFF'} />
                                                    )}
                                                </View>

                                                {/* Middle: Icon */}
                                                <View style={styles.iconSlot}>
                                                    {item.symbol ? (
                                                        <PlatformIcon name={item.symbol as any} size={18} tintColor={item.isDestructive ? '#FF3B30' : (isDark ? '#FFF' : '#1C1C1E')} />
                                                    ) : item.icon ? (
                                                        <Ionicons name={item.icon as any} size={18} color={item.isDestructive ? '#FF3B30' : (isDark ? '#FFF' : '#1C1C1E')} />
                                                    ) : null}
                                                </View>

                                                {/* Right: Label */}
                                                <Text
                                                    numberOfLines={1}
                                                    style={[
                                                        styles.itemText,
                                                        { color: item.isDestructive ? '#FF3B30' : (isDark ? '#FFF' : '#1C1C1E') },
                                                        item.isActive && styles.activeItemText
                                                    ]}
                                                >
                                                    {item.title}
                                                </Text>
                                            </View>
                                            {iIdx < section.items.length - 1 && (
                                                <View style={[styles.itemSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            );
                        })}
                    </ScrollView>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    menuWrapper: {
        position: 'absolute',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 1000,
    },
    internalContainer: {
        flexGrow: 0,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 12,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '600',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        letterSpacing: 0.5,
    },
    sectionSeparator: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.1)',
        marginTop: 4,
    },
    menuItem: {
        paddingHorizontal: 12,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
    },
    checkmarkIconSlot: {
        width: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSlot: {
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    itemText: {
        fontSize: 14,
        fontWeight: '400',
        flex: 1,
    },
    activeItemText: {
        fontWeight: '600',
    },
    itemSeparator: {
        height: StyleSheet.hairlineWidth,
        position: 'absolute',
        bottom: 0,
        left: 54,
        right: 0,
    }
});
