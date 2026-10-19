import { DocumentFolderTree } from './DocumentFolderTree';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Share,
    Alert,
    LayoutAnimation,
    StyleProp,
    ViewStyle,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Project, saveProjectMeta } from '@/lib/api/projects';
import { SwiftUIDocInfoSheet, DocInfoItem } from '@/components/chat/SwiftUIDocInfoSheet';
import { FormaUniversalFileViewer } from '@/components/chat/FormaUniversalFileViewer';
import { FilePreviewItem } from '@/lib/filePreviewStrategy';

export interface DocsTabProps {
    project: Project;
    isDark: boolean;
    onRefresh?: () => void;
    searchQuery?: string;
    docFilterType?: string;
    docSortMode?: 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';
    isDocSelectMode?: boolean;
    setIsDocSelectMode?: (val: boolean) => void;
    selectedDocIds?: string[];
    setSelectedDocIds?: React.Dispatch<React.SetStateAction<string[]>>;
    docsList?: ProjectDocItem[];
    setDocsList?: React.Dispatch<React.SetStateAction<ProjectDocItem[]>>;
    savedDocIds?: string[];
    setSavedDocIds?: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface ProjectDocItem {
    id: string;
    name: string;
    size: string;
    uploadedBy: string;
    time: string;
    date: string;
    dateLabel: string;
    isSelf?: boolean;
    isSaved?: boolean;
    folder?: string;
    url?: string;
    subworkCode?: string;
    subwork_code?: string;
    stageCode?: string;
    stage_code?: string;
    folderCode?: string;
    folder_code?: string;
}

export const formatDocCardDate = (dateStr?: string, timeStr?: string): string => {
    if (!dateStr) return timeStr || '';
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayIso = now.toISOString().slice(0, 10);

    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        const docDateIso = parsed.toISOString().slice(0, 10);
        if (docDateIso === todayIso) {
            return timeStr || 'Today';
        }

        const day = parsed.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[parsed.getMonth()];
        const year = parsed.getFullYear();

        if (year === currentYear) {
            return `${day} ${month}`;
        }
        return `${day} ${month} ${year}`;
    }
    return dateStr;
};

export const getDocSectionLabel = (dateStr?: string, fallbackLabel?: string): string => {
    if (!dateStr) return fallbackLabel || 'Other';
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);

    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        const docDateIso = parsed.toISOString().slice(0, 10);
        if (docDateIso === todayIso) {
            return 'Today';
        }
        if (docDateIso === yesterdayIso) {
            return 'Yesterday';
        }
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[parsed.getMonth()];
        const year = parsed.getFullYear();
        return `${month} ${year}`;
    }
    return fallbackLabel || 'Other';
};

export const DEFAULT_PROJECT_MOCK_DOCS: ProjectDocItem[] = [
    {
        id: 'pdoc-1',
        name: 'As-Built Drawing Fondasi Zona A.dwg',
        size: '12.4 MB',
        uploadedBy: 'Ahmad Reza',
        time: '09:30 AM',
        date: '2026-06-12',
        dateLabel: 'Jun 2026',
        isSelf: false,
    },
    {
        id: 'pdoc-2',
        name: 'Laporan Mingguan PM - Minggu 12.pdf',
        size: '3.8 MB',
        uploadedBy: 'Manu Travo',
        time: '02:15 PM',
        date: '2026-06-14',
        dateLabel: 'Jun 2026',
        isSelf: true,
    },
    {
        id: 'pdoc-3',
        name: 'BoQ Pekerjaan MEP Revisi 2.xlsx',
        size: '1.2 MB',
        uploadedBy: 'Budi Santoso',
        time: '11:00 AM',
        date: '2026-06-10',
        dateLabel: 'Jun 2026',
        isSelf: false,
    },
    {
        id: 'pdoc-4',
        name: 'Site Progress - Cor Balok.jpg',
        size: '2.5 MB',
        uploadedBy: 'Sarah Amelia',
        time: '04:20 PM',
        date: '2026-06-13',
        dateLabel: 'Jun 2026',
        isSelf: false,
    },
    {
        id: 'pdoc-5',
        name: 'Kontrak Induk Kontraktor Utama.pdf',
        size: '8.1 MB',
        uploadedBy: 'Manu Travo',
        time: '09:00 AM',
        date: '2026-06-01',
        dateLabel: 'Jun 2026',
        isSelf: true,
    },
    {
        id: 'pdoc-6',
        name: 'Structural Framing Plan Level 2.dwg',
        size: '18.6 MB',
        uploadedBy: 'Ahmad Reza',
        time: '10:15 AM',
        date: '2026-05-15',
        dateLabel: 'May 2026',
        isSelf: false,
    },
    {
        id: 'pdoc-7',
        name: 'Rekapitulasi Purchase Order Material Besi.xlsx',
        size: '2.1 MB',
        uploadedBy: 'Rizky Firmansyah',
        time: '01:45 PM',
        date: '2026-05-22',
        dateLabel: 'May 2026',
        isSelf: false,
    },
];

export const BouncyToolbarButton = ({
    onPress,
    children,
    style,
    disabled = false,
}: {
    onPress?: () => void;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
}) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Pressable
            disabled={disabled}
            onPress={() => {
                if (onPress) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }
            }}
            onPressIn={() => {
                scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
            }}
            onPressOut={() => {
                scale.value = withSpring(1, { damping: 12, stiffness: 350 });
            }}
            style={style}
        >
            <Animated.View style={animatedStyle}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

export function DocsTab({
    project,
    isDark,
    onRefresh,
    searchQuery: propSearchQuery,
    docFilterType: propDocFilterType,
    docSortMode: propDocSortMode,
    isDocSelectMode: propIsDocSelectMode,
    setIsDocSelectMode: propSetIsDocSelectMode,
    selectedDocIds: propSelectedDocIds,
    setSelectedDocIds: propSetSelectedDocIds,
    docsList: propDocsList,
    setDocsList: propSetDocsList,
    savedDocIds: propSavedDocIds,
    setSavedDocIds: propSetSavedDocIds,
}: DocsTabProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#636366';
    const formaBlue = '#007AFF';

    // Internal states fallback if not controlled by parent
    const [localDocsList, setLocalDocsList] = useState<ProjectDocItem[]>([]);
    const [localSavedDocIds, setLocalSavedDocIds] = useState<string[]>([]);
    const [localSelectedDocIds, setLocalSelectedDocIds] = useState<string[]>([]);
    const [localIsDocSelectMode, setLocalIsDocSelectMode] = useState<boolean>(false);

    const docsList = propDocsList ?? localDocsList;
    const setDocsList = propSetDocsList ?? setLocalDocsList;
    const savedDocIds = propSavedDocIds ?? localSavedDocIds;
    const setSavedDocIds = propSetSavedDocIds ?? setLocalSavedDocIds;
    const selectedDocIds = propSelectedDocIds ?? localSelectedDocIds;
    const setSelectedDocIds = propSetSelectedDocIds ?? setLocalSelectedDocIds;
    const isDocSelectMode = propIsDocSelectMode ?? localIsDocSelectMode;
    const setIsDocSelectMode = propSetIsDocSelectMode ?? setLocalIsDocSelectMode;

    const searchQuery = propSearchQuery ?? '';
    const docFilterType = propDocFilterType ?? 'all';
    const docSortMode = propDocSortMode ?? 'date-desc';

    // Modals
    const [previewItem, setPreviewItem] = useState<FilePreviewItem | null>(null);
    const [docInfoTarget, setDocInfoTarget] = useState<DocInfoItem | null>(null);

    // Sync from project meta
    useEffect(() => {
        if (project.meta?.documents && Array.isArray(project.meta.documents) && project.meta.documents.length > 0) {
            const rawDocs = project.meta.documents;
            const normalized: ProjectDocItem[] = rawDocs.map((d: any, idx: number) => ({
                ...d,
                id: d.id || `pdoc-${idx}`,
                name: d.name || 'Document.pdf',
                size: d.size || '1.5 MB',
                uploadedBy: d.uploadedBy || 'Project Member',
                time: d.time || d.uploadedAt || 'Today',
                date: d.date || d.uploadedAt || '2026-09-20',
                dateLabel: d.dateLabel || 'Today',
                isSelf: d.uploadedBy?.includes('You') || d.uploadedBy?.includes('Manu') || false,
                isSaved: d.isSaved || false,
            }));
            setDocsList(normalized);
        } else {
            setDocsList([]);
        }
    }, [project.meta?.documents, setDocsList]);

    const saveDocsToDb = async (updated: ProjectDocItem[]) => {
        setDocsList(updated);
        try {
            await saveProjectMeta(project.id, { documents: updated });
            if (onRefresh) onRefresh();
        } catch (e) {
            console.error('Error saving project docs:', e);
        }
    };

    // Filter and Sort Computation
    const filteredDocs = useMemo(() => {
        let list = [...docsList];
        if (docFilterType === 'saved') {
            list = list.filter(doc => savedDocIds.includes(doc.id));
        } else if (docFilterType !== 'all') {
            list = list.filter((doc) => {
                const lower = doc.name.toLowerCase();
                if (docFilterType === 'pdf') return lower.endsWith('.pdf');
                if (docFilterType === 'spreadsheet') return lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
                if (docFilterType === 'cad') return lower.endsWith('.dwg') || lower.endsWith('.cad');
                return true;
            });
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((doc) => doc.name.toLowerCase().includes(q) || doc.uploadedBy.toLowerCase().includes(q));
        }
        const parseKb = (sizeStr: string) => {
            const s = sizeStr.toUpperCase();
            const n = parseFloat(s) || 0;
            if (s.includes('GB')) return n * 1024 * 1024;
            if (s.includes('MB')) return n * 1024;
            return n;
        };
        if (docSortMode === 'date-asc') {
            list.reverse();
        } else if (docSortMode === 'name-asc') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (docSortMode === 'name-desc') {
            list.sort((a, b) => b.name.localeCompare(a.name));
        } else if (docSortMode === 'size-desc') {
            list.sort((a, b) => parseKb(b.size) - parseKb(a.size));
        } else if (docSortMode === 'size-asc') {
            list.sort((a, b) => parseKb(a.size) - parseKb(b.size));
        }
        return list;
    }, [docsList, searchQuery, docSortMode, docFilterType, savedDocIds]);



    // Item Context Menu
    const getDocCardContextMenuActions = useCallback((doc: ProjectDocItem): ContextMenuAction[] => {
        const isSaved = savedDocIds.includes(doc.id);
        const isSelf = doc.isSelf || doc.uploadedBy === 'You' || doc.uploadedBy.includes('Manu');
        return [
            {
                title: 'Download',
                systemIcon: 'arrow.down.to.line',
            },
            {
                title: 'Share',
                systemIcon: 'square.and.arrow.up',
            },
            {
                title: isSaved ? 'Remove Bookmark' : 'Bookmark',
                systemIcon: isSaved ? 'bookmark.fill' : 'bookmark',
            },
            {
                title: 'Get Info',
                systemIcon: 'info.circle',
            },
            {
                title: 'Select',
                systemIcon: 'checkmark.circle',
            },
            {
                title: 'Delete',
                systemIcon: 'trash',
                destructive: true,
                actions: isSelf ? [
                    {
                        title: 'Delete for Me',
                        systemIcon: 'person.crop.circle.badge.minus',
                        destructive: true,
                    },
                    {
                        title: 'Delete for Everyone',
                        systemIcon: 'trash.fill',
                        destructive: true,
                    },
                ] : [
                    {
                        title: 'Delete for Me',
                        systemIcon: 'person.crop.circle.badge.minus',
                        destructive: true,
                    },
                ],
            },
        ];
    }, [savedDocIds]);

    const handleDocActionPress = (doc: ProjectDocItem, actionName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionName === 'Download') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Downloaded', `${doc.name} saved to exports.`);
        } else if (actionName === 'Share') {
            Share.share({
                message: `Forma Project Document: ${doc.name}`,
                title: doc.name,
            });
        } else if (actionName === 'Bookmark' || actionName === 'Remove Bookmark') {
            const isSaved = savedDocIds.includes(doc.id);
            if (isSaved) {
                setSavedDocIds(prev => prev.filter(id => id !== doc.id));
            } else {
                setSavedDocIds(prev => [...prev, doc.id]);
            }
        } else if (actionName === 'Get Info') {
            setDocInfoTarget({
                id: doc.id,
                name: doc.name,
                size: doc.size,
                uploadedBy: doc.uploadedBy,
                time: `${doc.time}, ${doc.date}`,
            });
        } else if (actionName === 'Select') {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsDocSelectMode(true);
            setSelectedDocIds([doc.id]);
        } else if (actionName.includes('Delete')) {
            const updated = docsList.filter(d => d.id !== doc.id);
            saveDocsToDb(updated);
        }
    };

    const handleToggleSelectDoc = (docId: string) => {
        Haptics.selectionAsync();
        setSelectedDocIds(prev =>
            prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
        );
    };

    const openFilePreview = (doc: ProjectDocItem) => {
        Haptics.selectionAsync();
        router.push({
            pathname: '/file-preview',
            params: {
                id: doc.id,
                name: doc.name,
                title: doc.name,
                size: doc.size,
                uploadedBy: doc.uploadedBy,
                time: doc.time,
                date: doc.date,
                dateLabel: doc.dateLabel,
                url: doc.url,
            },
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.filterSection}>
                <DocumentFolderTree documents={filteredDocs} isDark={isDark} renderDocument={doc => <ContextMenu actions={getDocCardContextMenuActions(doc)} disabled={isDocSelectMode} onPress={event => handleDocActionPress(doc, event.nativeEvent.name)}>
                    <TouchableOpacity onPress={() => isDocSelectMode ? handleToggleSelectDoc(doc.id) : openFilePreview(doc)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                        <Ionicons name={isDocSelectMode ? selectedDocIds.includes(doc.id) ? 'checkmark-circle' : 'ellipse-outline' : 'document-text-outline'} size={22} color={formaBlue} />
                        <View style={{ flex: 1 }}><Text style={{ color: textColor, fontWeight: '500' }}>{doc.name}</Text><Text style={{ color: subtextColor, fontSize: 12, marginTop: 4 }}>{doc.size} · {formatDocCardDate(doc.date, doc.time)}</Text></View>
                        {savedDocIds.includes(doc.id) && <Ionicons name="bookmark" size={16} color="#FFCC00" />}
                    </TouchableOpacity>
                </ContextMenu>} />
            </View>

            {/* Spacer for floating bottom search / multi-select toolbars */}
            <View style={{ height: Math.max(insets.bottom, 16) + 84 }} />

            {/* 2. Global Forma Universal File & Media Viewer */}
            <FormaUniversalFileViewer
                visible={!!previewItem}
                onClose={() => setPreviewItem(null)}
                item={previewItem}
                isDark={isDark}
                isBookmarked={previewItem?.id ? savedDocIds.includes(previewItem.id) : false}
                onToggleBookmark={() => {
                    if (!previewItem?.id) return;
                    if (savedDocIds.includes(previewItem.id)) {
                        setSavedDocIds(prev => prev.filter(id => id !== previewItem.id));
                    } else {
                        setSavedDocIds(prev => [...prev, previewItem.id!]);
                    }
                }}
                onGetInfo={() => {
                    if (!previewItem) return;
                    setDocInfoTarget({
                        id: previewItem.id || 'pdoc',
                        name: previewItem.name || 'Document',
                        size: previewItem.size || '1.5 MB',
                        uploadedBy: previewItem.uploadedBy || 'Project Member',
                        time: `${previewItem.time || 'Today'}, ${previewItem.date || '2026'}`,
                    });
                }}
            />

            {/* 5. Native SwiftUIDocInfoSheet */}
            <SwiftUIDocInfoSheet
                visible={!!docInfoTarget}
                onClose={() => setDocInfoTarget(null)}
                doc={docInfoTarget}
                isSaved={docInfoTarget?.id ? savedDocIds.includes(docInfoTarget.id) : false}
                onToggleSave={() => {
                    if (!docInfoTarget) return;
                    const isSaved = savedDocIds.includes(docInfoTarget.id);
                    if (isSaved) {
                        setSavedDocIds(prev => prev.filter(id => id !== docInfoTarget.id));
                    } else {
                        setSavedDocIds(prev => [...prev, docInfoTarget.id]);
                    }
                }}
                onShare={() => {
                    if (docInfoTarget) {
                        Share.share({
                            message: `Forma Project File: ${docInfoTarget.name}`,
                            title: docInfoTarget.name,
                        });
                    }
                }}
                onDownload={() => {
                    if (docInfoTarget) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Downloaded', `${docInfoTarget.name} saved.`);
                    }
                }}
                onDelete={() => {
                    if (docInfoTarget) {
                        const updated = docsList.filter(d => d.id !== docInfoTarget.id);
                        saveDocsToDb(updated);
                        setDocInfoTarget(null);
                    }
                }}
                isDark={isDark}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterSection: {
        paddingHorizontal: 0,
        gap: 12,
    },
    emptyStateCard: {
        borderRadius: 24,
        padding: 36,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginVertical: 40,
    },
    emptyStateIconCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyStateTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 260,
    },
    filterCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 20,
        gap: 12,
    },
    filterCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    filterCardSubtitle: {
        fontSize: 11.5,
    },

    /* Floating Bottom Bars */
    floatingInputWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 50,
    },
    floatingSearchToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
    },
    floatingSearchCapsule: {
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    searchInnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 44,
        gap: 8,
    },
    floatingSearchInput: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        fontWeight: '500',
    },
    floatingSearchActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    /* Multi-Select Toolbar */
    floatingSelectToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    selectDoneBtn: {
        height: 44,
        paddingHorizontal: 20,
        borderRadius: 22,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    selectDoneBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    selectActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectActionCircleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    selectBtnFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
    },
    selectCircleFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
    },
});
