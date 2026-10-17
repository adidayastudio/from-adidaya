import React from 'react';
import { Platform } from 'react-native';

export const FinanceCustomRuleEditSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceCustomRuleEditSheet.ios').FinanceCustomRuleEditSheet || require('./FinanceCustomRuleEditSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceCustomRuleEditSheet;
