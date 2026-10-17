import React from 'react';
import { Platform } from 'react-native';

export const FinanceDocumentApprovalSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceDocumentApprovalSheet.ios').FinanceDocumentApprovalSheet || require('./FinanceDocumentApprovalSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceDocumentApprovalSheet;
