import React from 'react';
import { Platform } from 'react-native';

export const FinanceTemplateEditSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceTemplateEditSheet.ios').FinanceTemplateEditSheet || require('./FinanceTemplateEditSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceTemplateEditSheet;
