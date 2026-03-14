import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import CrewSidebar, { CrewSection } from "@/components/feel/crew/CrewSidebar";
import CrewMobileHeader from "@/components/feel/crew/CrewMobileHeader";
import { UserRole } from "@/hooks/useUserProfile";
import { motion } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Users, UserPlus } from "lucide-react";

interface CrewPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    // Props needed for Sidebar/Mobile Layout
    activeSection: CrewSection;
    onSectionChange: (section: CrewSection) => void;
    role?: UserRole;
    fabAction?: {
        icon: React.ReactNode;
        onClick: () => void;
        title: string;
        highlight?: boolean;
    };
    // Mobile Header Props
    view?: string;
    onChangeView?: (v: any) => void;
    selectedRole?: string;
    onRoleChange?: (role: string) => void;
    selectedStatus?: string;
    onStatusChange?: (status: string) => void;
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
}

export default function CrewPageWrapper({
    breadcrumbItems,
    header,
    children,
    activeSection,
    onSectionChange,
    role,
    fabAction,
    view,
    onChangeView,
    selectedRole,
    onRoleChange,
    selectedStatus,
    onStatusChange,
    searchQuery,
    onSearchChange,
}: CrewPageWrapperProps) {

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100">
                <CrewMobileHeader
                    onAddCrew={fabAction?.onClick}
                    backUrl="/dashboard"
                    view={view}
                    onChangeView={onChangeView}
                    selectedRole={selectedRole}
                    onRoleChange={onRoleChange}
                    selectedStatus={selectedStatus}
                    onStatusChange={onStatusChange}
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                />

                <div className="pb-32 px-4 space-y-4">
                    {header}
                    {children}
                </div>

                <CrewSidebar
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                    role={role}
                    fabAction={fabAction}
                />
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden md:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={
                    <CrewSidebar
                        activeSection={activeSection}
                        onSectionChange={onSectionChange}
                        role={role}
                        fabAction={fabAction}
                    />
                } isTransparent header={header}>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {/* Inline Tabs for iPad (Hidden on Desktop) */}
                        <div className="lg:hidden flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 mb-2">
                            {[
                                { id: "directory", label: "Directory", icon: Users },
                                { id: "onboarding", label: "Onboarding", icon: UserPlus },
                            ].map((tab) => {
                                const isActive = activeSection === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => onSectionChange(tab.id as any)}
                                        className={clsx(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors flex-shrink-0",
                                            isActive
                                                ? "text-neutral-900 dark:text-white font-semibold"
                                                : "text-neutral-500 font-medium hover:text-neutral-700"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabBadgeCrew"
                                                className="absolute inset-0 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-black/[0.04] dark:border-white/[0.04]"
                                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                            />
                                        )}
                                        <div className="relative z-10 flex items-center gap-2">
                                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-neutral-900 dark:text-white" : "opacity-60"} />
                                            <span className="text-[13px]">{tab.label}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
