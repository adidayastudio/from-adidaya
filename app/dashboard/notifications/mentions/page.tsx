"use client";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { AtSign } from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/components/dashboard/notifications/data";
import NotificationItem from "@/components/dashboard/notifications/NotificationItem";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";

export default function NotificationsMentionsPage() {
    const notifications = MOCK_NOTIFICATIONS.filter(n => n.type === "mention");

    return (
        <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Mentions</h1>
                    <p className="text-sm text-neutral-500">Updates where you were tagged directly.</p>
                </div>
            </div>

            <div className="space-y-3">
                {notifications.length > 0 ? (
                    notifications.map((item) => (
                        <NotificationItem key={item.id} item={item} />
                    ))
                ) : (
                    <EmptyState
                        icon={AtSign}
                        title="No mentions yet"
                        description="When someone tags you, it will appear here."
                    />
                )}
            </div>
        </div>
    );
}
