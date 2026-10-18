import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Text } from 'react-native';
import { useNavigation } from 'expo-router';

export function useProjectSaveFeedback(dirty: boolean, onDirtyChange?: (dirty: boolean) => void) {
    const [message, setMessage] = useState('');
    const [failed, setFailed] = useState(false);
    const navigation = useNavigation();
    const allowLeave = useRef(false);
    useEffect(() => {
        onDirtyChange?.(dirty);
        return () => onDirtyChange?.(false);
    }, [dirty, onDirtyChange]);
    useEffect(() => {
        if (!dirty || Platform.OS !== 'web') return;
        const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);
    useEffect(() => navigation.addListener('beforeRemove', (event: any) => {
        if (!dirty || allowLeave.current) return;
        event.preventDefault();
        const leave = () => { allowLeave.current = true; navigation.dispatch(event.data.action); };
        if (Platform.OS === 'web') {
            if (window.confirm('Discard unsaved project settings?')) leave();
        } else {
            Alert.alert('Unsaved changes', 'Discard unsaved project settings?', [
                { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: leave },
            ]);
        }
    }), [dirty, navigation]);
    return {
        message, failed,
        notify: (title: string, detail: string) => { setFailed(title !== 'Success'); setMessage(detail); },
        clear: () => setMessage(''),
    };
}

export function ProjectSaveFeedback({ message, failed }: { message: string; failed: boolean }) {
    if (!message) return null;
    return <Text accessibilityRole="alert" style={{ color: failed ? '#FF3B30' : '#159957', paddingHorizontal: 24, paddingVertical: 12, fontSize: 14 }}>{message}</Text>;
}

export function ProjectSettingsScopeNote({ children }: { children: React.ReactNode }) {
    return <Text style={{ color: '#8E8E93', paddingHorizontal: 24, paddingVertical: 12, fontSize: 13, lineHeight: 19 }}>{children}</Text>;
}
