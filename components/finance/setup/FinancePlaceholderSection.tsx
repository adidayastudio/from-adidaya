import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';

const PLACEHOLDER_SORT_OPTIONS = ['Name (A to Z)', 'Name (Z to A)', 'Code (A to Z)'];

interface FinancePlaceholderSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    icon: string;
    title: string;
    description: string;
    statusText?: string;
}

export function FinancePlaceholderSection({
    isDark,
    textColor,
    subtextColor,
    icon,
    title,
    description,
    statusText = 'Not configured yet',
}: FinancePlaceholderSectionProps) {
    const intensity = isDark ? 10 : 25;
    const [searchQuery, setSearchQuery] = useState('');
    const [sortIndex, setSortIndex] = useState(0);

    return (
        <View style={s.container}>
            {/* Search & Sort Bar (Borderless Pills + Native Menu Picker) */}
            <View style={s.filterRow}>
                {/* Search Input Box */}
                <GlassView
                    intensity={intensity}
                    style={[
                        s.searchBar,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)',
                        },
                    ]}
                >
                    <PlatformIcon name="magnifyingglass" size={15} tintColor={subtextColor} />
                    <TextInput
                        style={[s.searchInput, { color: textColor }]}
                        placeholder={`Search ${title.toLowerCase()}...`}
                        placeholderTextColor={subtextColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && Platform.OS === 'android' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <PlatformIcon name="xmark.circle.fill" size={15} tintColor={subtextColor} />
                        </TouchableOpacity>
                    )}
                </GlassView>

                {/* Native Variant Menu Sort Picker */}
                <SortMenuPicker
                    options={PLACEHOLDER_SORT_OPTIONS}
                    selectedIndex={sortIndex}
                    onSelect={(idx) => {
                        Haptics.selectionAsync();
                        setSortIndex(idx);
                    }}
                    isDark={isDark}
                    textColor={textColor}
                />
            </View>

            {/* Placeholder Minimal Card */}
            <GlassView
                intensity={intensity}
                style={[
                    s.card,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)',
                    },
                ]}
            >
                <View style={s.contentRow}>
                    <View
                        style={[
                            s.iconBox,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.05)',
                            },
                        ]}
                    >
                        <PlatformIcon
                            name={icon as any}
                            size={18}
                            tintColor={textColor}
                        />
                    </View>

                    <View style={s.textCol}>
                        <View style={s.titleRow}>
                            <Text style={[s.titleText, { color: textColor }]}>{title}</Text>
                            <View
                                style={[
                                    s.statusPill,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'rgba(0, 0, 0, 0.06)',
                                    },
                                ]}
                            >
                                <Text style={[s.statusText, { color: subtextColor }]}>
                                    {statusText}
                                </Text>
                            </View>
                        </View>
                        <Text style={[s.descriptionText, { color: subtextColor }]}>
                            {description}
                        </Text>
                    </View>
                </View>
            </GlassView>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        width: '100%',
        gap: 12,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 42,
        borderRadius: 21,
        borderWidth: 0,
        paddingHorizontal: 14,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    textCol: {
        flex: 1,
        gap: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    titleText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '500',
    },
    descriptionText: {
        fontSize: 13,
        lineHeight: 18,
    },
});
