import React from 'react';
import { Platform } from 'react-native';
import { SearchablePickerProps } from './SearchablePickerRN';

// Dynamically resolve components to bypass sticky Metro extension cache resolver
const SearchablePickerImpl = Platform.OS === 'ios'
    ? require('./SearchablePickerIOS').SearchablePicker
    : require('./SearchablePickerRN').SearchablePicker;

export const SearchablePicker = SearchablePickerImpl as React.FC<SearchablePickerProps>;
export type { PickerItem } from './SearchablePickerRN';
export type { SearchablePickerProps };
