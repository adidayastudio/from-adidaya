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
import { Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { StageTemplate } from '@/lib/api/templates';

export interface SwiftUIStagePickerSheetProps {
    isOpened: boolean;
    onClose: () => void;
    stages: StageTemplate[];
    selectedStage: StageTemplate | null;
    onSelectStage: (stage: StageTemplate) => void;
}

export const SwiftUIStagePickerSheet: React.FC<SwiftUIStagePickerSheetProps> = ({
    isOpened,
    onClose,
    stages,
    selectedStage,
    onSelectStage,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';

    // Calculate height dynamically to "fit to content"
    const screenHeight = Dimensions.get('window').height;
    const itemCount = stages.length || 4;
    const headerHeight = 50;
    const itemHeight = 44;
    const itemSpacing = 8;
    const listBottomPadding = 20;
    const bottomSafeArea = 34; // Manual safe area offset since we use ignoreSafeArea
    const calculatedHeight = headerHeight + (itemCount * itemHeight) + (Math.max(0, itemCount - 1) * itemSpacing) + listBottomPadding + bottomSafeArea;
    const detentFraction = Math.min(0.9, Math.max(0.15, calculatedHeight / screenHeight));

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[detentFraction]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'all' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 8, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={20} weight="bold" color={textColor}>
                            Select Stage
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Native SwiftUI List items inside a clean VStack */}
                    <VStack alignment="leading" spacing={8} modifiers={[
                        padding({ horizontal: 20, bottom: 20 }),
                        background('clear')
                    ]}>
                        {stages.map((st) => {
                            const isSelected = selectedStage?.id === st.id;
                            const activeBg = isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.08)';
                            return (
                                <Button
                                    key={st.id}
                                    onPress={() => {
                                        onSelectStage(st);
                                        onClose();
                                    }}
                                    modifiers={[
                                        buttonStyle('plain'),
                                        frame({ maxWidth: Infinity })
                                    ]}
                                >
                                    <HStack alignment="center" spacing={12} modifiers={[
                                        padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                        background(isSelected ? activeBg : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')),
                                        cornerRadius(10),
                                    ]}>
                                        {/* Stage Code Badge (Pill) */}
                                        <HStack alignment="center" modifiers={[
                                            padding({ horizontal: 10, vertical: 4 }),
                                            background(isSelected ? '#FF3B30' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')),
                                            cornerRadius(12)
                                        ]}>
                                            <SwiftUIText size={12} weight="bold" color={isSelected ? '#FFFFFF' : textColor}>
                                                {st.displayCode || st.stageCode || ''}
                                            </SwiftUIText>
                                        </HStack>

                                        {/* Stage Name */}
                                        <SwiftUIText size={15} weight="medium" color={isSelected ? '#FF3B30' : textColor}>
                                            {st.stageName}
                                        </SwiftUIText>

                                        <Spacer />

                                        {isSelected && (
                                            <Image systemName="checkmark" size={16} color="#FF3B30" />
                                        )}
                                    </HStack>
                                </Button>
                            );
                        })}
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
