import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import React, { ReactNode } from 'react';
import { Segment } from './SegmentedControl';

interface SwipeTabWrapperProps {
    segments: Segment[];
    activeSegment: string;
    onSegmentChange: (id: string) => void;
    children: ReactNode;
}

export function SwipeTabWrapper({ segments, activeSegment, onSegmentChange, children }: SwipeTabWrapperProps) {
    const changeTab = (direction: 'left' | 'right') => {
        const currentIndex = segments.findIndex(s => s.id === activeSegment);
        if (direction === 'left' && currentIndex < segments.length - 1) {
            const nextSegment = segments[currentIndex + 1];
            if (!nextSegment.disabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSegmentChange(nextSegment.id);
            }
        } else if (direction === 'right' && currentIndex > 0) {
            const prevSegment = segments[currentIndex - 1];
            if (!prevSegment.disabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSegmentChange(prevSegment.id);
            }
        }
    };

    const swipeGesture = Gesture.Pan()
        .activeOffsetX([-40, 40])
        .failOffsetY([-40, 40])
        .onEnd((event) => {
            if (event.translationX < -60) {
                runOnJS(changeTab)('left');
            } else if (event.translationX > 60) {
                runOnJS(changeTab)('right');
            }
        });

    return (
        <GestureDetector gesture={swipeGesture}>
            {children}
        </GestureDetector>
    );
}
