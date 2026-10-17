import React from 'react';
import { Platform } from 'react-native';

export const ProjectTypeEditSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./ProjectTypeEditSheet.ios').ProjectTypeEditSheet || require('./ProjectTypeEditSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ProjectTypeEditSheet;
