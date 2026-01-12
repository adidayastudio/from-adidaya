"use client";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { CheckSquare } from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/components/dashboard/notifications/data";
import NotificationItem from "@/components/dashboard/notifications/NotificationItem";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";

export default function NotificationsApprovalsPage() {
    const notifications = MOCK_NOTIFICATIONS.filter(n => n.type === "approval");

    return (
        <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Approvals</h1>
                    <p className="text-sm text-neutral-500">Items requiring your decision or review.</p>
                </div>
            </div>

            <div className="space-y-3">
                {notifications.length > 0 ? (
                    notifications.map((item) => (
                        <NotificationItem key={item.id} item={item} />
                    ))
                ) : (
                    <EmptyState
                        icon={CheckSquare}
                        title="No pending approvals"
                        description="You have no outstanding approval requests."
                    />
                )}
            </div>
        </div>
    );
}
