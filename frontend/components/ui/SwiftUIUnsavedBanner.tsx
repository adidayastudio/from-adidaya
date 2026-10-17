import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import * as Haptics from 'expo-haptics';

export interface SwiftUIUnsavedBannerProps {
    onCancel: () => void;
    onSave: () => void;
    saving?: boolean;
    isDark?: boolean;
    title?: string;
}

export function SwiftUIUnsavedBanner({
    onCancel,
    onSave,
    saving = false,
    isDark = false,
    title = 'Unsaved changes',
}: SwiftUIUnsavedBannerProps) {
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#64748B';

    return (
        <View style={styles.container}>
            <GlassView
                intensity={85}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    styles.card,
                    {
                        backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.88)',
                    }
                ]}
            >
                <View style={styles.left}>
                    <View style={styles.warningDot} />
                    <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onCancel();
                        }}
                        style={styles.cancelBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.cancelText, { color: subtextColor }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onSave();
                        }}
                        style={styles.saveBtn}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </GlassView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 56,
    },
    card: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    warningDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF9500',
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500',
    },
    saveBtn: {
        backgroundColor: '#007AFF',
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 64,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 4,
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
