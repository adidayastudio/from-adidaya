import React from 'react';
import { Platform } from 'react-native';

export const FinanceEventNotificationEditSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceEventNotificationEditSheet.ios').FinanceEventNotificationEditSheet || require('./FinanceEventNotificationEditSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default FinanceEventNotificationEditSheet;
