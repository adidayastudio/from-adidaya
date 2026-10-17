import React from 'react';
import { Platform } from 'react-native';

export const WorkLocationModal: React.FC<any> = (props) => {
    if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
        const Comp = require('./WorkLocationModal.ios').WorkLocationModal || require('./WorkLocationModal.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default WorkLocationModal;
