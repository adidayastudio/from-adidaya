import * as React from 'react';
import { ViewProps, StyleSheet, Platform, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface NativeToolbarButtonProps extends ViewProps {
  systemImage?: string;
  systemName?: string;
  style?: 'glass' | 'glassProminent' | 'bordered' | 'borderedProminent' | 'plain' | any;
  buttonStyle?: 'glass' | 'glassProminent' | 'bordered' | 'borderedProminent' | 'plain';
  tint?: string;
  tintColor?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
}

let NativeView: React.ComponentType<any> | null = null;
if (Platform.OS === 'ios' && typeof window === 'undefined') {
  try {
    const ExpoModules = require('expo-modules-core');
    if (ExpoModules && typeof ExpoModules.requireNativeViewManager === 'function') {
      NativeView = ExpoModules.requireNativeViewManager('NativeToolbarButton');
    }
  } catch (e) {
    NativeView = null;
  }
}

export function NativeToolbarButton({
  systemImage,
  systemName,
  style = 'glass',
  buttonStyle,
  tint,
  tintColor,
  accessibilityLabel = 'Button',
  onPress,
  ...props
}: NativeToolbarButtonProps) {
  const icon = systemImage || systemName || 'plus';
  const resolvedStyleType = typeof style === 'string' ? style : (buttonStyle || 'glass');
  const resolvedTint = tint || tintColor || '#007AFF';
  const containerStyle = typeof style === 'object' ? style : undefined;

  if (Platform.OS === 'ios' && NativeView) {
    return (
      <NativeView
        {...props}
        systemName={icon}
        buttonStyle={resolvedStyleType}
        tintColor={resolvedTint}
        accessibilityLabel={accessibilityLabel}
        onButtonPress={onPress}
        style={[styles.defaultButton, containerStyle]}
      />
    );
  }

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.defaultButton, containerStyle]}
      activeOpacity={0.7}
    >
      <Ionicons name="add" size={20} color={resolvedTint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  defaultButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
