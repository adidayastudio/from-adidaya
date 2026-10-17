import { Platform, Share, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

export async function copyToClipboard(text: string, label: string = 'Copied to clipboard') {
    try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (Platform.OS !== 'web') {
            Alert.alert('Copied', label);
        }
    } catch (e) {
        console.warn('Failed to copy text:', e);
    }
}

export async function saveOrDownloadImage(url: string, filename?: string) {
    if (!url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'web') {
        try {
            const cleanName = filename || `image_${Date.now()}.jpg`;
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = cleanName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            try {
                const cleanName = filename || `image_${Date.now()}.jpg`;
                const link = document.createElement('a');
                link.href = url;
                link.download = cleanName;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                console.error('Failed to download image on web:', err);
            }
        }
        return;
    }

    try {
        const cleanName = filename || `image_${Date.now()}.jpg`;
        const fsAny = FileSystem as any;
        const targetDir = fsAny.documentDirectory || fsAny.cacheDirectory;
        const fileUri = `${targetDir}${cleanName}`;

        const downloadResult = await FileSystem.downloadAsync(url, fileUri);
        if (downloadResult.status === 200) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    } catch (e) {
        console.error('Failed to save image:', e);
    }
}

export async function triggerSystemShare(params: { title?: string; message?: string; url?: string }) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
        if (Platform.OS === 'web') {
            if (typeof navigator !== 'undefined' && (navigator as any).share) {
                try {
                    await (navigator as any).share({
                        title: params.title,
                        text: params.message,
                        url: params.url,
                    });
                    return;
                } catch {
                    // user cancelled or share failed
                    return;
                }
            }
            // Desktop browser fallback: copy text to clipboard
            const textToCopy = [params.title, params.message, params.url].filter(Boolean).join('\n\n');
            if (textToCopy) {
                await copyToClipboard(textToCopy, 'Announcement copied to clipboard');
            }
            return;
        }
        await Share.share({
            title: params.title,
            message: params.message || params.title || '',
            url: params.url,
        });
    } catch (e) {
        // user cancelled or failed
    }
}
