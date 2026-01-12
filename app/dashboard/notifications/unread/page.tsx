"use client";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { CheckCheck, Mail } from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/components/dashboard/notifications/data";
import NotificationItem from "@/components/dashboard/notifications/NotificationItem";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";

export default function NotificationsUnreadPage() {
    const notifications = MOCK_NOTIFICATIONS.filter(n => !n.isRead);

    return (
        <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Unread</h1>
                    <p className="text-sm text-neutral-500">Messages requiring your attention.</p>
                </div>
                <button className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                    <CheckCheck className="w-4 h-4" />
                    Mark all as read
                </button>
            </div>

            <div className="space-y-3">
                {notifications.length > 0 ? (
                    notifications.map((item) => (
                        <NotificationItem key={item.id} item={item} />
                    ))
                ) : (
                    <EmptyState
                        icon={Mail}
                        title="You're all caught up"
                        description="No unread notifications at the moment."
                    />
                )}
            </div>
        </div>
    );
}
