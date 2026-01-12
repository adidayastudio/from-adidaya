"use client";

import { UserProfile } from "@/hooks/useUserProfile";
import { Bell, Search, Settings } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

export default function HeaderAdmin({ profile }: { profile: UserProfile }) {
    return (
        <div className="flex flex-col gap-6 mb-8">
            {/* Breadcrumb */}
            <Breadcrumb
                items={[
                    { label: "Frame" },
                    { label: "Website", href: "/frame/website" },
                    { label: "Dashboard" },
                ]}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">
                        Welcome back, {profile.name}
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Manage your website content and track performance.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-64">
                        <Input
                            inputSize="sm"
                            placeholder="Search content..."
                            iconLeft={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <Button variant="secondary" size="sm" iconOnly={<Bell className="w-4 h-4" />} />
                    <Button variant="secondary" size="sm" iconOnly={<Settings className="w-4 h-4" />} />
                    <div className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center text-sm font-medium">
                        {profile.name.charAt(0)}
                    </div>
                </div>
            </div>
        </div>
    );
}
