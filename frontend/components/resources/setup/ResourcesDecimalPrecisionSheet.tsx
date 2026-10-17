import React from 'react';
import { Platform } from 'react-native';

export const ResourcesDecimalPrecisionSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./ResourcesDecimalPrecisionSheet.ios').ResourcesDecimalPrecisionSheet || require('./ResourcesDecimalPrecisionSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ResourcesDecimalPrecisionSheet;
