import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Modal,
    ScrollView,
    TextInput,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Discipline } from '@/lib/api/templates';

export interface WBSAddDisciplineSheetProps {
    visible: boolean;
    onClose: () => void;
    availableDisciplines: Discipline[];
    onAddDiscipline: (discipline: Discipline) => void;
    onAddCustomDiscipline: (code: string, nameEn: string, nameId: string) => void;
}

export const WBSAddDisciplineSheet: React.FC<WBSAddDisciplineSheetProps> = ({
    visible,
    onClose,
    availableDisciplines,
    onAddDiscipline,
    onAddCustomDiscipline
}) => {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const borderColor = isDark ? '#2C2C2E' : '#E5E5EA';
    const inputBgColor = isDark ? '#2C2C2E' : '#F2F2F7';

    const [newDiscCode, setNewDiscCode] = useState('');
    const [newDiscNameEn, setNewDiscNameEn] = useState('');
    const [newDiscNameId, setNewDiscNameId] = useState('');
    const [showCustomDisciplineForm, setShowCustomDisciplineForm] = useState(false);

    // Reset fields on open
    useEffect(() => {
        if (visible) {
            setNewDiscCode('');
            setNewDiscNameEn('');
            setNewDiscNameId('');
            setShowCustomDisciplineForm(false);
        }
    }, [visible]);

    const handleSubmit = () => {
        const code = newDiscCode.toUpperCase().trim();
        const nameEn = newDiscNameEn.trim();
        const nameId = newDiscNameId.trim();

        if (!code) {
            Alert.alert("Required", "Discipline code is required");
            return;
        }
        if (code.length > 3) {
            Alert.alert("Invalid", "Discipline code must be 3 characters or less");
            return;
        }
        if (!nameEn) {
            Alert.alert("Required", "English name is required");
            return;
        }

        onAddCustomDiscipline(code, nameEn, nameId || nameEn);
        onClose();
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.menuModalBackdrop}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.menuModalCard, { backgroundColor: cardBgColor, paddingBottom: insets.bottom + 16 }]}
                >
                    <View style={[styles.sheetDragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />

                    <View style={styles.menuModalHeader}>
                        <Text style={[styles.menuModalTitle, { color: textColor }]}>
                            Add Discipline
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle" size={26} color={isDark ? '#3A3A3C' : '#E5E5EA'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                        {availableDisciplines.length > 0 && (
                            <View>
                                <Text style={[styles.sheetSectionHeader, { color: subtextColor }]}>Quick Add Template</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.disciplineScroll}>
                                    {availableDisciplines.map(d => (
                                        <TouchableOpacity
                                            key={d.id}
                                            style={[styles.discBadge, { backgroundColor: inputBgColor, borderColor }]}
                                            onPress={() => {
                                                onAddDiscipline(d);
                                                onClose();
                                            }}
                                        >
                                            <Text style={[styles.discBadgeText, { color: textColor }]}>+ {d.nameEn}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.customFormToggleButton, { borderColor: '#FF3B30' }]}
                            onPress={() => setShowCustomDisciplineForm(!showCustomDisciplineForm)}
                        >
                            <Ionicons name={showCustomDisciplineForm ? "close-outline" : "add-outline"} size={16} color="#FF3B30" />
                            <Text style={styles.customFormToggleText}>Custom / Other Discipline</Text>
                        </TouchableOpacity>

                        {showCustomDisciplineForm && (
                            <View style={styles.formContainer}>
                                <Text style={[styles.formHeading, { color: textColor }]}>New WBS Root Discipline</Text>
                                <View style={{ gap: 12 }}>
                                    <View>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Code (Max 3 chars)*</Text>
                                        <TextInput
                                            value={newDiscCode}
                                            onChangeText={setNewDiscCode}
                                            placeholder="e.g. C, X"
                                            placeholderTextColor={isDark ? '#555' : '#CCC'}
                                            style={[styles.inputField, { color: textColor, borderColor, backgroundColor: inputBgColor }]}
                                            autoCapitalize="characters"
                                            maxLength={3}
                                        />
                                    </View>
                                    <View>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Name (English)*</Text>
                                        <TextInput
                                            value={newDiscNameEn}
                                            onChangeText={setNewDiscNameEn}
                                            placeholder="e.g. Civil Works"
                                            placeholderTextColor={isDark ? '#555' : '#CCC'}
                                            style={[styles.inputField, { color: textColor, borderColor, backgroundColor: inputBgColor }]}
                                        />
                                    </View>
                                    <View>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Name (Indonesian)</Text>
                                        <TextInput
                                            value={newDiscNameId}
                                            onChangeText={setNewDiscNameId}
                                            placeholder="e.g. Pekerjaan Sipil (Optional)"
                                            placeholderTextColor={isDark ? '#555' : '#CCC'}
                                            style={[styles.inputField, { color: textColor, borderColor, backgroundColor: inputBgColor }]}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={styles.customFormSubmitButton}
                                        onPress={handleSubmit}
                                    >
                                        <Text style={styles.customFormSubmitText}>Add Category</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    menuModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    menuModalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 24,
        maxHeight: '85%',
        width: '100%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    menuModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    menuModalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sheetDragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 12,
    },
    sheetSectionHeader: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    disciplineScroll: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 4,
    },
    discBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    discBadgeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    customFormToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 6,
        marginVertical: 8,
    },
    customFormToggleText: {
        color: '#FF3B30',
        fontWeight: '600',
        fontSize: 14,
    },
    formContainer: {
        gap: 12,
        marginTop: 8,
    },
    formHeading: {
        fontSize: 16,
        fontWeight: '600',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    inputField: {
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 15,
    },
    customFormSubmitButton: {
        backgroundColor: '#FF3B30',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    customFormSubmitText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});
