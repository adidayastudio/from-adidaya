import { router } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function TaskDashboard() {
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            {/* Switcher Header */}
            <View style={styles.switcherContainer}>
                <Pressable style={styles.switcherActive}>
                    <PlatformIcon name="checkmark.square.fill" size={16} tintColor="#007AFF" style={{ marginRight: 6 }} />
                    <Text style={styles.activeText}>Tasks</Text>
                </Pressable>
                <Pressable style={styles.switcherInactive}>
                    <PlatformIcon name="folder" size={16} tintColor="#8E8E93" style={{ marginRight: 6 }} />
                    <Text style={styles.inactiveText}>Projects</Text>
                </Pressable>
            </View>

            {/* Empty State */}
            <View style={styles.emptyState}>
                <PlatformIcon
                    name="tray"
                    size={48}
                    tintColor={Colors[colorScheme].icon}
                    style={{ opacity: 0.3, marginBottom: 16 }}
                />
                <Text style={[styles.emptyText, { color: Colors[colorScheme].icon }]}>
                    No tasks due today 🎉
                </Text>

                <Pressable style={styles.linkButton} onPress={() => router.push('/tasks')}>
                    <Text style={styles.linkText}>View All Tasks</Text>
                    <PlatformIcon name="arrow.right" size={12} tintColor="#007AFF" />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 6, // Padding for the segment control look
        marginBottom: 40,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
    },
    switcherContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(118, 118, 128, 0.12)',
        borderRadius: 18,
        padding: 2,
        marginBottom: 20,
    },
    switcherActive: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        paddingVertical: 10,
        // Shadow for active segment
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    switcherInactive: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    activeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    inactiveText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E8E93',
    },
    emptyState: {
        alignItems: 'center',
        paddingBottom: 24,
        paddingTop: 10,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 20,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    linkText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#007AFF',
    }

});
