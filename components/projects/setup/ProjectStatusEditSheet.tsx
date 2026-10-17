import React from 'react';
import { Platform } from 'react-native';

export const ProjectStatusEditSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./ProjectStatusEditSheet.ios').ProjectStatusEditSheet || require('./ProjectStatusEditSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ProjectStatusEditSheet;
