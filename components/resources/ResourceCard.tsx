import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import {
    CatalogResource,
    ProjectStock,
    generateResourceCode,
    smartCapitalize,
    formatUnit,
    deriveStatus,
} from './mockData';

export interface ResourceCardItemData {
    id: string;
    name: string;
    code?: string;
    category?: string;
    subcategory?: string;
    group_name?: string;
    unit?: string;
    quantity?: number;
    expectedQty?: number;
    receivedQty?: number;
    status?: string;
    department?: string;
    location?: string;
    vendor?: string;
    assignedTo?: string;
    isReceivingItem?: boolean;
    rawItem?: CatalogResource;
}

interface ResourceCardProps {
    item: CatalogResource | ResourceCardItemData;
    projectStock?: ProjectStock[];
    onDetailsPress: () => void;
    isSelected?: boolean;
}

export function ResourceCard({ item, projectStock = [], onDetailsPress, isSelected = false }: ResourceCardProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = (Colors[resolvedTheme as 'light' | 'dark'] || Colors.light).text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';

    // Normalize item whether it's CatalogResource or ResourceCardItemData
    const isCustomData = 'isReceivingItem' in item || 'assignedTo' in item;
    const catItem = item as CatalogResource;
    const customItem = item as ResourceCardItemData;

    const name = smartCapitalize(item.name || 'Resource Item');
    const code = customItem.code || generateResourceCode(catItem);
    const category = (item.category || 'material').toLowerCase();
    const unit = item.unit ? formatUnit(item.unit) : '';

    // Resolve resource code (MT-, TL-, AS-, SV- format, never PO number)
    let resourceCode = '';
    if (customItem.code && (customItem.code.startsWith('MT-') || customItem.code.startsWith('TL-') || customItem.code.startsWith('AS-') || customItem.code.startsWith('SV-'))) {
        resourceCode = customItem.code;
    } else {
        resourceCode = generateResourceCode({
            ...catItem,
            name: item.name,
            category: (item.category as any) || 'material',
            subcategory: item.subcategory,
            group_name: item.group_name,
        });
    }

    // Calculate Quantity & Status
    let quantityDisplay = '';
    let statusText = '';
    let statusType: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';

    if (customItem.isReceivingItem) {
        const received = customItem.receivedQty ?? 0;
        const expected = customItem.expectedQty ?? 0;
        quantityDisplay = `${received} / ${expected} ${unit}`;
        if (customItem.status === 'partial') {
            statusText = 'Partial';
            statusType = 'warning';
        } else if (customItem.status === 'received') {
            statusText = 'Received';
            statusType = 'success';
        } else {
            statusText = 'Awaiting Receipt';
            statusType = 'info';
        }
    } else if (category === 'service') {
        quantityDisplay = '1 service';
        const st = (customItem.status || 'Completed').toLowerCase();
        if (st.includes('confirm') || st.includes('awaiting')) {
            statusText = 'Awaiting Confirmation';
            statusType = 'warning';
        } else if (st.includes('progress') || st.includes('active')) {
            statusText = 'In Progress';
            statusType = 'info';
        } else if (st.includes('cancel')) {
            statusText = 'Cancelled';
            statusType = 'error';
        } else {
            statusText = 'Completed';
            statusType = 'success';
        }
    } else {
        const totalQty = projectStock.reduce((acc, curr) => acc + curr.quantity, 0);
        const derived = deriveStatus(catItem, projectStock);

        if (category === 'tool') {
            quantityDisplay = `${totalQty} unit${totalQty !== 1 ? 's' : ''}`;
            if (derived === 'Out of Stock') {
                statusText = 'In Use';
                statusType = 'info';
            } else if (derived === 'Low Stock' || derived === 'Maintenance') {
                statusText = 'Maintenance';
                statusType = 'warning';
            } else {
                statusText = `${totalQty} Available`;
                statusType = 'success';
            }
        } else if (category === 'asset') {
            quantityDisplay = `${totalQty || 1} unit`;
            if (customItem.assignedTo || totalQty === 0) {
                statusText = 'Assigned';
                statusType = 'info';
            } else if (derived === 'Maintenance') {
                statusText = 'Maintenance';
                statusType = 'warning';
            } else {
                statusText = 'Active';
                statusType = 'success';
            }
        } else {
            // Material
            quantityDisplay = `${totalQty.toLocaleString()} ${unit}`;
            if (derived === 'Out of Stock') {
                statusText = 'Out of Stock';
                statusType = 'error';
            } else if (derived === 'Low Stock') {
                statusText = 'Low Stock';
                statusType = 'warning';
            } else {
                statusText = 'Available';
                statusType = 'success';
            }
        }
    }

    const getStatusColors = () => {
        switch (statusType) {
            case 'success':
                return {
                    color: '#34C759',
                    bg: isDark ? 'rgba(52, 199, 89, 0.18)' : 'rgba(52, 199, 89, 0.12)',
                };
            case 'warning':
                return {
                    color: '#FF9500',
                    bg: isDark ? 'rgba(255, 149, 0, 0.18)' : 'rgba(255, 149, 0, 0.12)',
                };
            case 'error':
                return {
                    color: '#FF3B30',
                    bg: isDark ? 'rgba(255, 59, 48, 0.18)' : 'rgba(255, 59, 48, 0.12)',
                };
            case 'info':
                return {
                    color: '#007AFF',
                    bg: isDark ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.12)',
                };
            default:
                return {
                    color: isDark ? '#A1A1A6' : '#8E8E93',
                    bg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                };
        }
    };

    const statusTheme = getStatusColors();

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDetailsPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            style={[
                s.card,
                {
                    backgroundColor: isSelected ? (isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)') : cardBg,
                    borderColor: isSelected ? '#007AFF' : 'transparent',
                    borderWidth: isSelected ? 1.5 : 0,
                }
            ]}
        >
            <View style={s.cardBody}>
                {/* Left Section (2 Lines) */}
                <View style={s.leftCol}>
                    <Text style={[s.title, { color: textColor }]} numberOfLines={1}>
                        {name}
                    </Text>
                    <Text style={[s.codeText, { color: subtextColor }]} numberOfLines={1}>
                        {resourceCode}
                    </Text>
                </View>

                {/* Right Section (2 Lines) */}
                <View style={s.rightCol}>
                    <Text style={[s.quantityText, { color: textColor }]} numberOfLines={1}>
                        {quantityDisplay}
                    </Text>
                    <Text style={[s.statusText, { color: statusTheme.color }]} numberOfLines={1}>
                        {statusText}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 8,
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
    codeText: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    rightCol: {
        alignItems: 'flex-end',
        gap: 4,
        flexShrink: 0,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
});
