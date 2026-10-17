import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function UIPlaygroundAddScreen() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    // Using system material for the best native glass feel
    const tint = isDark ? 'systemMaterialDark' : 'systemMaterialLight';
    const textColor = Colors[(resolvedTheme || 'light') as keyof typeof Colors].text;

    return (
        /* 
           UNIFIED LIQUID GLASS ROOT:
           We use a significantly more opaque background (0.85) to "kill" the split
           from the background screen while still feeling like glass.
        */
        <View style={[styles.container, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}>
            <BlurView
                intensity={100}
                tint={tint}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Create New</Text>
                    <Pressable onPress={() => router.back()} style={styles.closeButton}>
                        <PlatformIcon
                            name="xmark.circle.fill"
                            size={28}
                            tintColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}
                        />
                    </Pressable>
                </View>

                <View style={styles.menuList}>
                    <ActionItem
                        icon="doc.text.fill"
                        label="New Document"
                        color="#007AFF"
                        isDark={isDark}
                        resolvedTheme={resolvedTheme}
                        onPress={() => router.back()}
                    />
                    <ActionItem
                        icon="calendar.badge.plus"
                        label="Schedule Event"
                        color="#FF9500"
                        isDark={isDark}
                        resolvedTheme={resolvedTheme}
                        onPress={() => router.back()}
                    />
                    <ActionItem
                        icon="person.2.fill"
                        label="Add Team Member"
                        color="#34C759"
                        isDark={isDark}
                        resolvedTheme={resolvedTheme}
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        </View>
    );
}

function ActionItem({
    icon,
    label,
    color,
    isDark,
    resolvedTheme,
    onPress,
}: {
    icon: string;
    label: string;
    color: string;
    isDark: boolean;
    resolvedTheme: string | null;
    onPress: () => void;
}) {
    const textColor = Colors[(resolvedTheme || 'light') as keyof typeof Colors].text;
    return (
        <Pressable
            style={({ pressed }) => [
                styles.actionItem,
                pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <PlatformIcon name={icon as any} size={24} tintColor={color} />
            </View>
            <Text style={[styles.itemText, { color: textColor }]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // The background color is handled dynamically in the component root
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 30,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    menuList: {
        gap: 16,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemText: {
        fontSize: 18,
        fontWeight: '600',
    },
});
