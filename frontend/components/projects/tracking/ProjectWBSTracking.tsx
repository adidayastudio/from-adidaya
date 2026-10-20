import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildTrackingItems, TrackingItem } from '@/lib/projectWBSTracking';
import { publishedWBSRows } from '@/lib/projectWBSWorkflow';
import { supabase } from '@/lib/supabase';

interface ProjectWBSTrackingProps {
    project: any;
    wbs?: any[];
    isDark: boolean;
    onProjectMetaChange?: (meta: any) => void;
    onHeaderTrailingChange?: (content: React.ReactNode) => void;
}

export function ProjectWBSTracking({
    project,
    wbs,
    isDark,
    onProjectMetaChange,
    onHeaderTrailingChange,
}: ProjectWBSTrackingProps) {
    const text = isDark ? '#F5F5F7' : '#1C1C1E';
    const secondary = isDark ? '#9898A2' : '#73737D';
    const surface = isDark ? '#1C1D23' : '#F2F2F7';
    const cardBg = isDark ? '#14151B' : '#FFFFFF';
    const border = isDark ? '#292930' : '#E5E5EA';

    const [loadedWbs, setLoadedWbs] = useState<any[]>([]);
    const [loading, setLoading] = useState(!wbs);
    const [error, setError] = useState('');
    useEffect(() => {
        if (wbs) return;
        let active = true;
        setLoading(true); setError('');
        (async () => {
            const rows: any[] = [];
            for (let offset = 0; ; offset += 500) {
                const { data, error } = await supabase.from('project_wbs_items').select('*').eq('project_id', project.id).order('id').range(offset, offset + 499);
                if (error) throw error;
                rows.push(...(data || []));
                if (!data || data.length < 500) break;
            }
            if (active) setLoadedWbs(publishedWBSRows(project.meta, rows));
        })().catch(reason => { if (active) setError(reason.message || 'Unable to load WBS.'); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [project.id, project.meta, wbs]);

    // 1. Read tracking drafts from project meta
    const trackingSaved = project.meta?.wbsTracking || {};
    const [trackingState, setTrackingState] = useState<Record<string, any>>(trackingSaved);
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for "+ Input"
    const [activeModalItem, setActiveModalItem] = useState<TrackingItem | null>(null);
    const [modalConstProg, setModalConstProg] = useState('');
    const [modalMatProg, setModalMatProg] = useState('');
    const [modalPaidProg, setModalPaidProg] = useState('');
    const [modalNotes, setModalNotes] = useState('');
    const [isSavingModal, setIsSavingModal] = useState(false);

    useEffect(() => { setTrackingState(project.meta?.wbsTracking || {}); }, [project.id, project.meta?.wbsTracking]);
    const items = useMemo(() => buildTrackingItems(project, wbs || loadedWbs, trackingState), [project, wbs, loadedWbs, trackingState]);
    const totalItemsCount = items.filter(item => !item.isSection).length;

    // 3. Global Overall Progress
    const leafItems = useMemo(() => items.filter(i => !i.isSection), [items]);
    const overallConst = useMemo(() => {
        const sum = leafItems.reduce((acc, i) => acc + (i.constProgress * (i.weight / 100)), 0);
        return Math.min(100, Math.round(sum));
    }, [leafItems]);

    const overallPaid = useMemo(() => {
        const sum = leafItems.reduce((acc, i) => acc + (i.paidProgress * (i.weight / 100)), 0);
        return Math.min(100, Math.round(sum));
    }, [leafItems]);

    // Filtered items
    const visibleItems = useMemo(() => {
        return items.filter(item => {
            const isChildOfCollapsed = !searchQuery && [...collapsed].some(c => item.code.startsWith(`${c}.`));
            if (isChildOfCollapsed) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return items.some(candidate => (candidate.code === item.code || candidate.code.startsWith(`${item.code}.`)) && [candidate.code, candidate.titleEn, candidate.titleId].some(value => value.toLowerCase().includes(q)));
            }
            return true;
        });
    }, [items, collapsed, searchQuery]);

    const toggleCollapse = (code: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };

    const toolbar = useMemo(() => (
<View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: onHeaderTrailingChange ? 0 : 16 }}>
                <TextInput accessibilityLabel="Search WBS tracking" placeholder="Search WBS" placeholderTextColor={secondary} value={searchQuery} onChangeText={setSearchQuery} style={{ width: 220, height: 40, borderRadius: 999, backgroundColor: surface, color: text, paddingHorizontal: 16 }} />
                <TouchableOpacity onPress={() => setCollapsed(new Set())} style={{ backgroundColor: surface, padding: 12, borderRadius: 999 }}><Text style={{ color: text }}>Expand all</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setCollapsed(new Set(items.filter(item => item.hasChildren).map(item => item.code)))} style={{ backgroundColor: surface, padding: 12, borderRadius: 999 }}><Text style={{ color: text }}>Collapse all</Text></TouchableOpacity>
            </View>
    ), [searchQuery, surface, secondary, text, items, onHeaderTrailingChange]);
    useEffect(() => {
        onHeaderTrailingChange?.(toolbar);
        return () => onHeaderTrailingChange?.(null);
    }, [onHeaderTrailingChange, toolbar]);

    // Open modal
    const handleOpenInput = (item: TrackingItem) => {
        setActiveModalItem(item);
        const tracked = trackingState[item.id] || trackingState[item.code] || {};
        setModalConstProg(tracked.constProgress !== undefined ? String(tracked.constProgress) : '0');
        setModalMatProg(tracked.materialProgress !== undefined ? String(tracked.materialProgress) : '0');
        setModalPaidProg(tracked.paidProgress !== undefined ? String(tracked.paidProgress) : '0');
        setModalNotes(tracked.notes || '');
    };

    // Save modal input
    const handleSaveInput = async () => {
        if (!activeModalItem) return;
        setIsSavingModal(true);
        try {
            const constP = Math.min(100, Math.max(0, parseFloat(modalConstProg) || 0));
            const matP = Math.min(100, Math.max(0, parseFloat(modalMatProg) || 0));
            const paidP = Math.min(100, Math.max(0, parseFloat(modalPaidProg) || 0));
            const status = constP >= 100 ? 'DONE' : constP > 0 ? 'IN_PROGRESS' : 'PENDING';

            const nextTracking = {
                ...trackingState,
                [activeModalItem.id]: {
                    constProgress: constP,
                    materialProgress: matP,
                    paidProgress: paidP,
                    notes: modalNotes,
                    status,
                    updatedAt: new Date().toISOString()
                }
            };


            // Save to supabase
            const nextMeta = {
                ...(project.meta || {}),
                wbsTracking: nextTracking
            };

            const { error } = await supabase.from('projects').update({ meta: nextMeta }).eq('id', project.id);
            if (error) throw error;
            setTrackingState(nextTracking);
            onProjectMetaChange?.(nextMeta);
            setActiveModalItem(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to save progress.');
        } finally {
            setIsSavingModal(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* ---------------- Header Card (Matching Screenshot 4) ---------------- */}
            <View style={[styles.headerCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: text }]}>
                        Work Progress
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: secondary }]}>
                        {totalItemsCount} work items
                    </Text>
                </View>

                {/* Right KPIs (DESIGN 0% | CONST. 0% | PAID 0%) */}
                <View style={styles.kpiPillsRow}>
                    <View style={styles.kpiPill}>
                        <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={[styles.kpiText, { color: text }]}>CONST. {overallConst}%</Text>
                    </View>
                    <View style={styles.kpiPill}>
                        <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                        <Text style={[styles.kpiText, { color: text }]}>PAID {overallPaid}%</Text>
                    </View>
                </View>
            </View>

            {!!error && <Text accessibilityRole="alert" style={{ color: '#FF3B30', marginBottom: 12 }}>{error}</Text>}
            {!onHeaderTrailingChange && toolbar}
            {loading && <ActivityIndicator color="#007AFF" />}
            {!loading && !items.length && !error && <Text style={{ color: secondary }}>No WBS items yet.</Text>}
            {/* ---------------- Table of WBS Tracking Rows (Matching Screenshot 4) ---------------- */}
            <ScrollView horizontal><View style={[styles.tableContainer, { backgroundColor: cardBg, borderColor: border, minWidth: 1200, flex: 1 }]}>
                <View style={{ flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: border, alignItems: 'center' }}>
                    <Text style={{ flex: 1, minWidth: 300, color: secondary }}>WBS · Work description</Text>
                    <View style={styles.rightCellGroup}>{[['RAB',110], ['Weight',60], ['Schedule',150], ['Volume',70], ['Progress',80], ['%',36], ['Status',80], ['',62]].map(([label,width]) => <Text key={String(label)} style={{ width: Number(width), color: secondary, textAlign: 'right', fontSize: 12 }}>{label}</Text>)}</View>
                </View>
                {visibleItems.map(item => {
                    const isSection = item.isSection;
                    const isCollapsed = collapsed.has(item.code);
                    const indent = Math.min(item.level * 20, 80);

                    return (
                        <View
                            key={item.id}
                            style={[
                                styles.rowContainer,
                                {
                                    borderBottomColor: border,
                                    backgroundColor: isSection ? (isDark ? '#181920' : '#F8FAFC') : 'transparent'
                                }
                            ]}
                        >
                            {/* Left: Code, Title, Expand Icon */}
                            <View style={[styles.leftCell, { paddingLeft: 12 + indent }]}>
                                {item.hasChildren ? (
                                    <TouchableOpacity
                                        onPress={() => toggleCollapse(item.code)}
                                        style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Ionicons
                                            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                                            size={14}
                                            color={secondary}
                                        />
                                    </TouchableOpacity>
                                ) : (
                                    <View style={{ width: 18 }} />
                                )}

                                <Text style={[styles.codeText, { color: text, fontWeight: isSection ? '700' : '600' }]}>
                                    {item.code}
                                </Text>

                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text numberOfLines={1} style={[styles.titleText, { color: text, fontWeight: isSection ? '700' : '500' }]}>
                                        {item.title}
                                    </Text>
                                    {!!item.titleId && item.titleId !== item.title && (
                                        <Text numberOfLines={1} style={[styles.subTitleText, { color: secondary }]}>
                                            {item.titleId}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Middle & Right: Volume, Progress Bar, Percentage, Status Badge, + Input */}
                            <View style={styles.rightCellGroup}>
                                <Text style={{ color: secondary, width: 110, textAlign: 'right', fontSize: 12 }}>{item.cost > 0 ? `Rp ${Math.round(item.cost).toLocaleString('id-ID')}` : '—'}</Text>
                                <Text style={{ color: secondary, width: 60, textAlign: 'right', fontSize: 12 }}>{item.weight.toFixed(2)}%</Text>
                                <Text style={{ color: secondary, width: 150, textAlign: 'right', fontSize: 12 }}>{item.startDate ? `${item.startDate} → ${item.finishDate || '—'}` : '—'}</Text>
                                {(!isSection ? (
                                    <Text style={[styles.volumeText, { color: secondary }]}>
                                        {item.quantity > 0 ? `${item.quantity} ${item.unit}` : `— ${item.unit}`}
                                    </Text>
                                ) : <View style={{ width: 70 }} />)}

                                {/* Progress Bar */}
                                <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#27272A' : '#E4E4E7' }]}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${Number(item.constProgress.toFixed(1))}%`,
                                                backgroundColor: item.constProgress >= 100 ? '#10B981' : item.constProgress > 0 ? '#3B82F6' : 'transparent'
                                            }
                                        ]}
                                    />
                                </View>

                                {/* Percentage Text */}
                                <Text style={[styles.percentText, { color: text }]}>
                                    {Number(item.constProgress.toFixed(1))}%
                                </Text>

                                {/* Status Badge */}
                                <View style={[styles.statusBadge, { backgroundColor: surface }]}>
                                    <Text style={[styles.statusBadgeText, { color: secondary }]}>
                                        {item.status}
                                    </Text>
                                </View>

                                {/* "+ Input" Button (for leaf items) */}
                                {!isSection ? (
                                    <TouchableOpacity
                                        accessibilityLabel={`Input progress for ${item.code}`}
                                        onPress={() => handleOpenInput(item)}
                                        style={styles.inputButton}
                                    >
                                        <Text style={styles.inputButtonText}>+ Input</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={{ width: 62 }} />
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>

            </ScrollView>

            {/* ---------------- Modal: + Input Progress (3 Dimensi) ---------------- */}
            {activeModalItem && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setActiveModalItem(null)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalBox, { backgroundColor: cardBg, borderColor: border }]}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={[styles.modalTitle, { color: text }]}>
                                        Input Progress Realisasi
                                    </Text>
                                    <Text style={{ color: secondary, fontSize: 12 }}>
                                        {activeModalItem.code} · {activeModalItem.title}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setActiveModalItem(null)}>
                                    <Ionicons name="close" size={20} color={secondary} />
                                </TouchableOpacity>
                            </View>

                            {/* 3 Progress Inputs */}
                            <View style={{ gap: 14, marginVertical: 14 }}>
                                <View>
                                    <Text style={[styles.inputLabel, { color: text }]}>1. Progres Fisik / Konstruksi Lapangan (%)</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        value={modalConstProg}
                                        onChangeText={setModalConstProg}
                                        placeholder="0 - 100"
                                        placeholderTextColor={secondary}
                                        style={[styles.modalTextInput, { color: text, backgroundColor: surface, borderColor: border }]}
                                    />
                                </View>

                                <View>
                                    <Text style={[styles.inputLabel, { color: text }]}>2. Progres Pengadaan / Belanja Material (%)</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        value={modalMatProg}
                                        onChangeText={setModalMatProg}
                                        placeholder="0 - 100"
                                        placeholderTextColor={secondary}
                                        style={[styles.modalTextInput, { color: text, backgroundColor: surface, borderColor: border }]}
                                    />
                                </View>

                                <View>
                                    <Text style={[styles.inputLabel, { color: text }]}>3. Progres Pembayaran / Pencairan Tagihan (%)</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        value={modalPaidProg}
                                        onChangeText={setModalPaidProg}
                                        placeholder="0 - 100"
                                        placeholderTextColor={secondary}
                                        style={[styles.modalTextInput, { color: text, backgroundColor: surface, borderColor: border }]}
                                    />
                                </View>

                                <View>
                                    <Text style={[styles.inputLabel, { color: text }]}>Catatan Opname Lapangan</Text>
                                    <TextInput
                                        multiline
                                        numberOfLines={3}
                                        value={modalNotes}
                                        onChangeText={setModalNotes}
                                        placeholder="Kondisi riil pekerjaan di site..."
                                        placeholderTextColor={secondary}
                                        style={[styles.modalTextInput, { minHeight: 60, color: text, backgroundColor: surface, borderColor: border }]}
                                    />
                                </View>
                            </View>

                            {/* Modal Actions */}
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => setActiveModalItem(null)}
                                    style={[styles.modalCancelBtn, { backgroundColor: surface }]}
                                >
                                    <Text style={{ color: text, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    disabled={isSavingModal}
                                    onPress={handleSaveInput}
                                    style={[styles.modalSaveBtn, { backgroundColor: '#2563EB' }]}
                                >
                                    {isSavingModal ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Save Progress</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 60
    },
    headerCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700'
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2
    },
    kpiPillsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    kpiPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    kpiText: {
        fontSize: 11,
        fontWeight: '700'
    },
    tableContainer: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden'
    },
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        minHeight: 48
    },
    leftCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 260
    },
    codeText: {
        fontSize: 12,
        minWidth: 60
    },
    titleText: {
        fontSize: 13
    },
    subTitleText: {
        fontSize: 11,
        fontStyle: 'italic',
        marginTop: 1
    },
    rightCellGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    volumeText: {
        fontSize: 12,
        width: 70,
        textAlign: 'right'
    },
    progressBarTrack: {
        width: 80,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    percentText: {
        fontSize: 12,
        fontWeight: '700',
        width: 36,
        textAlign: 'right'
    },
    statusBadge: {
        width: 80,
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    inputButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6
    },
    inputButtonText: {
        color: '#2563EB',
        fontSize: 12,
        fontWeight: '700'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
    },
    modalBox: {
        width: '100%',
        maxWidth: 460,
        borderRadius: 16,
        borderWidth: 1,
        padding: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB20',
        paddingBottom: 12
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700'
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6
    },
    modalTextInput: {
        height: 38,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        fontSize: 13
    },
    modalCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8
    },
    modalSaveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8
    }
});
