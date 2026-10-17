import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SwiftUIExportSheetProps {
    isOpened: boolean;
    onClose: () => void;
    activeSegment: string;
    onPreview: (selectedOptions: Record<string, boolean>) => void;
}

export const SwiftUIExportSheet: React.FC<SwiftUIExportSheetProps> = ({
    isOpened,
    onClose,
    activeSegment,
    onPreview,
}) => {
    const { resolvedTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    const isPerformanceTab = activeSegment === 'performance';

    const [profileOptions, setProfileOptions] = useState<Record<string, boolean>>({
        identity: true,
        address: true,
        emergency: true,
        social: true,
        employment: true,
        access: true,
        account: true,
        finance: true,
        documents: true,
    });

    const [perfOptions, setPerfOptions] = useState<Record<string, boolean>>({
        overallIndex: true,
        periodInfo: true,
        attendance: true,
        taskCompletion: true,
        projectInvolvement: true,
        taskQuality: true,
        peerReview: true,
        teamBenchmark: true,
    });

    useEffect(() => {
        if (isOpened) {
            if (isPerformanceTab) {
                setPerfOptions({
                    overallIndex: true,
                    periodInfo: true,
                    attendance: true,
                    taskCompletion: true,
                    projectInvolvement: true,
                    taskQuality: true,
                    peerReview: true,
                    teamBenchmark: true,
                });
            } else {
                setProfileOptions({
                    identity: true,
                    address: true,
                    emergency: true,
                    social: true,
                    employment: true,
                    access: true,
                    account: true,
                    finance: true,
                    documents: true,
                });
            }
        }
    }, [isOpened, isPerformanceTab]);

    const currentOptions = isPerformanceTab ? perfOptions : profileOptions;

    const toggleOption = (key: string) => {
        if (isPerformanceTab) {
            setPerfOptions(prev => ({ ...prev, [key]: !prev[key] }));
        } else {
            setProfileOptions(prev => ({ ...prev, [key]: !prev[key] }));
        }
    };

    const toggleSelectAll = () => {
        if (isPerformanceTab) {
            const allSelected = Object.values(perfOptions).every(Boolean);
            const next = Object.keys(perfOptions).reduce((acc, k) => {
                acc[k] = !allSelected;
                return acc;
            }, {} as Record<string, boolean>);
            setPerfOptions(next);
        } else {
            const allSelected = Object.values(profileOptions).every(Boolean);
            const next = Object.keys(profileOptions).reduce((acc, k) => {
                acc[k] = !allSelected;
                return acc;
            }, {} as Record<string, boolean>);
            setProfileOptions(next);
        }
    };

    const handlePreview = () => {
        onClose();
        onPreview(currentOptions);
    };

    const allSelected = Object.values(currentOptions).every(Boolean);

    const sections = isPerformanceTab ? [
        {
            title: 'SNAPSHOT & TIMELINE',
            items: [
                { key: 'overallIndex', label: 'Overall Index Score', desc: 'Overall snapshot score & rating badge', icon: 'rosette' },
                { key: 'periodInfo', label: 'Evaluation Timeline', desc: 'Assessment period, review date & cycle', icon: 'calendar' },
            ]
        },
        {
            title: 'CORE EVALUATION METRICS',
            items: [
                { key: 'attendance', label: 'Attendance & Punctuality', desc: 'Presence rate & punctuality compliance', icon: 'clock.fill' },
                { key: 'taskCompletion', label: 'Task Completion & Velocity', desc: 'Sprint task delivery and completion rate', icon: 'checkmark.circle.fill' },
                { key: 'projectInvolvement', label: 'Project Involvement', desc: 'Active project contributions & sprint impact', icon: 'chart.line.uptrend.xyaxis' },
                { key: 'taskQuality', label: 'Task Quality Standards', desc: 'QA inspection rating & deliverables precision', icon: 'star.fill' },
                { key: 'peerReview', label: 'Peer & Manager Review', desc: '360 collaboration score & supervisor remarks', icon: 'person.2.fill' },
            ]
        },
        {
            title: 'BENCHMARKS & COMPARISONS',
            items: [
                { key: 'teamBenchmark', label: 'Team Average Benchmark', desc: 'Comparison against department standard baseline', icon: 'scale.3d' },
            ]
        }
    ] : [
        {
            title: 'PERSONAL IDENTITY & CONTACT',
            items: [
                { key: 'identity', label: 'Personal Identity', desc: 'Name, nickname, birthday, NIK, email, phone', icon: 'person.fill' },
                { key: 'address', label: 'Address Details', desc: 'Current residence & KTP registered address', icon: 'house.fill' },
                { key: 'emergency', label: 'Emergency Contact', desc: 'Next of kin name, relationship, and phone', icon: 'phone.fill' },
                { key: 'social', label: 'Social Profiles', desc: 'LinkedIn profile and Instagram handles', icon: 'globe' },
            ]
        },
        {
            title: 'EMPLOYMENT & ACCESS',
            items: [
                { key: 'employment', label: 'Employment Details', desc: 'Employee ID, ID code, department, position', icon: 'briefcase.fill' },
                { key: 'access', label: 'Access Role & Security', desc: 'System authority level and assignment status', icon: 'lock.shield.fill' },
                { key: 'account', label: 'Account Info', desc: 'System username and login credentials', icon: 'person.crop.circle.badge.checkmark' },
            ]
        },
        {
            title: 'FINANCIALS & DOCUMENTS',
            items: [
                { key: 'finance', label: 'Finance & Banking', desc: 'Bank account number, bank name, and holder', icon: 'creditcard.fill' },
                { key: 'documents', label: 'Uploaded Documents', desc: 'KTP, NPWP, CV, and diploma verified status', icon: 'doc.text.fill' },
            ]
        }
    ];

    return (
        <Modal
            visible={isOpened}
            transparent
            animationType="slide"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <GlassView intensity={60} style={[styles.content, { backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : '#FFFFFF' }]}>
                    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: textColor, flex: 1 }]}>
                                {isPerformanceTab ? 'Export Performance' : 'Export Profile'}
                            </Text>
                            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
                                <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 13 }}>
                                    {allSelected ? 'Deselect All' : 'Select All'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <Ionicons name="close" size={18} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 14 }}>
                            {sections.map((sec, sIdx) => (
                                <View key={sIdx} style={{ gap: 6 }}>
                                    <Text style={[styles.sectionHeader, { color: subtextColor }]}>{sec.title}</Text>
                                    <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        {sec.items.map((opt, i) => {
                                            const isSelected = !!currentOptions[opt.key];
                                            const isLast = i === sec.items.length - 1;
                                            return (
                                                <View key={opt.key}>
                                                    <TouchableOpacity 
                                                        onPress={() => toggleOption(opt.key)}
                                                        activeOpacity={0.7}
                                                        style={styles.row}
                                                    >
                                                        <View style={[styles.iconBox, { backgroundColor: isSelected ? 'rgba(0,122,255,0.15)' : 'rgba(142,142,147,0.15)' }]}>
                                                            <PlatformIcon name={opt.icon as any} size={16} tintColor={isSelected ? '#007AFF' : subtextColor} />
                                                        </View>
                                                        <View style={{ flex: 1, marginRight: 8 }}>
                                                            <Text style={[styles.rowLabel, { color: textColor }]}>{opt.label}</Text>
                                                            <Text style={{ fontSize: 12, color: subtextColor }}>{opt.desc}</Text>
                                                        </View>
                                                        <Ionicons 
                                                            name={isSelected ? "checkbox" : "square-outline"} 
                                                            size={22} 
                                                            color={isSelected ? "#007AFF" : subtextColor} 
                                                        />
                                                    </TouchableOpacity>
                                                    {!isLast && <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.submitBtn} onPress={handlePreview} activeOpacity={0.7}>
                            <PlatformIcon name="doc.text.fill" size={16} tintColor="#FFFFFF" />
                            <Text style={styles.submitBtnText}>Preview PDF Report</Text>
                        </TouchableOpacity>
                    </View>
                </GlassView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        height: '80%',
    },
    dragIndicator: {
        width: 36,
        height: 5,
        backgroundColor: 'rgba(142,142,147,0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    selectAllBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '600',
        paddingHorizontal: 8,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    sectionCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 58,
    },
    submitBtn: {
        backgroundColor: '#007AFF',
        height: 48,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
