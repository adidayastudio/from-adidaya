import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform, StatusBar as RNStatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function CostSystemSettingsScreen() {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const accentColor = '#30D158'; // Green accent for Cost System

    const features = [
        { title: 'Calculation Rules', desc: 'Set formulas for material, labor, and equipment cost items' },
        { title: 'WBS Depth Constraints', desc: 'Configure maximum allowed sub-item depth' },
        { title: 'Budget Validation', desc: 'Define approval flows and budget tolerance checks' },
    ];

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Cost System',
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: Platform.OS === 'ios',
                    headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: accentColor,
                    headerTitleStyle: { color: textColor },
                    headerLargeTitleStyle: { color: textColor },
                    headerShadowVisible: false,
                    headerBackTitle: '',
                }}
            />

            <ScrollView
                style={[styles.scrollView, { backgroundColor: bgColor }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: insets.bottom + 40,
                    paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 16,
                    gap: 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Visual Accent Box */}
                <Animated.View 
                    entering={FadeInDown.duration(400)}
                    style={[styles.heroCard, { backgroundColor: cardBgColor }]}
                >
                    <LinearGradient
                        colors={isDark ? ['rgba(48, 209, 88, 0.15)', 'rgba(48, 209, 88, 0.05)'] : ['rgba(48, 209, 88, 0.08)', 'rgba(48, 209, 88, 0.02)']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
                        <Ionicons name="calculator-outline" size={40} color={accentColor} />
                    </View>
                    <Text style={[styles.heroTitle, { color: textColor }]}>Cost System Settings</Text>
                    <Text style={[styles.heroDesc, { color: subtextColor }]}>
                        Manage custom pricing algorithms, WBS constraints, and validation rules for budget and estimation reports.
                    </Text>
                </Animated.View>

                {/* Features Section */}
                <View style={{ gap: 12 }}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Key Features Included</Text>
                    {features.map((f, idx) => (
                        <Animated.View
                            key={f.title}
                            entering={FadeInDown.delay(100 + idx * 80).duration(300)}
                            style={[styles.featureCard, { backgroundColor: cardBgColor }]}
                        >
                            <View style={styles.bulletPoint}>
                                <Ionicons name="checkmark-circle-outline" size={18} color={accentColor} />
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={[styles.featureTitle, { color: textColor }]}>{f.title}</Text>
                                <Text style={[styles.featureDesc, { color: subtextColor }]}>{f.desc}</Text>
                            </View>
                        </Animated.View>
                    ))}
                </View>

                {/* Status Indicator */}
                <Animated.View 
                    entering={FadeInDown.delay(400).duration(300)}
                    style={styles.statusBox}
                >
                    <Ionicons name="construct-outline" size={18} color="#FF9500" style={{ marginRight: 8 }} />
                    <Text style={styles.statusText}>Under Development • Coming Soon</Text>
                </Animated.View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
    },
    iconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    heroDesc: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 4,
        marginBottom: 4,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    bulletPoint: {
        marginTop: 2,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    featureDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        paddingVertical: 12,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 0, 0.2)',
    },
    statusText: {
        color: '#FF9500',
        fontSize: 13,
        fontWeight: '600',
    },
});
