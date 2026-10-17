import { supabase } from '@/lib/supabase';
// Public VAPID key from the existing from-adidaya push registration.
const VAPID_PUBLIC_KEY = 'BLsN_ba3HI2Oi5Slu5L3027FH8gCleLwA35liLS7DjU2rIrOKKnc7ErxD7Xy3vfIJhhY99hVcDm5o7EUO8E5qMo';
export async function enableAdidayaWebPush() {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported in this browser.');
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Sign in to enable notifications.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Allow notifications in browser site settings to enable push.');
    await navigator.serviceWorker.register('/sw.js');
    const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Push setup timed out. Please retry.')), 12000)),
    ]);
    const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY });
    const keys = subscription.toJSON().keys;
    if (!keys?.p256dh || !keys.auth) throw new Error('Push subscription keys are unavailable.');
    const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth, updated_at: new Date().toISOString() }, { onConflict: 'user_id,endpoint' });
    if (error) throw new Error(error.message);
}
export async function sendAdidayaTestNotification() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Sign in to test notifications.');
    const { error } = await supabase.from('notifications').insert({ user_id: user.id, type: 'success', category: 'system', title: 'Test Push System', description: 'Your Adidaya notification test was created.', link: '/dashboard/notifications' });
    if (error) throw new Error(error.message);
}
