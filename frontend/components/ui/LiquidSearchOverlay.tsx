import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Keyboard, Platform } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SHOW_SEARCH_TAB } from '@/app/(tabs)/_layout';

export function LiquidSearchOverlay() {
    const { isSearchVisible, setIsSearchVisible, searchQuery, setSearchQuery, activeModule } = useSearch();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    if (!isSearchVisible || activeModule === 'tasks') return null;

    // Resolve icon for contextual search capsule
    const getActiveIcon = (mod: string) => {
        switch (mod) {
            case 'projects':
            case 'project': return "briefcase.fill";
            case 'tasks':
            case 'task': return "checkmark.circle.fill";
            case 'actions':
            case 'action': return "bolt.fill";
            case 'finance': return "creditcard.fill";
            case 'people': return "person.2.fill";
            case 'resources': return "shippingbox.fill";
            case 'clock': return "clock.fill";
            case 'crew': return "person.3.fill";
            case 'home': return "house.fill";
            default: return "briefcase.fill";
        }
    };

    const activeIcon = getActiveIcon(activeModule);

    return (
        <Animated.View
            entering={SlideInDown.damping(20).stiffness(150)}
            exiting={SlideOutDown.duration(250)}
            style={[
                styles.searchOverlay,
                {
                    bottom: keyboardHeight > 0 ? keyboardHeight + 16 : 0,
                    paddingBottom: keyboardHeight > 0 ? 0 : (insets.bottom > 0 ? insets.bottom + 12 : 20)
                }
            ]}
        >
            <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.searchContainer}>
                {/* The circular icon on the left (briefcase/house) */}
                <View style={[styles.moduleIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                    <PlatformIcon name={activeIcon as any} size={20} tintColor={isDark ? '#FFF' : '#000'} />
                </View>

                {/* The search bar itself */}
                <View style={[styles.middleSearchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(142,142,147,0.12)' }]}>
                    <Ionicons name="search" size={16} color={isDark ? '#8E8E93' : '#6e6e73'} style={{ marginLeft: 10, marginRight: 6 }} />
                    <TextInput
                        autoFocus
                        placeholder="Search..."
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        style={[styles.searchInput, { color: isDark ? '#FFF' : '#000' }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
                            <Ionicons name="close-circle" size={16} color={isDark ? '#8E8E93' : '#6e6e73'} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Cancel Button */}
                <TouchableOpacity
                    onPress={() => {
                        setIsSearchVisible(false);
                        setSearchQuery('');
                    }}
                    style={styles.cancelButton}
                >
                    <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 16 }}>
                        Cancel
                    </Text>
                </TouchableOpacity>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    searchOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        paddingHorizontal: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 28,
        paddingHorizontal: 8,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(128,128,128,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    moduleIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    middleSearchBar: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
    },
    cancelButton: {
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
});
