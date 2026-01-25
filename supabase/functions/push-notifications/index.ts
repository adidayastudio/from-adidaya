import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import * as webpush from "https://esm.sh/gh/manustravo/web-push-deno@main/mod.ts" // Using a Deno compatible web-push port

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = "mailto:hello@adidaya.studio";

const supabase = createClient(
    `https://${Deno.env.get("PROJECT_ID")}.supabase.co`,
    Deno.env.get("SERVICE_ROLE_KEY")!
);

serve(async (req) => {
    try {
        const { record } = await req.json();
        const { user_id, title, description } = record;

        // Fetch subscriptions for this user
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('user_id', user_id);

        if (error || !subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: "No subscriptions found" }), { status: 200 });
        }

        const payload = JSON.stringify({
            title: title,
            body: description,
            tag: record.id,
            link: record.link || '/dashboard/notifications'
        });

        const pushPromises = subscriptions.map(sub => {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            return webpush.sendNotification(
                pushConfig,
                payload,
                {
                    vapidDetails: {
                        subject: VAPID_SUBJECT,
                        publicKey: VAPID_PUBLIC_KEY,
                        privateKey: VAPID_PRIVATE_KEY,
                    },
                }
            ).catch(err => {
                console.error(`Failed to send push to ${sub.endpoint}:`, err);
                // If 410 Gone or 404, we should remove the subscripton
                if (err.statusCode === 410 || err.statusCode === 404) {
                    return supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
            });
        });

        await Promise.all(pushPromises);

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
