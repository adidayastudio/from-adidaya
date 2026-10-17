import React from 'react';
import { Platform } from 'react-native';

export const ConsolidationPaymentModal: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./ConsolidationPaymentModal.ios').ConsolidationPaymentModal;
        return <Comp {...props} />;
    }
    return null;
};

export default ConsolidationPaymentModal;
