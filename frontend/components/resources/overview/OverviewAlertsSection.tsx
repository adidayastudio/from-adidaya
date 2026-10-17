import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

export interface ResourceAlertItem {
    id: string;
    type: 'low_stock' | 'out_of_stock' | 'damaged' | 'unmatched' | 'duplicates';
    title: string;
    subtitle: string;
    count: number;
    severity: 'warning' | 'error' | 'info';
    onPress?: () => void;
}

interface OverviewAlertsSectionProps {
    alerts: ResourceAlertItem[];
}

export function OverviewAlertsSection({ alerts }: OverviewAlertsSectionProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = (Colors[resolvedTheme as 'light' | 'dark'] || Colors.light).text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';

    // Only display when there are active issues
    const activeAlerts = alerts.filter(a => a.count > 0);
    if (activeAlerts.length === 0) return null;

    const totalIssues = activeAlerts.reduce((sum, a) => sum + a.count, 0);

    return (
        <View style={s.container}>
            <View style={s.headerRow}>
                <Text style={[s.sectionTitle, { color: textColor }]}>Resource Alerts</Text>
                <Text style={[s.totalText, { color: '#FF3B30' }]}>
                    {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'}
                </Text>
            </View>

            <View style={s.list}>
                {activeAlerts.map((alert) => {
                    const countColor = alert.severity === 'error' ? '#FF3B30' : '#FF9500';

                    return (
                        <TouchableOpacity
                            key={alert.id}
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (alert.onPress) alert.onPress();
                            }}
                            style={[s.card, { backgroundColor: cardBg }]}
                        >
                            <View style={s.cardBody}>
                                <View style={s.leftCol}>
                                    <Text style={[s.title, { color: textColor }]} numberOfLines={1}>
                                        {alert.title}
                                    </Text>
                                    <Text style={[s.subtitle, { color: subtextColor }]} numberOfLines={1}>
                                        {alert.subtitle}
                                    </Text>
                                </View>

                                <View style={s.rightCol}>
                                    <Text style={[s.countText, { color: countColor }]}>
                                        {alert.count}
                                    </Text>
                                    <PlatformIcon
                                        name="chevron.right"
                                        size={12}
                                        tintColor={isDark ? '#6E6E73' : '#AEAEB2'}
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    totalText: {
        fontSize: 13,
        fontWeight: '600',
    },
    list: {
        gap: 8,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    leftCol: {
        flex: 1,
        gap: 3,
        minWidth: 0,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    rightCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    countText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
