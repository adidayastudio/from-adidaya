import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import {
    Announcement,
    AnnouncementDocument,
    ANNOUNCEMENT_TEMPLATES,
    formatPostedAt,
    formatRole,
    getInitials,
    withdrawAnnouncement,
    restoreAnnouncement,
    deleteAnnouncement,
    togglePinAnnouncement,
} from '@/lib/announcements';
import { SwiftUIDocumentPreviewSheet } from '@/components/home/SwiftUIDocumentPreviewSheet';
import { ForwardToChatModal, ForwardPayload } from '@/components/chat/ForwardToChatModal';
import { copyToClipboard, triggerSystemShare } from '@/lib/shareActions';
import { supabase } from '@/lib/supabase';

export interface AnnouncementDetailPaneProps {
    announcement: Announcement;
    onClose?: () => void;
    onUpdated?: () => void;
}

export function AnnouncementDetailPane({
    announcement,
    onClose,
    onUpdated,
}: AnnouncementDetailPaneProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const formaBlue = isDark ? '#4D82FF' : '#0036F8';

    const { tenantRole, isSuperAdmin, activeTenant } = useTenantContext();
    const isAuthorized = isSuperAdmin || !!(tenantRole && (
        tenantRole.toLowerCase().includes('admin') ||
        tenantRole.toLowerCase().includes('owner') ||
        tenantRole.toLowerCase().includes('lead') ||
        tenantRole.toLowerCase().includes('manager')
    ));

    const [selectedDoc, setSelectedDoc] = useState<AnnouncementDocument | null>(null);
    const [dbAvatarUrl, setDbAvatarUrl] = useState<string | null>(null);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardPayload, setForwardPayload] = useState<ForwardPayload | null>(null);

    const templateConfig = ANNOUNCEMENT_TEMPLATES[announcement.template] || ANNOUNCEMENT_TEMPLATES.general;

    useEffect(() => {
        if (announcement?.authorName && !announcement?.authorAvatarUrl) {
            supabase
                .from('profiles')
                .select('avatar_url')
                .or(`full_name.eq."${announcement.authorName}",nickname.eq."${announcement.authorName}"`)
                .limit(1)
                .maybeSingle()
                .then(
                    ({ data }) => {
                        if (data?.avatar_url) {
                            setDbAvatarUrl(data.avatar_url);
                        }
                    },
                    () => {}
                );
        }
    }, [announcement?.authorName, announcement?.authorAvatarUrl]);

    const formatShareText = () => {
        const categoryLabel = (templateConfig?.label || 'Announcement').toUpperCase();
        const parts: string[] = [
            `[${categoryLabel}]`,
            announcement.title,
        ];
        if (announcement.subtitle) parts.push(announcement.subtitle);
        if (announcement.bodyContent) parts.push(announcement.bodyContent);

        const metaParts: string[] = [];
        if (announcement.duration) metaParts.push(`Schedule ${announcement.duration}`);
        const postedAt = announcement.dateCreated ? formatPostedAt(announcement.dateCreated) : '';
        const author = announcement.authorName || 'Broadcast Team';
        metaParts.push(`Posted by ${author}${postedAt ? ` • ${postedAt}` : ''}`);

        if (metaParts.length > 0) {
            parts.push('');
            parts.push(metaParts.join('\n'));
        }

        return parts.join('\n');
    };

    const handleShareToChat = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setForwardPayload({
            title: announcement.title,
            text: formatShareText(),
            announcementId: announcement.id,
        });
        setForwardModalVisible(true);
    };

    const handleCopyText = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await copyToClipboard(formatShareText(), 'Announcement copied to clipboard');
    };

    const handleNativeShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await triggerSystemShare({
            title: announcement.title,
            message: formatShareText(),
        });
    };

    const handleTogglePin = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const tenantId = announcement.tenantId || activeTenant?.id;
        await togglePinAnnouncement(announcement.id, tenantId);
        onUpdated?.();
    };

    const handleWithdrawToggle = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const tenantId = announcement.tenantId || activeTenant?.id;
        const confirmMsg = announcement.isWithdrawn
            ? `Restore "${announcement.title}" to active announcements?`
            : `Withdraw "${announcement.title}"? It will no longer appear on Home Brief.`;

        const doAction = async () => {
            if (announcement.isWithdrawn) {
                await restoreAnnouncement(announcement.id, tenantId);
            } else {
                await withdrawAnnouncement(announcement.id, tenantId);
            }
            onUpdated?.();
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                await doAction();
            }
        } else {
            Alert.alert(
                announcement.isWithdrawn ? 'Restore Announcement' : 'Withdraw Announcement',
                confirmMsg,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: announcement.isWithdrawn ? 'Restore' : 'Withdraw',
                        style: announcement.isWithdrawn ? 'default' : 'destructive',
                        onPress: doAction,
                    },
                ]
            );
        }
    };

    const handleDelete = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const tenantId = announcement.tenantId || activeTenant?.id;
        const confirmMsg = `Permanently delete "${announcement.title}"? This action cannot be undone.`;

        const doDelete = async () => {
            await deleteAnnouncement(announcement.id, tenantId);
            onClose?.();
            onUpdated?.();
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                await doDelete();
            }
        } else {
            Alert.alert(
                'Delete Announcement',
                confirmMsg,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete Permanently',
                        style: 'destructive',
                        onPress: doDelete,
                    },
                ]
            );
        }
    };

    const avatarSource = announcement.authorAvatarUrl || dbAvatarUrl;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Content Card */}
                <View style={[styles.mainCard, { backgroundColor: cardBgColor, borderColor }]}>
                    {/* Top Vibrant Header Strip */}
                    <LinearGradient
                        colors={templateConfig.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bannerHeader}
                    >
                        <View style={styles.bannerLeftRow}>
                            <View style={styles.iconSquircle}>
                                <PlatformIcon
                                    name={templateConfig.icon as any}
                                    size={18}
                                    tintColor="#FFFFFF"
                                />
                            </View>
                            <View style={styles.categoryPill}>
                                <Text style={styles.categoryPillText}>
                                    {templateConfig.label}
                                </Text>
                            </View>
                            {announcement.isFeatured && (
                                <View style={[styles.categoryPill, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
                                    <PlatformIcon name="pin.fill" size={11} tintColor="#FFFFFF" />
                                    <Text style={styles.categoryPillText}>Pinned</Text>
                                </View>
                            )}
                            {announcement.isWithdrawn && (
                                <View style={[styles.categoryPill, { backgroundColor: 'rgba(220, 38, 38, 0.5)' }]}>
                                    <Text style={styles.categoryPillText}>Withdrawn</Text>
                                </View>
                            )}
                        </View>

                        {onClose && (
                            <HeaderCircleButton
                                type="close"
                                isDark={true}
                                tintColor="#FFFFFF"
                                size={32}
                                onPress={onClose}
                                style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
                            />
                        )}
                    </LinearGradient>

                    {/* Body Padding */}
                    <View style={styles.cardInnerContent}>
                        {/* Duration Pill (if set) */}
                        {!!announcement.duration && (
                            <View style={styles.durationRow}>
                                <PlatformIcon name="calendar" size={13} tintColor={subtextColor} />
                                <Text style={[styles.durationText, { color: subtextColor }]}>
                                    {announcement.duration}
                                </Text>
                            </View>
                        )}

                        {/* Title & Subtitle */}
                        <Text style={[styles.title, { color: textColor }]}>
                            {announcement.title}
                        </Text>
                        {!!announcement.subtitle && (
                            <Text style={[styles.subtitle, { color: subtextColor }]}>
                                {announcement.subtitle}
                            </Text>
                        )}

                        {/* Author Profile Row */}
                        <View style={[styles.authorRow, { borderTopColor: borderColor, borderBottomColor: borderColor }]}>
                            {avatarSource ? (
                                <Image source={{ uri: avatarSource }} style={styles.authorAvatar} contentFit="cover" />
                            ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: isDark ? 'rgba(0,54,248,0.2)' : '#EFF6FF' }]}>
                                    <Text style={[styles.avatarFallbackText, { color: formaBlue }]}>
                                        {getInitials(announcement.authorName)}
                                    </Text>
                                </View>
                            )}
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={[styles.authorName, { color: textColor }]}>
                                    {announcement.authorName || 'Management'}
                                </Text>
                                <Text style={[styles.authorMeta, { color: subtextColor }]}>
                                    {formatRole(announcement.authorRole)}{announcement.targetDepartment ? ` • ${announcement.targetDepartment}` : ''}
                                    {announcement.dateCreated ? ` • ${formatPostedAt(announcement.dateCreated)}` : ''}
                                </Text>
                            </View>
                        </View>

                        {/* Body Content */}
                        {!!announcement.bodyContent && (
                            <View style={styles.bodyWrap}>
                                <Text style={[styles.bodyText, { color: textColor }]}>
                                    {announcement.bodyContent}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Attached Documents Section */}
                {announcement.documents && announcement.documents.length > 0 && (
                    <View style={styles.sectionWrap}>
                        <Text style={[styles.sectionHeading, { color: subtextColor }]}>
                            Attached Documents ({announcement.documents.length})
                        </Text>
                        <View style={[styles.docsCard, { backgroundColor: cardBgColor, borderColor }]}>
                            {announcement.documents.map((doc, idx) => {
                                const isLast = idx === announcement.documents!.length - 1;
                                const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                                const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.name) || doc.type === 'image';

                                return (
                                    <View key={doc.id || idx}>
                                        <TouchableOpacity
                                            onPress={() => setSelectedDoc(doc)}
                                            activeOpacity={0.7}
                                            style={styles.docRow}
                                        >
                                            {isImage && doc.url ? (
                                                <Image source={{ uri: doc.url }} style={styles.docThumbnail} contentFit="cover" />
                                            ) : (
                                                <View style={[styles.docIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                                    <PlatformIcon
                                                        name={isImage ? 'photo.fill' : isPdf ? 'doc.text.fill' : 'link'}
                                                        size={16}
                                                        tintColor={isDark ? '#A1A1AA' : '#64748B'}
                                                    />
                                                </View>
                                            )}
                                            <View style={{ flex: 1, gap: 2 }}>
                                                <Text style={[styles.docName, { color: textColor }]} numberOfLines={1}>
                                                    {doc.name}
                                                </Text>
                                                <Text style={[styles.docMeta, { color: subtextColor }]}>
                                                    {doc.size || 'Attachment'}
                                                </Text>
                                            </View>
                                            <PlatformIcon name="chevron.right" size={13} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                        {!isLast && <View style={[styles.docDivider, { backgroundColor: borderColor }]} />}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Actions Toolbar Row */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        onPress={handleShareToChat}
                        activeOpacity={0.75}
                        style={[styles.actionBtn, { backgroundColor: cardBgColor, borderColor }]}
                    >
                        <PlatformIcon name="paperplane" size={15} tintColor={formaBlue} />
                        <Text style={[styles.actionBtnText, { color: textColor }]}>Share to Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleCopyText}
                        activeOpacity={0.75}
                        style={[styles.actionBtn, { backgroundColor: cardBgColor, borderColor }]}
                    >
                        <PlatformIcon name="doc.on.doc" size={15} tintColor={formaBlue} />
                        <Text style={[styles.actionBtnText, { color: textColor }]}>Copy Text</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleNativeShare}
                        activeOpacity={0.75}
                        style={[styles.actionBtn, { backgroundColor: cardBgColor, borderColor }]}
                    >
                        <PlatformIcon name="square.and.arrow.up" size={15} tintColor={formaBlue} />
                        <Text style={[styles.actionBtnText, { color: textColor }]}>Share...</Text>
                    </TouchableOpacity>

                    {isAuthorized && (
                        <>
                            <TouchableOpacity
                                onPress={handleTogglePin}
                                activeOpacity={0.75}
                                style={[styles.actionBtn, { backgroundColor: cardBgColor, borderColor }]}
                            >
                                <PlatformIcon name={announcement.isFeatured ? 'pin.slash' : 'pin'} size={15} tintColor={formaBlue} />
                                <Text style={[styles.actionBtnText, { color: textColor }]}>
                                    {announcement.isFeatured ? 'Unpin' : 'Pin'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleWithdrawToggle}
                                activeOpacity={0.75}
                                style={[styles.actionBtn, { backgroundColor: cardBgColor, borderColor }]}
                            >
                                <PlatformIcon name={announcement.isWithdrawn ? 'arrow.uturn.backward' : 'xmark.circle'} size={15} tintColor={announcement.isWithdrawn ? formaBlue : '#DC2626'} />
                                <Text style={[styles.actionBtnText, { color: announcement.isWithdrawn ? textColor : '#DC2626' }]}>
                                    {announcement.isWithdrawn ? 'Restore' : 'Withdraw'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleDelete}
                                activeOpacity={0.75}
                                style={[styles.actionBtn, { backgroundColor: cardBgColor, borderColor }]}
                            >
                                <PlatformIcon name="trash" size={15} tintColor="#DC2626" />
                                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>

            <SwiftUIDocumentPreviewSheet
                isOpened={!!selectedDoc}
                document={selectedDoc}
                onClose={() => setSelectedDoc(null)}
            />

            {forwardPayload && (
                <ForwardToChatModal
                    visible={forwardModalVisible}
                    onClose={() => {
                        setForwardModalVisible(false);
                        setForwardPayload(null);
                    }}
                    payload={forwardPayload}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        gap: 16,
        paddingBottom: 60,
    },
    mainCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 14,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    bannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    bannerLeftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    iconSquircle: {
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: 'rgba(255, 255, 255, 0.24)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    categoryPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
    cardInnerContent: {
        padding: 20,
        gap: 12,
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    durationText: {
        fontSize: 12,
        fontWeight: '600',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
        lineHeight: 28,
    },
    subtitle: {
        fontSize: 14.5,
        lineHeight: 21,
        fontWeight: '500',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        marginTop: 4,
    },
    authorAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFallbackText: {
        fontSize: 14,
        fontWeight: '700',
    },
    authorName: {
        fontSize: 14,
        fontWeight: '700',
    },
    authorMeta: {
        fontSize: 12,
    },
    bodyWrap: {
        paddingTop: 4,
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '400',
    },
    sectionWrap: {
        gap: 8,
    },
    sectionHeading: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.1,
        marginLeft: 4,
    },
    docsCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
    },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    docThumbnail: {
        width: 36,
        height: 36,
        borderRadius: 8,
    },
    docIconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docName: {
        fontSize: 14,
        fontWeight: '600',
    },
    docMeta: {
        fontSize: 12,
    },
    docDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 64,
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
