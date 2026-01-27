"use client";

import CareerPageWrapper from "@/components/feel/career/CareerPageWrapper";
import CareerSidebar from "@/components/feel/career/CareerSidebar";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { TrendingUp } from "lucide-react";

export default function CareerPage() {
  const header = (
    <PageHeader
      title="Career Context"
      description="Long-term growth, skill acquisition, and career trajectory."
      meta={
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-50 text-xs font-mono text-neutral-500 border border-neutral-100">
          Mode: Professional Development
        </div>
      }
    />
  );

  return (
    <CareerPageWrapper
      breadcrumbItems={[{ label: "Feel" }, { label: "Career" }]}
      header={header}
      sidebar={<CareerSidebar />}
    >
      <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-400 text-center p-8 mt-8">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Career Context</h2>
        <p className="max-w-xs mx-auto text-sm text-neutral-500">
          "Where a person is heading."
        </p>
      </div>
    </CareerPageWrapper>
  );
}
