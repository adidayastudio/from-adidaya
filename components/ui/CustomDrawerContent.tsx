
import { GlassView } from '@/components/ui/GlassView';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BouncyGlassButton } from './BouncyGlassButton';

export function CustomDrawerContent(props: DrawerContentComponentProps) {
    const { resolvedTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const isDark = resolvedTheme === 'dark';
    const router = useRouter();

    const handleNavigation = (path: string) => {
        props.navigation.closeDrawer();
        // In a real app we'd navigate here, e.g. router.push(path as any)
    };

    return (
        <View style={styles.container}>
            <GlassView
                intensity={80}
                tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
                style={[styles.glass, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitials}>US</Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userName} numberOfLines={1}>User Name</Text>
                            <Text style={styles.userRole} numberOfLines={1}>Administrator</Text>
                        </View>
                    </View>
                    <BouncyGlassButton
                        onPress={() => props.navigation.closeDrawer()}
                        variant="close"
                        isDark={isDark}
                        textColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                    />
                </View>

                <View style={styles.menuList}>
                    <DrawerItem
                        icon="doc.text.fill"
                        label="New Document"
                        color="#007AFF"
                        isDark={isDark}
                        resolvedTheme={resolvedTheme}
                        onPress={() => handleNavigation('/new-doc')}
                    />
                    <DrawerItem
                        icon="calendar.badge.plus"
                        label="Schedule Event"
                        color="#FF9500"
                        isDark={isDark}
                        resolvedTheme={resolvedTheme}
                        onPress={() => handleNavigation('/new-event')}
                    />
                    <DrawerItem
                        icon="person.2.fill"
                        label="Add Team Member"
                        color="#34C759"
                        isDark={isDark}
                        resolvedTheme={resolvedTheme}
                        onPress={() => handleNavigation('/new-member')}
                    />
                    <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                    <DrawerItem
                        icon="gearshape.fill"
                        label="Quick Settings"
                        color={Colors[resolvedTheme || 'light'].text}
                        isDark={isDark}
                        resolvedTheme={resolvedTheme}
                        onPress={() => handleNavigation('/settings')}
                    />
                </View>
            </GlassView>
        </View>
    );
}

function DrawerItem({
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
    return (
        <Pressable
            style={({ pressed }) => [
                styles.drawerItem,
                pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '26' }]}>
                <PlatformIcon name={icon as any} size={22} tintColor={color} />
            </View>
            <Text style={[styles.itemText, { color: Colors[(resolvedTheme || 'light') as keyof typeof Colors].text }]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    glass: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    userDetails: {
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
    },
    userRole: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
    menuList: {
        gap: 12,
    },
    drawerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        gap: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemText: {
        fontSize: 17,
        fontWeight: '500',
    },
    separator: {
        height: 1,
        width: '100%',
        marginVertical: 10,
    }
});
