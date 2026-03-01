import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import CrewSidebar, { CrewSection } from "@/components/feel/crew/CrewSidebar";
import CrewMobileHeader from "@/components/feel/crew/CrewMobileHeader";
import { UserRole } from "@/hooks/useUserProfile";

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
            <div className="lg:hidden min-h-screen bg-neutral-100">
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
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={
                    <CrewSidebar
                        activeSection={activeSection}
                        onSectionChange={onSectionChange}
                        role={role}
                        fabAction={fabAction}
                    />
                } isTransparent header={header}>
                    <div className="flex flex-col h-full pb-28 lg:pb-0">
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
