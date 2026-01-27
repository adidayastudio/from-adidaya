"use client";

import ResourcesPageWrapper from "@/components/flow/resources/ResourcesPageWrapper";
import ResourcesSidebar from "@/components/flow/resources/ResourcesSidebar";

export default function ResourcesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ResourcesPageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Resources" }]}
            sidebar={<ResourcesSidebar />}
        >
            {children}
        </ResourcesPageWrapper>
    );
}
