import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { enableAdidayaWebPush, sendAdidayaTestNotification } from '@/lib/adidayaWebPush';

export function NotificationInboxControls({ unreadCount, loading, onRefresh, onMarkAllRead }: {
    unreadCount: number; loading: boolean; onRefresh: () => Promise<void>; onMarkAllRead: () => Promise<void>;
}) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [busy, setBusy] = useState('');
    const [status, setStatus] = useState('');
    const [failed, setFailed] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const supported = Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window && 'PushManager' in window;
    const blocked = supported && Notification.permission === 'denied';
    const run = async (id: string, action: () => Promise<void>, success = '') => {
        if (busy) return;
        setBusy(id); setStatus(''); setFailed(false);
        try { await action(); setStatus(success); }
        catch (error) { setFailed(true); setStatus(error instanceof Error ? error.message : 'Unable to update notifications.'); }
        finally { setBusy(''); }
    };
    const button = (id: string, label: string, action: () => Promise<void>, disabled = false, success = '') => (
        <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={!!busy || disabled} onPress={() => void run(id, action, success)}
            style={{ borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', opacity: busy || disabled ? 0.5 : 1 }}>
            <Text style={{ color: isDark ? '#FFFFFF' : '#1C1C1E', fontSize: 12, fontWeight: '600' }}>{busy === id ? 'Please wait…' : label}</Text>
        </Pressable>
    );
    return <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {button('read', 'Mark all read', onMarkAllRead, unreadCount === 0)}
            {button('refresh', loading ? 'Refreshing…' : 'Refresh', onRefresh, loading)}
        </View>
        {supported && <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, color: isDark ? '#A1A1A6' : '#6E6E73' }}>{blocked ? 'Push is blocked. Allow notifications in browser site settings.' : pushEnabled ? 'Browser push connected to Adidaya.' : 'Receive Adidaya alerts even when this page is closed.'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {button('push', pushEnabled ? 'Reconnect push' : 'Enable push', async () => { await enableAdidayaWebPush(); setPushEnabled(true); }, blocked)}
                {button('test', 'Test notification', async () => { await sendAdidayaTestNotification(); await onRefresh(); }, false, 'Test added to your inbox. Push delivery depends on the existing Adidaya push service.')}
            </View>
        </View>}
        {!!status && <Text accessibilityRole={failed ? 'alert' : undefined} style={{ fontSize: 12, color: failed ? '#FF453A' : (isDark ? '#A1A1A6' : '#6E6E73') }}>{status}</Text>}
    </View>;
}
