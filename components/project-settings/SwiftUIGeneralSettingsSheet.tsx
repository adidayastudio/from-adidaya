import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    Modal, 
    ScrollView, 
    Alert,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

const PASTEL_COLORS = [
    'bg-red-200', 'bg-orange-200', 'bg-amber-200',
    'bg-yellow-200', 'bg-lime-200', 'bg-green-200',
    'bg-emerald-200', 'bg-teal-200', 'bg-cyan-200',
    'bg-sky-200', 'bg-blue-200', 'bg-indigo-200',
    'bg-violet-200', 'bg-purple-200', 'bg-fuchsia-200',
    'bg-pink-200', 'bg-rose-200', 'bg-stone-200'
];

const COLOR_MAP: Record<string, string> = {
    'bg-red-200': '#FECACA',
    'bg-orange-200': '#FED7AA',
    'bg-amber-200': '#FDE68A',
    'bg-yellow-200': '#FEF08A',
    'bg-lime-200': '#D9F99D',
    'bg-green-200': '#BBF7D0',
    'bg-emerald-200': '#A7F3D0',
    'bg-teal-200': '#99F6E4',
    'bg-cyan-200': '#A5F3FC',
    'bg-sky-200': '#BAE6FD',
    'bg-blue-200': '#BFDBFE',
    'bg-indigo-200': '#C7D2FE',
    'bg-violet-200': '#DDD6FE',
    'bg-purple-200': '#E9D5FF',
    'bg-fuchsia-200': '#F5D0FE',
    'bg-pink-200': '#FBCFE8',
    'bg-rose-200': '#FECDD3',
    'bg-stone-200': '#E7E5E4',
};

export interface SwiftUIGeneralSettingsSheetProps {
    isOpened: boolean;
    onClose: () => void;
    activeTab: 'scope' | 'typologies' | 'disciplines' | 'classes' | 'locations';
    editItem: any | null;
    parentId?: string | null;
    onSave: (payload: {
        code: string;
        name: string;
        description?: string;
        nameId?: string;
        color?: string;
        complexityLevel?: string;
        finishLevel?: string;
        parentId?: string | null;
        province?: string;
        city?: string;
        regionalFactor?: number;
        difficultyFactor?: number;
    }) => Promise<boolean> | void;
    onDelete: (id: string, name: string) => void;
}

export const SwiftUIGeneralSettingsSheet: React.FC<SwiftUIGeneralSettingsSheetProps> = ({
    isOpened,
    onClose,
    activeTab,
    editItem,
    parentId = null,
    onSave,
    onDelete,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const modalOverlayColor = 'rgba(0,0,0,0.5)';
    const textInputBg = isDark ? '#2C2C2E' : '#F2F2F7';

    // State Fields
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameId, setNameId] = useState('');
    const [desc, setDesc] = useState('');
    const [complexity, setComplexity] = useState('Medium');
    const [color, setColor] = useState('bg-purple-200');
    const [finishLevel, setFinishLevel] = useState('');
    const [province, setProvince] = useState('');
    const [city, setCity] = useState('');
    const [regionalFactor, setRegionalFactor] = useState('1.0');
    const [difficultyFactor, setDifficultyFactor] = useState('1.0');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpened) {
            if (editItem) {
                if (activeTab === 'scope') {
                    setCode(editItem.code || '');
                    setName(editItem.name || '');
                    setDesc(editItem.description || '');
                } else if (activeTab === 'typologies') {
                    setCode(editItem.code || '');
                    setName(editItem.name || '');
                    setComplexity(editItem.complexityLevel || 'Medium');
                } else if (activeTab === 'disciplines') {
                    setCode(editItem.code || '');
                    setName(editItem.nameEn || '');
                    setNameId(editItem.nameId || '');
                    setColor(editItem.color || 'bg-purple-200');
                } else if (activeTab === 'classes') {
                    setCode(editItem.classCode || '');
                    setName(editItem.description || '');
                    setFinishLevel(editItem.finishLevel || '');
                } else if (activeTab === 'locations') {
                    setCode(editItem.code || '');
                    setName(editItem.province || '');
                    setProvince(editItem.province || '');
                    setCity(editItem.city || '');
                    setRegionalFactor(String(editItem.regionalFactor ?? '1.0'));
                    setDifficultyFactor(String(editItem.difficultyFactor ?? '1.0'));
                }
            } else {
                setCode('');
                setName('');
                setNameId('');
                setDesc('');
                setComplexity('Medium');
                setColor('bg-purple-200');
                setFinishLevel('');
                setProvince('');
                setCity('');
                setRegionalFactor('1.0');
                setDifficultyFactor('1.0');
            }
        }
    }, [isOpened, editItem, activeTab]);

    const handleFormSubmit = async () => {
        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim();

        if (!cleanCode) {
            Alert.alert('Validation Error', 'Code is required.');
            return;
        }

        const maxCodeLen = activeTab === 'classes' ? 1 : 3;
        if (cleanCode.length > maxCodeLen) {
            Alert.alert('Validation Error', `Code must be at most ${maxCodeLen} character${maxCodeLen > 1 ? 's' : ''}.`);
            return;
        }

        if (activeTab !== 'classes' && activeTab !== 'locations' && !cleanName) {
            Alert.alert('Validation Error', 'Name is required.');
            return;
        }

        if (activeTab === 'locations' && !province.trim()) {
            Alert.alert('Validation Error', 'Province is required.');
            return;
        }

        setIsSaving(true);
        try {
            const payload: any = {
                code: cleanCode,
                name: activeTab === 'classes' ? cleanName : (activeTab === 'locations' ? province.trim() : cleanName),
            };

            if (activeTab === 'scope') {
                payload.description = desc.trim();
            } else if (activeTab === 'typologies') {
                payload.complexityLevel = complexity;
                payload.parentId = editItem ? editItem.parentId : parentId;
            } else if (activeTab === 'disciplines') {
                payload.nameId = nameId.trim();
                payload.color = color;
            } else if (activeTab === 'classes') {
                payload.finishLevel = finishLevel.trim();
            } else if (activeTab === 'locations') {
                payload.province = province.trim();
                payload.city = city.trim();
                payload.regionalFactor = parseFloat(regionalFactor) || 1.0;
                payload.difficultyFactor = parseFloat(difficultyFactor) || 1.0;
            }

            const success = await onSave(payload);
            if (success) {
                onClose();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePress = () => {
        if (!editItem) return;
        onClose();
        
        const itemId = activeTab === 'scope' ? editItem.projectTypeId : editItem.id;
        const itemName = activeTab === 'scope' 
            ? editItem.name 
            : activeTab === 'classes' 
                ? (editItem.description || editItem.classCode) 
                : activeTab === 'locations'
                    ? (editItem.province + (editItem.city ? ` - ${editItem.city}` : ''))
                    : editItem.nameEn || editItem.name;

        setTimeout(() => {
            onDelete(itemId, itemName);
        }, 400);
    };

    const tabLabel = activeTab === 'scope' 
        ? 'Scope' 
        : activeTab === 'typologies' 
            ? 'Typology' 
            : activeTab === 'disciplines' 
                ? 'Discipline' 
                : activeTab === 'classes'
                    ? 'Class'
                    : 'Location Factor';

    return (
        <Modal
            visible={isOpened}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: modalOverlayColor }]}>
                <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
                    <View style={styles.modalHeaderRow}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>
                            {editItem ? 'Edit' : 'Add'} {tabLabel}
                        </Text>
                        <TouchableOpacity onPress={onClose} disabled={isSaving}>
                            <Ionicons name="close" size={24} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                        {/* Code Input */}
                        <Text style={[styles.inputLabel, { color: textColor }]}>
                            {activeTab === 'classes' ? 'Class Code (1 Char)' : 'Code (3 Chars)'}
                        </Text>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                            value={code}
                            onChangeText={setCode}
                            maxLength={activeTab === 'classes' ? 1 : 3}
                            autoCapitalize="characters"
                            placeholder={activeTab === 'classes' ? 'e.g. A' : 'e.g. ARC'}
                            placeholderTextColor={subtextColor}
                            editable={!isSaving}
                        />

                        {/* Name Input */}
                        {activeTab !== 'classes' && (
                            <>
                                <Text style={[styles.inputLabel, { color: textColor }]}>
                                    {activeTab === 'disciplines' ? 'Name (English)' : 'Name'}
                                </Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter name"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />
                            </>
                        )}

                        {/* Indonesian Name Input for Discipline */}
                        {activeTab === 'disciplines' && (
                            <>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Name (Indonesia)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={nameId}
                                    onChangeText={setNameId}
                                    placeholder="Enter Indonesian name"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />
                            </>
                        )}

                        {/* Finish Level Input for Class */}
                        {activeTab === 'classes' && (
                            <>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Class Name (Description)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="e.g. Luxury"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Finish Level</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={finishLevel}
                                    onChangeText={setFinishLevel}
                                    placeholder="e.g. High End"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />
                            </>
                        )}

                        {/* Location Factors Inputs */}
                        {activeTab === 'locations' && (
                            <>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Province</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={province}
                                    onChangeText={setProvince}
                                    placeholder="e.g. DKI Jakarta, Bali, Jawa Barat"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>City (Optional)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={city}
                                    onChangeText={setCity}
                                    placeholder="e.g. Jakarta Selatan, Bandung"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.inputLabel, { color: textColor }]}>Regional Factor</Text>
                                        <TextInput
                                            style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                            value={regionalFactor}
                                            onChangeText={setRegionalFactor}
                                            placeholder="1.0"
                                            placeholderTextColor={subtextColor}
                                            keyboardType="decimal-pad"
                                            editable={!isSaving}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.inputLabel, { color: textColor }]}>Difficulty Factor</Text>
                                        <TextInput
                                            style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                            value={difficultyFactor}
                                            onChangeText={setDifficultyFactor}
                                            placeholder="1.0"
                                            placeholderTextColor={subtextColor}
                                            keyboardType="decimal-pad"
                                            editable={!isSaving}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Description (Scope only) */}
                        {activeTab === 'scope' && (
                            <>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Description (Optional)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor, height: 80 }]}
                                    value={desc}
                                    onChangeText={setDesc}
                                    multiline={true}
                                    placeholder="Enter description"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />
                            </>
                        )}

                        {/* Complexity Selector (Typology only) */}
                        {activeTab === 'typologies' && (
                            <>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Complexity Level</Text>
                                <View style={styles.pickerSelectorContainer}>
                                    {['Low', 'Medium', 'High'].map(level => {
                                        const isSel = complexity === level;
                                        return (
                                            <TouchableOpacity
                                                key={level}
                                                onPress={() => setComplexity(level)}
                                                disabled={isSaving}
                                                style={[
                                                    styles.pickerOptionPill,
                                                    {
                                                        backgroundColor: isSel
                                                            ? '#007AFF'
                                                            : (isDark ? '#2C2C2E' : '#F2F2F7'),
                                                    }
                                                ]}
                                            >
                                                <Text style={[styles.pickerOptionText, { color: isSel ? '#FFFFFF' : textColor }]}>
                                                    {level}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* Color Tag Selector (Discipline only) */}
                        {activeTab === 'disciplines' && (
                            <>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Color Tag</Text>
                                <View style={styles.colorPillsGrid}>
                                    {PASTEL_COLORS.map(c => {
                                        const hex = COLOR_MAP[c];
                                        const isSelected = color === c;
                                        return (
                                            <TouchableOpacity
                                                key={c}
                                                disabled={isSaving}
                                                style={[
                                                    styles.colorPillCircle,
                                                    {
                                                        backgroundColor: hex,
                                                        borderColor: isSelected ? textColor : 'transparent',
                                                        borderWidth: isSelected ? 2 : 0,
                                                    }
                                                ]}
                                                onPress={() => setColor(c)}
                                            />
                                        );
                                    })}
                                </View>
                            </>
                        )}

                    </ScrollView>

                    {/* Destructive Delete Button */}
                    {editItem && (
                        <TouchableOpacity
                            style={[styles.deleteButton, { borderColor: '#FF3B30' }]}
                            onPress={handleDeletePress}
                            disabled={isSaving}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                            <Text style={styles.deleteButtonText}>Delete {tabLabel}</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.modalActionsRow}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton, { borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                            onPress={onClose}
                            disabled={isSaving}
                        >
                            <Text style={[styles.modalButtonText, { color: textColor }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.submitButton]}
                            onPress={handleFormSubmit}
                            disabled={isSaving}
                        >
                            <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                                {isSaving ? 'Saving...' : (editItem ? 'Save' : 'Add')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        maxHeight: '90%',
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    modalScrollBody: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    textInput: {
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 4,
    },
    pickerSelectorContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        marginBottom: 8,
    },
    pickerOptionPill: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    colorPillsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 4,
        marginBottom: 12,
    },
    colorPillCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderWidth: 1.5,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 16,
    },
    deleteButtonText: {
        color: '#FF3B30',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 15,
    },
    modalActionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    submitButton: {
        backgroundColor: '#007AFF',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
