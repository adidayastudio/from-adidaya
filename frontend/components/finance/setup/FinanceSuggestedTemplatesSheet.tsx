import React from 'react';
import { Platform } from 'react-native';

export const FinanceSuggestedTemplatesSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceSuggestedTemplatesSheet.ios').FinanceSuggestedTemplatesSheet;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceSuggestedTemplatesSheet;
