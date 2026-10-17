import React from 'react';
import { Platform } from 'react-native';

export const FinanceBankAccountEditSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceBankAccountEditSheet.ios').FinanceBankAccountEditSheet || require('./FinanceBankAccountEditSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceBankAccountEditSheet;
