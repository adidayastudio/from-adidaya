import { createClient } from "@/utils/supabase/client";

export const VAPID_PUBLIC_KEY = "BLsN_ba3HI2Oi5Slu5L3027FH8gCleLwA35liLS7DjU2rIrOKKnc7ErxD7Xy3vfIJhhY99hVcDm5o7EUO8E5qMo";

export const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn("🧭 [Push] Push messaging not supported in this browser");
        return;
    }

    const supabase = createClient();

    try {
        const registration = await navigator.serviceWorker.ready;

        // Always try to get existing subscription first
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            console.log("📡 [Push] No existing subscription, creating new one...");
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY
            });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log("👤 [Push] User not logged in, skipping database sync");
            return;
        }

        // Extract keys
        const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!) as any));
        const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!) as any));

        // Sync with Supabase
        const { error } = await (supabase as any).from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: p256dh,
            auth: auth,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,endpoint' });

        if (error) throw error;

        console.log("✅ [Push] Subscription synced with Supabase for user:", user.id);
        return true;
    } catch (error) {
        console.error("❌ [Push] Subscription sync failed:", error);
        return false;
    }
};
