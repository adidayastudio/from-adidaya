import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState, useEffect } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from './GlassView';
import { PillButton } from './PillButton';
import { getProjectWbs } from '@/lib/api/tasks';

export interface WBSItem {
    id: string;
    code: string;
    fullCode: string;
    name: string;
    children?: WBSItem[];
}

// Mock WBS Data
export const MOCK_WBS: WBSItem[] = [
    {
        id: 'wbs-s', code: 'S', fullCode: 'S', name: 'Structure (Struktur)', children: [
            { id: 'wbs-s-1', code: 'S.1', fullCode: 'S.1', name: 'Preparation (Persiapan)' },
            { id: 'wbs-s-2', code: 'S.2', fullCode: 'S.2', name: 'Earthworks (Pekerjaan Tanah)' },
            { id: 'wbs-s-3', code: 'S.3', fullCode: 'S.3', name: 'Foundation (Pekerjaan Pondasi)' },
            { id: 'wbs-s-4', code: 'S.4', fullCode: 'S.4', name: 'Concrete Structure (Struktur Beton)' },
            { id: 'wbs-s-5', code: 'S.5', fullCode: 'S.5', name: 'Steel/Roof Structure (Struktur Atap)' },
        ]
    },
    {
        id: 'wbs-a', code: 'A', fullCode: 'A', name: 'Architecture (Arsitektur)', children: [
            { id: 'wbs-a-1', code: 'A.1', fullCode: 'A.1', name: 'Wall Masonry & Plaster (Dinding & Plesteran)' },
            { id: 'wbs-a-2', code: 'A.2', fullCode: 'A.2', name: 'Wall Finishes (Finishing Dinding)' },
            { id: 'wbs-a-3', code: 'A.3', fullCode: 'A.3', name: 'Floor Finishes (Finishing Lantai)' },
            { id: 'wbs-a-4', code: 'A.4', fullCode: 'A.4', name: 'Ceiling Works (Pekerjaan Plafond)' },
            { id: 'wbs-a-5', code: 'A.5', fullCode: 'A.5', name: 'Painting (Pengecatan)' },
            { id: 'wbs-a-6', code: 'A.6', fullCode: 'A.6', name: 'Doors & Windows (Kusen, Pintu & Jendela)' },
            { id: 'wbs-a-7', code: 'A.7', fullCode: 'A.7', name: 'Sanitary Ware (Sanitair)' },
            { id: 'wbs-a-8', code: 'A.8', fullCode: 'A.8', name: 'Facade & Cladding (Fasad)' },
        ]
    },
    {
        id: 'wbs-m', code: 'M', fullCode: 'M', name: 'MEP (Mechanical Electrical Plumbing)', children: [
            { id: 'wbs-m-1', code: 'M.1', fullCode: 'M.1', name: 'Electrical & Lighting (Elektrikal & Penerangan)' },
            { id: 'wbs-m-2', code: 'M.2', fullCode: 'M.2', name: 'Plumbing & Water Supply (Plumbing & Air)' },
            { id: 'wbs-m-3', code: 'M.3', fullCode: 'M.3', name: 'Air Conditioning & HVAC (AC & HVAC)' },
            { id: 'wbs-m-4', code: 'M.4', fullCode: 'M.4', name: 'Fire Fighting (Pemadam Kebakaran)' },
            { id: 'wbs-m-5', code: 'M.5', fullCode: 'M.5', name: 'Lightning Protection (Proteksi Petir)' },
        ]
    },
    {
        id: 'wbs-i', code: 'I', fullCode: 'I', name: 'Interior', children: [
            { id: 'wbs-i-1', code: 'I.1', fullCode: 'I.1', name: 'Built-in Furniture (Furnitur Custom)' },
            { id: 'wbs-i-2', code: 'I.2', fullCode: 'I.2', name: 'Loose Furniture (Furnitur Loose)' },
            { id: 'wbs-i-3', code: 'I.3', fullCode: 'I.3', name: 'Interior Wall Coverings (Finishing Interior)' },
            { id: 'wbs-i-4', code: 'I.4', fullCode: 'I.4', name: 'Special Lighting (Lampu Dekoratif)' },
        ]
    },
    {
        id: 'wbs-l', code: 'L', fullCode: 'L', name: 'Landscape (Lansekap)', children: [
            { id: 'wbs-l-1', code: 'L.1', fullCode: 'L.1', name: 'Hardscape (Pekerasan)' },
            { id: 'wbs-l-2', code: 'L.2', fullCode: 'L.2', name: 'Softscape (Tanaman)' },
            { id: 'wbs-l-3', code: 'L.3', fullCode: 'L.3', name: 'Drainage & Irrigation (Saluran Air)' },
            { id: 'wbs-l-4', code: 'L.4', fullCode: 'L.4', name: 'Garden Lighting (Lampu Taman)' },
        ]
    }
];

interface WBSPickerProps {
    visible: boolean;
    onClose: () => void;
    projectId?: string;
    onSelect: (wbsId: string, wbsCode: string, wbsName: string) => void;
}

export function WBSPicker({ visible, onClose, projectId, onSelect }: WBSPickerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();

    const [wbsTree, setWbsTree] = useState<WBSItem[]>(MOCK_WBS);
    const [isLoading, setIsLoading] = useState(false);

    const [step, setStep] = useState<'discipline' | 'section' | 'code'>('discipline');
    const [selectedDiscipline, setSelectedDiscipline] = useState<WBSItem | null>(null);
    const [selectedSection, setSelectedSection] = useState<WBSItem | null>(null);

    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';

    // Enforce static SAMIL template hierarchy
    useEffect(() => {
        if (visible) {
            setWbsTree(MOCK_WBS);
        }
    }, [visible]);

    // Reset steps when closed
    useEffect(() => {
        if (!visible) {
            setStep('discipline');
            setSelectedDiscipline(null);
            setSelectedSection(null);
        }
    }, [visible]);

    const handleBack = () => {
        if (step === 'code') {
            setStep('section');
            setSelectedSection(null);
        } else if (step === 'section') {
            setStep('discipline');
            setSelectedDiscipline(null);
        }
    };

    const currentData = useMemo(() => {
        if (step === 'discipline') return wbsTree;
        if (step === 'section') return selectedDiscipline?.children || [];
        if (step === 'code') return selectedSection?.children || [];
        return [];
    }, [step, wbsTree, selectedDiscipline, selectedSection]);

    const handleSelect = (item: WBSItem) => {
        if (step === 'discipline') {
            if (item.children && item.children.length > 0) {
                setSelectedDiscipline(item);
                setStep('section');
            } else {
                onSelect(item.id, item.fullCode, item.name);
                onClose();
            }
        } else if (step === 'section') {
            if (item.children && item.children.length > 0) {
                setSelectedSection(item);
                setStep('code');
            } else {
                onSelect(item.id, item.fullCode, item.name);
                onClose();
            }
        } else if (step === 'code') {
            onSelect(item.id, item.fullCode, item.name);
            onClose();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

                <GlassView
                    intensity={60}
                    style={[
                        styles.content,
                        {
                            marginTop: insets.top + 100,
                            backgroundColor: Platform.OS === 'android'
                                ? (isDark ? '#1C1C1E' : '#FFFFFF')
                                : (isDark ? 'rgba(28,28,30,0.8)' : 'rgba(242,242,247,0.8)')
                        }
                    ]}
                >
                    <View style={{ flex: 1, padding: 24, paddingBottom: insets.bottom + 16 }}>
                        <View style={styles.dragIndicator} />

                        {/* Title & Back */}
                        <View style={styles.header}>
                            <View style={styles.headerSide}>
                                {(step === 'section' || step === 'code') && (
                                    <PillButton
                                        label=""
                                        onPress={handleBack}
                                        variant="clear"
                                        color="neutral"
                                        icon={<Ionicons name="chevron-back" size={20} color={textColor} />}
                                    />
                                )}
                            </View>
                            <View style={styles.headerCenter}>
                                <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                                    {step === 'discipline' ? 'Select Discipline' :
                                        step === 'section' ? 'Select Section' : 'Select Code'}
                                </Text>
                            </View>
                            <View style={styles.headerSide}>
                                <PillButton
                                    label=""
                                    onPress={onClose}
                                    variant="clear"
                                    color="neutral"
                                    icon={<Ionicons name="close" size={20} color={textColor} />}
                                />
                            </View>
                        </View>

                        {/* Breadcrumbs */}
                        {(selectedDiscipline || selectedSection) && (
                            <View style={styles.breadcrumbs}>
                                {selectedDiscipline && (
                                    <Text style={[styles.breadcrumbText, { color: subtextColor }]}>
                                        {selectedDiscipline.code}
                                    </Text>
                                )}
                                {selectedSection && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="chevron-forward" size={12} color={subtextColor} style={{ marginHorizontal: 4 }} />
                                        <Text style={[styles.breadcrumbText, { color: subtextColor }]}>
                                            {selectedSection.code}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Loading State */}
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#007AFF" />
                            </View>
                        ) : (
                            /* List */
                            <FlatList
                                data={currentData}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelect(item)}
                                        style={styles.itemRow}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <View style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <Text style={[styles.codeText, { color: textColor }]}>{item.code}</Text>
                                                </View>
                                                <Text style={[styles.itemLabel, { color: textColor }]}>{item.name}</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </GlassView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    content: {
        marginHorizontal: Platform.OS === 'android' ? 0 : 8,
        marginBottom: Platform.OS === 'android' ? 0 : 8,
        borderTopLeftRadius: Platform.OS === 'android' ? 32 : 56,
        borderTopRightRadius: Platform.OS === 'android' ? 32 : 56,
        borderBottomLeftRadius: Platform.OS === 'android' ? 0 : 56,
        borderBottomRightRadius: Platform.OS === 'android' ? 0 : 56,
        overflow: 'hidden',
        height: '80%',
    },
    dragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(142,142,147,0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        height: 48,
    },
    headerSide: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 19,
        fontWeight: '700',
    },
    breadcrumbs: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    breadcrumbText: {
        fontSize: 13,
        fontWeight: '600',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128,128,128,0.2)',
    },
    codeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    codeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
