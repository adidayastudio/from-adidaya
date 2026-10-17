import React from 'react';
import { Platform } from 'react-native';

export const SwiftUIAddResourceSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./SwiftUIAddResourceSheet.ios').SwiftUIAddResourceSheet || require('./SwiftUIAddResourceSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default SwiftUIAddResourceSheet;
