import React from 'react';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Image,
    Button
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle } from '@expo/ui/swift-ui/modifiers';
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
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const groupBg = isDark ? '#2C2C2E' : '#F2F2F7';

    if (!selectedNode) return null;

    const maxIndent = activeTab === 'BALLPARK' ? 1 : (activeTab === 'ESTIMATES' ? 2 : 4);
    const isSubworkDisabled = (selectedNode.indent_level ?? 0) >= maxIndent;
    const isMoveUpDisabled = isFirstSibling(selectedNode);
    const isMoveDownDisabled = isLastSibling(selectedNode);

    const rowPadding = padding({ top: 10, bottom: 10, leading: 14, trailing: 14 });
    const circleIconModifiers = (color: string) => [
        frame({ width: 28, height: 28 }),
        background(color),
        cornerRadius(14)
    ];

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.48]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background('clear'),
                    frame({ maxWidth: Infinity }),
                    padding({ bottom: 20 })
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 44, leading: 20, trailing: 20, bottom: 16 })]}>
                        <SwiftUIText size={18} weight="bold" color={textColor}>
                            {`WBS Actions: ${selectedNode.code} • ${selectedNode.nameEn || 'Unnamed'}`}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Section 1: Modifications */}
                    <VStack spacing={6} alignment="leading" modifiers={[padding({ leading: 20, trailing: 20, bottom: 16 })]}>
                        <SwiftUIText size={11} weight="semibold" color={subtextColor} modifiers={[padding({ leading: 4 })]}>
                            STRUCTURE MODIFICATIONS
                        </SwiftUIText>
                        
                        <VStack spacing={0} modifiers={[background(groupBg), cornerRadius(12)]}>
                            {/* Add Above */}
                            <Button
                                onPress={() => {
                                    addNode(selectedNode.id, 'ABOVE');
                                    onClose();
                                }}
                                modifiers={[
                                    buttonStyle('plain'),
                                    frame({ maxWidth: Infinity })
                                ]}
                            >
                                <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                    <Image 
                                        systemName="arrow.up" 
                                        size={14} 
                                        color="#FFFFFF" 
                                        modifiers={circleIconModifiers('#FF3B30')} 
                                    />
                                    <SwiftUIText size={15} weight="medium" color={textColor}>
                                        Add Above
                                    </SwiftUIText>
                                    <Spacer />
                                    <Image systemName="chevron.right" size={14} color={isDark ? '#48484A' : '#C7C7CC'} />
                                </HStack>
                            </Button>

                            <VStack modifiers={[background(isDark ? '#3A3A3C' : '#E5E5EA'), frame({ height: 0.5 }), padding({ leading: 54 })]}>
                                <Spacer />
                            </VStack>

                            {/* Add Below */}
                            <Button
                                onPress={() => {
                                    addNode(selectedNode.id, 'BELOW');
                                    onClose();
                                }}
                                modifiers={[
                                    buttonStyle('plain'),
                                    frame({ maxWidth: Infinity })
                                ]}
                            >
                                <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                    <Image 
                                        systemName="arrow.down" 
                                        size={14} 
                                        color="#FFFFFF" 
                                        modifiers={circleIconModifiers('#FF9500')} 
                                    />
                                    <SwiftUIText size={15} weight="medium" color={textColor}>
                                        Add Below
                                    </SwiftUIText>
                                    <Spacer />
                                    <Image systemName="chevron.right" size={14} color={isDark ? '#48484A' : '#C7C7CC'} />
                                </HStack>
                            </Button>

                            <VStack modifiers={[background(isDark ? '#3A3A3C' : '#E5E5EA'), frame({ height: 0.5 }), padding({ leading: 54 })]}>
                                <Spacer />
                            </VStack>

                            {/* Add Subwork */}
                            {isSubworkDisabled ? (
                                <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                    <Image 
                                        systemName="arrow.right.to.line" 
                                        size={14} 
                                        color="#FFFFFF" 
                                        modifiers={circleIconModifiers('#AEAEB2')} 
                                    />
                                    <SwiftUIText size={15} weight="medium" color={subtextColor}>
                                        Add Subwork (Max Level Reached)
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            ) : (
                                <Button
                                    onPress={() => {
                                        addNode(selectedNode.id, 'SUBWORK');
                                        onClose();
                                    }}
                                    modifiers={[
                                        buttonStyle('plain'),
                                        frame({ maxWidth: Infinity })
                                    ]}
                                >
                                    <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                        <Image 
                                            systemName="arrow.right.to.line" 
                                            size={14} 
                                            color="#FFFFFF" 
                                            modifiers={circleIconModifiers('#34C759')} 
                                        />
                                        <SwiftUIText size={15} weight="medium" color={textColor}>
                                            Add Subwork
                                        </SwiftUIText>
                                        <Spacer />
                                        <Image systemName="chevron.right" size={14} color={isDark ? '#48484A' : '#C7C7CC'} />
                                    </HStack>
                                </Button>
                            )}
                        </VStack>
                    </VStack>

                    {/* Section 2: Reordering */}
                    <VStack spacing={6} alignment="leading" modifiers={[padding({ leading: 20, trailing: 20, bottom: 20 })]}>
                        <SwiftUIText size={11} weight="semibold" color={subtextColor} modifiers={[padding({ leading: 4 })]}>
                            REORDERING
                        </SwiftUIText>
                        
                        <VStack spacing={0} modifiers={[background(groupBg), cornerRadius(12)]}>
                            {/* Move Up */}
                            {isMoveUpDisabled ? (
                                <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                    <Image 
                                        systemName="chevron.up" 
                                        size={14} 
                                        color="#FFFFFF" 
                                        modifiers={circleIconModifiers('#AEAEB2')} 
                                    />
                                    <SwiftUIText size={15} weight="medium" color={subtextColor}>
                                        Move Up (First Child)
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            ) : (
                                <Button
                                    onPress={() => {
                                        moveNode(selectedNode.id, 'UP');
                                        onClose();
                                    }}
                                    modifiers={[
                                        buttonStyle('plain'),
                                        frame({ maxWidth: Infinity })
                                    ]}
                                >
                                    <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                        <Image 
                                            systemName="chevron.up" 
                                            size={14} 
                                            color="#FFFFFF" 
                                            modifiers={circleIconModifiers('#007AFF')} 
                                        />
                                        <SwiftUIText size={15} weight="medium" color={textColor}>
                                            Move Up
                                        </SwiftUIText>
                                        <Spacer />
                                        <Image systemName="chevron.right" size={14} color={isDark ? '#48484A' : '#C7C7CC'} />
                                    </HStack>
                                </Button>
                            )}

                            <VStack modifiers={[background(isDark ? '#3A3A3C' : '#E5E5EA'), frame({ height: 0.5 }), padding({ leading: 54 })]}>
                                <Spacer />
                            </VStack>

                            {/* Move Down */}
                            {isMoveDownDisabled ? (
                                <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                    <Image 
                                        systemName="chevron.down" 
                                        size={14} 
                                        color="#FFFFFF" 
                                        modifiers={circleIconModifiers('#AEAEB2')} 
                                    />
                                    <SwiftUIText size={15} weight="medium" color={subtextColor}>
                                        Move Down (Last Child)
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            ) : (
                                <Button
                                    onPress={() => {
                                        moveNode(selectedNode.id, 'DOWN');
                                        onClose();
                                    }}
                                    modifiers={[
                                        buttonStyle('plain'),
                                        frame({ maxWidth: Infinity })
                                    ]}
                                >
                                    <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                        <Image 
                                            systemName="chevron.down" 
                                            size={14} 
                                            color="#FFFFFF" 
                                            modifiers={circleIconModifiers('#007AFF')} 
                                        />
                                        <SwiftUIText size={15} weight="medium" color={textColor}>
                                            Move Down
                                        </SwiftUIText>
                                        <Spacer />
                                        <Image systemName="chevron.right" size={14} color={isDark ? '#48484A' : '#C7C7CC'} />
                                    </HStack>
                                </Button>
                            )}
                        </VStack>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
