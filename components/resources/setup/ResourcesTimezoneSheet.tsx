import React from 'react';
import { Platform } from 'react-native';

export const ResourcesTimezoneSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./ResourcesTimezoneSheet.ios').ResourcesTimezoneSheet || require('./ResourcesTimezoneSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ResourcesTimezoneSheet;
