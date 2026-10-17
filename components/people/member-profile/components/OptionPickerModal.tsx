import React, { useState, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Platform,
    useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

interface OptionPickerModalProps {
    visible: boolean;
    title: string;
    options: { id: string; name: string }[];
    selectedValue?: string;
    onSelect: (item: { id: string; name: string }) => void;
    onClose: () => void;
}

export const OptionPickerModal: React.FC<OptionPickerModalProps> = ({
    visible,
    title,
    options,
    selectedValue,
    onSelect,
    onClose,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 600;

    const [search, setSearch] = useState('');

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase().trim();
        return options.filter((o) => o.name.toLowerCase().includes(q));
    }, [options, search]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, isDesktop && styles.overlayDesktop]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <View style={styles.backdrop} />
                </TouchableOpacity>

                <GlassView
                    intensity={isDark ? 30 : 50}
                    style={[
                        styles.container,
                        isDesktop ? styles.containerDesktop : styles.containerMobile,
                        {
                            backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
                            borderColor,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>{title || 'Select Option'}</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[
                                styles.closeBtn,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                            ]}
                        >
                            <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Search if > 5 options */}
                    {options.length > 5 && (
                        <View
                            style={[
                                styles.searchBox,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    borderColor,
                                },
                            ]}
                        >
                            <PlatformIcon name="magnifyingglass" size={14} tintColor={subtextColor} />
                            <TextInput
                                style={[styles.searchInput, { color: textColor }]}
                                placeholder="Search..."
                                placeholderTextColor={subtextColor}
                                value={search}
                                onChangeText={setSearch}
                                autoCorrect={false}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
                                    <PlatformIcon name="xmark.circle.fill" size={14} tintColor={subtextColor} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* List */}
                    <ScrollView
                        style={styles.list}
                        contentContainerStyle={{ paddingVertical: 4 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {filteredOptions.length === 0 ? (
                            <View style={{ padding: 24, alignItems: 'center' }}>
                                <Text style={{ color: subtextColor, fontSize: 14 }}>No options found</Text>
                            </View>
                        ) : (
                            filteredOptions.map((item, idx) => {
                                const isSelected =
                                    selectedValue === item.id ||
                                    selectedValue?.toLowerCase() === item.name.toLowerCase() ||
                                    selectedValue === item.name;
                                return (
                                    <TouchableOpacity
                                        key={item.id || idx}
                                        style={[
                                            styles.optionRow,
                                            isSelected && {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,122,255,0.08)',
                                            },
                                        ]}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onSelect(item);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                { color: isSelected ? '#007AFF' : textColor, fontWeight: isSelected ? '600' : '400' },
                                            ]}
                                        >
                                            {item.name}
                                        </Text>
                                        {isSelected && (
                                            <PlatformIcon name="checkmark" size={15} tintColor="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                </GlassView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlayDesktop: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        borderWidth: 1,
        overflow: 'hidden',
    },
    containerMobile: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '75%',
        paddingBottom: 24,
    },
    containerDesktop: {
        borderRadius: 24,
        width: 420,
        maxHeight: 520,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 12,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        height: 38,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
    },
    list: {
        paddingHorizontal: 12,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        marginVertical: 1,
    },
    optionText: {
        fontSize: 15,
        flex: 1,
    },
});
