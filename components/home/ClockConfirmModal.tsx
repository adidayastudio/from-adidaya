import { useTheme } from '@/context/ThemeContext';
import { Modal, Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { ClockConfirmContent, ClockConfirmPayload } from './ClockConfirmContent';

interface ClockConfirmModalProps {
    visible: boolean;
    isClockedIn: boolean;
    userName: string;
    onConfirm: (payload: ClockConfirmPayload) => void | Promise<void>;
    onCancel: () => void;
}

export function ClockConfirmModal({ visible, isClockedIn, userName, onConfirm, onCancel }: ClockConfirmModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { width, height } = useWindowDimensions();
    const isSideDrawer = Platform.OS === 'web' && width >= 600;

    return (
        <Modal
            visible={visible}
            transparent
            animationType={isSideDrawer ? "none" : "slide"}
            statusBarTranslucent={true}
            onRequestClose={onCancel}
        >
            <View style={[styles.modalOverlay, isSideDrawer && { justifyContent: 'center', alignItems: 'flex-end', padding: 16 }]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onCancel}
                >
                    <View style={{ flex: 1 }} />
                </TouchableOpacity>

                <Animated.View
                    entering={isSideDrawer ? SlideInRight.duration(240) : FadeInUp.duration(220)}
                    style={[
                        styles.drawerSheet,
                        isSideDrawer && { width: Math.min(480, width - 32), maxWidth: '100%', height: height - 32, borderRadius: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
                        {
                            backgroundColor: isDark ? '#121212' : '#F2F2F7',
                        }
                    ]}
                >
                    <ClockConfirmContent
                        isClockedIn={isClockedIn}
                        userName={userName}
                        onConfirm={onConfirm}
                        onCancel={onCancel}
                    />
                </Animated.View>
            </View>
        </Modal>
    );
}

export type { ClockConfirmPayload };

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    drawerSheet: {
        width: '100%',
        height: '85%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 16,
    },
});
