import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { StyleSheet, Text, View } from 'react-native';
import { LiquidCard } from '../ui/LiquidCard';
import { ProgressRing } from '../ui/ProgressRing';

interface InsightCardProps {
    title: string;
    icon: string;
    insight: string;
    children: React.ReactNode;
    tintColor?: string;
}

function BaseInsightCard({ title, icon, insight, children, tintColor }: InsightCardProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <LiquidCard
            variant="tinted"
            tintColor={tintColor}
            style={styles.card}
            contentStyle={styles.cardContent}
        >
            <View style={styles.header}>
                <PlatformIcon
                    name={icon as any}
                    size={20}
                    tintColor={tintColor || (isDark ? '#fff' : '#000')}
                />
                <Text style={[styles.title, { color: Colors[resolvedTheme].text }]}>{title}</Text>
            </View>

            <View style={styles.body}>
                {children}
            </View>

            <View style={[styles.footer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.insight, { color: Colors[resolvedTheme].icon }]}>{insight}</Text>
            </View>
        </LiquidCard>
    );
}

export function TaskPulseCard() {
    const { resolvedTheme } = useTheme();
    const progress = 7 / 12;

    return (
        <BaseInsightCard
            title="Task Pulse"
            icon="checkmark.circle.fill"
            insight="You are on track for today's deadline."
            tintColor="#34C759"
        >
            <View style={styles.row}>
                <ProgressRing
                    progress={Math.round(progress * 100)}
                    size={60}
                    strokeWidth={6}
                />
                <View style={styles.statsContainer}>
                    <Text style={[styles.mainValue, { color: Colors[resolvedTheme].text }]}>7/12</Text>
                    <Text style={[styles.subValue, { color: Colors[resolvedTheme].icon }]}>Tasks Completed</Text>
                </View>
            </View>
        </BaseInsightCard>
    );
}

export function ProjectProgressCard() {
    const { resolvedTheme } = useTheme();

    return (
        <BaseInsightCard
            title="Project Progress"
            icon="briefcase.fill"
            insight="Milestone 'Deployment' is due in 2 days."
            tintColor="#007AFF"
        >
            <View style={styles.projectInfo}>
                <Text style={[styles.projectName, { color: Colors[resolvedTheme].text }]}>Adidaya Web Revamp</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                        <View style={[styles.progressFill, { width: '85%', backgroundColor: '#007AFF' }]} />
                    </View>
                    <Text style={[styles.progressText, { color: Colors[resolvedTheme].text }]}>85%</Text>
                </View>
            </View>
        </BaseInsightCard>
    );
}

export function ActionStatusCard() {
    const { resolvedTheme } = useTheme();

    return (
        <BaseInsightCard
            title="Action Status"
            icon="bolt.fill"
            insight="1 Revision requested on Task #202."
            tintColor="#FF9500"
        >
            <View style={styles.actionStats}>
                <View style={styles.actionItem}>
                    <Text style={[styles.actionValue, { color: '#FF9500' }]}>3</Text>
                    <Text style={[styles.actionLabel, { color: Colors[resolvedTheme].icon }]}>Pending</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                <View style={styles.actionItem}>
                    <Text style={[styles.actionValue, { color: Colors[resolvedTheme].text }]}>12</Text>
                    <Text style={[styles.actionLabel, { color: Colors[resolvedTheme].icon }]}>Resolved</Text>
                </View>
            </View>
        </BaseInsightCard>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 280,
        marginRight: 16,
    },
    cardContent: {
        padding: 0, // Content is padded inside components
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
        letterSpacing: -0.3,
    },
    body: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        minHeight: 80,
        justifyContent: 'center',
    },
    footer: {
        padding: 12,
        paddingHorizontal: 16,
    },
    insight: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statsContainer: {
        marginLeft: 16,
    },
    mainValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subValue: {
        fontSize: 12,
        fontWeight: '500',
    },
    projectInfo: {
        width: '100%',
    },
    projectName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBar: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: 10,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '700',
        width: 30,
    },
    actionStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    actionItem: {
        alignItems: 'center',
    },
    actionValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 30,
    },
    personaContainer: {
        alignItems: 'flex-start',
    },
    personaBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 6,
    },
    personaName: {
        fontSize: 14,
        fontWeight: '700',
    },
    personaDesc: {
        fontSize: 12,
        fontWeight: '500',
    },
});
