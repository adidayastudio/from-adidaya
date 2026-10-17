import * as React from 'react';
import { ViewProps, StyleSheet, Platform, View, Text, TouchableOpacity } from 'react-native';

export interface NativeSheetHeaderProps extends ViewProps {
  title: string;
  confirmTint?: string;
  confirmEnabled?: boolean;
  closeAccessibilityLabel?: string;
  confirmAccessibilityLabel?: string;
  modifiers?: any[];
  onClose?: () => void;
  onConfirm?: () => void;
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

export function NativeSheetHeader({
  title,
  confirmTint = '#007AFF',
  confirmEnabled = true,
  closeAccessibilityLabel = 'Close',
  confirmAccessibilityLabel = 'Save',
  onClose,
  onConfirm,
  modifiers,
  style,
  ...props
}: NativeSheetHeaderProps) {
  if (Platform.OS === 'ios' && NativeView) {
    return (
      <NativeView
        {...props}
        title={title}
        confirmTint={confirmTint}
        confirmEnabled={confirmEnabled}
        closeAccessibilityLabel={closeAccessibilityLabel}
        confirmAccessibilityLabel={confirmAccessibilityLabel}
        onClose={onClose}
        onConfirm={onConfirm}
        modifiers={modifiers}
        style={[styles.defaultHeader, style]}
      />
    );
  }

  return (
    <View style={[styles.androidHeader, style]} {...props}>
      <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
        <Text style={styles.closeText}>{closeAccessibilityLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <TouchableOpacity
        onPress={confirmEnabled ? onConfirm : undefined}
        style={styles.headerBtn}
        disabled={!confirmEnabled}
      >
        <Text style={[styles.confirmText, { color: confirmEnabled ? confirmTint : '#8E8E93' }]}>
          {confirmAccessibilityLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  defaultHeader: {
    width: '100%',
    height: 56,
  },
  androidHeader: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
