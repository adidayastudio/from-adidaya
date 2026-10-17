import React from 'react';
import { Platform } from 'react-native';

export const ShiftConfigModal: React.FC<any> = (props) => {
    if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
        const Comp = require('./ShiftConfigModal.ios').ShiftConfigModal || require('./ShiftConfigModal.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ShiftConfigModal;
