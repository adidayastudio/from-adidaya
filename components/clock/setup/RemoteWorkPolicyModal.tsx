import React from 'react';
import { Platform } from 'react-native';

export const RemoteWorkPolicyModal: React.FC<any> = (props) => {
    if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
        const Comp = require('./RemoteWorkPolicyModal.ios').RemoteWorkPolicyModal || require('./RemoteWorkPolicyModal.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default RemoteWorkPolicyModal;
