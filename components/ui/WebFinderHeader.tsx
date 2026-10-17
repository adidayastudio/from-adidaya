import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';

import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';

interface WebFinderHeaderProps {
    title: string;
    subtitle?: string;
    actions?: HeaderToolbarAction[];
    onSearch?: () => void;
    onFilter?: () => void;
    filterActive?: boolean;
    onAdd?: () => void;
    centerComponent?: React.ReactNode;
    showBack?: boolean;
    onBack?: () => void;
    primaryActionBgColor?: string;
}

export function WebFinderHeader({
    title,
    subtitle,
    actions,
    onSearch,
    onFilter,
    filterActive = false,
    onAdd,
    centerComponent,
    showBack = false,
    onBack,
    primaryActionBgColor,
}: WebFinderHeaderProps) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { width } = useWindowDimensions();
    const isMobileWeb = width < 768;

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    const fallbackActions: HeaderToolbarAction[] = [];
    if (!actions || actions.length === 0) {
        if (onSearch) {
            fallbackActions.push({
                id: 'search',
                icon: 'search',
                image: 'magnifyingglass',
                onPress: onSearch,
            });
        }
        if (onFilter) {
            fallbackActions.push({
                id: 'filter',
                icon: 'filter-outline',
                image: 'line.3.horizontal.decrease',
                tintColor: filterActive ? '#0036F8' : undefined,
                onPress: onFilter,
            });
        }
        if (onAdd) {
            fallbackActions.push({
                id: 'add',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                onPress: onAdd,
            });
        }
    }

    const effectiveActions = (actions && actions.length > 0) ? actions : fallbackActions;

    if (isMobileWeb) {
        return (
            <View style={styles.mobileContainer}>
                {/* Top Row: Back + Title on Left, Actions Toolbar on Right */}
                <View style={styles.mobileTopRow}>
                    <View style={styles.mobileTitleGroup}>
                        {showBack && (
                            <HeaderCircleButton
                                type="back"
                                onPress={handleBack}
                                isDark={isDark}
                                style={{ marginRight: 8 }}
                            />
                        )}
                        <View style={{ flexShrink: 1 }}>
                            <Text style={[styles.mobilePageTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                                {title}
                            </Text>
                            {Boolean(subtitle) && (
                                <Text style={[styles.mobilePageSubtitle, { color: isDark ? '#A1A1A6' : '#64748B' }]} numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            )}
                        </View>
                    </View>

                    {effectiveActions.length > 0 && (
                        <HeaderToolbar
                            actions={effectiveActions}
                            isDark={isDark}
                            textColor={isDark ? '#FFFFFF' : '#0F172A'}
                            maxDirectActions={effectiveActions.length}
                            primaryActionBgColor={primaryActionBgColor}
                        />
                    )}
                </View>

                {/* Bottom Row: Segmented Control left-aligned underneath */}
                {centerComponent && (
                    <View style={styles.mobileBottomRow}>
                        {centerComponent}
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Left: Back + Page Title & Subtitle */}
            <View style={styles.leftGroup}>
                {showBack && (
                    <HeaderCircleButton
                        type="back"
                        onPress={handleBack}
                        isDark={isDark}
                        style={{ marginRight: 10 }}
                    />
                )}
                <View style={{ flexShrink: 1 }}>
                    <Text style={[styles.pageTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                        {title}
                    </Text>
                    {Boolean(subtitle) && (
                        <Text style={[styles.pageSubtitle, { color: isDark ? '#A1A1A6' : '#64748B' }]} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            {/* Center: Subtab / Filter Segmented Control */}
            <View style={styles.centerGroup}>
                {centerComponent || null}
            </View>

            {/* Right: Actions in unified HeaderToolbar pill */}
            <View style={styles.rightGroup}>
                {effectiveActions.length > 0 && (
                    <HeaderToolbar
                        actions={effectiveActions}
                        isDark={isDark}
                        textColor={isDark ? '#FFFFFF' : '#0F172A'}
                        maxDirectActions={effectiveActions.length}
                        primaryActionBgColor={primaryActionBgColor}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 8,
        width: '100%',
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-start',
    },
    backButton: {
        marginRight: 8,
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    centerGroup: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 2,
    },
    rightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
    },
    mobileContainer: {
        width: '100%',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 6,
        gap: 10,
        zIndex: 10,
    },
    mobileTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: 40,
        minHeight: 40,
    },
    mobileTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        height: 40,
    },
    pageSubtitle: {
        fontSize: 11.5,
        fontWeight: '500',
        letterSpacing: -0.1,
        marginTop: 0.5,
    },
    mobilePageTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
        lineHeight: 20,
    },
    mobilePageSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: -0.1,
        lineHeight: 14,
    },
    mobileBottomRow: {
        width: '100%',
        alignItems: 'stretch',
        justifyContent: 'center',
    },
});
