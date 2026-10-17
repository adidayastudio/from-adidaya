import { requireNativeView } from 'expo';
import React from 'react';
import { Platform, View } from 'react-native';

export interface NativeFinanceListProps {
  children: React.ReactNode;
  backgroundColor?: string;
}

let NativeView: React.ComponentType<NativeFinanceListProps> | null = null;
if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
  try {
    NativeView = requireNativeView(
      'NativeToolbarButton',
      'NativeFinanceListView'
    );
  } catch (e) {
    NativeView = null;
  }
}

export function NativeFinanceList({
  children,
  backgroundColor = '#FFFFFF',
}: NativeFinanceListProps) {
  if (Platform.OS === 'ios' && NativeView) {
    return (
      <NativeView backgroundColor={backgroundColor}>
        {children}
      </NativeView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {children}
    </View>
  );
}
