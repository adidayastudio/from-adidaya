import React from 'react';
import { Platform } from 'react-native';

export const SwiftUIReceivingDetailSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./SwiftUIReceivingDetailSheet.ios').SwiftUIReceivingDetailSheet || require('./SwiftUIReceivingDetailSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export const ReceivingDetailModal = SwiftUIReceivingDetailSheet;
export default SwiftUIReceivingDetailSheet;
