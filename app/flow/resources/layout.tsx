import ResourcesSidebar from "@/components/flow/resources/ResourcesSidebar";
import PageWrapper from "@/components/layout/PageWrapper";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

export default function ResourcesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Resources" }]} />
            <PageWrapper sidebar={<ResourcesSidebar />}>
                {children}
            </PageWrapper>
        </div>
    );
}
