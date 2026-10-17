import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ZoomableImageProps {
    uri: string;
    width?: number;
    height?: number;
    onZoomChange?: (isZoomed: boolean) => void;
    onTap?: () => void;
}

export function ZoomableImage({
    uri,
    width = SCREEN_WIDTH,
    height = SCREEN_HEIGHT * 0.72,
    onZoomChange,
    onTap,
}: ZoomableImageProps) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const notifyZoom = (zoomed: boolean) => {
        if (onZoomChange) onZoomChange(zoomed);
    };

    const notifyTap = () => {
        if (onTap) onTap();
    };

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            const nextScale = Math.min(Math.max(savedScale.value * e.scale, 0.8), 5);
            scale.value = nextScale;
            if (nextScale > 1.05) {
                runOnJS(notifyZoom)(true);
            }
        })
        .onEnd(() => {
            if (scale.value < 1.05) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(notifyZoom)(false);
            } else {
                savedScale.value = scale.value;
                runOnJS(notifyZoom)(true);
            }
        });

    const panGesture = Gesture.Pan()
        .minPointers(1)
        .maxPointers(2)
        .onUpdate((e) => {
            if (scale.value > 1.05) {
                const maxTranslateX = (width * (scale.value - 1)) / 2;
                const maxTranslateY = (height * (scale.value - 1)) / 2;
                const nextX = savedTranslateX.value + e.translationX;
                const nextY = savedTranslateY.value + e.translationY;
                translateX.value = Math.min(Math.max(nextX, -maxTranslateX * 1.3), maxTranslateX * 1.3);
                translateY.value = Math.min(Math.max(nextY, -maxTranslateY * 1.3), maxTranslateY * 1.3);
            }
        })
        .onEnd(() => {
            if (scale.value > 1.05) {
                const maxTranslateX = (width * (scale.value - 1)) / 2;
                const maxTranslateY = (height * (scale.value - 1)) / 2;
                translateX.value = withSpring(Math.min(Math.max(translateX.value, -maxTranslateX), maxTranslateX));
                translateY.value = withSpring(Math.min(Math.max(translateY.value, -maxTranslateY), maxTranslateY));
                savedTranslateX.value = translateX.value;
                savedTranslateY.value = translateY.value;
            } else {
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            }
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1.1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(notifyZoom)(false);
            } else {
                scale.value = withSpring(2.8);
                savedScale.value = 2.8;
                runOnJS(notifyZoom)(true);
            }
        });

    const singleTapGesture = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
            runOnJS(notifyTap)();
        });

    const composedGesture = Gesture.Simultaneous(
        pinchGesture,
        Gesture.Race(doubleTapGesture, singleTapGesture, panGesture)
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.container, { width, height }]}>
                <Animated.Image
                    source={{ uri }}
                    style={[{ width, height }, animatedStyle]}
                    resizeMode="contain"
                />
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
});
