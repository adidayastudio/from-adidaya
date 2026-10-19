import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { loadFinanceAttachmentPreview } from '@/lib/financeAttachmentPreview';

export function FinanceAttachmentPreview({ url }: { url: string }) {
    const [source, setSource] = useState('');
    const [kind, setKind] = useState('image');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        let objectUrl = '';
        const controller = new AbortController();
        setLoading(true);
        setError('');
        setSource('');
        if (Platform.OS !== 'web') {
            setSource(url);
        } else {
            void loadFinanceAttachmentPreview(url, controller.signal).then(result => {
                if (!active) return;
                objectUrl = URL.createObjectURL(result.kind === 'pdf' ? new Blob([result.blob], { type: 'application/pdf' }) : result.blob);
                setSource(objectUrl);
                setKind(result.kind);
                if (result.kind === 'file') setLoading(false);
            }).catch(failure => {
                if (!active) return;
                setError(failure?.message || 'File failed to load.');
                setLoading(false);
            });
        }
        return () => {
            active = false;
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url, attempt]);
    const failed = () => { setLoading(false); setError('Preview failed to load. Try again or download the file.'); };
    return (
        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            {!error && source && (kind === 'pdf' && Platform.OS === 'web' ? (
                <iframe title="PDF preview" src={source} onLoad={() => setLoading(false)} onError={failed}
                    style={{ width: '100%', height: '100%', border: 0, backgroundColor: '#fff' }} />
            ) : kind === 'image' ? (
                <Image source={{ uri: source }} resizeMode="contain" style={{ width: '100%', height: '100%' }}
                    onLoad={() => setLoading(false)} onError={failed} />
            ) : (
                <Text style={{ color: '#fff' }}>Preview is unavailable for this file type. Use Download File.</Text>
            ))}
            {loading && <View style={{ position: 'absolute', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: '#fff' }}>Loading file...</Text>
            </View>}
            {!!error && <View style={{ alignItems: 'center', gap: 16, padding: 24 }}>
                <Text style={{ color: '#fff', textAlign: 'center' }}>{error}</Text>
                <TouchableOpacity onPress={() => setAttempt(value => value + 1)}><Text style={{ color: '#66b5ff' }}>Retry</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { void Linking.openURL(url); }}><Text style={{ color: '#66b5ff' }}>Open file directly</Text></TouchableOpacity>
            </View>}
        </View>
    );
}
