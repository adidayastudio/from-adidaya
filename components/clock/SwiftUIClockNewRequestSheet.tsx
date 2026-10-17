import React, { memo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '@/components/ui/GlassView';
import { useTheme } from '@/context/ThemeContext';

export interface SwiftUIClockNewRequestSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSelectLeaveRequest: () => void;
    onSelectLogOvertime: () => void;
    onSelectBusinessTrip: () => void;
    onSelectAttendanceCorrection?: () => void;
}

export const SwiftUIClockNewRequestSheet: React.FC<SwiftUIClockNewRequestSheetProps> = memo(({
    isOpened,
    onClose,
    onSelectLeaveRequest,
    onSelectLogOvertime,
    onSelectBusinessTrip,
    onSelectAttendanceCorrection,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const chevronColor = isDark ? '#8E8E93' : '#AEAEB2';

    const purpleColor = isDark ? '#BF5AF2' : '#AF52DE';
    const purpleBadgeBg = isDark ? 'rgba(191, 90, 242, 0.18)' : 'rgba(175, 82, 222, 0.12)';

    const orangeColor = isDark ? '#FF9F0A' : '#FF9500';
    const orangeBadgeBg = isDark ? 'rgba(255, 159, 10, 0.18)' : 'rgba(255, 149, 0, 0.12)';

    const greenColor = isDark ? '#30D158' : '#34C759';
    const greenBadgeBg = isDark ? 'rgba(48, 209, 88, 0.18)' : 'rgba(52, 199, 89, 0.12)';

    const blueColor = isDark ? '#0A84FF' : '#007AFF';
    const blueBadgeBg = isDark ? 'rgba(10, 132, 255, 0.18)' : 'rgba(0, 122, 255, 0.12)';

    return (
        <Modal 
            visible={isOpened} 
            transparent={true} 
            animationType="slide" 
            onRequestClose={onClose} 
            statusBarTranslucent={true}
        >
            <View style={styles.drawerOverlay}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <GlassView 
                    intensity={60} 
                    tint={isDark ? 'dark' : 'light'} 
                    style={[
                        styles.drawerContentSheet, 
                        { backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)' }
                    ]}
                >
                    <View style={styles.drawerHeader}>
                        <Text style={[styles.drawerHeaderTitle, { color: textColor }]}>New Request</Text>
                        <TouchableOpacity 
                            style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={20} color={subtextColor} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.drawerContent}>
                        <TouchableOpacity 
                            style={[styles.typeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 120, 128, 0.08)' }]} 
                            activeOpacity={0.7}
                            onPress={() => { onClose(); onSelectLeaveRequest(); }}
                        >
                            <View style={[styles.typeIconContainer, { backgroundColor: purpleBadgeBg }]}>
                                <Ionicons name="calendar-outline" size={22} color={purpleColor} />
                            </View>
                            <View style={styles.typeTextContainer}>
                                <Text style={[styles.typeTitle, { color: textColor }]}>Leave Request</Text>
                                <Text style={[styles.typeDesc, { color: subtextColor }]}>Annual leave, sick leave, or other absences.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.typeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 120, 128, 0.08)' }]} 
                            activeOpacity={0.7}
                            onPress={() => { onClose(); onSelectLogOvertime(); }}
                        >
                            <View style={[styles.typeIconContainer, { backgroundColor: orangeBadgeBg }]}>
                                <Ionicons name="time-outline" size={22} color={orangeColor} />
                            </View>
                            <View style={styles.typeTextContainer}>
                                <Text style={[styles.typeTitle, { color: textColor }]}>Log Overtime</Text>
                                <Text style={[styles.typeDesc, { color: subtextColor }]}>Record extra hours worked outside schedule.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.typeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 120, 128, 0.08)' }]} 
                            activeOpacity={0.7}
                            onPress={() => { onClose(); onSelectBusinessTrip(); }}
                        >
                            <View style={[styles.typeIconContainer, { backgroundColor: greenBadgeBg }]}>
                                <Ionicons name="airplane-outline" size={22} color={greenColor} />
                            </View>
                            <View style={styles.typeTextContainer}>
                                <Text style={[styles.typeTitle, { color: textColor }]}>Business Trip</Text>
                                <Text style={[styles.typeDesc, { color: subtextColor }]}>Work-related travel and expenses.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
                        </TouchableOpacity>
                    </View>
                </GlassView>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    drawerContentSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 34,
        overflow: 'hidden',
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    drawerHeaderTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    drawerContent: {
        paddingHorizontal: 20,
        gap: 12,
        paddingTop: 4,
    },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        gap: 14,
    },
    typeIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeTextContainer: {
        flex: 1,
    },
    typeTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    typeDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
});
