import React from 'react';
import { Platform } from 'react-native';

export const FinancePlaceholderGuideSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinancePlaceholderGuideSheet.ios').FinancePlaceholderGuideSheet || require('./FinancePlaceholderGuideSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinancePlaceholderGuideSheet;
