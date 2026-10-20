import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    StageInfo,
    getProjectStageList,
    saveStageDeliverableData
} from '@/lib/projectDeliverables';

interface ProjectStageDeliverableEditorProps {
    project: any;
    stageCode: string; // e.g. '01-KO'
    initialSectionCode?: string;
    isDark: boolean;
    onBack: () => void;
    onProjectMetaChange?: (meta: any) => void;
    onDirtyChange?: (dirty: boolean) => void;
}

export function ProjectStageDeliverableEditor({
    project,
    stageCode,
    initialSectionCode,
    isDark,
    onBack,
    onProjectMetaChange,
    onDirtyChange
}: ProjectStageDeliverableEditorProps) {
    const text = isDark ? '#F5F5F7' : '#1C1C1E';
    const secondary = isDark ? '#9898A2' : '#73737D';
    const surface = isDark ? '#1C1D23' : '#F2F2F7';
    const cardBg = isDark ? '#14151B' : '#FFFFFF';
    const border = isDark ? '#292930' : '#E5E5EA';
    const redAccent = '#EF4444';

    // 1. Get stage data
    const stages = useMemo(() => getProjectStageList(project.meta), [project.meta]);
    const currentStage = useMemo(() => {
        return stages.find(s => s.code === stageCode) || stages[0];
    }, [stages, stageCode]);

    const stageDeliverables = project.meta?.stageDeliverables?.[currentStage.code] || {};
    const [activeSectionCode, setActiveSectionCode] = useState<string>(() => {
        return initialSectionCode || currentStage.sections[0]?.code || '';
    });

    const activeSection = useMemo(() => {
        return currentStage.sections.find(s => s.code === activeSectionCode) || currentStage.sections[0];
    }, [currentStage, activeSectionCode]);

    // Tasks under current stage
    const stageTasks = useMemo(() => currentStage.tasks, [currentStage]);
    const sectionTasks = useMemo(() => {
        return stageTasks.filter(t => t.sectionCode === activeSection?.code);
    }, [stageTasks, activeSection]);

    // Active page
    const [activePageTaskCode, setActivePageTaskCode] = useState<string>(() => {
        return sectionTasks[0]?.code || '01-02';
    });

    useEffect(() => {
        if (sectionTasks.length > 0 && !sectionTasks.some(t => t.code === activePageTaskCode)) {
            setActivePageTaskCode(sectionTasks[0].code);
        }
    }, [sectionTasks, activePageTaskCode]);

    // Page view mode: Single Page vs All Pages
    const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveError, setSaveError] = useState('');

    // Drafts for page content and completion
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => {
        return new Set(stageDeliverables.completedTasks || []);
    });
    const [pageContentDrafts, setPageContentDrafts] = useState<Record<string, any>>(() => {
        return stageDeliverables.pageContent || {};
    });

    const [isDirty, setIsDirty] = useState(false);
    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const activeTaskIndex = stageTasks.findIndex(t => t.code === activePageTaskCode);
    const totalPages = Math.max(stageTasks.length, 1);
    const currentPageNumber = activeTaskIndex >= 0 ? activeTaskIndex + 1 : 1;

    // Toggle Task Complete
    const handleToggleTaskComplete = (taskCodeOrId: string) => {
        setCompletedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskCodeOrId)) next.delete(taskCodeOrId);
            else next.add(taskCodeOrId);
            return next;
        });
        setIsDirty(true);
        setSaveMessage('');
    };

    // Update Page Content Draft
    const handleUpdateContent = (taskCode: string, field: string, val: string) => {
        setPageContentDrafts(prev => ({
            ...prev,
            [taskCode]: {
                ...(prev[taskCode] || {}),
                [field]: val
            }
        }));
        setIsDirty(true);
        setSaveMessage('');
    };

    // Save
    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        setSaveError('');
        setSaveMessage('');
        try {
            // Determine completed sections
            const completedSections: Record<string, boolean> = {};
            currentStage.sections.forEach(sec => {
                const secTasks = stageTasks.filter(t => t.sectionCode === sec.code);
                completedSections[sec.code] = secTasks.length > 0 && secTasks.every(t => completedTasks.has(t.code) || completedTasks.has(t.id));
            });

            const nextMeta = await saveStageDeliverableData(project.id, currentStage.code, {
                completedSections,
                completedTasks: Array.from(completedTasks),
                pageContent: pageContentDrafts
            });

            setIsDirty(false);
            setSaveMessage('Saved');
            onProjectMetaChange?.(nextMeta);
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save deliverable document.');
        } finally {
            setSaving(false);
        }
    };

    // Export / Print
    const handleExport = () => {
        if (Platform.OS === 'web') {
            window.print();
        }
    };

    // -------------------------------------------------------------
    // Render Left Panel: Sections, Pages & Auto-Generated Index
    // -------------------------------------------------------------
    const renderLeftPanel = () => {
        return (
            <View style={[styles.leftPanel, { backgroundColor: cardBg, borderColor: border }]}>
                {/* Section Pages Header */}
                <View style={[styles.leftPanelHeader, { borderBottomColor: border }]}>
                    <Text style={{ color: text, fontSize: 13, fontWeight: '700' }}>Pages in Section</Text>
                    <Text style={{ color: secondary, fontSize: 11 }}>{sectionTasks.length} Pages</Text>
                </View>

                {/* Section Pages List */}
                <ScrollView style={{ maxHeight: 220, borderBottomWidth: 1, borderBottomColor: border }}>
                    {sectionTasks.map(task => {
                        const isCurrent = task.code === activePageTaskCode;
                        const isDone = completedTasks.has(task.code) || completedTasks.has(task.id);

                        return (
                            <TouchableOpacity
                                key={task.code}
                                onPress={() => setActivePageTaskCode(task.code)}
                                style={[
                                    styles.pageListItem,
                                    {
                                        backgroundColor: isCurrent ? (isDark ? '#1E293B' : '#EFF6FF') : 'transparent'
                                    }
                                ]}
                            >
                                <View style={[styles.codeBadge, { backgroundColor: surface, borderColor: border }]}>
                                    <Text style={[styles.codeBadgeText, { color: text }]}>{task.code}</Text>
                                </View>
                                <Text numberOfLines={1} style={[styles.pageListTitle, { color: isCurrent ? '#2563EB' : text }]}>
                                    {task.name}
                                </Text>
                                <TouchableOpacity
                                    accessibilityLabel={`Toggle complete ${task.name}`}
                                    onPress={() => handleToggleTaskComplete(task.code)}
                                    style={{ marginLeft: 'auto', padding: 4 }}
                                >
                                    <Ionicons
                                        name={isDone ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                        size={17}
                                        color={isDone ? '#10B981' : secondary}
                                    />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* AUTO-GENERATE INDEX CARD (Matching Screenshot 3) */}
                <View style={styles.autoIndexContainer}>
                    <View style={styles.autoIndexHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.autoIndexTitle}>AUTO-GENERATE INDEX</Text>
                            <Text style={styles.autoIndexStatus}>✓ Table of contents is up to date</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {}}
                            style={[styles.refreshButton, { backgroundColor: '#2563EB' }]}
                        >
                            <Ionicons name="refresh" size={12} color="#FFFFFF" />
                            <Text style={styles.refreshButtonText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Auto-Generated Index List */}
                    <ScrollView style={{ maxHeight: 280, marginTop: 10 }}>
                        <Text style={{ color: secondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 }}>
                            AUTO-GENERATED INDEX ({stageTasks.length} PAGES)
                        </Text>
                        {stageTasks.slice(0, 15).map((t, idx) => {
                            const isCurrent = t.code === activePageTaskCode;
                            return (
                                <TouchableOpacity
                                    key={t.code}
                                    onPress={() => setActivePageTaskCode(t.code)}
                                    style={styles.indexRow}
                                >
                                    <Text numberOfLines={1} style={[styles.indexTitle, { color: isCurrent ? '#2563EB' : text, fontWeight: isCurrent ? '700' : '400' }]}>
                                        {String(idx + 1).padStart(2, '0')} {t.name}
                                    </Text>
                                    <Text style={[styles.indexPageNumber, { color: isCurrent ? '#2563EB' : secondary }]}>
                                        {idx + 1}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        );
    };

    // -------------------------------------------------------------
    // Render Right Panel: Document Sheet Canvas (Matching Screenshot 3)
    // -------------------------------------------------------------
    const renderCanvas = () => {
        const activeTask = stageTasks.find(t => t.code === activePageTaskCode) || stageTasks[0];
        const draft = pageContentDrafts[activeTask?.code] || {};
        const isTOC = activeTask?.code === '01-02' || activeTask?.name?.toLowerCase().includes('contents');
        const isCover = activeTask?.code === '01-01' || activeTask?.name?.toLowerCase().includes('cover');

        return (
            <View style={{ flex: 1, minWidth: 0 }}>
                {/* Canvas Controls Header: Single Page / All Pages + Page Stepper */}
                <View style={styles.canvasControlsRow}>
                    <View style={[styles.segmentedPillContainer, { backgroundColor: isDark ? '#1F2028' : '#E9ECEF' }]}>
                        <TouchableOpacity
                            onPress={() => setViewMode('single')}
                            style={[
                                styles.segmentedButton,
                                viewMode === 'single' && [styles.segmentedButtonActive, { backgroundColor: cardBg }]
                            ]}
                        >
                            <Ionicons name="eye-outline" size={14} color={viewMode === 'single' ? '#2563EB' : secondary} />
                            <Text style={[styles.segmentedButtonText, { color: viewMode === 'single' ? '#2563EB' : secondary, fontWeight: viewMode === 'single' ? '700' : '500' }]}>
                                Single Page
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setViewMode('all')}
                            style={[
                                styles.segmentedButton,
                                viewMode === 'all' && [styles.segmentedButtonActive, { backgroundColor: cardBg }]
                            ]}
                        >
                            <Text style={[styles.segmentedButtonText, { color: viewMode === 'all' ? '#2563EB' : secondary, fontWeight: viewMode === 'all' ? '700' : '500' }]}>
                                All Pages ({totalPages})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Page Stepper */}
                    <View style={[styles.stepperContainer, { backgroundColor: cardBg, borderColor: border }]}>
                        <TouchableOpacity
                            accessibilityLabel="Previous page"
                            disabled={currentPageNumber <= 1}
                            onPress={() => {
                                if (currentPageNumber > 1) {
                                    setActivePageTaskCode(stageTasks[currentPageNumber - 2].code);
                                }
                            }}
                            style={{ padding: 4, opacity: currentPageNumber <= 1 ? 0.3 : 1 }}
                        >
                            <Ionicons name="chevron-back" size={14} color={text} />
                        </TouchableOpacity>
                        <Text style={[styles.stepperText, { color: text }]}>
                            {currentPageNumber} / {totalPages}
                        </Text>
                        <TouchableOpacity
                            accessibilityLabel="Next page"
                            disabled={currentPageNumber >= totalPages}
                            onPress={() => {
                                if (currentPageNumber < totalPages) {
                                    setActivePageTaskCode(stageTasks[currentPageNumber].code);
                                }
                            }}
                            style={{ padding: 4, opacity: currentPageNumber >= totalPages ? 0.3 : 1 }}
                        >
                            <Ionicons name="chevron-forward" size={14} color={text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Printable Document Paper Sheet (A4-Style Layout) */}
                <ScrollView contentContainerStyle={styles.paperScrollContainer}>
                    <View style={[styles.documentPaper, { backgroundColor: '#FFFFFF', borderColor: isDark ? '#333' : '#E5E7EB' }]}>
                        {/* Document Header Line */}
                        <View style={styles.docHeaderRow}>
                            <Text style={styles.docHeaderProject}>
                                {`#${project.number || '008'}-${project.code || 'RWM'} · ${project.title || 'Rumah Rawamangun'}`}
                            </Text>
                            <Text style={styles.docHeaderStage}>
                                {currentStage.name} v1.{new Date().getFullYear()}
                            </Text>
                        </View>

                        {/* Page Title & Red Rule (Matching Screenshot 3) */}
                        <View style={styles.docTitleBlock}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={styles.docMainTitle}>{activeTask?.name}</Text>
                                    <Text style={styles.docSubTitle}>
                                        {activeTask?.nameId || (isTOC ? 'Daftar Isi' : isCover ? 'Sampul' : 'Keluaran Desain')}
                                    </Text>
                                </View>
                                <Text style={[styles.docSectionNumber, { color: redAccent }]}>{activeTask?.code}</Text>
                            </View>
                            {/* Thin Red Rule Line */}
                            <View style={[styles.redRuleLine, { backgroundColor: redAccent }]} />
                        </View>

                        {/* Document Body Content */}
                        {isCover ? (
                            /* Cover Page Layout */
                            <View style={styles.coverLayout}>
                                <View style={{ alignItems: 'center', marginVertical: 40, gap: 12 }}>
                                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center' }}>
                                        {project.title}
                                    </Text>
                                    <Text style={{ fontSize: 16, color: '#4B5563', fontWeight: '500' }}>
                                        {currentStage.fullName} Deliverable Booklet
                                    </Text>
                                    <View style={{ width: 60, height: 3, backgroundColor: redAccent, marginVertical: 10 }} />
                                    <Text style={{ fontSize: 13, color: '#6B7280' }}>
                                        Location: {project.location || 'Jakarta, Indonesia'}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#6B7280' }}>
                                        Date: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </Text>
                                </View>

                                {/* Cover Notes Editor */}
                                <View style={styles.pageEditBlock}>
                                    <Text style={styles.editBlockLabel}>Cover Subtitle / Notes:</Text>
                                    <TextInput
                                        value={draft.notes || ''}
                                        onChangeText={val => handleUpdateContent(activeTask.code, 'notes', val)}
                                        placeholder="Add notes or subtitle for this deliverable cover..."
                                        placeholderTextColor="#9CA3AF"
                                        style={styles.textInputPaper}
                                    />
                                </View>
                            </View>
                        ) : isTOC ? (
                            /* Table of Contents Layout (Matching Screenshot 3) */
                            <View style={styles.tocLayout}>
                                {currentStage.sections.map(sec => {
                                    const secTasksList = stageTasks.filter(t => t.sectionCode === sec.code);
                                    return (
                                        <View key={sec.code} style={{ marginBottom: 16 }}>
                                            {/* Section Header */}
                                            <Text style={styles.tocSectionHeading}>
                                                SEC {sec.code.replace(`${currentStage.id}-`, '')} {sec.title.toUpperCase()}
                                            </Text>

                                            {/* Tasks in Section */}
                                            {secTasksList.map(item => {
                                                const pgNum = stageTasks.findIndex(t => t.code === item.code) + 1;
                                                return (
                                                    <View key={item.code} style={styles.tocRow}>
                                                        <Text style={styles.tocItemCode}>{item.code}</Text>
                                                        <Text style={styles.tocItemName}>
                                                            {item.name}{' '}
                                                            <Text style={{ fontStyle: 'italic', color: '#6B7280', fontWeight: '400' }}>
                                                                {item.nameId ? `(${item.nameId})` : ''}
                                                            </Text>
                                                        </Text>
                                                        <View style={styles.tocDottedLeader} />
                                                        <Text style={styles.tocPageNum}>{pgNum}</Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            /* Standard Deliverable Page Form & Content */
                            <View style={styles.standardPageLayout}>
                                <View style={styles.pageEditBlock}>
                                    <Text style={styles.editBlockLabel}>Page Description / Content:</Text>
                                    <TextInput
                                        multiline
                                        numberOfLines={4}
                                        value={draft.description || ''}
                                        onChangeText={val => handleUpdateContent(activeTask.code, 'description', val)}
                                        placeholder={`Enter details, specifications or notes for ${activeTask.name}...`}
                                        placeholderTextColor="#9CA3AF"
                                        style={[styles.textInputPaper, { minHeight: 90, textAlignVertical: 'top' }]}
                                    />
                                </View>

                                <View style={styles.pageEditBlock}>
                                    <Text style={styles.editBlockLabel}>Attachments / Image URLs:</Text>
                                    <TextInput
                                        value={draft.attachmentUrl || ''}
                                        onChangeText={val => handleUpdateContent(activeTask.code, 'attachmentUrl', val)}
                                        placeholder="https://... image or CAD drawing URL"
                                        placeholderTextColor="#9CA3AF"
                                        style={styles.textInputPaper}
                                    />
                                </View>

                                {/* Completion Toggle */}
                                <TouchableOpacity
                                    onPress={() => handleToggleTaskComplete(activeTask.code)}
                                    style={styles.completeToggleRow}
                                >
                                    <Ionicons
                                        name={completedTasks.has(activeTask.code) ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={20}
                                        color={completedTasks.has(activeTask.code) ? '#10B981' : '#6B7280'}
                                    />
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: completedTasks.has(activeTask.code) ? '#10B981' : '#374151' }}>
                                        {completedTasks.has(activeTask.code) ? 'Page marked as complete' : 'Mark this deliverable page as complete'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Document Footer */}
                        <View style={styles.docFooterRow}>
                            <Text style={styles.docFooterText}>#{project.code || 'PRJ'} · {currentStage.fullName}</Text>
                            <Text style={styles.docFooterText}>Page {currentPageNumber} of {totalPages}</Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* ---------------- Top Bar: Back Arrow, Stage Badge, Export & Save ---------------- */}
            <View style={[styles.topBar, { borderBottomColor: border, backgroundColor: cardBg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                        accessibilityLabel="Back to deliverables dashboard"
                        onPress={onBack}
                        style={[styles.circleButton, { backgroundColor: surface }]}
                    >
                        <Ionicons name="arrow-back" size={17} color={text} />
                    </TouchableOpacity>

                    <View style={[styles.stageBadgePill, { backgroundColor: currentStage.color }]}>
                        <Text style={styles.stageBadgeText}>{currentStage.code}</Text>
                    </View>
                    <Text style={[styles.stageHeaderTitle, { color: text }]}>{currentStage.name}</Text>
                </View>

                {/* Right Actions: Export + Save */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {!!saveMessage && (
                        <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>{saveMessage}</Text>
                    )}
                    {!!saveError && (
                        <Text style={{ color: redAccent, fontSize: 11 }}>{saveError}</Text>
                    )}

                    <TouchableOpacity
                        accessibilityLabel="Export deliverable document"
                        onPress={handleExport}
                        style={[styles.exportButton, { backgroundColor: surface, borderColor: border }]}
                    >
                        <Ionicons name="download-outline" size={15} color={text} />
                        <Text style={[styles.exportButtonText, { color: text }]}>Export</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        accessibilityLabel="Save deliverable document"
                        disabled={saving}
                        onPress={handleSave}
                        style={[styles.saveButton, { backgroundColor: '#2563EB', opacity: saving ? 0.6 : 1 }]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={15} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Save</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* ---------------- Sub-deliverables Horizontal Tabs (Matching Screenshot 3) ---------------- */}
            <View style={[styles.tabsRow, { borderBottomColor: border, backgroundColor: cardBg }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                    {currentStage.sections.map((sec, idx) => {
                        const active = sec.code === activeSectionCode;
                        const numStr = String(idx + 1).padStart(2, '0');
                        return (
                            <TouchableOpacity
                                key={sec.code}
                                onPress={() => {
                                    setActiveSectionCode(sec.code);
                                }}
                                style={[
                                    styles.subTabButton,
                                    active
                                        ? [styles.subTabButtonActive, { backgroundColor: '#2563EB' }]
                                        : { backgroundColor: surface }
                                ]}
                            >
                                <Text style={[styles.subTabNumber, { color: active ? '#FFFFFF' : secondary }]}>
                                    {numStr}
                                </Text>
                                <Text style={[styles.subTabText, { color: active ? '#FFFFFF' : text, fontWeight: active ? '700' : '500' }]}>
                                    {sec.title}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ---------------- Main Content: Split Left Panel & Right Canvas ---------------- */}
            <View style={styles.bodySplitLayout}>
                {renderLeftPanel()}
                {renderCanvas()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 0
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1
    },
    circleButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center'
    },
    stageBadgePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    stageBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    stageHeaderTitle: {
        fontSize: 16,
        fontWeight: '700'
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1
    },
    exportButtonText: {
        fontSize: 12,
        fontWeight: '600'
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 8
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600'
    },
    tabsRow: {
        paddingVertical: 10,
        borderBottomWidth: 1
    },
    subTabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999
    },
    subTabButtonActive: {
        shadowColor: '#2563EB',
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2
    },
    subTabNumber: {
        fontSize: 11,
        fontWeight: '700'
    },
    subTabText: {
        fontSize: 12
    },
    bodySplitLayout: {
        flex: 1,
        flexDirection: 'row',
        padding: 14,
        gap: 14,
        minHeight: 0
    },
    leftPanel: {
        width: 290,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 12,
        gap: 10
    },
    leftPanelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottomWidth: 1
    },
    pageListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 7,
        borderRadius: 8,
        marginBottom: 2
    },
    codeBadge: {
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 5,
        borderWidth: 1
    },
    codeBadgeText: {
        fontSize: 10,
        fontWeight: '700'
    },
    pageListTitle: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1
    },
    autoIndexContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    autoIndexHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    autoIndexTitle: {
        color: '#1E293B',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    autoIndexStatus: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    refreshButtonText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600'
    },
    indexRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 3
    },
    indexTitle: {
        fontSize: 11,
        flex: 1,
        paddingRight: 6
    },
    indexPageNumber: {
        fontSize: 11,
        fontWeight: '600'
    },
    canvasControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    segmentedPillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        padding: 3,
        gap: 2
    },
    segmentedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 999
    },
    segmentedButtonActive: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1
    },
    segmentedButtonText: {
        fontSize: 12
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1
    },
    stepperText: {
        fontSize: 12,
        fontWeight: '600'
    },
    paperScrollContainer: {
        alignItems: 'center',
        paddingBottom: 40
    },
    documentPaper: {
        width: '100%',
        maxWidth: 720,
        minHeight: 880,
        borderRadius: 8,
        borderWidth: 1,
        padding: 36,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3
    },
    docHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    docHeaderProject: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280'
    },
    docHeaderStage: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280'
    },
    docTitleBlock: {
        marginBottom: 24
    },
    docMainTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827'
    },
    docSubTitle: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#6B7280',
        marginTop: 2
    },
    docSectionNumber: {
        fontSize: 14,
        fontWeight: '800'
    },
    redRuleLine: {
        height: 2,
        width: '100%',
        marginTop: 8
    },
    coverLayout: {
        flex: 1,
        justifyContent: 'space-between'
    },
    pageEditBlock: {
        marginBottom: 16
    },
    editBlockLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6
    },
    textInputPaper: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: '#111827',
        backgroundColor: '#F9FAFB'
    },
    tocLayout: {
        paddingTop: 8
    },
    tocSectionHeading: {
        fontSize: 12,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 10
    },
    tocRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        paddingVertical: 3
    },
    tocItemCode: {
        fontSize: 11,
        fontWeight: '700',
        color: '#374151',
        width: 44
    },
    tocItemName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#111827'
    },
    tocDottedLeader: {
        flex: 1,
        height: 1,
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        marginHorizontal: 8
    },
    tocPageNum: {
        fontSize: 11,
        fontWeight: '700',
        color: '#111827'
    },
    standardPageLayout: {
        gap: 16,
        paddingTop: 8
    },
    completeToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8
    },
    docFooterRow: {
        marginTop: 'auto',
        paddingTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderColor: '#F3F4F6'
    },
    docFooterText: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500'
    }
});
