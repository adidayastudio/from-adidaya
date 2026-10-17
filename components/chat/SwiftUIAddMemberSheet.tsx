import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    Platform,
    StyleSheet,
    SectionList,
    Image,
    ActivityIndicator,
    Animated,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormaBlue } from '@/constants/theme';
import { useTenantContext } from '@/context/TenantContext';

export interface PeopleDirectoryItem {
    id: string;
    user_id: string;
    name: string;
    role: string;
    dept: string;
    avatar_url?: string | null;
}

export interface SwiftUIAddMemberSheetProps {
    visible: boolean;
    onClose: () => void;
    peopleDirectory: PeopleDirectoryItem[];
    loading?: boolean;
    onAddMember: (person: PeopleDirectoryItem) => void;
    isDark?: boolean;
}

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

export function SwiftUIAddMemberSheet({
    visible,
    onClose,
    peopleDirectory,
    loading = false,
    onAddMember,
    isDark = false,
}: SwiftUIAddMemberSheetProps) {
    const insets = useSafeAreaInsets();
    const { activeTenant } = useTenantContext();
    const primaryColor = activeTenant?.primary_color || '#10B981';
    const [searchQuery, setSearchQuery] = useState('');

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setSearchQuery('');
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible, slideAnim, fadeAnim]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start(() => {
            onClose();
        });
    };

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    const sections = useMemo(() => {
        let list = peopleDirectory;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.role.toLowerCase().includes(q) ||
                    p.dept.toLowerCase().includes(q)
            );
        }

        const groups: { [key: string]: PeopleDirectoryItem[] } = {};
        for (const item of list) {
            const dept = item.dept || 'Other';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(item);
        }

        return Object.keys(groups)
            .sort()
            .map((dept) => ({
                title: dept,
                data: groups[dept],
            }));
    }, [peopleDirectory, searchQuery]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleDismiss}
            statusBarTranslucent={true}
            navigationBarTranslucent={Platform.OS === 'android'}
        >
            <View style={[styles.overlay, Platform.OS === 'web' && styles.overlayWeb]}>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>
                <Animated.View
                    style={[
                        styles.container,
                        Platform.OS === 'web' && styles.containerWeb,
                        {
                            backgroundColor: cardBg,
                            borderColor,
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [Platform.OS === 'web' ? 450 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [Platform.OS === 'web' ? 0 : 350, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {Platform.OS !== 'web' && (
                        <View style={styles.handle}>
                            <View style={[styles.handleBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
                        </View>
                    )}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>Add Member</Text>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close" size={18} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor }]}>
                        <Ionicons name="search-outline" size={16} color={subtextColor} style={{ marginRight: 8 }} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder="Search people..."
                            placeholderTextColor={subtextColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="small" color={subtextColor} />
                            <Text style={[styles.centerText, { color: subtextColor }]}>Loading people...</Text>
                        </View>
                    ) : sections.length === 0 ? (
                        <View style={styles.centerBox}>
                            <Text style={[styles.centerText, { color: subtextColor }]}>
                                {searchQuery ? 'No matching people found' : 'No more people to add'}
                            </Text>
                        </View>
                    ) : (
                        <SectionList
                            sections={sections}
                            keyExtractor={(item) => item.id}
                            renderSectionHeader={({ section: { title } }) => (
                                <View style={[styles.sectionHeader, { backgroundColor: cardBg }]}>
                                    <Text style={[styles.sectionTitle, { color: subtextColor }]}>{title}</Text>
                                </View>
                            )}
                            renderItem={({ item, index, section }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.personRow,
                                        index < section.data.length - 1 && {
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderBottomColor: borderColor,
                                        },
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => onAddMember(item)}
                                >
                                    {item.avatar_url ? (
                                        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                                    ) : (
                                        <View style={[styles.avatar, { backgroundColor: primaryColor, alignItems: 'center', justifyContent: 'center' }]}>
                                            <Text style={styles.initials}>{getInitials(item.name)}</Text>
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.name, { color: textColor }]}>{item.name}</Text>
                                        <Text style={[styles.role, { color: subtextColor }]}>{item.role}</Text>
                                    </View>
                                    <Ionicons name="add-circle-outline" size={22} color={isDark ? FormaBlue[400] : FormaBlue[700]} />
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    },
    overlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    container: {
        borderRadius: Platform.OS === 'ios' ? 40 : 32,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 40 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 40 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 16 : 10,
        overflow: 'hidden',
        width: '100%',
        maxHeight: '80%',
        display: 'flex',
        flexDirection: 'column',
    },
    containerWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 420,
        maxWidth: 'calc(100% - 24px)' as any,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 1,
        height: 'calc(100% - 24px)' as any,
        maxHeight: 'none' as any,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08)',
        } as any) : {}),
    },
    handle: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 4,
    },
    handleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
    },
    centerBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    centerText: {
        fontSize: 13,
    },
    sectionHeader: {
        paddingHorizontal: 18,
        paddingVertical: 6,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    personRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
        gap: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    initials: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
    },
    role: {
        fontSize: 12,
        marginTop: 1,
    },
});
