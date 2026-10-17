import React from 'react';
import { Platform } from 'react-native';

export const FinanceTimezoneSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceTimezoneSheet.ios').FinanceTimezoneSheet || require('./FinanceTimezoneSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceTimezoneSheet;
