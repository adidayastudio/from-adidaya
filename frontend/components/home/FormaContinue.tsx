import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FORMA "CONTINUE" ARCHITECTURE & RULES:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Purpose: Answer "What was I working on, and can I continue where I left off?"
 *    NOT Recent Items, NOT Recently Viewed, NOT Tasks/Actions, NOT terminal records.
 * 2. Scope:
 *    - General / non-Adidaya tenants first.
 *    - Crew is COMPLETELY EXCLUDED from source modules, ranking, and rendering.
 *    - Product Areas: Finance, Resources, People, Reports, Projects.
 *    - Clock is excluded from generating Continue items.
 * 3. Eligibility & Priorities:
 *    - Priority 1: User-authored unfinished Draft (up to 30 days).
 *    - Priority 2: Autosaved unfinished work with real data changes.
 *    - Priority 3: Recently edited in-progress object (up to 7 days).
 *    - Priority 4: Last meaningful work context (fallback only).
 * 4. Display Hierarchy:
 *    - Max 4 items total (returns null if 0 items to keep Home clean).
 *    - 1 item: 1 full-width Primary Hero Card.
 *    - 2 items: 1 Primary Hero Card + 1 full-width secondary card.
 *    - 3 items: 1 Primary Hero Card + 2 static 50/50 cards (no scroll).
 *    - 4 items: 1 Primary Hero Card + 3 cards in horizontal scroll (card 3 peeking).
 * 5. Metadata:
 *    - Communicates WHAT (Title), WHERE (Category/Context), and WHY (Draft/Autosaved/Edited).
 *    - No progress percentages (e.g. "75% completed") or financial amounts as reason.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ContinueItem {
    id: string;
    title: string;
    context: string;
    reason: string; // e.g., 'Draft saved today at 16:45', 'Autosaved 18 min ago'
    category: 'Project' | 'Report' | 'Finance' | 'Resources' | 'People';
    icon: string;
    iconColor: string;
    priority: 1 | 2 | 3 | 4; // 1 = Draft, 2 = Autosaved, 3 = Edited, 4 = Context
    lastActiveAt: string; // ISO string for recency sorting
    route: string;
}

export const CANDIDATE_CONTINUE_ITEMS: ContinueItem[] = [];

export function FormaContinue() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { activeTenant } = useTenantContext();

    // Ranked by: 1) Priority ascending (1=Draft > 2=Autosave > 3=Edited > 4=Context), 2) Recency descending
    const items = useMemo(() => {
        return [...CANDIDATE_CONTINUE_ITEMS]
            .sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
            })
            .slice(0, 4);
    }, []);

    // Do not show an empty section or placeholder when there is nothing to continue
    if (!activeTenant || items.length === 0) return null;

    const primaryItem = items[0];
    const secondaryItems = items.slice(1);

    const handlePress = (item: ContinueItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(item.route as any);
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: Colors[resolvedTheme].text }]}>
                    Continue
                </Text>
            </View>

            {/* Main Primary Hero Card (Most Recent) */}
            <View style={styles.primaryCardWrapper}>
                <Pressable
                    onPress={() => handlePress(primaryItem)}
                    style={({ pressed }) => [
                        styles.primaryCard,
                        isDark ? styles.cardDark : styles.cardLight,
                        pressed && (isDark ? styles.cardPressedDark : styles.cardPressedLight),
                    ]}
                >
                    <View style={styles.primaryRow}>
                        <View style={[styles.primaryIconBox, { backgroundColor: `${primaryItem.iconColor}16` }]}>
                            <PlatformIcon
                                name={primaryItem.icon as any}
                                size={19}
                                tintColor={primaryItem.iconColor}
                            />
                        </View>

                        <View style={styles.contentCol}>
                            <View style={styles.categoryBadgeRow}>
                                <Text style={[styles.categoryBadgeText, { color: primaryItem.iconColor }]}>
                                    {primaryItem.category}
                                </Text>
                                <Text style={[styles.contextDot, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                                    •
                                </Text>
                                <Text style={[styles.contextText, isDark ? styles.subtitleDark : styles.subtitleLight]} numberOfLines={1}>
                                    {primaryItem.context}
                                </Text>
                            </View>
                            <Text style={[styles.primaryTitle, { color: Colors[resolvedTheme].text }]} numberOfLines={1}>
                                {primaryItem.title}
                            </Text>
                            <Text style={[styles.itemSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]} numberOfLines={2}>
                                {primaryItem.reason}
                            </Text>
                        </View>

                        <View style={styles.chevronBox}>
                            <PlatformIcon
                                name="chevron.right"
                                size={14}
                                tintColor={isDark ? '#71717A' : '#A1A1AA'}
                            />
                        </View>
                    </View>
                </Pressable>
            </View>

            {/* Secondary Layout based on total count */}
            {secondaryItems.length === 1 && (
                <View style={styles.primaryCardWrapper}>
                    <Pressable
                        onPress={() => handlePress(secondaryItems[0])}
                        style={({ pressed }) => [
                            styles.primaryCard,
                            isDark ? styles.cardDark : styles.cardLight,
                            pressed && (isDark ? styles.cardPressedDark : styles.cardPressedLight),
                        ]}
                    >
                        <View style={styles.primaryRow}>
                            <View style={[styles.primaryIconBox, { backgroundColor: `${secondaryItems[0].iconColor}16` }]}>
                                <PlatformIcon
                                    name={secondaryItems[0].icon as any}
                                    size={19}
                                    tintColor={secondaryItems[0].iconColor}
                                />
                            </View>

                            <View style={styles.contentCol}>
                                <View style={styles.categoryBadgeRow}>
                                    <Text style={[styles.categoryBadgeText, { color: secondaryItems[0].iconColor }]}>
                                        {secondaryItems[0].category}
                                    </Text>
                                    <Text style={[styles.contextDot, isDark ? styles.subtitleDark : styles.subtitleLight]}>
                                        •
                                    </Text>
                                    <Text style={[styles.contextText, isDark ? styles.subtitleDark : styles.subtitleLight]} numberOfLines={1}>
                                        {secondaryItems[0].context}
                                    </Text>
                                </View>
                                <Text style={[styles.primaryTitle, { color: Colors[resolvedTheme].text }]} numberOfLines={1}>
                                    {secondaryItems[0].title}
                                </Text>
                                <Text style={[styles.itemSubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]} numberOfLines={2}>
                                    {secondaryItems[0].reason}
                                </Text>
                            </View>

                            <View style={styles.chevronBox}>
                                <PlatformIcon
                                    name="chevron.right"
                                    size={14}
                                    tintColor={isDark ? '#71717A' : '#A1A1AA'}
                                />
                            </View>
                        </View>
                    </Pressable>
                </View>
            )}

            {secondaryItems.length === 2 && (
                <View style={styles.staticRowContent}>
                    {secondaryItems.map((item) => (
                        <Pressable
                            key={item.id}
                            onPress={() => handlePress(item)}
                            style={({ pressed }) => [
                                styles.secondaryCardStatic,
                                isDark ? styles.cardDark : styles.cardLight,
                                pressed && (isDark ? styles.cardPressedDark : styles.cardPressedLight),
                            ]}
                        >
                            <View style={styles.secondaryCardHeader}>
                                <View style={[styles.secondaryIconBox, { backgroundColor: `${item.iconColor}16` }]}>
                                    <PlatformIcon
                                        name={item.icon as any}
                                        size={14}
                                        tintColor={item.iconColor}
                                    />
                                </View>
                                <Text style={[styles.secondaryCategoryText, { color: item.iconColor }]}>
                                    {item.category}
                                </Text>
                            </View>

                            <View style={styles.secondaryCardBody}>
                                <Text
                                    style={[styles.secondaryTitle, { color: Colors[resolvedTheme].text }]}
                                    numberOfLines={2}
                                >
                                    {item.title}
                                </Text>
                                <Text
                                    style={[styles.secondarySubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}
                                    numberOfLines={2}
                                >
                                    {item.reason}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            )}

            {secondaryItems.length >= 3 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.secondaryScrollContent}
                >
                    {secondaryItems.map((item) => (
                        <Pressable
                            key={item.id}
                            onPress={() => handlePress(item)}
                            style={({ pressed }) => [
                                styles.secondaryCardScroll,
                                isDark ? styles.cardDark : styles.cardLight,
                                pressed && (isDark ? styles.cardPressedDark : styles.cardPressedLight),
                            ]}
                        >
                            <View style={styles.secondaryCardHeader}>
                                <View style={[styles.secondaryIconBox, { backgroundColor: `${item.iconColor}16` }]}>
                                    <PlatformIcon
                                        name={item.icon as any}
                                        size={14}
                                        tintColor={item.iconColor}
                                    />
                                </View>
                                <Text style={[styles.secondaryCategoryText, { color: item.iconColor }]}>
                                    {item.category}
                                </Text>
                            </View>

                            <View style={styles.secondaryCardBody}>
                                <Text
                                    style={[styles.secondaryTitle, { color: Colors[resolvedTheme].text }]}
                                    numberOfLines={2}
                                >
                                    {item.title}
                                </Text>
                                <Text
                                    style={[styles.secondarySubtitle, isDark ? styles.subtitleDark : styles.subtitleLight]}
                                    numberOfLines={2}
                                >
                                    {item.reason}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingBottom: 16,
        gap: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
        opacity: 0.5,
    },
    primaryCardWrapper: {
        paddingHorizontal: 16,
    },
    primaryCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    cardLight: {
        backgroundColor: '#FFFFFF',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(0,0,0,0.06)',
    },
    cardDark: {
        backgroundColor: '#1C1C1E',
        borderColor: Platform.OS === 'android' ? 'transparent' : 'rgba(255,255,255,0.08)',
    },
    cardPressedLight: {
        backgroundColor: '#F8FAFC',
    },
    cardPressedDark: {
        backgroundColor: '#27272A',
    },
    primaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    primaryIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 13,
    },
    categoryBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 2,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    contextDot: {
        fontSize: 10,
        opacity: 0.6,
    },
    contextText: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: -0.1,
    },
    contentCol: {
        flex: 1,
        gap: 2,
    },
    primaryTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    itemSubtitle: {
        fontSize: 12.5,
        lineHeight: 16,
    },
    subtitleLight: {
        color: '#64748B',
    },
    subtitleDark: {
        color: '#94A3B8',
    },
    chevronBox: {
        paddingLeft: 8,
        justifyContent: 'center',
    },
    // Static 2-card row (Total 3 items: fits screen side-by-side without scrolling)
    staticRowContent: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
    },
    secondaryCardStatic: {
        flex: 1,
        borderRadius: 18,
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        padding: 13,
        minHeight: 118,
        justifyContent: 'space-between',
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    // Horizontal Scroll Row (Total 4 items: card 3 peeks into view)
    secondaryScrollContent: {
        paddingHorizontal: 16,
        gap: 10,
    },
    secondaryCardScroll: {
        width: 172,
        borderRadius: 18,
        borderWidth: Platform.OS === 'android' ? 0 : 1,
        padding: 13,
        minHeight: 118,
        justifyContent: 'space-between',
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    secondaryCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    secondaryIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryCategoryText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    secondaryCardBody: {
        gap: 4,
    },
    secondaryTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
        lineHeight: 17,
    },
    secondarySubtitle: {
        fontSize: 11.5,
        lineHeight: 15,
    },
});
