import React from 'react';
import { Platform } from 'react-native';

export const ProjectRoleEditSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./ProjectRoleEditSheet.ios').ProjectRoleEditSheet || require('./ProjectRoleEditSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ProjectRoleEditSheet;
