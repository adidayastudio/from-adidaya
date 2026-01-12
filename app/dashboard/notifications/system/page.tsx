"use client";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Settings } from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/components/dashboard/notifications/data";
import NotificationItem from "@/components/dashboard/notifications/NotificationItem";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";

export default function NotificationsSystemPage() {
    const notifications = MOCK_NOTIFICATIONS.filter(n => n.type === "system");

    return (
        <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">System Logs</h1>
                    <p className="text-sm text-neutral-500">Automated alerts and platform updates.</p>
                </div>
            </div>

            <div className="space-y-3">
                {notifications.length > 0 ? (
                    notifications.map((item) => (
                        <NotificationItem key={item.id} item={item} />
                    ))
                ) : (
                    <EmptyState
                        icon={Settings}
                        title="No system alerts"
                        description="System is running smoothly."
                    />
                )}
            </div>
        </div>
    );
}
