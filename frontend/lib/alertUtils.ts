import { Alert, Platform } from 'react-native';

interface ConfirmDestructiveOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
}

export function confirmDestructiveAction({
    title,
    message,
    confirmLabel = 'Delete',
    onConfirm,
}: ConfirmDestructiveOptions): void {
    if (Platform.OS === 'web') {
        const fullMsg = `${title}\n\n${message}`;
        if (typeof window !== 'undefined' && window.confirm(fullMsg)) {
            onConfirm();
        }
        return;
    }

    Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
}
