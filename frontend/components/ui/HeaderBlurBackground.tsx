import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface HeaderBlurBackgroundProps {
  isDark?: boolean;
  height?: number;
}

export function HeaderBlurBackground({ isDark = false }: HeaderBlurBackgroundProps) {
  const tint = Platform.OS === 'ios'
    ? (isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight')
    : (isDark ? 'dark' : 'light');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurView
        intensity={80}
        tint={tint as any}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

