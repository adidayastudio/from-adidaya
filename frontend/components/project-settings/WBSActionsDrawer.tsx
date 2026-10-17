import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { WBSItem, WBSMode } from '@/lib/wbs-data/wbs.types';

export interface WBSActionsDrawerProps {
    visible: boolean;
    onClose: () => void;
    selectedNode: WBSItem | null;
    activeTab: WBSMode;
    addNode: (targetNodeId: string, position: 'ABOVE' | 'BELOW' | 'SUBWORK') => void;
    moveNode: (nodeId: string, direction: 'UP' | 'DOWN') => void;
    isFirstSibling: (node: WBSItem) => boolean;
    isLastSibling: (node: WBSItem) => boolean;
}

export const WBSActionsDrawer: React.FC<WBSActionsDrawerProps> = ({
    visible,
    onClose,
    selectedNode,
    activeTab,
    addNode,
    moveNode,
    isFirstSibling,
    isLastSibling
}) => {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const borderColor = isDark ? '#2C2C2E' : '#E5E5EA';

    if (!selectedNode) return null;

    const maxIndent = activeTab === 'BALLPARK' ? 1 : (activeTab === 'ESTIMATES' ? 2 : 4);
    const isSubworkDisabled = (selectedNode.indent_level ?? 0) >= maxIndent;
    const isMoveUpDisabled = isFirstSibling(selectedNode);
    const isMoveDownDisabled = isLastSibling(selectedNode);

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
                <View style={[styles.menuModalCard, { backgroundColor: cardBgColor, paddingBottom: insets.bottom + 16 }]}>
                    {/* Drag Handle to mimic native bottom sheet */}
                    <View style={[styles.sheetDragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />

                    <View style={styles.menuModalHeader}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={[styles.menuModalTitle, { color: textColor }]}>
                                WBS Actions
                            </Text>
                            <Text numberOfLines={1} style={[styles.menuModalSubtitle, { color: subtextColor }]}>
                                Configure node {selectedNode.code} • {selectedNode.nameEn || 'Unnamed'}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={onClose}
                            style={styles.closeButtonContainer}
                        >
                            <Ionicons name="close-circle" size={26} color={isDark ? '#3A3A3C' : '#E5E5EA'} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.menuModalOptions}>
                        {/* SECTION 1: INSERTION */}
                        <Text style={[styles.sheetSectionHeader, { color: subtextColor }]}>Structure Modifications</Text>
                        <View style={[styles.sheetGroup, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderColor }]}>
                            <TouchableOpacity
                                style={styles.sheetOption}
                                activeOpacity={0.7}
                                onPress={() => {
                                    addNode(selectedNode.id, 'ABOVE');
                                    onClose();
                                }}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#FF3B30' }]}>
                                    <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
                                </View>
                                <Text style={[styles.sheetOptionText, { color: textColor }]}>Add Above</Text>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#48484A' : '#C7C7CC'} />
                            </TouchableOpacity>

                            <View style={[styles.sheetDivider, { backgroundColor: borderColor }]} />

                            <TouchableOpacity
                                style={styles.sheetOption}
                                activeOpacity={0.7}
                                onPress={() => {
                                    addNode(selectedNode.id, 'BELOW');
                                    onClose();
                                }}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#FF9500' }]}>
                                    <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
                                </View>
                                <Text style={[styles.sheetOptionText, { color: textColor }]}>Add Below</Text>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#48484A' : '#C7C7CC'} />
                            </TouchableOpacity>

                            <View style={[styles.sheetDivider, { backgroundColor: borderColor }]} />

                            {isSubworkDisabled ? (
                                <View style={[styles.sheetOption, styles.menuOptionDisabled]}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#AEAEB2' }]}>
                                        <Ionicons name="enter" size={16} color="#FFFFFF" />
                                    </View>
                                    <Text style={[styles.sheetOptionText, { color: subtextColor }]}>Add Subwork (Max Level Reached)</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.sheetOption}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        addNode(selectedNode.id, 'SUBWORK');
                                        onClose();
                                    }}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#34C759' }]}>
                                        <Ionicons name="enter" size={16} color="#FFFFFF" />
                                    </View>
                                    <Text style={[styles.sheetOptionText, { color: textColor }]}>Add Subwork</Text>
                                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#48484A' : '#C7C7CC'} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* SECTION 2: REORDERING */}
                        <Text style={[styles.sheetSectionHeader, { color: subtextColor }]}>Reordering</Text>
                        <View style={[styles.sheetGroup, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderColor }]}>
                            {isMoveUpDisabled ? (
                                <View style={[styles.sheetOption, styles.menuOptionDisabled]}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#AEAEB2' }]}>
                                        <Ionicons name="chevron-up" size={16} color="#FFFFFF" />
                                    </View>
                                    <Text style={[styles.sheetOptionText, { color: subtextColor }]}>Move Up (First Child)</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.sheetOption}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        moveNode(selectedNode.id, 'UP');
                                        onClose();
                                    }}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#007AFF' }]}>
                                        <Ionicons name="chevron-up" size={16} color="#FFFFFF" />
                                    </View>
                                    <Text style={[styles.sheetOptionText, { color: textColor }]}>Move Up</Text>
                                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#48484A' : '#C7C7CC'} />
                                </TouchableOpacity>
                            )}

                            <View style={[styles.sheetDivider, { backgroundColor: borderColor }]} />

                            {isMoveDownDisabled ? (
                                <View style={[styles.sheetOption, styles.menuOptionDisabled]}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#AEAEB2' }]}>
                                        <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                                    </View>
                                    <Text style={[styles.sheetOptionText, { color: subtextColor }]}>Move Down (Last Child)</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.sheetOption}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        moveNode(selectedNode.id, 'DOWN');
                                        onClose();
                                    }}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#007AFF' }]}>
                                        <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                                    </View>
                                    <Text style={[styles.sheetOptionText, { color: textColor }]}>Move Down</Text>
                                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#48484A' : '#C7C7CC'} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
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
    menuModalSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuModalOptions: {
        gap: 4,
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
        marginBottom: 6,
        marginLeft: 4,
        marginTop: 8,
    },
    sheetGroup: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 16,
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetOptionText: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 12,
        flex: 1,
    },
    sheetDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 56,
    },
    menuOptionDisabled: {
        opacity: 0.4,
    }
});
