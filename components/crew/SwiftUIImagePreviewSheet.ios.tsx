import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { Host, BottomSheet, HStack, VStack, Spacer, Button, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { padding, background } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SwiftUIImagePreviewSheetProps {
    isOpened: boolean;
    onClose: () => void;
    imageUrl: string | null;
    title?: string;
}

export const SwiftUIImagePreviewSheet: React.FC<SwiftUIImagePreviewSheetProps> = ({
    isOpened,
    onClose,
    imageUrl,
    title = 'Attachment Preview',
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const sheetBg = 'clear';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[background(sheetBg)]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={20} weight="bold" color={textColor}>
                            {title}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Image Content */}
                    <View style={styles.imageContainer}>
                        {imageUrl && (
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </VStack>
            </BottomSheet>
        </Host>
    );
};

const styles = StyleSheet.create({
    imageContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.72,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
});
