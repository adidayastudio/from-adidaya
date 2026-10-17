import React from 'react';
import { Platform } from 'react-native';
import { MultiSearchablePickerProps } from './MultiSearchablePickerRN';

// Dynamically resolve components to bypass sticky Metro extension cache resolver
const MultiSearchablePickerImpl = Platform.OS === 'ios'
    ? require('./MultiSearchablePickerIOS').MultiSearchablePicker
    : require('./MultiSearchablePickerRN').MultiSearchablePicker;

export const MultiSearchablePicker = MultiSearchablePickerImpl as React.FC<MultiSearchablePickerProps>;
export type { MultiSearchablePickerProps };
