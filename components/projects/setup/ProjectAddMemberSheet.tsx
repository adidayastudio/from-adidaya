import React from 'react';
import { Platform } from 'react-native';

export const ProjectAddMemberSheet: React.FC<any> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./ProjectAddMemberSheet.ios').ProjectAddMemberSheet || require('./ProjectAddMemberSheet.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default ProjectAddMemberSheet;
