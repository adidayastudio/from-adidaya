import React from 'react';
import { Platform } from 'react-native';

export const FinanceBankAccountsGuideSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceBankAccountsGuideSheet.ios').FinanceBankAccountsGuideSheet || require('./FinanceBankAccountsGuideSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceBankAccountsGuideSheet;
