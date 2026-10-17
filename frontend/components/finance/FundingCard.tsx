import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FundingCardProps {
    id: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    balance?: number;
    colors: string[];
    onPress?: () => void;
}

export const FundingCard: React.FC<FundingCardProps> = ({
    bankName,
    accountName,
    accountNumber,
    balance,
    colors,
    onPress,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [isVisible, setIsVisible] = useState(false);

    // Bouncy animation values
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.96, {
            damping: 15,
            stiffness: 300,
        });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {
            damping: 10,
            stiffness: 250,
        });
    };

    const maskAccountNumber = (num: string) => {
        if (!isVisible) {
            // Grouping for masked look: •••• •••• •••• 1234
            return `••••  ••••  ••••  ${num.slice(-4)}`;
        }
        // Grouping 4 digits for readability
        return num.replace(/(.{4})/g, '$1  ').trim();
    };

    const formatCurrency = (amount: number) => {
        if (!isVisible) return '*** *** ***';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount).replace('IDR', 'Rp');
    };

    // Determine watermark icon based on bank name
    const getBankIcon = () => {
        const name = bankName.toLowerCase();
        if (name.includes('bca')) return 'building.columns.fill';
        if (name.includes('mandiri')) return 'star.fill';
        if (name.includes('bri')) return 'globe.americas.fill';
        if (name.includes('bni')) return 'shield.fill';
        return 'creditcard.fill';
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
                styles.wrapper,
                animatedStyle,
                { shadowColor: colors[0] } // Dynamic shadow color matching the card
            ]}
        >
            <LinearGradient
                colors={colors as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                {/* Premium Watermark */}
                <View style={styles.watermarkContainer}>
                    <PlatformIcon
                        name={getBankIcon() as any}
                        size={180}
                        tintColor="rgba(255, 255, 255, 0.12)"
                        style={styles.watermark}
                    />
                </View>

                {/* Card Reflections / Rim */}
                <View style={styles.cardReflections}>
                    <View style={styles.reflectionTop} />
                    <View style={styles.rimOverlay} />
                </View>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.bankInfo}>
                            <Text style={styles.bankName}>{bankName}</Text>
                            <View style={styles.debitBadge}>
                                <Text style={styles.cardType}>DEBIT</Text>
                            </View>
                        </View>
                        <View style={styles.chipWrapper}>
                            <LinearGradient
                                colors={['#F9D423', '#FF4E50']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.chip}
                            />
                        </View>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.accountNumber} numberOfLines={1}>{maskAccountNumber(accountNumber)}</Text>

                        <View style={styles.balanceRow}>
                            <View>
                                <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
                                <Text style={styles.balanceValue}>
                                    {balance !== undefined ? formatCurrency(balance) : 'NO DATA'}
                                </Text>
                            </View>
                            <Pressable
                                hitSlop={20}
                                onPress={() => setIsVisible(!isVisible)}
                                style={styles.eyeButton}
                            >
                                <View style={styles.eyeBg}>
                                    <PlatformIcon
                                        name={isVisible ? 'eye.slash.fill' : 'eye.fill'}
                                        size={18}
                                        tintColor="#FFFFFF"
                                    />
                                </View>
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.accountName} numberOfLines={1}>{accountName.toUpperCase()}</Text>
                        <View style={styles.visaContainer}>
                            <PlatformIcon name="wave.3.forward" size={16} tintColor="rgba(255, 255, 255, 0.5)" />
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        marginBottom: 20,
        borderRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
    },
    container: {
        width: '100%',
        aspectRatio: 1.58,
        borderRadius: 24,
        overflow: 'hidden',
    },
    watermarkContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    watermark: {
        position: 'absolute',
        right: -30,
        bottom: -40,
        transform: [{ rotate: '-15deg' }],
    },
    cardReflections: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'none',
    },
    reflectionTop: {
        width: '150%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.08)',
        position: 'absolute',
        top: '-40%',
        left: '-30%',
        transform: [{ rotate: '45deg' }],
    },
    rimOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 24,
    },
    content: {
        ...StyleSheet.absoluteFillObject,
        padding: 24,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    bankInfo: {
        flex: 1,
    },
    bankName: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    debitBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    cardType: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 2,
    },
    chipWrapper: {
        padding: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    chip: {
        width: 48,
        height: 36,
        borderRadius: 6,
    },
    body: {
        marginTop: 10,
    },
    accountNumber: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '600',
        letterSpacing: 2,
        fontFamily: 'Courier',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    balanceValue: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        marginTop: 2,
    },
    eyeButton: {
        marginRight: -4,
    },
    eyeBg: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        padding: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    accountName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        flex: 1,
        paddingRight: 10,
        opacity: 0.9,
    },
    visaContainer: {
        opacity: 0.6,
    },
});
