import React from 'react';
import { Platform } from 'react-native';

export interface SwiftUINotificationsSheetProps {
    isOpened: boolean;
    onClose: () => void;
}

let Component: React.FC<SwiftUINotificationsSheetProps>;

if (Platform.OS === 'ios') {
    Component = require('./SwiftUINotificationsSheet.ios').SwiftUINotificationsSheet;
} else {
    Component = () => null;
}

export const SwiftUINotificationsSheet = Component;
