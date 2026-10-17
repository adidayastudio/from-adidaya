import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { DOCUMENT_CATEGORIES } from '../types';
import { DocumentPreviewDrawer, PreviewDocItem } from '@/components/people/DocumentPreviewDrawer';
import { dispatchSignDocumentAction } from '@/lib/workflows/peopleWorkflow';

interface MemberDocumentsTabProps {
    userId?: string;
    documents: any[];
    uploadingDoc: string | null;
    onUploadDoc: (catId: string) => void;
    onDeleteDoc?: (docId: string, category: string) => void;
    onPreviewDoc?: (doc: PreviewDocItem) => void;
    textColor: string;
    subtextColor: string;
    borderColor: string;
    bgColor: string;
    intensity: number;
    sectionTitleColor: string;
    isDark?: boolean;
}

export const MemberDocumentsTab: React.FC<MemberDocumentsTabProps> = ({
    userId,
    documents,
    uploadingDoc,
    onUploadDoc,
    onDeleteDoc,
    onPreviewDoc,
    textColor,
    subtextColor,
    borderColor,
    bgColor,
    intensity,
    sectionTitleColor,
    isDark = false,
}) => {
    const [selectedDoc, setSelectedDoc] = useState<PreviewDocItem | null>(null);

    const handleRequestSignature = async (doc: PreviewDocItem) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const targetUid = userId || '1';
            const action = await dispatchSignDocumentAction({
                employeeUserId: targetUid,
                documentId: doc.id,
                documentTitle: doc.title || doc.category,
                documentType: doc.category,
                fileUrl: doc.file_url,
            });

            if (action) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Signature Requested', `An Action "Sign ${doc.title || doc.category}" has been generated for the employee.`);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not dispatch signature request.');
        }
    };

    const handleDownloadDoc = async (url: string, title: string) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const safeTitle = (title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
            const cleanUrl = url.split('?')[0];
            const ext = cleanUrl.split('.').pop() || 'pdf';
            const localUri = `${FileSystem.cacheDirectory}${safeTitle}-${Date.now()}.${ext}`;

            const downloadRes = await FileSystem.downloadAsync(url, localUri);
            if (downloadRes.status === 200) {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(downloadRes.uri, {
                        UTI: ext === 'pdf' ? 'com.adobe.pdf' : 'public.item',
                        dialogTitle: `Download / Save ${title}`,
                    });
                } else {
                    Alert.alert('Downloaded', `File saved to ${downloadRes.uri}`);
                }
            } else {
                throw new Error('Failed to download file.');
            }
        } catch (e: any) {
            Alert.alert('Download Failed', e.message || 'Could not download document.');
        }
    };

    const customDocs = documents.filter(
        (d) => !DOCUMENT_CATEGORIES.some((c) => c.id === (d.document_type || d.category))
    );

    return (
        <View style={s.section}>
            <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>Official Documents</Text>
                <Text style={[s.sectionSubtitle, { color: subtextColor }]}>{documents.length} Uploaded</Text>
            </View>

            {/* Individual Document Cards */}
            <View style={s.cardsGrid}>
                {DOCUMENT_CATEGORIES.map((cat) => {
                    const doc = documents.find((d) => (d.document_type || d.category) === cat.id);
                    const isUploading = uploadingDoc === cat.id;
                    const isPasFoto = cat.id === 'Pas Foto';
                    const hasThumbnail = doc && (isPasFoto || /\.(jpg|jpeg|png|webp|gif)/i.test(doc.file_url));

                    return (
                        <TouchableOpacity
                            key={cat.id}
                            activeOpacity={0.8}
                            onPress={() => {
                                if (doc) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    const docItem = {
                                        id: doc.id,
                                        title: doc.title || doc.name || cat.label,
                                        category: cat.label,
                                        file_url: doc.file_url,
                                        created_at: doc.created_at,
                                        updated_at: doc.updated_at,
                                    };
                                    if (onPreviewDoc) {
                                        onPreviewDoc(docItem);
                                    } else {
                                        setSelectedDoc(docItem);
                                    }
                                } else {
                                    onUploadDoc(cat.id);
                                }
                            }}
                        >
                            <GlassView
                                intensity={intensity}
                                style={[
                                    s.docCard,
                                    {
                                        backgroundColor: bgColor,
                                        borderColor: borderColor,
                                    },
                                ]}
                            >
                                {/* Left Thumbnail / Icon */}
                                <View style={s.thumbnailContainer}>
                                    {hasThumbnail ? (
                                        <Image
                                            source={{ uri: doc.file_url }}
                                            style={s.thumbnailImage}
                                            contentFit="cover"
                                            transition={200}
                                        />
                                    ) : (
                                        <View
                                            style={[
                                                s.iconBox,
                                                {
                                                    backgroundColor: doc
                                                        ? (isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)')
                                                        : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                                                },
                                            ]}
                                        >
                                            <PlatformIcon
                                                name={isPasFoto ? 'person.crop.square.fill' : 'doc.text.fill'}
                                                size={22}
                                                tintColor={doc ? '#007AFF' : subtextColor}
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* Middle Info */}
                                <View style={s.infoColumn}>
                                    <Text style={[s.cardTitle, { color: textColor }]} numberOfLines={1}>
                                        {cat.label}
                                    </Text>
                                    <Text style={[s.cardSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                        {doc
                                            ? `Uploaded • ${new Date(doc.created_at || doc.updated_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                            : 'Not uploaded yet'}
                                    </Text>
                                </View>

                                {/* Right Action */}
                                {!doc && (
                                    <View style={s.rightAction}>
                                        <BouncyGlassButton
                                            onPress={() => onUploadDoc(cat.id)}
                                            isDark={isDark}
                                            isGlass={true}
                                            style={s.plusButtonCircle}
                                        >
                                            {isUploading ? (
                                                <ActivityIndicator size="small" color="#007AFF" />
                                            ) : (
                                                <PlatformIcon name="plus" size={16} tintColor={isDark ? '#409CFF' : '#007AFF'} />
                                            )}
                                        </BouncyGlassButton>
                                    </View>
                                )}
                            </GlassView>
                        </TouchableOpacity>
                    );
                })}

                {/* Custom Uploaded Documents */}
                {customDocs.map((otherDoc) => {
                    const otherLabel = otherDoc.title || otherDoc.name || 'Custom Document';
                    const otherCat = otherDoc.document_type || otherDoc.category || 'Other';
                    const hasThumbnail = /\.(jpg|jpeg|png|webp|gif)/i.test(otherDoc.file_url);

                    return (
                        <TouchableOpacity
                            key={otherDoc.id || otherDoc.file_url}
                            activeOpacity={0.8}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                const docItem = {
                                    id: otherDoc.id,
                                    title: otherLabel,
                                    category: otherCat,
                                    file_url: otherDoc.file_url,
                                    created_at: otherDoc.created_at,
                                    updated_at: otherDoc.updated_at,
                                };
                                if (onPreviewDoc) {
                                    onPreviewDoc(docItem);
                                } else {
                                    setSelectedDoc(docItem);
                                }
                            }}
                        >
                            <GlassView
                                intensity={intensity}
                                style={[
                                    s.docCard,
                                    {
                                        backgroundColor: bgColor,
                                        borderColor: borderColor,
                                    },
                                ]}
                            >
                                <View style={s.thumbnailContainer}>
                                    {hasThumbnail ? (
                                        <Image
                                            source={{ uri: otherDoc.file_url }}
                                            style={s.thumbnailImage}
                                            contentFit="cover"
                                            transition={200}
                                        />
                                    ) : (
                                        <View style={[s.iconBox, { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.15)' : 'rgba(175, 82, 222, 0.08)' }]}>
                                            <PlatformIcon name="doc.fill" size={22} tintColor="#AF52DE" />
                                        </View>
                                    )}
                                </View>

                                <View style={s.infoColumn}>
                                    <Text style={[s.cardTitle, { color: textColor }]} numberOfLines={1}>
                                        {otherLabel}
                                    </Text>
                                    <Text style={[s.cardSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                        {otherCat} • Custom Document
                                    </Text>
                                </View>
                            </GlassView>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Native SwiftUI Document Preview & Management Drawer */}
            <DocumentPreviewDrawer
                visible={!!selectedDoc}
                document={selectedDoc}
                onClose={() => setSelectedDoc(null)}
                onDownload={handleDownloadDoc}
                onChange={(catLabel) => {
                    const matchedCat = DOCUMENT_CATEGORIES.find((c) => c.label === catLabel || c.id === catLabel);
                    onUploadDoc(matchedCat ? matchedCat.id : catLabel);
                }}
                onDelete={(docId, catLabel) => {
                    onDeleteDoc?.(docId, catLabel);
                }}
                onRequestSignature={handleRequestSignature}
                isDark={isDark}
            />
        </View>
    );
};

const s = StyleSheet.create({
    section: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '500',
        textTransform: 'none',
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    cardsGrid: {
        gap: 10,
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    thumbnailContainer: {
        position: 'relative',
        marginRight: 12,
    },
    thumbnailImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#000',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniCheckBadge: {
        position: 'absolute',
        bottom: -3,
        right: -3,
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 1,
    },
    infoColumn: {
        flex: 1,
        justifyContent: 'center',
        gap: 3,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    cardSubtitle: {
        fontSize: 12,
        fontWeight: '400',
    },
    rightAction: {
        marginLeft: 8,
    },
    previewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    previewBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    plusButtonCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
});
