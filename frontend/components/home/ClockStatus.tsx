import { BlurView } from 'expo-blur';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ClockStatus() {
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';

    return (
        <View style={styles.container}>
            <BlurView
                intensity={60}
                tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
                style={styles.card}
            >
                <View style={styles.leftContent}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? '#3A3A3C' : '#F2F2F7' }]}>
                        <PlatformIcon
                            name="clock"
                            size={24}
                            tintColor={Colors[colorScheme].text}
                            resizeMode="scaleAspectFit"
                            style={{ opacity: 0.5 }}
                        />
                    </View>
                    <View style={styles.textStack}>
                        <Text style={[styles.statusLabel, { color: Colors[colorScheme].icon }]}>OFFLINE</Text>
                        <Text style={[styles.timer, { color: Colors[colorScheme].text }]}>00:00:00</Text>
                    </View>
                </View>

                <Pressable style={({ pressed }) => [styles.clockInButton, { opacity: pressed ? 0.8 : 1 }]}>
                    <PlatformIcon name="play.fill" size={16} tintColor="white" style={{ marginRight: 6 }} />
                    <Text style={styles.buttonText}>Clock In</Text>
                </Pressable>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 24,
        overflow: 'hidden',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textStack: {
        justifyContent: 'center',
    },
    statusLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    timer: {
        fontSize: 24,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.5,
    },
    clockInButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    }
});
