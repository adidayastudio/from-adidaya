import React from 'react';
import { Platform } from 'react-native';

export const FinanceCustomTimingSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceCustomTimingSheet.ios').FinanceCustomTimingSheet || require('./FinanceCustomTimingSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceCustomTimingSheet;
