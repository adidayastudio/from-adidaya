import { FormaBlue } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { BouncyGlassButton } from './BouncyGlassButton';
import { NativeToolbarButton } from '@/modules/native-toolbar-button';

export interface HeaderToolbarAction {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    image?: string; // native iOS icon name (SF Symbol)
    title?: string; // used for context menu
    onPress?: () => void;
    isDestructive?: boolean;
    tintColor?: string;
    badge?: number; // notification badge count
    isPrimary?: boolean; // prominent primary blue button styling
    buttonStyle?: ViewStyle;
    menuActions?: ContextMenuAction[];
    onMenuPress?: (e: { nativeEvent: { index: number; name: string } }) => void;
}

interface HeaderToolbarProps {
    actions: HeaderToolbarAction[];
    isDark?: boolean;
    textColor?: string;
    menuIcon?: keyof typeof Ionicons.glyphMap;
    menuSymbol?: string;
    maxDirectActions?: number;
    customMenuTrigger?: (layout: { x: number, y: number, width: number, height: number }) => void;
    primaryActionColor?: string;
    primaryActionBgColor?: string;
    primaryActionTextColor?: string;
    primaryActionShadow?: boolean;
}

export function HeaderToolbar({
    actions,
    isDark = false,
    textColor = '#FFFFFF',
    menuIcon = 'ellipsis-horizontal',
    menuSymbol,
    maxDirectActions = 4,
    customMenuTrigger,
    primaryActionColor,
    primaryActionBgColor,
    primaryActionTextColor,
    primaryActionShadow = true,
}: HeaderToolbarProps) {
    const menuButtonRef = React.useRef<View>(null);
    if (!actions || actions.length === 0) return null;

    const directActions = actions.slice(0, maxDirectActions);
    const menuActions = actions.slice(maxDirectActions);
    const totalButtonsCount = directActions.length + (menuActions.length > 0 ? 1 : 0);
    const containerWidth = totalButtonsCount > 0 ? (totalButtonsCount * 40 + (totalButtonsCount - 1) * 8) : undefined;

    const showMenu = () => {
        if (customMenuTrigger) {
            menuButtonRef.current?.measureInWindow((x, y, width, height) => {
                customMenuTrigger({ x, y, width, height });
            });
            return;
        }

        if (Platform.OS === 'ios') {
            const options = ['Cancel', ...menuActions.map(a => a.title || a.id)];
            const destructiveButtonIndex = menuActions.findIndex(a => a.isDestructive);

            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex + 1 : undefined,
                    userInterfaceStyle: isDark ? 'dark' : 'light',
                },
                (buttonIndex) => {
                    if (buttonIndex > 0) {
                        const action = menuActions[buttonIndex - 1];
                        if (action && action.onPress) {
                            action.onPress();
                        }
                    }
                }
            );
        } else {
            const buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[] = menuActions.map(a => ({
                text: a.title || a.id,
                onPress: () => a.onPress && a.onPress(),
                style: a.isDestructive ? 'destructive' : 'default',
            }));
            buttons.push({ text: 'Cancel', style: 'cancel', onPress: () => {} });
            Alert.alert('Options', undefined, buttons, { cancelable: true });
        }
    };

    const isWeb = Platform.OS === 'web';

    const isAddOrPrimaryAction = (a: HeaderToolbarAction) => {
        return Boolean(
            a.isPrimary ||
            a.id === 'add' ||
            a.id === 'create' ||
            a.id === 'new' ||
            a.id === 'plus' ||
            a.id.startsWith('add_') ||
            a.id.startsWith('create_') ||
            a.image === 'plus' ||
            a.image === 'plus.circle' ||
            a.image === 'plus.circle.fill' ||
            a.icon === 'add' ||
            a.icon === 'add-outline' ||
            a.icon === 'add-circle' ||
            a.icon === 'add-circle-outline'
        );
    };

    const primaryAction = isWeb ? directActions.find(isAddOrPrimaryAction) : null;
    const standardActions = isWeb && primaryAction 
        ? directActions.filter(a => a.id !== primaryAction.id)
        : directActions;

    const isSingleStandard = isWeb && (standardActions.length + (menuActions.length > 0 ? 1 : 0) === 1);

    const renderActionItem = (action: HeaderToolbarAction, index: number, isStandalonePrimary: boolean = false) => {
        const primaryBg = primaryActionBgColor || primaryActionColor || '#007AFF';
        const actionTextColor = isStandalonePrimary 
            ? (primaryActionTextColor || '#FFFFFF')
            : (action.tintColor || (textColor !== '#FFFFFF' ? textColor : (isDark ? '#FFFFFF' : '#000000')));
        const hasMenu = Boolean(action.menuActions && action.menuActions.length > 0);
        
        const buttonContent = (
            <BouncyGlassButton
                onPress={hasMenu ? undefined : (action.onPress || (() => { }))}
                isDark={isDark}
                isPrimary={isStandalonePrimary}
                isMenuToggle={hasMenu}
                textColor={actionTextColor}
                style={[
                    action.buttonStyle, 
                    isWeb && (isStandalonePrimary 
                        ? [
                              styles.webStandalonePrimaryBtn,
                              { backgroundColor: primaryBg },
                              !primaryActionShadow && { boxShadow: 'none', shadowOpacity: 0, elevation: 0 },
                          ]
                        : (isSingleStandard ? styles.webSingleCircleButton : styles.webInnerButton))
                ]}
            >
                {action.image ? (
                    <PlatformIcon
                        name={action.image as any}
                        size={18}
                        weight="medium"
                        tintColor={actionTextColor}
                        fallback={
                            <Ionicons
                                name={action.icon}
                                size={18}
                                color={actionTextColor}
                            />
                        }
                    />
                ) : (
                    <PlatformIcon
                        name={action.icon as any}
                        size={18}
                        weight="medium"
                        tintColor={actionTextColor}
                        fallback={
                            <Ionicons
                                name={action.icon}
                                size={18}
                                color={actionTextColor}
                            />
                        }
                    />
                )}
            </BouncyGlassButton>
        );

        return (
            <View key={action.id} style={[{ overflow: 'visible' }, !isWeb && index > 0 ? { marginLeft: 8 } : undefined]}>
                {action.menuActions && action.menuActions.length > 0 ? (
                    <ContextMenu
                        actions={action.menuActions}
                        onPress={action.onMenuPress}
                        dropdownMenuMode={true}
                    >
                        {buttonContent}
                    </ContextMenu>
                ) : (
                    buttonContent
                )}
                {action.badge != null && action.badge > 0 && (
                    <View style={badgeStyles.badge} pointerEvents="none">
                        <Text style={badgeStyles.badgeText}>
                            {action.badge > 9 ? '9+' : action.badge}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.rootWrapper} pointerEvents="box-none">
            {standardActions.length > 0 && (
                <View
                    style={[
                        styles.container,
                        isWeb && (
                            isSingleStandard
                                ? (isDark ? styles.singleCircleDark : styles.singleCircleLight)
                                : (isDark ? styles.pillContainerDark : styles.pillContainerLight)
                        ),
                        isWeb && headerSurfaceStyles[isDark ? "dark" : "light"],
                    ]}
                    pointerEvents="box-none"
                >
                    {standardActions.map((action, index) => renderActionItem(action, index, false))}

                    {menuActions.length > 0 && (
                        <View ref={menuButtonRef} style={!isWeb ? { marginLeft: 8 } : undefined}>
                            <BouncyGlassButton
                                onPress={showMenu}
                                isDark={isDark}
                                textColor={textColor}
                                style={isWeb && (isSingleStandard ? styles.webSingleCircleButton : styles.webInnerButton)}
                            >
                                {menuSymbol ? (
                                    <PlatformIcon name={menuSymbol as any} size={18} weight="medium" tintColor={textColor} />
                                ) : (
                                    <Ionicons name={menuIcon} size={18} color={textColor} />
                                )}
                            </BouncyGlassButton>
                        </View>
                    )}
                </View>
            )}

            {isWeb && primaryAction && (
                <View style={styles.standalonePrimaryWrapper}>
                    {renderActionItem(primaryAction, 0, true)}
                </View>
            )}
        </View>
    );
}

export const headerSurfaceStyles = StyleSheet.create({
 light: { backgroundColor: "rgba(255, 255, 255, 0.65)", borderWidth: 0, ...Platform.select({ web: { backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)" }, default: {} }) },
 dark: { backgroundColor: "rgba(255, 255, 255, 0.08)", borderWidth: 0, ...Platform.select({ web: { backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)" }, default: {} }) },
});

const styles = StyleSheet.create({
    rootWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'visible',
        height: 40,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'visible',
        height: 40,
    },
    singleCircleLight: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            },
            default: {},
        }),
    },
    singleCircleDark: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            },
            default: {},
        }),
    },
    pillContainerLight: {
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
        borderWidth: 0,
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            },
            default: {},
        }),
    },
    pillContainerDark: {
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 0,
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            },
            default: {},
        }),
    },
    webInnerButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'transparent',
    },
    webSingleCircleButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'transparent',
    },
    standalonePrimaryWrapper: {
        marginLeft: 8,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webStandalonePrimaryBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
            },
            default: {},
        }),
    },
});

const badgeStyles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
        zIndex: 10,
    },
    badgeText: {
        display: 'none',
    },
});
