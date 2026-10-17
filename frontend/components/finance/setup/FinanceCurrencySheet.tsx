import React from 'react';
import { Platform } from 'react-native';

export const FinanceCurrencySheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceCurrencySheet.ios').FinanceCurrencySheet || require('./FinanceCurrencySheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceCurrencySheet;
