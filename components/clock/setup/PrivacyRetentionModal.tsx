import React from 'react';
import { Platform } from 'react-native';

export type RetentionTypeKey = 'location' | 'photo' | 'audit_log' | 'attendance' | 'requests' | 'leaves' | 'corrections' | 'face_photos' | 'gps_logs' | 'audit_trail' | 'overtime_logs';

export const PrivacyRetentionModal: React.FC<any> = (props) => {
    if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
        const Comp = require('./PrivacyRetentionModal.ios').PrivacyRetentionModal || require('./PrivacyRetentionModal.ios').default;
        return <Comp {...props} />;
    }
    return null;
};

export default PrivacyRetentionModal;
