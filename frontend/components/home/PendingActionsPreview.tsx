import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface PendingAction {
    id: string;
    title: string;
    type: 'approval' | 'revision' | 'dispute' | 'confirmation';
    module: string;
    submitter: string;
    timeAgo: string;
}

const MOCK_ACTIONS: PendingAction[] = [
    {
        id: '1',
        title: 'Invoice #421 — Semen & Besi',
        type: 'approval',
        module: 'Finance',
        submitter: 'Ahmad',
        timeAgo: '15m ago',
    },
    {
        id: '2',
        title: 'Change Order — Foundation Work',
        type: 'revision',
        module: 'Project',
        submitter: 'Siti',
        timeAgo: '1h ago',
    },
    {
        id: '3',
        title: 'Daily Report — Tower B',
        type: 'confirmation',
        module: 'Task',
        submitter: 'Budi',
        timeAgo: '2h ago',
    },
];

const TYPE_CONFIG = {
    approval: { icon: 'checkmark.seal', color: '#34C759', label: 'Approval' },
    revision: { icon: 'arrow.uturn.backward', color: '#FF9500', label: 'Revision' },
    dispute: { icon: 'exclamationmark.bubble', color: '#FF3B30', label: 'Dispute' },
    confirmation: { icon: 'hand.thumbsup', color: '#007AFF', label: 'Confirm' },
};

export function PendingActionsPreview() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <View style={styles.container}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <PlatformIcon
                        name="bolt.fill"
                        size={14}
                        tintColor={isDark ? '#FF9500' : '#FF9500'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.sectionTitle, { color: Colors[resolvedTheme].text }]}>
                        Pending Actions
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: '#FF3B30' }]}>
                        <Text style={styles.countText}>{MOCK_ACTIONS.length}</Text>
                    </View>
                </View>
                <Pressable
                    onPress={() => router.push('/actions')}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                    <View style={styles.viewAllRow}>
                        <Text style={styles.viewAllText}>View All</Text>
                        <PlatformIcon name="chevron.right" size={10} tintColor="#007AFF" />
                    </View>
                </Pressable>
            </View>

            {/* Action Rows */}
            <View style={[
                styles.listContainer,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }
            ]}>
                {MOCK_ACTIONS.map((action, index) => {
                    const config = TYPE_CONFIG[action.type];
                    return (
                        <Pressable
                            key={action.id}
                            onPress={() => router.push('/actions')}
                            style={({ pressed }) => [
                                styles.actionRow,
                                pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
                                index < MOCK_ACTIONS.length - 1 && {
                                    borderBottomWidth: StyleSheet.hairlineWidth,
                                    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                },
                            ]}
                        >
                            {/* Type Icon */}
                            <View style={[styles.typeIcon, { backgroundColor: config.color + '1A' }]}>
                                <PlatformIcon
                                    name={config.icon as any}
                                    size={16}
                                    tintColor={config.color}
                                />
                            </View>

                            {/* Content */}
                            <View style={styles.actionContent}>
                                <Text
                                    style={[styles.actionTitle, { color: Colors[resolvedTheme].text }]}
                                    numberOfLines={1}
                                >
                                    {action.title}
                                </Text>
                                <View style={styles.actionMeta}>
                                    <View style={[styles.typeBadge, { backgroundColor: config.color + '1A' }]}>
                                        <Text style={[styles.typeText, { color: config.color }]}>
                                            {config.label}
                                        </Text>
                                    </View>
                                    <Text style={[styles.metaText, { color: Colors[resolvedTheme].icon }]}>
                                        {action.submitter} · {action.timeAgo}
                                    </Text>
                                </View>
                            </View>

                            {/* Chevron */}
                            <PlatformIcon
                                name="chevron.right"
                                size={12}
                                tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
                            />
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
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
    countBadge: {
        marginLeft: 8,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    viewAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },
    listContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    typeIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionContent: {
        flex: 1,
        marginRight: 8,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    actionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    metaText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
