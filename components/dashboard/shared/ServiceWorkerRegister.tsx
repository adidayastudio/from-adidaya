"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { subscribeToPush } from "@/lib/api/push-registration";

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            const supabase = createClient();

            // 1. Initial Registration
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("🛠️ [SW] Registered:", registration.scope);
                })
                .catch((error) => {
                    console.error("❌ [SW] Registration failed:", error);
                });

            // 2. Proactive Auth Sync
            // Whenever user logs in or page reloads, if permission is granted, we sync the subscription
            const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((event, session) => {
                if (session?.user && "Notification" in window && Notification.permission === "granted") {
                    console.log("🔄 [SW] Auth event detected:", event, "Refreshing subscription...");
                    subscribeToPush();
                }
            });

            // Run once on mount if already logged in
            if ("Notification" in window && Notification.permission === "granted") {
                subscribeToPush();
            }

            return () => authListener.unsubscribe();
        }
    }, []);

    return null;
}
