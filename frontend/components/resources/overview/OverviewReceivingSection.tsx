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
import { ReceivingQueueItem } from '@/lib/api/resourcesReceiving';

interface OverviewReceivingSectionProps {
    items: ReceivingQueueItem[];
    onItemPress: (item: ReceivingQueueItem) => void;
}

export function OverviewReceivingSection({
    items,
    onItemPress,
}: OverviewReceivingSectionProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = (Colors[resolvedTheme as 'light' | 'dark'] || Colors.light).text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';

    // Show pending items first, up to 4
    const pendingItems = items.filter(i => i.status === 'awaiting' || i.status === 'partial');
    const displayItems = pendingItems.length > 0 ? pendingItems.slice(0, 4) : items.slice(0, 4);
    const pendingCount = pendingItems.length;

    const getStatusInfo = (status: 'awaiting' | 'partial' | 'received') => {
        switch (status) {
            case 'received':
                return { label: 'Received', color: '#34C759' };
            case 'partial':
                return { label: 'Partial', color: '#FF9500' };
            case 'awaiting':
            default:
                return { label: 'Awaiting', color: '#007AFF' };
        }
    };

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={s.headerRow}>
                <Text style={[s.sectionTitle, { color: textColor }]}>Receiving Summary</Text>
                {pendingCount > 0 && (
                    <Text style={[s.counterText, { color: subtextColor }]}>
                        {pendingCount} pending
                    </Text>
                )}
            </View>

            {/* List */}
            <View style={s.list}>
                {displayItems.length > 0 ? (
                    displayItems.map((item) => {
                        const statusInfo = getStatusInfo(item.status);

                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.7}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onItemPress(item);
                                }}
                                style={[s.card, { backgroundColor: cardBg }]}
                            >
                                <View style={s.cardBody}>
                                    {/* Left: Item info */}
                                    <View style={s.leftCol}>
                                        <Text style={[s.itemName, { color: textColor }]} numberOfLines={1}>
                                            {item.itemName}
                                        </Text>
                                        <Text style={[s.vendorText, { color: subtextColor }]} numberOfLines={1}>
                                            {item.vendor} • {item.sourceDocNo}
                                        </Text>
                                    </View>

                                    {/* Right: Quantity & Status */}
                                    <View style={s.rightCol}>
                                        <Text style={[s.qtyText, { color: textColor }]} numberOfLines={1}>
                                            {item.receivedQty} / {item.expectedQty} {item.unit}
                                        </Text>
                                        <Text style={[s.statusText, { color: statusInfo.color }]} numberOfLines={1}>
                                            {statusInfo.label}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    <View style={[s.emptyBox, { backgroundColor: cardBg }]}>
                        <PlatformIcon
                            name="tray"
                            size={22}
                            tintColor={isDark ? '#6E6E73' : '#AEAEB2'}
                        />
                        <Text style={[s.emptyText, { color: subtextColor }]}>
                            No pending receiving items.
                        </Text>
                    </View>
                )}
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
    counterText: {
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
    itemName: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    vendorText: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    rightCol: {
        alignItems: 'flex-end',
        gap: 4,
        flexShrink: 0,
    },
    qtyText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    emptyBox: {
        borderRadius: 20,
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
