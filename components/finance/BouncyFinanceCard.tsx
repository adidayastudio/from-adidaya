import React from 'react';
import type { ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export function BouncyFinanceCard({ style, children, ...props }: ViewProps) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const release = () => { scale.value = withSpring(1, { damping: 12, stiffness: 250 }); };
    return <Animated.View {...props} style={[style, animatedStyle]}
        onTouchStart={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onTouchEnd={release} onTouchCancel={release} onTouchMove={release}>
        {children}
    </Animated.View>;
}
