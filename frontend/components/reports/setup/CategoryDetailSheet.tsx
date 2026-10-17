import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { ReportType } from '../types';

export interface ReportCategoryData {
    id: string;
    name: string;
    code: string;
    icon: string;
    color: string;
    colorEnd?: string;
    description?: string;
    reportCount?: number;
    activityCount?: number;
}

export const NOTION_COLORS = [
    '#14B8A6', // Teal
    '#0284C7', // Sky Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#64748B', // Slate
    '#0EA5E9', // Ocean
];

export const NOTION_ICONS = [
    // Row 1: Facility & Buildings
    'building.2.crop.circle.fill', 'building.fill', 'house.fill', 'storefront.fill', 'door.left.hand.open', 'key.fill',
    // Row 2: Maintenance & Engineering
    'wrench.and.screwdriver.fill', 'hammer.fill', 'gearshape.fill', 'bolt.fill', 'speedometer', 'gauge.with.dots.needle.bottom.50percent',
    // Row 3: Cleaning & Sanitation
    'sparkles', 'bubbles.and.sparkles.fill', 'trash.fill', 'wind', 'drop.fill', 'hand.tap.fill',
    // Row 4: HSE & Safety
    'shield.checkerboard', 'shield.fill', 'exclamationmark.triangle.fill', 'cross.case.fill', 'flame.fill', 'leaf.fill',
    // Row 5: Operations & Gym
    'figure.run', 'dumbbell.fill', 'figure.cross.training', 'heart.fill', 'camera.fill', 'wifi',
    // Row 6: Management & Audits
    'folder.fill', 'doc.text.fill', 'checklist', 'chart.bar.fill', 'briefcase.fill', 'person.2.fill',
];

export interface CategoryDetailSheetProps {
    visible: boolean;
    category: ReportCategoryData | null;
    linkedReportTypes?: ReportType[];
    onClose: () => void;
    onSave: (updated: ReportCategoryData) => void;
    onViewReportTypes?: (categoryName: string) => void;
}

export function CategoryDetailSheet({
    visible,
    category,
    linkedReportTypes = [],
    onClose,
    onSave,
    onViewReportTypes,
}: CategoryDetailSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
    const inputBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F2F2F7';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [name, setName] = useState(category?.name || '');
    const [code, setCode] = useState(category?.code || 'FAC');
    const [selectedIcon, setSelectedIcon] = useState(category?.icon || 'building.2.crop.circle.fill');
    const [selectedColor, setSelectedColor] = useState(category?.color || '#14B8A6');

    if (category && category.id !== editingCatId) {
        setEditingCatId(category.id);
        setName(category.name || '');
        setCode(category.code || 'FAC');
        setSelectedIcon(category.icon || 'building.2.crop.circle.fill');
        setSelectedColor(category.color || '#14B8A6');
    }

    if (!visible || !category) return null;

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave({
            ...category,
            name: name.trim() || category.name,
            code: code.trim().toUpperCase() || category.code,
            icon: selectedIcon,
            color: selectedColor,
        });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={styles.sheetWrapper}>
                    <GlassView
                        intensity={isDark ? 30 : 60}
                        style={[
                            styles.sheetContainer,
                            {
                                backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(242,242,247,0.98)',
                                borderColor,
                                paddingBottom: Math.max(insets.bottom, 20),
                            },
                        ]}
                    >
                        <View style={styles.handleContainer}>
                            <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
                        </View>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: textColor }]}>Category Template</Text>
                            <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            {/* Preview */}
                            <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
                                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: `${selectedColor}22`, alignItems: 'center', justifyContent: 'center' }}>
                                    <PlatformIcon name={selectedIcon as any} size={24} tintColor={selectedColor} />
                                </View>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={[styles.itemTitle, { color: textColor, fontWeight: '700' }]}>{name.trim() || 'Category Name'}</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: selectedColor }}>{code.toUpperCase()}</Text>
                                </View>
                            </GlassView>

                            {/* Section: Identity */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Category Identity & Code</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Category Name</Text>
                                        <TextInput
                                            value={name}
                                            onChangeText={setName}
                                            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                                            placeholder="Category Name"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Category Code (3 letters)</Text>
                                        <TextInput
                                            value={code}
                                            maxLength={3}
                                            onChangeText={(t) => setCode(t.toUpperCase().slice(0, 3))}
                                            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                                            placeholder="Category Code"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                </GlassView>
                            </View>

                            {/* Section: Color Palette */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Theme Color</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }]}>
                                    {NOTION_COLORS.map((col) => (
                                        <TouchableOpacity
                                            key={col}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSelectedColor(col);
                                            }}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 16,
                                                backgroundColor: col,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderWidth: selectedColor === col ? 3 : 0,
                                                borderColor: '#FFFFFF',
                                            }}
                                        >
                                            {selectedColor === col && <PlatformIcon name="checkmark" size={14} tintColor="#FFFFFF" />}
                                        </TouchableOpacity>
                                    ))}
                                </GlassView>
                            </View>

                            {/* Section: Icon Grid */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Icon Library</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }]}>
                                    {NOTION_ICONS.map((iconSym) => (
                                        <TouchableOpacity
                                            key={iconSym}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSelectedIcon(iconSym);
                                            }}
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 10,
                                                backgroundColor: selectedIcon === iconSym ? `${selectedColor}25` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <PlatformIcon
                                                name={iconSym as any}
                                                size={20}
                                                tintColor={selectedIcon === iconSym ? selectedColor : (isDark ? '#E5E5EA' : '#3C3C43')}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </GlassView>
                            </View>

                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Linked Report Types ({linkedReportTypes.length})</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                                    {linkedReportTypes.map((rt) => (
                                        <View key={rt.id} style={styles.row}>
                                            <Text style={[styles.itemTitle, { color: textColor }]}>{rt.name}</Text>
                                            <Text style={[styles.itemSubtitle, { color: rt.color }]}>{rt.activities.length} activities</Text>
                                        </View>
                                    ))}
                                    {linkedReportTypes.length === 0 && (
                                        <View style={{ padding: 14, alignItems: 'center' }}>
                                            <Text style={{ color: subtextColor }}>No report types linked</Text>
                                        </View>
                                    )}
                                </GlassView>
                            </View>
                        </ScrollView>
                    </GlassView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
    sheetWrapper: { maxHeight: '85%', height: '85%' },
    sheetContainer: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, overflow: 'hidden' },
    handleContainer: { alignItems: 'center', paddingVertical: 10 },
    grabber: { width: 36, height: 5, borderRadius: 2.5 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
    headerBtn: { paddingVertical: 4, paddingHorizontal: 6 },
    cancelText: { fontSize: 16, color: '#8E8E93' },
    saveText: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    scrollArea: { flex: 1 },
    scrollContent: { padding: 16, gap: 18 },
    block: { gap: 8 },
    sectionLabel: { fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
    card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
    inputGroup: { paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
    fieldLabel: { fontSize: 12, fontWeight: '500' },
    textInput: { height: 40, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
    itemTitle: { fontSize: 15, fontWeight: '500' },
    itemSubtitle: { fontSize: 13, fontWeight: '500' },
});
