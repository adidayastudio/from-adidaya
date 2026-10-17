import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Pressable,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// UI components
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTheme } from '@/context/ThemeContext';

interface SessionItem {
    id: string;
    title: string;
    createdAt: string;
    isPinned?: boolean;
}

export default function AdidayaAIHistoryScreen() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSessions = async () => {
        try {
            const rawList = await AsyncStorage.getItem('adidaya_ai_sessions_list');
            if (rawList) {
                setSessions(JSON.parse(rawList));
            }
        } catch (e) {
            console.error("Failed to load sessions from storage:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const togglePinSession = async (id: string) => {
        try {
            const updated = sessions.map(s => {
                if (s.id === id) {
                    return { ...s, isPinned: !s.isPinned };
                }
                return s;
            });
            await AsyncStorage.setItem('adidaya_ai_sessions_list', JSON.stringify(updated));
            setSessions(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error("Failed to pin session:", e);
        }
    };

    const deleteSession = async (idToDelete: string) => {
        try {
            await AsyncStorage.removeItem(`adidaya_ai_session_${idToDelete}`);
            const updated = sessions.filter(s => s.id !== idToDelete);
            await AsyncStorage.setItem('adidaya_ai_sessions_list', JSON.stringify(updated));
            setSessions(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error("Failed to delete session:", e);
        }
    };

    const handleLongPress = (session: SessionItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            session.title,
            'Choose an action for this chat:',
            [
                {
                    text: session.isPinned ? 'Unpin Chat' : 'Pin Chat',
                    onPress: () => togglePinSession(session.id)
                },
                {
                    text: 'Delete Chat',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Delete History',
                            'Are you sure you want to delete this chat history?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteSession(session.id) }
                            ]
                        );
                    }
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    const handleSelectSession = (session: SessionItem) => {
        Haptics.selectionAsync();
        router.replace({
            pathname: '/(tabs)/home/adidaya-ai',
            params: { sessionId: session.id }
        });
    };

    const handleNewChat = () => {
        Haptics.selectionAsync();
        router.replace({
            pathname: '/(tabs)/home/adidaya-ai',
            params: { newChat: 'true' }
        });
    };

    // Sort sessions: pinned first, then chronological descending
    const sortedSessions = [...sessions].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const backgroundColor = isDark ? '#000000' : '#F2F2F7';
    const cardBackgroundColor = isDark ? 'rgba(28,28,30,0.8)' : 'rgba(255,255,255,0.8)';
    const cardBorderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#FFFFFF' : '#000000';

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Chat History',
                    headerTintColor: isDark ? '#FFFFFF' : '#000000',
                    headerStyle: { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerTransparent: false,
                    headerRight: () => (
                        <Pressable 
                            onPress={handleNewChat}
                            style={({ pressed }) => [
                                styles.headerIconButton,
                                pressed && { opacity: 0.7 }
                            ]}
                        >
                            <PlatformIcon name="square.and.pencil" size={22} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                        </Pressable>
                    ),
                }}
            />

            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={[styles.container, { backgroundColor }]}
                contentContainerStyle={[
                    styles.contentContainer,
                    {
                        paddingTop: Platform.OS === 'ios' ? 12 : 20,
                        paddingBottom: insets.bottom + 20
                    }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="small" color="#8B5CF6" />
                    </View>
                ) : sortedSessions.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <GlassView intensity={30} style={[styles.emptyCard, { backgroundColor: cardBackgroundColor, borderColor: cardBorderColor }]}>
                            <PlatformIcon name="clock" size={40} tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
                            <Text style={[styles.emptyText, { color: isDark ? '#A1A1A6' : '#8E8E93' }]}>
                                No Chat History
                            </Text>
                            <Text style={[styles.emptySubtext, { color: isDark ? '#8E8E93' : '#AEAEB2' }]}>
                                Start a new conversation with Adidaya AI to save it here.
                            </Text>
                        </GlassView>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {sortedSessions.map(session => {
                            const formattedDate = new Date(session.createdAt).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            return (
                                <GlassView
                                    key={session.id}
                                    intensity={30}
                                    style={[
                                        styles.itemCard,
                                        {
                                            backgroundColor: cardBackgroundColor,
                                            borderColor: session.isPinned ? '#8B5CF6' : cardBorderColor,
                                            borderWidth: session.isPinned ? 1 : 0.5,
                                        }
                                    ]}
                                >
                                    <Pressable
                                        onPress={() => handleSelectSession(session)}
                                        onLongPress={() => handleLongPress(session)}
                                        style={({ pressed }) => [
                                            styles.itemPressable,
                                            pressed && { opacity: 0.8 }
                                        ]}
                                    >
                                        <View style={styles.itemContent}>
                                            <View style={styles.itemHeader}>
                                                <Text numberOfLines={1} style={[styles.itemTitle, { color: textColor }]}>
                                                    {session.title}
                                                </Text>
                                                {session.isPinned && (
                                                    <PlatformIcon name="pin.fill" size={14} tintColor="#8B5CF6" style={styles.pinIcon} />
                                                )}
                                            </View>
                                            <Text style={styles.itemDate}>
                                                {formattedDate}
                                            </Text>
                                        </View>
                                        <PlatformIcon name="chevron.right" size={16} tintColor={isDark ? '#8E8E93' : '#AEAEB2'} />
                                    </Pressable>
                                </GlassView>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Glowing background aura in dark mode */}
            {isDark && (
                <View style={styles.glowOverlay} pointerEvents="none">
                    <View style={[styles.glowColor, { backgroundColor: '#7C3AED', top: -100, left: -100 }]} />
                    <View style={[styles.glowColor, { backgroundColor: '#EC4899', bottom: -100, right: -100 }]} />
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyCard: {
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 340,
        borderWidth: 0.5,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    listContainer: {
        gap: 12,
        marginTop: 8,
    },
    itemCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 0.5,
    },
    itemPressable: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    itemContent: {
        flex: 1,
        marginRight: 12,
        gap: 6,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '600',
        flexShrink: 1,
    },
    pinIcon: {
        transform: [{ rotate: '45deg' }],
    },
    itemDate: {
        fontSize: 12,
        color: '#8E8E93',
    },
    glowOverlay: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        zIndex: -1,
    },
    glowColor: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        opacity: 0.12,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 100,
        elevation: 8,
    },
    headerIconButton: {
        marginRight: Platform.OS === 'ios' ? 0 : 16,
        padding: 6,
        borderRadius: 20,
    },
});
