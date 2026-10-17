import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { GlassView } from '@/components/ui/GlassView';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { LiquidCard } from '@/components/ui/LiquidCard';
import { PillButton } from '@/components/ui/PillButton';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

// ─── Design Tokens ────────────────────────────────────────────────────
const COLORS = {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    pink: '#FF2D55',
    teal: '#5AC8FA',
    indigo: '#AF52DE',
};

const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
};

const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
};

// ─── Section Wrapper ──────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    return (
        <View style={sectionStyles.container}>
            <Text style={[sectionStyles.title, { color: isDark ? '#8E8E93' : '#6e6e73' }]}>
                {title}
            </Text>
            {children}
        </View>
    );
}

const sectionStyles = StyleSheet.create({
    container: { marginBottom: 32 },
    title: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
});

// ─── Main Component ───────────────────────────────────────────────────
export default function UIPlaygroundScreen() {
    const { resolvedTheme, toggleTheme } = useTheme();
    const insets = useSafeAreaInsets();
    // Playground state for testing variants
    const [backVariant, setBackVariant] = React.useState<'back' | 'close'>('back');
    const isDark = resolvedTheme === 'dark';

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

    const themeColors = {
        text: textColor,
        subtext: subtextColor,
        cardBackground: cardBg,
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'UI Playground',
                    headerLargeTitle: true,
                    headerTransparent: Platform.OS === 'ios',
                    headerTintColor: textColor,
                    headerBackVisible: false,
                    headerLeft: () => (
                        <BouncyGlassButton
                            onPress={() => router.back()}
                            isDark={isDark}
                            variant={backVariant}
                            textColor={textColor}
                            style={{ marginLeft: 0 }}
                        />
                    ),
                    headerRight: () => {
                        const actions: HeaderToolbarAction[] = [
                            {
                                id: 'theme',
                                icon: isDark ? 'sunny' : 'moon',
                                onPress: toggleTheme
                            },
                            {
                                id: 'add',
                                icon: 'add',
                                onPress: () => router.push('/ui-playground-add')
                            },
                            {
                                id: 'menu1',
                                icon: 'document-text',
                                title: 'Menu 1',
                                onPress: () => console.log('Menu 1 selected')
                            },
                            {
                                id: 'menu2',
                                icon: 'folder',
                                title: 'Menu 2',
                                onPress: () => console.log('Menu 2 selected')
                            },
                            {
                                id: 'menu3',
                                icon: 'trash',
                                title: 'Menu 3',
                                isDestructive: true,
                                onPress: () => console.log('Menu 3 selected')
                            }
                        ];

                        return (
                            <HeaderToolbar actions={actions} isDark={isDark} textColor={textColor} />
                        );
                    },
                }}
            />

            {/* ScrollView MUST be the root native child for Large Title inset to collapse natively! */}
            <ScrollView
                style={styles.scrollView}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
            >
                {/* Wrap content to prevent overlap while maintaining iOS adjustment */}
                <View style={[styles.content, { paddingBottom: insets.bottom + 40 }]}>

                    {/* ── TYPOGRAPHY ──────────────────────────────────────── */}
                    <Section title="Typography">
                        <GlassView style={styles.card}>
                            <Text style={[styles.displayText, { color: textColor }]}>Display</Text>
                            <Text style={[styles.headingText, { color: textColor }]}>Heading 1</Text>
                            <Text style={[styles.heading2Text, { color: textColor }]}>Heading 2</Text>
                            <Text style={[styles.heading3Text, { color: textColor }]}>Heading 3</Text>
                            <Text style={[styles.bodyText, { color: textColor }]}>
                                Body text — The quick brown fox jumps over the lazy dog.
                            </Text>
                            <Text style={[styles.captionText, { color: subtextColor }]}>
                                Caption — Secondary information appears smaller and muted.
                            </Text>
                        </GlassView>
                    </Section>

                    {/* ── BUTTONS ─────────────────────────────────────────── */}
                    {/* ── PILL BUTTONS ─────────────────────────────────────── */}
                    <Section title="Pill Buttons">
                        <View style={styles.vibrantContainer}>
                            {/* Background Reference Text (NATIVE LOOK: White background with sharp blue text) */}
                            <View style={styles.backgroundTextContainer}>
                                <Text style={styles.backgroundText}>OS</Text>
                                <Text style={[styles.backgroundText, { marginTop: -100, fontSize: 300 }]}>26</Text>
                            </View>

                            <View style={[styles.card, { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0 }]}>
                                {/* Neutral Clear (Tool-bar behavior) */}
                                <View style={styles.pillRow}>
                                    <View>
                                        <Text style={[styles.subSectionTitle, { color: '#000' }]}>Clear</Text>
                                        <PillButton label="Label" color="neutral" variant="clear" onPress={() => { }} />
                                    </View>
                                    <View style={{ marginLeft: 20 }}>
                                        <Text style={[styles.subSectionTitle, { color: '#000' }]}>Tinted</Text>
                                        <PillButton label="Label" color="blue" variant="tinted" onPress={() => { }} />
                                    </View>
                                </View>

                                {/* Vibrant Tinted Variant */}
                                <View style={[styles.pillRow, { marginTop: 24 }]}>
                                    <View>
                                        <PillButton label="Label" color="orange" variant="solid" onPress={() => { }} />
                                    </View>
                                    <View style={{ marginLeft: 20 }}>
                                        <PillButton label="Label" color="blue" variant="solid" onPress={() => { }} />
                                    </View>
                                </View>

                                <View style={[styles.pillRow, { marginTop: 12 }]}>
                                    <View>
                                        <PillButton label="Label" color="green" variant="solid" onPress={() => { }} />
                                    </View>
                                    <View style={{ marginLeft: 40 }}>
                                        <PillButton label="Label" color="red" variant="solid" onPress={() => { }} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Section>

                    {/* ── LIQUID CARDS ─────────────────────────────────────── */}
                    <Section title="Liquid Cards">
                        <View style={styles.vibrantContainer}>
                            {/* Background Reference Text */}
                            <View style={styles.backgroundTextContainer}>
                                <Text style={styles.backgroundText}>CARD</Text>
                            </View>

                            <View style={[styles.card, { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0 }]}>
                                {/* Example 1: Labeled Actions */}
                                <Text style={[styles.subSectionTitle, { color: '#000', marginBottom: 12 }]}>1. Glass Card with Labels</Text>
                                <LiquidCard variant="clear" style={{ width: '100%', marginBottom: 32 }}>
                                    <View style={styles.cardHeader}>
                                        <PlatformIcon name="text.alignleft" size={24} tintColor="#007AFF" />
                                        <Text style={[styles.cardTitle, { color: themeColors.text }]}>Labeled Card</Text>
                                    </View>
                                    <Text style={[styles.cardBody, { color: themeColors.text, opacity: 0.7 }]}>
                                        Kartu ini menggunakan tombol dengan label teks untuk aksi yang lebih deskriptif.
                                    </Text>
                                    <View style={styles.cardFooter}>
                                        <PillButton label="Cancel" color="neutral" variant="clear" onPress={() => { }} />
                                        <PillButton label="Save Changes" color="blue" variant="solid" onPress={() => { }} />
                                    </View>
                                </LiquidCard>

                                {/* Example 2: Icon-Only Actions (Native Menu Style) */}
                                <Text style={[styles.subSectionTitle, { color: '#000', marginBottom: 12 }]}>2. Glass Card with Icons (X, V, Trash)</Text>
                                <LiquidCard variant="clear" style={{ width: '100%', marginBottom: 32 }}>
                                    <View style={styles.cardHeader}>
                                        <PlatformIcon name="circle.grid.2x2.fill" size={24} tintColor="#5856D6" />
                                        <Text style={[styles.cardTitle, { color: themeColors.text }]}>Icon Action Card</Text>
                                    </View>
                                    <Text style={[styles.cardBody, { color: themeColors.text, opacity: 0.7 }]}>
                                        Kartu ini menggunakan tombol icon-only (SF Symbols) yang berbentuk lingkaran sempurna.
                                    </Text>
                                    <View style={styles.cardFooter}>
                                        <PillButton icon={<PlatformIcon name="xmark" size={20} tintColor={isDark ? '#fff' : '#000'} />} color="neutral" variant="clear" onPress={() => { }} />
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <PillButton icon={<PlatformIcon name="trash" size={20} tintColor="#fff" />} color="red" variant="solid" onPress={() => { }} />
                                            <PillButton icon={<PlatformIcon name="checkmark" size={20} tintColor="#fff" />} color="blue" variant="solid" onPress={() => { }} />
                                        </View>
                                    </View>
                                </LiquidCard>

                                {/* Example 3: Image/Vibrant Card (Bonus) */}
                                <Text style={[styles.subSectionTitle, { color: '#000', marginBottom: 12 }]}>3. Image Background Glass</Text>
                                <LiquidCard
                                    variant="image"
                                    backgroundImage={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop' }}
                                    style={{ width: '100%', marginBottom: 32 }}
                                >
                                    <View style={styles.cardHeader}>
                                        <PlatformIcon name="sparkles" size={24} tintColor="#fff" />
                                        <Text style={[styles.cardTitle, { color: '#fff' }]}>Vibrant Glass</Text>
                                    </View>
                                    <Text style={[styles.cardBody, { color: '#fff', opacity: 0.9 }]}>
                                        Ini adalah kartu dengan gambar latar belakang. Efek "Liquid Glass" akan membiaskan warna-warna cerah dari fotonya.
                                    </Text>
                                    <View style={styles.cardFooter}>
                                        <PillButton label="Learn More" color="neutral" variant="clear" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} onPress={() => { }} />
                                        <PillButton icon={<PlatformIcon name="arrow.right" size={20} tintColor="#fff" />} color="blue" variant="solid" onPress={() => { }} />
                                    </View>
                                </LiquidCard>
                            </View>
                        </View>
                    </Section>

                    {/* ── OLD BUTTONS (LEGACY) ─────────────────────────────── */}
                    <Section title="Legacy Buttons (For Comparison)">
                        <GlassView style={styles.card}>
                            {/* Primary */}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.buttonPrimary,
                                    { opacity: pressed ? 0.8 : 1 },
                                ]}
                            >
                                <Text style={styles.buttonPrimaryText}>Primary Button</Text>
                            </Pressable>
                            {/* ... (truncated for brevity, keep existing legacy code here if needed or just replace) */}
                        </GlassView>
                    </Section>

                    {/* ── GLASS CARDS ─────────────────────────────────────── */}
                    <Section title="Glass Cards">
                        <GlassView intensity={30} tint="systemThinMaterial" style={styles.glassCard}>
                            <Text style={[styles.glassCardTitle, { color: textColor }]}>
                                Light Glass
                            </Text>
                            <Text style={[styles.glassCardBody, { color: subtextColor }]}>
                                intensity=30, systemThinMaterial
                            </Text>
                        </GlassView>

                        <GlassView intensity={60} tint="systemThickMaterial" style={styles.glassCard}>
                            <Text style={[styles.glassCardTitle, { color: textColor }]}>
                                Medium Glass
                            </Text>
                            <Text style={[styles.glassCardBody, { color: subtextColor }]}>
                                intensity=60, systemThickMaterial
                            </Text>
                        </GlassView>

                        <GlassView intensity={90} tint="systemUltraThinMaterial" style={styles.glassCard}>
                            <Text style={[styles.glassCardTitle, { color: textColor }]}>
                                Heavy Glass
                            </Text>
                            <Text style={[styles.glassCardBody, { color: subtextColor }]}>
                                intensity=90, systemUltraThinMaterial
                            </Text>
                        </GlassView>

                        {/* Colored Glass */}
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.coloredGlassWrapper}
                        >
                            <GlassView intensity={40} tint="systemThinMaterial" style={styles.coloredGlassInner}>
                                <Text style={[styles.glassCardTitle, { color: '#fff' }]}>
                                    Colored Glass
                                </Text>
                                <Text style={[styles.glassCardBody, { color: 'rgba(255,255,255,0.7)' }]}>
                                    Glass on gradient background
                                </Text>
                            </GlassView>
                        </LinearGradient>
                    </Section>

                    {/* ── COLOR PALETTE ───────────────────────────────────── */}
                    <Section title="Color Palette">
                        <GlassView style={styles.card}>
                            <View style={styles.colorGrid}>
                                {Object.entries(COLORS).map(([name, color]) => (
                                    <View key={name} style={styles.colorItem}>
                                        <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                                        <Text style={[styles.colorName, { color: textColor }]}>{name}</Text>
                                        <Text style={[styles.colorHex, { color: subtextColor }]}>{color}</Text>
                                    </View>
                                ))}
                            </View>
                        </GlassView>
                    </Section>

                    {/* ── SPACING & RADIUS ────────────────────────────────── */}
                    <Section title="Border Radius">
                        <GlassView style={styles.card}>
                            <View style={styles.radiusRow}>
                                {Object.entries(RADIUS).map(([name, value]) => (
                                    <View key={name} style={styles.radiusItem}>
                                        <View
                                            style={[
                                                styles.radiusBox,
                                                {
                                                    borderRadius: value,
                                                    backgroundColor: isDark ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.15)',
                                                    borderColor: COLORS.primary,
                                                },
                                            ]}
                                        />
                                        <Text style={[styles.radiusLabel, { color: subtextColor }]}>{name}</Text>
                                        <Text style={[styles.radiusValue, { color: textColor }]}>{value}</Text>
                                    </View>
                                ))}
                            </View>
                        </GlassView>
                    </Section>

                    {/* ── SPACING SCALE ────────────────────────────────────── */}
                    <Section title="Spacing Scale">
                        <GlassView style={styles.card}>
                            {Object.entries(SPACING).map(([name, value]) => (
                                <View key={name} style={styles.spacingRow}>
                                    <Text style={[styles.spacingLabel, { color: subtextColor }]}>
                                        {name} ({value}px)
                                    </Text>
                                    <View
                                        style={[
                                            styles.spacingBar,
                                            {
                                                width: value * 4,
                                                backgroundColor: isDark ? 'rgba(88,86,214,0.5)' : 'rgba(88,86,214,0.25)',
                                            },
                                        ]}
                                    />
                                </View>
                            ))}
                        </GlassView>
                    </Section>
                </View>

            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    // Layout
    content: {
        paddingHorizontal: 16,
    },

    // Card
    card: {
        padding: 20,
        borderRadius: 16,
        gap: 12,
    },

    // Typography
    displayText: { fontSize: 34, fontWeight: '700', letterSpacing: 0.4 },
    headingText: { fontSize: 28, fontWeight: '700' },
    heading2Text: { fontSize: 22, fontWeight: '600' },
    heading3Text: { fontSize: 18, fontWeight: '600' },
    bodyText: { fontSize: 16, lineHeight: 22 },
    captionText: { fontSize: 13, lineHeight: 18 },
    subSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },

    // Buttons
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPrimary: {
        backgroundColor: COLORS.primary,
    },
    buttonPrimaryText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    buttonSecondary: {
        backgroundColor: 'rgba(0,122,255,0.12)',
    },
    buttonSecondaryText: {
        fontWeight: '600',
        fontSize: 16,
    },
    buttonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    buttonOutlineText: {
        fontWeight: '600',
        fontSize: 16,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    pillButton: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 999,
    },
    pillButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    // Glass Cards
    glassCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 12,
    },
    glassCardTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    glassCardBody: {
        fontSize: 14,
    },
    coloredGlassWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    coloredGlassInner: {
        padding: 20,
        borderRadius: 0,
    },

    // Colors
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    colorItem: {
        alignItems: 'center',
        width: 64,
    },
    colorSwatch: {
        width: 48,
        height: 48,
        borderRadius: 14,
        marginBottom: 6,
    },
    colorName: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    colorHex: {
        fontSize: 10,
        marginTop: 2,
    },

    // Radius
    radiusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    radiusItem: {
        alignItems: 'center',
    },
    radiusBox: {
        width: 56,
        height: 56,
        borderWidth: 2,
        marginBottom: 6,
    },
    radiusLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    radiusValue: {
        fontSize: 10,
    },

    // Spacing
    spacingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    spacingLabel: {
        fontSize: 13,
        width: 80,
        fontWeight: '500',
    },
    spacingBar: {
        height: 12,
        borderRadius: 6,
    },

    // Vibrant Section
    vibrantContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF', // Clean White background as in the image
        minHeight: 400,
        padding: 20,
    },
    backgroundTextContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 1, // Full opacity for the "OS" letters
    },
    backgroundText: {
        fontSize: 320,
        fontWeight: '900',
        color: '#007AFF', // Solid Apple Blue
        letterSpacing: -20,
        lineHeight: 280,
    },

    // Liquid Card Styles
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    cardBody: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
