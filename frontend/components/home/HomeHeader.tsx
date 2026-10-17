import { useTheme } from '@/context/ThemeContext';
import { StyleSheet, Text, View } from 'react-native';

export function HomeHeader() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    // Mock User Data
    const initials = "AL";

    return (
        <View style={styles.container}>
            {/* Minimal Premium Avatar */}
            <View style={styles.avatarWrapper}>
                <View style={[styles.bloom, { shadowColor: isDark ? '#2C5BFF' : '#007AFF' }]} />
                <View style={[styles.squircleAvatar, { backgroundColor: isDark ? '#2C5BFF' : '#007AFF' }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    avatarWrapper: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bloom: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    squircleAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});


