import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { ProjectTypeTemplate } from '@/lib/api/templates';

export interface SwiftUIScopePickerSheetProps {
    isOpened: boolean;
    onClose: () => void;
    scopes: ProjectTypeTemplate[];
    selectedScope: ProjectTypeTemplate | null;
    onSelectScope: (scope: ProjectTypeTemplate) => void;
}

export const SwiftUIScopePickerSheet: React.FC<SwiftUIScopePickerSheetProps> = ({
    isOpened,
    onClose,
    scopes,
    selectedScope,
    onSelectScope,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';

    return (
        <Modal
            visible={isOpened}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    entering={FadeInDown.duration(250)}
                    style={[styles.scopePickerSheet, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                >
                    {/* Drag Indicator */}
                    <View style={styles.pickerSheetDragHandle} />

                    <View style={styles.pickerSheetHeader}>
                        <View style={{ width: 44 }} />
                        <Text style={[styles.pickerSheetTitle, { color: textColor }]}>Select Scope</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <Ionicons name="close" size={18} color={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ maxHeight: 350 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[
                            styles.pickerGroupedList,
                            {
                                backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                            }
                        ]}>
                            {scopes.map((sc, scIdx) => {
                                const isSelected = selectedScope?.projectTypeId === sc.projectTypeId;
                                const isLast = scIdx === scopes.length - 1;
                                return (
                                    <TouchableOpacity
                                        key={sc.id}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            onSelectScope(sc);
                                            onClose();
                                        }}
                                        style={[
                                            styles.pickerSheetOption,
                                            !isLast && {
                                                borderBottomWidth: 0.5,
                                                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                                            }
                                        ]}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                            {/* Scope Code Badge (Pill) */}
                                            <View style={[
                                                styles.codeBadge,
                                                { backgroundColor: isSelected ? '#FF3B30' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') }
                                            ]}>
                                                <Text style={[
                                                    styles.codeBadgeText,
                                                    { color: isSelected ? '#FFFFFF' : textColor }
                                                ]}>
                                                    {sc.code || ''}
                                                </Text>
                                            </View>
                                            
                                            <Text style={[styles.pickerOptionNameText, { color: isSelected ? '#FF3B30' : textColor }]}>
                                                {sc.name}
                                            </Text>
                                        </View>
                                        {isSelected && <Ionicons name="checkmark" size={20} color="#FF3B30" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    scopePickerSheet: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 34,
        paddingHorizontal: 20,
    },
    pickerSheetDragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(120, 120, 128, 0.3)',
        alignSelf: 'center',
        marginTop: 8,
    },
    pickerSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    pickerSheetTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    pickerGroupedList: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
    },
    pickerSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    codeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    codeBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    pickerOptionNameText: {
        fontSize: 15,
        fontWeight: '500',
    }
});
