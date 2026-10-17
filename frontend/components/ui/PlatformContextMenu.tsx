import React, { useState } from 'react';
import {
    Platform,
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    TouchableWithoutFeedback,
    ScrollView,
    ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTheme } from '@/context/ThemeContext';

export interface ContextMenuAction {
    title: string;
    subtitle?: string;
    systemIcon?: string;
    icon?: string;
    destructive?: boolean;
    disabled?: boolean;
    inlineChildren?: boolean;
    actions?: ContextMenuAction[];
    state?: 'on' | 'off' | 'mixed';
    selected?: boolean;
}

export interface ContextMenuProps {
    title?: string;
    actions?: ContextMenuAction[];
    onPress?: (e: { nativeEvent: { index: number; name: string } }) => void;
    onCancel?: () => void;
    previewBackgroundColor?: string;
    dropdownMenuMode?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    children?: React.ReactNode;
}

let NativeContextMenu: any = null;
if (Platform.OS === 'ios') {
    try {
        NativeContextMenu = require('react-native-context-menu-view').default;
    } catch (e) {
        NativeContextMenu = null;
    }
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EXTENDED_EMOJIS = [
    '👍', '❤️', '😂', '😮', '😢', '🙏',
    '🔥', '🎉', '👏', '💯', '👀', '🚀',
    '🤔', '💡', '🤝', '🎯', '⭐', '✨',
    '💪', '🥳', '🙌', '😍', '🤩', '😎',
    '🫡', '🏗️', '✅', '⚠️', '❌', '📌'
];

export function PlatformContextMenu({
    title,
    actions = [],
    onPress,
    onCancel,
    previewBackgroundColor,
    dropdownMenuMode,
    disabled = false,
    style,
    children,
    ...props
}: ContextMenuProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [isAndroidMenuVisible, setIsAndroidMenuVisible] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState<{ title: string; actions: ContextMenuAction[] } | null>(null);
    const [showMoreEmojis, setShowMoreEmojis] = useState(false);

    if (Platform.OS === 'ios' && NativeContextMenu) {
        return (
            <NativeContextMenu
                title={title}
                actions={actions}
                onPress={onPress}
                onCancel={onCancel}
                previewBackgroundColor={previewBackgroundColor}
                dropdownMenuMode={dropdownMenuMode}
                disabled={disabled}
                style={style}
                {...props}
            >
                {children}
            </NativeContextMenu>
        );
    }

    if (Platform.OS === 'web' && dropdownMenuMode) {
        return (
            <View style={[{ position: 'relative' }, style]}>
                {children}
                {!disabled && (
                    <select
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer',
                            zIndex: 99,
                            border: 'none',
                            outline: 'none',
                        }}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val.includes('-')) {
                                const [parentIdx, childIdx] = val.split('-').map((n) => parseInt(n, 10));
                                const parentAct = actions[parentIdx];
                                const subAct = parentAct?.actions?.[childIdx];
                                if (subAct) {
                                    onPress?.({ nativeEvent: { index: childIdx, name: subAct.title } });
                                }
                            } else {
                                const index = parseInt(val, 10);
                                if (!isNaN(index) && actions[index]) {
                                    onPress?.({ nativeEvent: { index, name: actions[index].title } });
                                }
                            }
                            e.target.value = '';
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>
                            {title || 'Select option'}
                        </option>
                        {actions.map((act, i) => {
                            if (act.actions && act.actions.length > 0) {
                                return (
                                    <optgroup key={i} label={act.title}>
                                        {act.actions.map((subAct, subI) => (
                                            <option key={`${i}-${subI}`} value={`${i}-${subI}`} disabled={subAct.disabled}>
                                                {subAct.subtitle ? `[${subAct.subtitle}] ${subAct.title}` : subAct.title}
                                            </option>
                                        ))}
                                    </optgroup>
                                );
                            }
                            return (
                                <option key={i} value={i} disabled={act.disabled}>
                                    {act.subtitle ? `[${act.subtitle}] ${act.title}` : act.title}
                                </option>
                            );
                        })}
                    </select>
                )}
            </View>
        );
    }

    // Android Context Menu Sheet
    const handleOpenMenu = () => {
        if (disabled || !actions || actions.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActiveSubmenu(null);
        setShowMoreEmojis(false);
        setIsAndroidMenuVisible(true);
    };

    const handleSelectAction = (actionTitle: string, index: number) => {
        Haptics.selectionAsync();
        setIsAndroidMenuVisible(false);
        setActiveSubmenu(null);
        setShowMoreEmojis(false);
        onPress?.({ nativeEvent: { index, name: actionTitle } });
    };

    const handleSelectEmoji = (emoji: string) => {
        Haptics.selectionAsync();
        setIsAndroidMenuVisible(false);
        setActiveSubmenu(null);
        setShowMoreEmojis(false);
        onPress?.({ nativeEvent: { index: 0, name: emoji } });
    };

    const handleClose = () => {
        setIsAndroidMenuVisible(false);
        setActiveSubmenu(null);
        setShowMoreEmojis(false);
        onCancel?.();
    };

    // Flatten / extract actions
    const currentActions = activeSubmenu ? activeSubmenu.actions : actions.filter(a => !a.disabled);
    const reactionsSubmenu = actions.find(a => a.title.includes('React') || a.title.includes('Reaction'));

    const attachLongPress = (element: React.ReactNode): React.ReactNode => {
        if (!React.isValidElement(element)) return element;
        const childProps: any = (element as any).props || {};
        
        let newChildren = childProps.children;
        if (React.Children.count(childProps.children) > 0) {
            newChildren = React.Children.map(childProps.children, (child) => attachLongPress(child));
        }

        const isTouchableComponent =
            childProps.onPress !== undefined ||
            childProps.onLongPress !== undefined ||
            childProps.activeOpacity !== undefined ||
            childProps.delayLongPress !== undefined ||
            element.type === TouchableOpacity ||
            element.type === TouchableWithoutFeedback ||
            (element.type as any)?.name === 'TouchableOpacity' ||
            (element.type as any)?.displayName === 'TouchableOpacity' ||
            (element.type as any)?.displayName === 'Pressable';

        if (isTouchableComponent) {
            return React.cloneElement(element as React.ReactElement<any>, {
                ...childProps,
                onLongPress: (e: any) => {
                    if (typeof childProps.onLongPress === 'function') {
                        childProps.onLongPress(e);
                    }
                    handleOpenMenu();
                },
                delayLongPress: childProps.delayLongPress || 280,
                children: newChildren,
            });
        }

        return React.cloneElement(element as React.ReactElement<any>, {
            ...childProps,
            children: newChildren,
        });
    };

    const renderAndroidContent = () => {
        if (dropdownMenuMode) {
            return (
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleOpenMenu}
                    disabled={disabled}
                    style={{ width: '100%', height: '100%' }}
                >
                    <View pointerEvents="box-only" style={{ width: '100%', height: '100%' }}>
                        {children}
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                activeOpacity={1}
                onLongPress={handleOpenMenu}
                delayLongPress={280}
                disabled={disabled}
                style={{ width: '100%', height: '100%' }}
            >
                {attachLongPress(children)}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[{ position: 'relative' }, style]}>
            {renderAndroidContent()}

            {/* Android & Web Native-Style Context Menu Sheet */}
            <Modal
                visible={isAndroidMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={handleClose}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.modalBackdrop}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContentWrapper}>
                                {/* 1. Distinct Floating Quick Reactions Pill */}
                                {reactionsSubmenu && !activeSubmenu && (
                                    <View style={[
                                        styles.reactionPillCard,
                                        {
                                            backgroundColor: isDark ? 'rgba(30, 30, 32, 0.96)' : '#FFFFFF',
                                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                                        }
                                    ]}>
                                        {!showMoreEmojis ? (
                                            <View style={styles.reactionRow}>
                                                {QUICK_EMOJIS.map((emoji) => (
                                                    <TouchableOpacity
                                                        key={emoji}
                                                        activeOpacity={0.7}
                                                        style={styles.reactionBtn}
                                                        onPress={() => handleSelectEmoji(emoji)}
                                                    >
                                                        <Text style={styles.reactionEmojiText}>{emoji}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                                <View style={[styles.reactionDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' }]} />
                                                <TouchableOpacity
                                                    activeOpacity={0.7}
                                                    style={[
                                                        styles.reactionPlusBtn,
                                                        {
                                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                                        }
                                                    ]}
                                                    onPress={() => setShowMoreEmojis(true)}
                                                >
                                                    <PlatformIcon
                                                        name="plus"
                                                        size={16}
                                                        tintColor={isDark ? '#A1A1A6' : '#64748B'}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={styles.extendedReactionContainer}>
                                                <View style={styles.extendedReactionHeader}>
                                                    <Text style={[styles.extendedReactionTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                                        Reactions
                                                    </Text>
                                                    <TouchableOpacity
                                                        activeOpacity={0.7}
                                                        onPress={() => setShowMoreEmojis(false)}
                                                        style={styles.extendedReactionCloseBtn}
                                                    >
                                                        <PlatformIcon name="xmark" size={13} tintColor={isDark ? '#8E8E93' : '#64748B'} />
                                                    </TouchableOpacity>
                                                </View>
                                                <ScrollView
                                                    style={{ maxHeight: 150 }}
                                                    contentContainerStyle={styles.extendedEmojiGrid}
                                                    showsVerticalScrollIndicator={false}
                                                >
                                                    {EXTENDED_EMOJIS.map((emoji, eIdx) => (
                                                        <TouchableOpacity
                                                            key={eIdx}
                                                            activeOpacity={0.7}
                                                            style={styles.reactionBtn}
                                                            onPress={() => handleSelectEmoji(emoji)}
                                                        >
                                                            <Text style={styles.reactionEmojiText}>{emoji}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* 2. Main Context Menu Actions Card */}
                                <View style={[
                                    styles.menuContainer,
                                    {
                                        backgroundColor: isDark ? 'rgba(30, 30, 32, 0.96)' : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                                    }
                                ]}>
                                    {/* Title Header */}
                                    {title && !activeSubmenu && (
                                        <View style={[
                                            styles.titleHeader,
                                            {
                                                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                                            }
                                        ]}>
                                            <Text style={[styles.menuTitleText, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={1}>
                                                {title}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Header / Submenu Back */}
                                    {activeSubmenu && (
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            style={[styles.submenuHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}
                                            onPress={() => setActiveSubmenu(null)}
                                        >
                                            <PlatformIcon name="chevron.left" size={16} tintColor={isDark ? '#8E8E93' : '#636366'} />
                                            <Text style={[styles.submenuTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>{activeSubmenu.title}</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Action List */}
                                    <ScrollView style={{ maxHeight: 360 }} bounces={false}>
                                        {currentActions.map((action, idx) => {
                                            if (action.title.includes('React') && !activeSubmenu) return null;
                                            const isDestructive = !!action.destructive || !!(action as any).attributes?.destructive;
                                            const hasChildren = action.actions && action.actions.length > 0;
                                            const isSelected = action.state === 'on' || (action as any).selected === true;

                                            return (
                                                <React.Fragment key={`${action.title}-${idx}`}>
                                                    {idx > 0 && (
                                                        <View
                                                            style={[
                                                                styles.insetDivider,
                                                                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }
                                                            ]}
                                                        />
                                                    )}
                                                    <TouchableOpacity
                                                        activeOpacity={0.7}
                                                        style={styles.actionRow}
                                                        onPress={() => {
                                                            if (hasChildren) {
                                                                setActiveSubmenu({ title: action.title, actions: action.actions! });
                                                            } else {
                                                                handleSelectAction(action.title, idx);
                                                            }
                                                        }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                            {isSelected && (
                                                                <PlatformIcon
                                                                    name="checkmark"
                                                                    size={15}
                                                                    tintColor={isDark ? '#0A84FF' : '#007AFF'}
                                                                />
                                                            )}
                                                            <Text style={[
                                                                styles.actionText,
                                                                { color: isDestructive ? '#FF453A' : (isSelected ? (isDark ? '#0A84FF' : '#007AFF') : (isDark ? '#FFFFFF' : '#000000')) }
                                                            ]}>
                                                                {action.title}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.actionTrailing}>
                                                            {action.systemIcon && (
                                                                <PlatformIcon
                                                                    name={action.systemIcon as any}
                                                                    size={18}
                                                                    tintColor={isDestructive ? '#FF453A' : (isSelected ? (isDark ? '#0A84FF' : '#007AFF') : (isDark ? '#8E8E93' : '#636366'))}
                                                                />
                                                            )}
                                                            {hasChildren && (
                                                                <PlatformIcon
                                                                    name="chevron.right"
                                                                    size={14}
                                                                    tintColor={isDark ? '#8E8E93' : '#636366'}
                                                                />
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                </React.Fragment>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    modalContentWrapper: {
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
    },
    reactionPillCard: {
        width: '100%',
        borderRadius: 26,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginBottom: 10,
        borderWidth: 1,
        elevation: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        } : {}),
    },
    reactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    reactionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionEmojiText: {
        fontSize: 22,
    },
    reactionDivider: {
        width: StyleSheet.hairlineWidth,
        height: 20,
        marginHorizontal: 4,
    },
    reactionPlusBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    extendedReactionContainer: {
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    extendedReactionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    extendedReactionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    extendedReactionCloseBtn: {
        padding: 4,
    },
    extendedEmojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
        paddingVertical: 4,
    },
    menuContainer: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        elevation: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        } : {}),
    },
    submenuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    submenuTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    titleHeader: {
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuTitleText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    insetDivider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    actionTrailing: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
});

export default PlatformContextMenu;
