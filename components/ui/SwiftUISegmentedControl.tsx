import React from 'react';
import { SegmentedControl, Segment } from './SegmentedControl';
import { StyleProp, ViewStyle } from 'react-native';

interface SwiftUISegmentedControlProps {
    segments: Segment[];
    activeSegment: string;
    onSegmentChange: (id: string) => void;
    style?: StyleProp<ViewStyle>;
    fullWidth?: boolean;
    equalWidth?: boolean;
}

export function SwiftUISegmentedControl(props: SwiftUISegmentedControlProps) {
    return <SegmentedControl {...props} />;
}
