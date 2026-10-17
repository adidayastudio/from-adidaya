import React from 'react';
import { Platform } from 'react-native';

export const ProjectLeadSelectSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./ProjectLeadSelectSheet.ios').ProjectLeadSelectSheet || require('./ProjectLeadSelectSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ProjectLeadSelectSheet;
