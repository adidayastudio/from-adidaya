import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '../ui/GlassView';
import { PlatformIcon } from '../ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

export interface DocInfoItem {
    id: string;
    name: string;
    size: string;
    uploadedBy: string;
    time: string;
}

interface SwiftUIDocInfoSheetProps {
    visible: boolean;
    onClose: () => void;
    doc: DocInfoItem | null;
    isSaved: boolean;
    onToggleSave: () => void;
    onShare?: () => void;
    onForward?: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
    isDark?: boolean;
}

export interface FileTypeConfig {
    tag: string;
    color: string;
    family: string;
    bottomLabel: string;
    layoutType: 'doc' | 'sheet' | 'slides' | 'cad' | 'bim' | '3d' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'gis' | 'other';
}

export const EXTENSION_MAP: Record<string, { tag: string; color: string; family: string; bottomLabel?: string; layoutType?: FileTypeConfig['layoutType'] }> = {
    // Documents
    'pdf': { tag: 'PDF', color: '#EF4444', family: 'Document', bottomLabel: 'p.1', layoutType: 'doc' },
    'doc': { tag: 'DOC', color: '#2563EB', family: 'Document', bottomLabel: 'p.1', layoutType: 'doc' },
    'docx': { tag: 'DOC', color: '#2563EB', family: 'Document', bottomLabel: 'p.1', layoutType: 'doc' },
    'pages': { tag: 'PAGE', color: '#3B82F6', family: 'Document', bottomLabel: 'p.1', layoutType: 'doc' },

    // Spreadsheets & Data
    'xls': { tag: 'XLS', color: '#16A34A', family: 'Spreadsheet', bottomLabel: 'p.1', layoutType: 'sheet' },
    'xlsx': { tag: 'XLS', color: '#16A34A', family: 'Spreadsheet', bottomLabel: 'p.1', layoutType: 'sheet' },
    'xlsm': { tag: 'XLS', color: '#16A34A', family: 'Spreadsheet', bottomLabel: 'p.1', layoutType: 'sheet' },
    'csv': { tag: 'CSV', color: '#22A06B', family: 'Spreadsheet / Data', bottomLabel: 'DATA', layoutType: 'sheet' },
    'tsv': { tag: 'CSV', color: '#22A06B', family: 'Spreadsheet / Data', bottomLabel: 'DATA', layoutType: 'sheet' },
    'numbers': { tag: 'NUM', color: '#10B981', family: 'Spreadsheet', bottomLabel: 'p.1', layoutType: 'sheet' },

    // Presentations
    'ppt': { tag: 'PPT', color: '#EA580C', family: 'Presentation', bottomLabel: 'p.1', layoutType: 'slides' },
    'pptx': { tag: 'PPT', color: '#EA580C', family: 'Presentation', bottomLabel: 'p.1', layoutType: 'slides' },
    'key': { tag: 'KEY', color: '#F59E0B', family: 'Presentation', bottomLabel: 'p.1', layoutType: 'slides' },

    // Text
    'txt': { tag: 'TXT', color: '#64748B', family: 'Text', bottomLabel: 'p.1', layoutType: 'doc' },
    'rtf': { tag: 'TXT', color: '#64748B', family: 'Text', bottomLabel: 'p.1', layoutType: 'doc' },
    'md': { tag: 'MD', color: '#475569', family: 'Text', bottomLabel: 'p.1', layoutType: 'doc' },

    // CAD
    'dwg': { tag: 'DWG', color: '#DC2626', family: 'CAD', bottomLabel: 'CAD', layoutType: 'cad' },
    'dxf': { tag: 'DXF', color: '#E11D48', family: 'CAD', bottomLabel: 'CAD', layoutType: 'cad' },
    'dgn': { tag: 'DGN', color: '#E05A3F', family: 'CAD', bottomLabel: 'CAD', layoutType: 'cad' },

    // BIM
    'rvt': { tag: 'RVT', color: '#1683D8', family: 'BIM', bottomLabel: 'BIM', layoutType: 'bim' },
    'rfa': { tag: 'RFA', color: '#1683D8', family: 'BIM', bottomLabel: 'BIM', layoutType: 'bim' },
    'rte': { tag: 'RTE', color: '#1683D8', family: 'BIM', bottomLabel: 'BIM', layoutType: 'bim' },
    'pln': { tag: 'PLN', color: '#008C95', family: 'BIM', bottomLabel: 'BIM', layoutType: 'bim' },
    'pla': { tag: 'PLA', color: '#008C95', family: 'BIM', bottomLabel: 'BIM', layoutType: 'bim' },
    'mod': { tag: 'MOD', color: '#008C95', family: 'BIM', bottomLabel: 'BIM', layoutType: 'bim' },
    'ifc': { tag: 'IFC', color: '#0891B2', family: 'Open BIM', bottomLabel: 'BIM', layoutType: 'bim' },
    'bcf': { tag: 'BCF', color: '#0E7490', family: 'BIM Coordination', bottomLabel: 'BIM', layoutType: 'bim' },
    'bcfzip': { tag: 'BCF', color: '#0E7490', family: 'BIM Coordination', bottomLabel: 'BIM', layoutType: 'bim' },
    'nwd': { tag: 'NWD', color: '#4F46E5', family: 'BIM Coordination', bottomLabel: 'BIM', layoutType: 'bim' },
    'nwc': { tag: 'NWD', color: '#4F46E5', family: 'BIM Coordination', bottomLabel: 'BIM', layoutType: 'bim' },

    // 3D / CAD
    'skp': { tag: 'SKP', color: '#1D4ED8', family: '3D / CAD', bottomLabel: '3D', layoutType: '3d' },
    'layout': { tag: 'LAY', color: '#1E40AF', family: '3D / CAD', bottomLabel: 'CAD', layoutType: 'cad' },
    'lay': { tag: 'LAY', color: '#1E40AF', family: '3D / CAD', bottomLabel: 'CAD', layoutType: 'cad' },
    '3dm': { tag: '3DM', color: '#7C3AED', family: '3D', bottomLabel: '3D', layoutType: '3d' },
    'obj': { tag: '3D', color: '#8B5CF6', family: '3D', bottomLabel: '3D', layoutType: '3d' },
    'fbx': { tag: '3D', color: '#8B5CF6', family: '3D', bottomLabel: '3D', layoutType: '3d' },
    'glb': { tag: 'GLB', color: '#8B5CF6', family: '3D', bottomLabel: '3D', layoutType: '3d' },
    'gltf': { tag: 'GLB', color: '#8B5CF6', family: '3D', bottomLabel: '3D', layoutType: '3d' },
    'stl': { tag: '3D', color: '#7C3AED', family: '3D / Manufacturing', bottomLabel: '3D', layoutType: '3d' },
    'step': { tag: '3D', color: '#7C3AED', family: '3D / Manufacturing', bottomLabel: '3D', layoutType: '3d' },
    'stp': { tag: '3D', color: '#7C3AED', family: '3D / Manufacturing', bottomLabel: '3D', layoutType: '3d' },

    // Image & Vector
    'jpg': { tag: 'JPG', color: '#9333EA', family: 'Image', bottomLabel: 'IMG', layoutType: 'image' },
    'jpeg': { tag: 'JPG', color: '#9333EA', family: 'Image', bottomLabel: 'IMG', layoutType: 'image' },
    'png': { tag: 'PNG', color: '#A855F7', family: 'Image', bottomLabel: 'IMG', layoutType: 'image' },
    'webp': { tag: 'IMG', color: '#A855F7', family: 'Image', bottomLabel: 'IMG', layoutType: 'image' },
    'heic': { tag: 'IMG', color: '#A855F7', family: 'Image', bottomLabel: 'IMG', layoutType: 'image' },
    'tif': { tag: 'TIF', color: '#7E22CE', family: 'Image', bottomLabel: 'IMG', layoutType: 'image' },
    'tiff': { tag: 'TIF', color: '#7E22CE', family: 'Image', bottomLabel: 'IMG', layoutType: 'image' },
    'svg': { tag: 'SVG', color: '#8B5CF6', family: 'Vector', bottomLabel: 'VEC', layoutType: 'image' },

    // Design
    'psd': { tag: 'PSD', color: '#0EA5E9', family: 'Design', bottomLabel: 'PSD', layoutType: 'image' },
    'ai': { tag: 'AI', color: '#F59E0B', family: 'Design', bottomLabel: 'VEC', layoutType: 'image' },
    'eps': { tag: 'AI', color: '#F59E0B', family: 'Design', bottomLabel: 'VEC', layoutType: 'image' },
    'indd': { tag: 'INDD', color: '#DB2777', family: 'Design', bottomLabel: 'p.1', layoutType: 'doc' },
    'fig': { tag: 'FIG', color: '#7C3AED', family: 'Design', bottomLabel: 'FIG', layoutType: 'image' },

    // Video
    'mp4': { tag: 'VID', color: '#C026D3', family: 'Video', bottomLabel: 'VID', layoutType: 'video' },
    'mov': { tag: 'VID', color: '#C026D3', family: 'Video', bottomLabel: 'VID', layoutType: 'video' },
    'mkv': { tag: 'VID', color: '#C026D3', family: 'Video', bottomLabel: 'VID', layoutType: 'video' },
    'webm': { tag: 'VID', color: '#C026D3', family: 'Video', bottomLabel: 'VID', layoutType: 'video' },
    'avi': { tag: 'VID', color: '#C026D3', family: 'Video', bottomLabel: 'VID', layoutType: 'video' },

    // Audio
    'mp3': { tag: 'AUD', color: '#6366F1', family: 'Audio', bottomLabel: 'AUD', layoutType: 'audio' },
    'm4a': { tag: 'AUD', color: '#6366F1', family: 'Audio', bottomLabel: 'AUD', layoutType: 'audio' },
    'wav': { tag: 'AUD', color: '#6366F1', family: 'Audio', bottomLabel: 'AUD', layoutType: 'audio' },

    // Archive
    'zip': { tag: 'ZIP', color: '#6B7280', family: 'Archive', bottomLabel: 'ZIP', layoutType: 'archive' },
    'rar': { tag: 'RAR', color: '#6B7280', family: 'Archive', bottomLabel: 'ZIP', layoutType: 'archive' },
    '7z': { tag: 'ZIP', color: '#6B7280', family: 'Archive', bottomLabel: 'ZIP', layoutType: 'archive' },
    'tar': { tag: 'ZIP', color: '#6B7280', family: 'Archive', bottomLabel: 'ZIP', layoutType: 'archive' },
    'gz': { tag: 'ZIP', color: '#6B7280', family: 'Archive', bottomLabel: 'ZIP', layoutType: 'archive' },

    // Data / Code
    'json': { tag: 'JSON', color: '#475569', family: 'Data / Code', bottomLabel: 'DATA', layoutType: 'code' },
    'xml': { tag: 'XML', color: '#475569', family: 'Data / Code', bottomLabel: 'DATA', layoutType: 'code' },
    'yaml': { tag: 'YML', color: '#475569', family: 'Data / Code', bottomLabel: 'DATA', layoutType: 'code' },
    'yml': { tag: 'YML', color: '#475569', family: 'Data / Code', bottomLabel: 'DATA', layoutType: 'code' },
    'sql': { tag: 'SQL', color: '#475569', family: 'Data', bottomLabel: 'DATA', layoutType: 'code' },

    // GIS
    'shp': { tag: 'SHP', color: '#059669', family: 'GIS', bottomLabel: 'GIS', layoutType: 'gis' },
    'geojson': { tag: 'GEO', color: '#059669', family: 'GIS', bottomLabel: 'GIS', layoutType: 'gis' },
    'kml': { tag: 'KML', color: '#059669', family: 'GIS', bottomLabel: 'GIS', layoutType: 'gis' },
    'kmz': { tag: 'KML', color: '#059669', family: 'GIS', bottomLabel: 'GIS', layoutType: 'gis' },

    // Email
    'eml': { tag: 'MAIL', color: '#64748B', family: 'Email', bottomLabel: 'MAIL', layoutType: 'doc' },
    'msg': { tag: 'MAIL', color: '#64748B', family: 'Email', bottomLabel: 'MAIL', layoutType: 'doc' },
};

export const getFileConfig = (fileName: string): FileTypeConfig => {
    const clean = (fileName || '').trim().toLowerCase();
    const parts = clean.split('.');
    const ext = parts.length > 1 ? parts.pop() || '' : '';

    if (ext && EXTENSION_MAP[ext]) {
        const item = EXTENSION_MAP[ext];
        return {
            tag: item.tag,
            color: item.color,
            family: item.family,
            bottomLabel: item.bottomLabel || 'FILE',
            layoutType: item.layoutType || 'doc',
        };
    }

    if (ext && ext.length <= 4 && /^[a-z0-9]+$/i.test(ext)) {
        return {
            tag: ext.toUpperCase(),
            color: '#9CA3AF',
            family: 'Other',
            bottomLabel: 'FILE',
            layoutType: 'other',
        };
    }

    return {
        tag: 'FILE',
        color: '#9CA3AF',
        family: 'Other',
        bottomLabel: 'FILE',
        layoutType: 'other',
    };
};

export const getFormatDisplay = (fileName: string): string => {
    if (!fileName) return '.doc';
    const clean = fileName.trim();
    const lastDot = clean.lastIndexOf('.');
    if (lastDot !== -1 && lastDot < clean.length - 1) {
        return '.' + clean.substring(lastDot + 1).toLowerCase();
    }
    return '.doc';
};

export const DocPagePreview = ({ fileName, isDark }: { fileName: string; isDark: boolean }) => {
    const config = getFileConfig(fileName);
    const badgeColor = config.color;
    const badgeBg = isDark ? `${badgeColor}38` : `${badgeColor}1F`;

    const pageBg = isDark ? 'rgba(38, 38, 44, 0.95)' : '#FFFFFF';
    const pageBorder = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)';
    const lineBase = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)';
    const lineDim = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)';

    return (
        <View
            style={{
                width: 38,
                height: 48,
                borderRadius: 8,
                backgroundColor: pageBg,
                borderWidth: 1,
                borderColor: pageBorder,
                padding: 4,
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1.5 },
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 3,
                elevation: 2,
                overflow: 'hidden',
            }}
        >
            {/* Top row: Format tag & mini emblem dot */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View
                    style={{
                        backgroundColor: badgeBg,
                        paddingHorizontal: 3.5,
                        paddingVertical: 1,
                        borderRadius: 3.5,
                    }}
                >
                    <Text style={{ fontSize: 7, fontWeight: '800', color: badgeColor, letterSpacing: -0.2 }}>
                        {config.tag}
                    </Text>
                </View>
                <View
                    style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: badgeColor,
                        opacity: 0.7,
                    }}
                />
            </View>

            <View style={{ gap: 3.5, marginVertical: 3 }}>
                <View style={{ width: '85%', height: 2.5, backgroundColor: lineBase, borderRadius: 1 }} />
                <View style={{ width: '60%', height: 2, backgroundColor: lineDim, borderRadius: 1 }} />
            </View>

            {/* Bottom minimal spacer */}
            <View style={{ height: 1 }} />
        </View>
    );
};

export function SwiftUIDocInfoSheet({
    visible,
    onClose,
    doc,
    isSaved,
    onToggleSave,
    onShare,
    onForward,
    onDownload,
    onDelete,
    isDark = false,
}: SwiftUIDocInfoSheetProps) {
    const insets = useSafeAreaInsets();
    if (!visible || !doc) return null;

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const borderTint = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.55)';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.75)';
    const separatorColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const fileConfig = getFileConfig(doc.name);
    const typeName = fileConfig.family;
    const formatStr = getFormatDisplay(doc.name);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent={true}
            navigationBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onClose();
                    }}
                />
                <View style={styles.sheetWrapper}>
                    <GlassView
                        intensity={isDark ? 90 : 85}
                        tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
                        style={StyleSheet.absoluteFill}
                    />
                    <View
                        style={[
                            styles.sheetInner,
                            {
                                backgroundColor: isDark ? 'rgba(20, 20, 24, 0.68)' : 'rgba(255, 255, 255, 0.68)',
                                borderColor: borderTint,
                                paddingBottom: Math.max(insets.bottom, 24) + 16,
                                paddingTop: 18,
                            }
                        ]}
                    >
                        {/* Header */}
                        <View style={styles.headerRow}>
                            <Text style={[styles.title, { color: textColor }]}>Document Info</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                }}
                                activeOpacity={0.7}
                                style={[
                                    styles.closeBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.7)',
                                    }
                                ]}
                            >
                                <PlatformIcon name="xmark" size={13} tintColor={textColor} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false} bounces={false}>
                            {/* Hero File Card with Liquid Glass */}
                            <View
                                style={[
                                    styles.heroCard,
                                    {
                                        backgroundColor: cardBg,
                                        borderColor: cardBorder,
                                    }
                                ]}
                            >
                                <Text style={[styles.heroFileName, { color: textColor }]} numberOfLines={2}>
                                    {doc.name}
                                </Text>
                                <Text style={[styles.heroSub, { color: subtextColor }]}>
                                    {typeName} • {doc.size}
                                </Text>
                            </View>

                            {/* Metadata Rows Card */}
                            <View
                                style={[
                                    styles.metaContainer,
                                    {
                                        backgroundColor: cardBg,
                                        borderColor: cardBorder,
                                    }
                                ]}
                            >
                                <View style={[styles.metaRow, { borderBottomColor: separatorColor }]}>
                                    <Text style={[styles.metaLabel, { color: subtextColor }]}>Format</Text>
                                    <Text style={[styles.metaValue, { color: textColor }]}>{formatStr}</Text>
                                </View>
                                <View style={[styles.metaRow, { borderBottomColor: separatorColor }]}>
                                    <Text style={[styles.metaLabel, { color: subtextColor }]}>Size</Text>
                                    <Text style={[styles.metaValue, { color: textColor }]}>{doc.size}</Text>
                                </View>
                                <View style={[styles.metaRow, { borderBottomColor: separatorColor }]}>
                                    <Text style={[styles.metaLabel, { color: subtextColor }]}>Shared By</Text>
                                    <Text style={[styles.metaValue, { color: textColor }]}>{doc.uploadedBy}</Text>
                                </View>
                                <View style={styles.metaRowLast}>
                                    <Text style={[styles.metaLabel, { color: subtextColor }]}>Date & Time</Text>
                                    <Text style={[styles.metaValue, { color: textColor }]}>{doc.time}</Text>
                                </View>
                            </View>

                            {/* Action Buttons: Bookmark (Pill) + Forward, Share, Download, Delete (Circles) */}
                            <View style={styles.actionsRow}>
                                <TouchableOpacity
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onToggleSave();
                                    }}
                                    style={[
                                        styles.bookmarkBtn,
                                        {
                                            backgroundColor: isSaved
                                                ? (isDark ? 'rgba(234, 179, 8, 0.22)' : 'rgba(234, 179, 8, 0.14)')
                                                : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)'),
                                            borderColor: isSaved
                                                ? 'rgba(234, 179, 8, 0.45)'
                                                : (isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)'),
                                        }
                                    ]}
                                >
                                    <PlatformIcon name={isSaved ? 'bookmark.fill' : 'bookmark'} size={14} tintColor={isSaved ? '#EAB308' : textColor} />
                                    <Text style={[styles.actionBtnText, { color: isSaved ? '#EAB308' : textColor }]}>
                                        {isSaved ? 'Bookmarked' : 'Bookmark'}
                                    </Text>
                                </TouchableOpacity>

                                {onForward && (
                                    <TouchableOpacity
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onForward();
                                        }}
                                        style={[
                                            styles.circleActionBtn,
                                            {
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
                                            }
                                        ]}
                                    >
                                        <PlatformIcon name="arrowshape.turn.up.right" size={15} tintColor={textColor} />
                                    </TouchableOpacity>
                                )}

                                {onShare && (
                                    <TouchableOpacity
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onShare();
                                        }}
                                        style={[
                                            styles.circleActionBtn,
                                            {
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
                                            }
                                        ]}
                                    >
                                        <PlatformIcon name="square.and.arrow.up" size={15} tintColor={textColor} />
                                    </TouchableOpacity>
                                )}

                                {onDownload && (
                                    <TouchableOpacity
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onDownload();
                                        }}
                                        style={[
                                            styles.circleActionBtn,
                                            {
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
                                            }
                                        ]}
                                    >
                                        <PlatformIcon name="arrow.down.to.line" size={15} tintColor={textColor} />
                                    </TouchableOpacity>
                                )}

                                {onDelete && (
                                    <TouchableOpacity
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                            onDelete();
                                        }}
                                        style={[
                                            styles.circleActionBtn,
                                            {
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
                                            }
                                        ]}
                                    >
                                        <PlatformIcon name="trash" size={15} tintColor="#FF3B30" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.38)',
        justifyContent: 'flex-end',
    },
    sheetWrapper: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 24,
    },
    sheetInner: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1.2,
        borderBottomWidth: 0,
        maxHeight: '80%',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
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
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroCard: {
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 14,
    },
    heroFileName: {
        fontSize: 14.5,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    heroSub: {
        fontSize: 12,
        marginTop: 3,
    },
    metaContainer: {
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    metaRowLast: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
    },
    metaLabel: {
        fontSize: 13.5,
    },
    metaValue: {
        fontSize: 13.5,
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    bookmarkBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        height: 44,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 10,
    },
    circleActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
