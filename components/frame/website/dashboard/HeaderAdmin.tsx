import { useState, useRef, useEffect } from "react";
import { UserProfile } from "@/hooks/useUserProfile";
import { Bell, Search, Settings, LogOut, User } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import Link from "next/link";
import clsx from "clsx";

export default function HeaderAdmin({ profile }: { profile: UserProfile }) {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        if (isUserMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isUserMenuOpen]);

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

                    {/* User Menu Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            {profile.name.charAt(0)}
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-neutral-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <Link
                                    href="/settings"
                                    onClick={() => setIsUserMenuOpen(false)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </Link>
                                <div className="h-px bg-neutral-100 my-1"></div>
                                <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                    onClick={() => {
                                        // Handle logout
                                        window.location.href = "/login";
                                    }}
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
