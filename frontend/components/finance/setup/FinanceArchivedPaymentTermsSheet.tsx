import React from 'react';
import { Platform } from 'react-native';

export const FinanceArchivedPaymentTermsSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceArchivedPaymentTermsSheet.ios').FinanceArchivedPaymentTermsSheet || require('./FinanceArchivedPaymentTermsSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceArchivedPaymentTermsSheet;
