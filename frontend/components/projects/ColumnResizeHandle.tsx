import React, { useRef } from 'react';
import { PanResponder, View } from 'react-native';
export function ColumnResizeHandle({ width, onChange }: { width: number; onChange: (width: number) => void }) {
    const current = useRef({ width, onChange }); current.current = { width, onChange };
    const start = useRef(width);
    const responder = useRef(PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: () => { start.current = current.current.width; }, onPanResponderMove: (_, gesture) => current.current.onChange(Math.round(Math.max(55, Math.min(1000, start.current + gesture.dx)))) })).current;
    return <View {...responder.panHandlers} accessibilityLabel="Drag to resize column" style={{ position: 'absolute', right: -5, top: 0, bottom: 0, width: 10, zIndex: 2 }} />;
}
