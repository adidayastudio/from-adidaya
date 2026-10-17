import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { StyleSheet, Text, View } from 'react-native';

interface ActivityItem {
    id: string;
    type: 'task' | 'clock' | 'approval' | 'comment';
    user: string;
    initials: string;
    action: string;
    target: string;
    timeAgo: string;
}

const MOCK_ACTIVITY: ActivityItem[] = [
    {
        id: '1',
        type: 'task',
        user: 'Ahmad',
        initials: 'AH',
        action: 'submitted',
        target: 'Foundation Inspection Report',
        timeAgo: '2m ago',
    },
    {
        id: '2',
        type: 'approval',
        user: 'Siti',
        initials: 'ST',
        action: 'approved',
        target: 'Invoice #418 — Ready Mix',
        timeAgo: '45m ago',
    },
    {
        id: '3',
        type: 'clock',
        user: 'Budi',
        initials: 'BD',
        action: 'clocked in',
        target: 'Tower A — Site B',
        timeAgo: '1h ago',
    },
    {
        id: '4',
        type: 'comment',
        user: 'Joko',
        initials: 'JK',
        action: 'commented on',
        target: 'Structural Drawing Rev.3',
        timeAgo: '2h ago',
    },
    {
        id: '5',
        type: 'task',
        user: 'You',
        initials: 'AL',
        action: 'completed',
        target: 'Site Survey — Plot C',
        timeAgo: '3h ago',
    },
];

const TYPE_CONFIG = {
    task: { icon: 'checkmark.circle.fill', color: '#34C759' },
    clock: { icon: 'clock.fill', color: '#5856D6' },
    approval: { icon: 'checkmark.seal.fill', color: '#007AFF' },
    comment: { icon: 'bubble.left.fill', color: '#FF9500' },
};

export function RecentActivityFeed() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <View style={styles.container}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <PlatformIcon
                        name="clock.arrow.circlepath"
                        size={14}
                        tintColor={isDark ? '#5856D6' : '#5856D6'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.sectionTitle, { color: Colors[resolvedTheme].text }]}>
                        Recent Activity
                    </Text>
                </View>
            </View>

            {/* Timeline */}
            <View style={styles.timeline}>
                {MOCK_ACTIVITY.map((item, index) => {
                    const config = TYPE_CONFIG[item.type];
                    const isLast = index === MOCK_ACTIVITY.length - 1;

                    return (
                        <View key={item.id} style={styles.timelineItem}>
                            {/* Timeline Line + Dot */}
                            <View style={styles.timelineLeft}>
                                <View style={[styles.avatarSmall, { backgroundColor: config.color + '1A' }]}>
                                    <Text style={[styles.avatarSmallText, { color: config.color }]}>
                                        {item.initials}
                                    </Text>
                                </View>
                                {!isLast && (
                                    <View
                                        style={[
                                            styles.timelineLine,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                                        ]}
                                    />
                                )}
                            </View>

                            {/* Content */}
                            <View style={styles.timelineContent}>
                                <Text style={[styles.activityText, { color: Colors[resolvedTheme].text }]}>
                                    <Text style={styles.activityUser}>{item.user}</Text>
                                    {' '}{item.action}{' '}
                                    <Text style={[styles.activityTarget, { color: config.color }]}>
                                        {item.target}
                                    </Text>
                                </Text>
                                <Text style={[styles.activityTime, { color: Colors[resolvedTheme].icon }]}>
                                    {item.timeAgo}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    timeline: {},
    timelineItem: {
        flexDirection: 'row',
    },
    timelineLeft: {
        width: 36,
        alignItems: 'center',
        marginRight: 12,
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarSmallText: {
        fontSize: 11,
        fontWeight: '700',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
        borderRadius: 1,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 20,
    },
    activityText: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
    },
    activityUser: {
        fontWeight: '600',
    },
    activityTarget: {
        fontWeight: '600',
    },
    activityTime: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 3,
    },
});
