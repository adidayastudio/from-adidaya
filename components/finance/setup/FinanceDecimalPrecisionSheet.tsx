import React from 'react';
import { Platform } from 'react-native';

export const FinanceDecimalPrecisionSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceDecimalPrecisionSheet.ios').FinanceDecimalPrecisionSheet || require('./FinanceDecimalPrecisionSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceDecimalPrecisionSheet;
