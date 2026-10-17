import React from 'react';
import { Platform } from 'react-native';

export const ApprovalFlowModal: React.FC<any> = (props) => {
    if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
        const Comp = require('./ApprovalFlowModal.ios').ApprovalFlowModal || require('./ApprovalFlowModal.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ApprovalFlowModal;
