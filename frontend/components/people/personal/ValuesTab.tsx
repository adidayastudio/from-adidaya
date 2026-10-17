import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface ValuesTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
}

export function ValuesTab({ isDark, textColor, subtextColor }: ValuesTabProps) {
    const cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const accentColor = '#1677D2';

    return (
        <View style={s.valuesContainer}>
            <GlassView 
                intensity={isDark ? 10 : 25} 
                style={[
                    s.comingSoonCard, 
                    { 
                        borderColor: cardBorderColor, 
                        borderWidth: 1,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)'
                    }
                ]}
            >
                <View style={s.comingSoonHeader}>
                    <View style={[s.comingSoonIconBox, { backgroundColor: `${accentColor}15` }]}>
                        <PlatformIcon name="heart.fill" size={24} tintColor={accentColor} />
                    </View>
                    <View style={[s.comingSoonBadge, { backgroundColor: `${accentColor}15` }]}>
                        <Text style={[s.comingSoonBadgeText, { color: accentColor }]}>COMING SOON</Text>
                    </View>
                </View>
                
                <Text style={[s.comingSoonTitle, { color: textColor }]}>Culture & Values</Text>
                <Text style={[s.comingSoonDesc, { color: subtextColor }]}>
                    Company core values, culture frameworks, pulse surveys, and peer recognitions will be available here soon.
                </Text>
                
                <View style={[s.comingSoonPreview, { borderColor: cardBorderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }]}>
                    <View style={s.previewRow}>
                        <View style={[s.previewDot, { backgroundColor: accentColor, opacity: 0.3 }]} />
                        <View style={[s.previewLineShort, { backgroundColor: textColor, opacity: 0.15 }]} />
                    </View>
                    <View style={s.previewRow}>
                        <View style={[s.previewDot, { backgroundColor: accentColor, opacity: 0.15 }]} />
                        <View style={[s.previewLineLong, { backgroundColor: textColor, opacity: 0.1 }]} />
                    </View>
                </View>
            </GlassView>
        </View>
    );
}

const s = StyleSheet.create({
    valuesContainer: {
        paddingTop: 8,
    },
    comingSoonCard: {
        borderRadius: 24,
        padding: 24,
        gap: 16,
    },
    comingSoonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    comingSoonIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    comingSoonBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    comingSoonTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    comingSoonDesc: {
        fontSize: 14,
        lineHeight: 20,
    },
    comingSoonPreview: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 10,
        marginTop: 4,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    previewDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    previewLineShort: {
        height: 8,
        borderRadius: 4,
        width: '50%',
    },
    previewLineLong: {
        height: 8,
        borderRadius: 4,
        width: '80%',
    },
});
