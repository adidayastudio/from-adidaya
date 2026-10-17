import React from 'react';
import { Platform } from 'react-native';

export const FinanceApprovalFlowModal: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceApprovalFlowModal.ios').FinanceApprovalFlowModal || require('./FinanceApprovalFlowModal.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceApprovalFlowModal;
