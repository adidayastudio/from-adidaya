import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Share, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FinanceSummaryCard } from '@/components/finance/FinanceSummaryCard';
import { ReportEntry, ReportDocument } from './types';

interface RecordsTabProps {
    entries: ReportEntry[];
    documents: ReportDocument[];
    onSelectEntry: (entry: ReportEntry) => void;
    onSelectDocument: (doc: ReportDocument) => void;
    selectedEntryId?: string | null;
}

export function RecordsTab({
    entries,
    documents,
    onSelectEntry,
    onSelectDocument,
    selectedEntryId,
}: RecordsTabProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(28, 28, 30, 0.75)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    const [recordSegment, setRecordSegment] = useState<'all' | 'entries' | 'documents'>('all');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

    const statCards = [
        {
            id: 'all' as const,
            label: 'All Records',
            value: String(entries.length + documents.length),
            sub: 'Total recorded',
            color: '#0284C7',
            icon: 'tray.2.fill' as any,
        },
        {
            id: 'entries' as const,
            label: 'Entries',
            value: String(entries.length),
            sub: 'Raw checklists',
            color: '#10B981',
            icon: 'checklist' as any,
        },
        {
            id: 'documents' as const,
            label: 'Documents',
            value: String(documents.length),
            sub: 'Compiled files',
            color: '#8B5CF6',
            icon: 'doc.text.fill' as any,
        },
    ];

    const handleShareDoc = async (doc: ReportDocument) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: `[Forma Report] ${doc.title} (${doc.period}) - Status: ${doc.status}`,
                title: doc.title,
            });
        } catch (e) {
            console.error(e);
        }
    };

    const filteredEntries = entries.filter(e => {
        if (selectedTypeFilter === 'all') return true;
        return e.reportTypeName.toLowerCase().includes(selectedTypeFilter.toLowerCase());
    });

    const filteredDocuments = documents.filter(d => {
        if (selectedTypeFilter === 'all') return true;
        return d.reportTypeName.toLowerCase().includes(selectedTypeFilter.toLowerCase());
    });

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Stat Cards as Filter: All · Entries · Documents */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.statsScroll}
                contentContainerStyle={styles.statsScrollContent}
            >
                {statCards.map((stat) => {
                    const isSelected = recordSegment === stat.id;
                    return (
                        <FinanceSummaryCard
                            key={stat.id}
                            icon={stat.icon}
                            iconColor={stat.color}
                            value={stat.value}
                            label={stat.label}
                            subValue={stat.sub}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setRecordSegment(stat.id);
                            }}
                            style={{
                                width: 140,
                                marginRight: 10,
                                marginBottom: 0,
                                backgroundColor: isDark 
                                    ? (isSelected ? 'rgba(255, 255, 255, 0.09)' : '#1C1C1E') 
                                    : '#FFFFFF',
                                borderColor: isSelected 
                                    ? stat.color 
                                    : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                                borderWidth: isSelected ? 1.5 : 1,
                            }}
                        />
                    );
                })}
            </ScrollView>

            {/* Type Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilterScroll}>
                {['all', 'Maintenance', 'Cleaning Service'].map((type) => {
                    const isSelected = selectedTypeFilter === type;
                    return (
                        <TouchableOpacity
                            key={type}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedTypeFilter(type);
                            }}
                            style={[
                                styles.typeFilterChip,
                                {
                                    backgroundColor: isSelected 
                                        ? (isDark ? 'rgba(20, 184, 166, 0.2)' : 'rgba(20, 184, 166, 0.12)')
                                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                    borderColor: isSelected ? '#14B8A6' : 'transparent',
                                }
                            ]}
                        >
                            <Text style={[
                                styles.typeFilterText,
                                { color: isSelected ? '#14B8A6' : subtextColor, fontWeight: isSelected ? '700' : '500' }
                            ]}>
                                {type === 'all' ? 'All Report Types' : type}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* ENTRIES SECTION */}
            {(recordSegment === 'all' || recordSegment === 'entries') && (
                <View style={styles.sectionBlock}>
                    {recordSegment === 'all' && (
                        <View style={styles.sectionTitleRow}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Submitted Entries</Text>
                            <Text style={[styles.sectionSub, { color: subtextColor }]}>Raw data & checklists</Text>
                        </View>
                    )}

                    <View style={styles.recordsList}>
                        {filteredEntries.map((entry, idx) => {
                            const isSelected = selectedEntryId === entry.id;
                            return (
                                <Animated.View key={entry.id} entering={FadeInDown.delay(30 * idx).duration(250)}>
                                    <TouchableOpacity
                                        activeOpacity={0.82}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onSelectEntry(entry);
                                        }}
                                        style={[
                                            styles.entryCard,
                                            {
                                                backgroundColor: isSelected 
                                                    ? (isDark ? 'rgba(20, 184, 166, 0.16)' : 'rgba(20, 184, 166, 0.08)')
                                                    : cardBg,
                                                borderColor: isSelected ? '#14B8A6' : borderColor,
                                                borderWidth: isSelected ? 1.5 : 1,
                                            }
                                        ]}
                                    >
                                    <View style={styles.entryHeader}>
                                        <View style={styles.entryTitleInfo}>
                                            <Text style={[styles.entryActivityTitle, { color: textColor }]}>
                                                {entry.activityName}
                                            </Text>
                                            <Text style={[styles.entryMetaLine, { color: subtextColor }]}>
                                                {entry.reportTypeName} • {entry.submittedAt}
                                            </Text>
                                        </View>

                                        <View style={[
                                            styles.condTag,
                                            entry.condition === 'Normal' ? styles.condNormal : styles.condAttention
                                        ]}>
                                            <Text style={[
                                                styles.condTagText,
                                                entry.condition === 'Normal' ? { color: '#10B981' } : { color: '#F59E0B' }
                                            ]}>
                                                {entry.condition}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Data Fields Preview */}
                                    <View style={[styles.fieldsGrid, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)' }]}>
                                        {Object.entries(entry.values).map(([k, v]) => (
                                            <View key={k} style={styles.fieldRow}>
                                                <Text style={[styles.fieldKey, { color: subtextColor }]}>{k}</Text>
                                                <Text style={[styles.fieldVal, { color: textColor }]}>{String(v)}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {entry.notes && (
                                        <Text style={[styles.notesText, { color: subtextColor }]} numberOfLines={2}>
                                            "{entry.notes}"
                                        </Text>
                                    )}

                                    <View style={styles.entryFooter}>
                                        <View style={styles.submitterBadge}>
                                            <Ionicons name="person-circle-outline" size={15} color={subtextColor} />
                                            <Text style={[styles.submitterText, { color: subtextColor }]}>
                                                By {entry.submittedBy.name} ({entry.submittedBy.role})
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={14} color={subtextColor} />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                    </View>
                </View>
            )}

            {/* DOCUMENTS SECTION */}
            {(recordSegment === 'all' || recordSegment === 'documents') && (
                <View style={styles.sectionBlock}>
                    {recordSegment === 'all' && (
                        <View style={styles.sectionTitleRow}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Compiled Documents</Text>
                            <Text style={[styles.sectionSub, { color: subtextColor }]}>Weekly, Monthly & Custom</Text>
                        </View>
                    )}

                    <View style={styles.recordsList}>
                        {filteredDocuments.map((doc, idx) => (
                            <Animated.View key={doc.id} entering={FadeInDown.delay(30 * idx).duration(250)}>
                                <TouchableOpacity
                                    activeOpacity={0.82}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onSelectDocument(doc);
                                    }}
                                    style={[styles.docCard, { backgroundColor: cardBg, borderColor }]}
                                >
                                    <View style={styles.docCardTop}>
                                        <View style={[
                                            styles.formatPill,
                                            { backgroundColor: doc.format === 'PDF' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)' }
                                        ]}>
                                            <Text style={[
                                                styles.formatPillText,
                                                { color: doc.format === 'PDF' ? '#EF4444' : '#10B981' }
                                            ]}>
                                                {doc.format}
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1, gap: 2 }}>
                                            <Text style={[styles.docHeading, { color: textColor }]} numberOfLines={1}>
                                                {doc.title}
                                            </Text>
                                            <Text style={[styles.docMeta, { color: subtextColor }]}>
                                                {doc.reportTypeName} • {doc.period} • {doc.fileSize}
                                            </Text>
                                        </View>

                                        <View style={[
                                            styles.docStatusPill,
                                            doc.status === 'Approved' ? styles.statusApproved : styles.statusGenerated
                                        ]}>
                                            <Text style={[
                                                styles.docStatusPillText,
                                                doc.status === 'Approved' ? { color: '#10B981' } : { color: '#0284C7' }
                                            ]}>
                                                {doc.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.docCardBottom}>
                                        <Text style={[styles.docEntriesCount, { color: subtextColor }]}>
                                            Aggregated from <Text style={{ color: textColor, fontWeight: '600' }}>{doc.entriesCount} completed entries</Text>
                                        </Text>

                                        <TouchableOpacity 
                                            style={[styles.shareBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
                                            onPress={() => handleShareDoc(doc)}
                                        >
                                            <Ionicons name="share-outline" size={15} color={textColor} />
                                            <Text style={[styles.shareBtnText, { color: textColor }]}>Export</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 40,
        gap: 16,
    },
    statsScroll: {
        marginHorizontal: -16,
        marginBottom: 2,
    },
    statsScrollContent: {
        paddingHorizontal: 16,
    },
    typeFilterScroll: {
        gap: 8,
        paddingRight: 16,
    },
    typeFilterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
    },
    typeFilterText: {
        fontSize: 12,
    },
    sectionBlock: {
        gap: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    sectionSub: {
        fontSize: 12,
    },
    recordsList: {
        gap: 12,
    },
    entryCard: {
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        gap: 10,
    },
    entryHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    entryTitleInfo: {
        flex: 1,
        gap: 2,
    },
    entryActivityTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    entryMetaLine: {
        fontSize: 12,
    },
    condTag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 99,
    },
    condNormal: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    condAttention: {
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    condTagText: {
        fontSize: 11,
        fontWeight: '700',
    },
    fieldsGrid: {
        padding: 10,
        borderRadius: 10,
        gap: 6,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldKey: {
        fontSize: 12,
        fontWeight: '500',
    },
    fieldVal: {
        fontSize: 12,
        fontWeight: '700',
    },
    notesText: {
        fontSize: 12,
        fontStyle: 'italic',
        lineHeight: 16,
    },
    entryFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 2,
    },
    submitterBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    submitterText: {
        fontSize: 12,
    },
    docCard: {
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        gap: 12,
    },
    docCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    formatPill: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
    },
    formatPillText: {
        fontSize: 11,
        fontWeight: '800',
    },
    docHeading: {
        fontSize: 15,
        fontWeight: '600',
    },
    docMeta: {
        fontSize: 12,
    },
    docStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 99,
    },
    statusApproved: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    statusGenerated: {
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
    },
    docStatusPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    docCardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    docEntriesCount: {
        fontSize: 12,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    shareBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
