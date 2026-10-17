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

interface DepartmentResourceCount {
    department: string;
    count: number;
}

interface OverviewMovementSectionProps {
    departments: DepartmentResourceCount[];
    inTransferCount: number;
    assignedToolsCount: number;
    assignedAssetsCount: number;
    onViewTransfers?: () => void;
    onViewCustody?: () => void;
}

export function OverviewMovementSection({
    departments,
    inTransferCount,
    assignedToolsCount,
    assignedAssetsCount,
    onViewTransfers,
    onViewCustody,
}: OverviewMovementSectionProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = (Colors[resolvedTheme as 'light' | 'dark'] || Colors.light).text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';

    return (
        <View style={s.container}>
            <View style={s.headerRow}>
                <Text style={[s.sectionTitle, { color: textColor }]}>Ownership & Movement</Text>
            </View>

            {/* Top Grid: In Transfer & Assigned */}
            <View style={s.gridRow}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (onViewTransfers) onViewTransfers();
                    }}
                    style={[s.tileCard, { backgroundColor: cardBg }]}
                >
                    <View style={s.tileHeader}>
                        <View style={[s.iconBox, { backgroundColor: '#007AFF' + (isDark ? '25' : '15') }]}>
                            <PlatformIcon name="arrow.triangle.2.circlepath" size={16} tintColor="#007AFF" />
                        </View>
                        <Text style={[s.tileValue, { color: textColor }]}>{inTransferCount}</Text>
                    </View>
                    <Text style={[s.tileLabel, { color: textColor }]}>In Transfer</Text>
                    <Text style={[s.tileSub, { color: subtextColor }]}>Pending site handovers</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (onViewCustody) onViewCustody();
                    }}
                    style={[s.tileCard, { backgroundColor: cardBg }]}
                >
                    <View style={s.tileHeader}>
                        <View style={[s.iconBox, { backgroundColor: '#AF52DE' + (isDark ? '25' : '15') }]}>
                            <PlatformIcon name="person.badge.shield.checkmark.fill" size={16} tintColor="#AF52DE" />
                        </View>
                        <Text style={[s.tileValue, { color: textColor }]}>
                            {assignedToolsCount + assignedAssetsCount}
                        </Text>
                    </View>
                    <Text style={[s.tileLabel, { color: textColor }]}>Assigned Custody</Text>
                    <Text style={[s.tileSub, { color: subtextColor }]}>
                        {assignedToolsCount} tools • {assignedAssetsCount} assets
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Department Breakdown Card */}
            <View style={[s.deptCard, { backgroundColor: cardBg }]}>
                <View style={s.deptHeader}>
                    <View style={[s.deptIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                        <PlatformIcon name="building.2.fill" size={15} tintColor={isDark ? '#FFF' : '#1C1C1E'} />
                    </View>
                    <Text style={[s.deptTitle, { color: textColor }]}>Resources by Department</Text>
                </View>

                <View style={s.deptList}>
                    {departments.map((dept, index) => (
                        <View key={dept.department} style={s.deptRow}>
                            <View style={s.deptNameBox}>
                                <View style={[s.deptDot, { backgroundColor: index === 0 ? '#007AFF' : index === 1 ? '#34C759' : index === 2 ? '#FF9500' : '#AF52DE' }]} />
                                <Text style={[s.deptName, { color: textColor }]}>{dept.department}</Text>
                            </View>
                            <Text style={[s.deptCount, { color: subtextColor }]}>{dept.count} items</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 12,
    },
    headerRow: {
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 10,
    },
    tileCard: {
        flex: 1,
        borderRadius: 22,
        padding: 14,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
            },
            android: {
                elevation: 1.5,
            },
        }),
    },
    tileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileValue: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    tileLabel: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    tileSub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    deptCard: {
        borderRadius: 22,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
            },
            android: {
                elevation: 1.5,
            },
        }),
    },
    deptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    deptIconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deptTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    deptList: {
        gap: 8,
    },
    deptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    deptNameBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deptDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    deptName: {
        fontSize: 13,
        fontWeight: '600',
    },
    deptCount: {
        fontSize: 12,
        fontWeight: '500',
    },
});
