"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import LearnMobileHeader from "@/components/frame/learn/LearnMobileHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FRAME_APPS } from "@/lib/navigation-config";
import { GraduationCap } from "lucide-react";

interface LearnPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    onAddKnowledge?: () => void;
    // Mobile Filter Props
    view?: "list" | "grouped";
    onChangeView?: (v: "list" | "grouped") => void;
    selectedDepartment?: string[];
    onDepartmentChange?: (dept: any) => void;
    selectedType?: string[];
    onTypeChange?: (type: any) => void;
    typeOptions?: { value: string; label: string }[];
    selectedSort?: string;
    onSortChange?: (sort: any) => void;
    onAddKnowledgeSuccess?: (data: any) => void;
}

export default function LearnPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
    onAddKnowledge,
    view,
    onChangeView,
    selectedDepartment,
    onDepartmentChange,
    selectedType,
    onTypeChange,
    typeOptions,
    selectedSort,
    onSortChange,
    onAddKnowledgeSuccess,
}: LearnPageWrapperProps) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <LearnMobileHeader
                    onAddKnowledge={onAddKnowledge}
                    backUrl="/dashboard"
                    view={view}
                    onChangeView={onChangeView}
                    selectedDepartment={selectedDepartment}
                    onDepartmentChange={onDepartmentChange}
                    selectedType={selectedType}
                    onTypeChange={onTypeChange}
                    typeOptions={typeOptions}
                    selectedSort={selectedSort}
                    onSortChange={onSortChange}
                    onAddKnowledgeSuccess={onAddKnowledgeSuccess}
                />

                <div className="pb-32 px-4 space-y-4">
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={sidebar}>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
