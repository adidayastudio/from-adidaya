import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import { decodeFinanceImage } from '@/lib/decodeFinanceImage';
import { loadFinanceAttachmentPreview } from '@/lib/financeAttachmentPreview';

export function FinanceImageThumbnail({ url, name = '', mimeType = '', file }: { url: string; name?: string; mimeType?: string; file?: File }) {
    const needsConversion = Platform.OS === 'web' && (/hei[cf]/i.test(mimeType) || (/\.hei[cf](?:[?#]|$)/i.test(name) || /\.hei[cf](?:[?#]|$)/i.test(url)));
    const [source, setSource] = useState(needsConversion ? '' : url);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        let objectUrl = '';
        const controller = new AbortController();
        setFailed(false);
        setSource(needsConversion ? '' : url);
        if (needsConversion) {
            const preview = file ? decodeFinanceImage(file, name) : loadFinanceAttachmentPreview(url, controller.signal).then(result => result.blob);
            void preview.then(blob => {
                if (!active) return;
                objectUrl = URL.createObjectURL(blob);
                setSource(objectUrl);
            }).catch(() => { if (active) setFailed(true); });
        }
        return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [url, name, file, needsConversion]);
    return <View style={{ width: 80, height: 50, alignItems: 'center', justifyContent: 'center' }}>
        {failed ? <Text style={{ fontSize: 10, color: '#8E8E93', textAlign: 'center' }}>Preview unavailable</Text>
            : source ? <Image source={{ uri: source }} style={{ width: 80, height: 50 }} resizeMode="cover" onError={() => setFailed(true)} />
            : <ActivityIndicator size="small" color="#159957" />}
    </View>;
}
