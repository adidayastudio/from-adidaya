import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

import { Host, Button as SwiftUIButton, SwiftUIText } from '@/lib/swiftui';

interface MemberProfileSectionHeaderProps {
    title: string;
    showEdit?: boolean;
    isEditing?: boolean;
    onToggleEdit?: (section: string) => void;
    sectionTitleColor: string;
    isDark: boolean;
}

export const MemberProfileSectionHeader: React.FC<MemberProfileSectionHeaderProps> = ({
    title,
    showEdit = true,
    isEditing = false,
    onToggleEdit,
    sectionTitleColor,
    isDark,
}) => {
    return (
        <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>{title}</Text>
            {showEdit && onToggleEdit && (
                Platform.OS === 'ios' && process.env.EXPO_OS === 'ios' ? (
                    <View style={{ height: 22, width: 64 }}>
                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                            <SwiftUIButton
                                onPress={() => onToggleEdit(title)}
                                controlSize="mini"
                                variant="glassProminent"
                                color="#007AFF"
                            >
                                <SwiftUIText size={11} weight="semibold" color="#FFFFFF">
                                    {isEditing ? 'Cancel' : 'Edit'}
                                </SwiftUIText>
                            </SwiftUIButton>
                        </Host>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            s.editButtonGlass,
                            {
                                backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)',
                                borderColor: isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0, 122, 255, 0.18)',
                            },
                        ]}
                        onPress={() => onToggleEdit(title)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.editTextGlass, { color: isDark ? '#409CFF' : '#007AFF' }]}>
                            {isEditing ? 'Cancel' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                )
            )}
        </View>
    );
};

const s = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '400',
        textTransform: 'none',
    },
    editButtonGlass: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    editTextGlass: {
        fontSize: 12,
        fontWeight: '600',
    },
});
