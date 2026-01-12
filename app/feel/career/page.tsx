"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import CareerSidebar from "@/components/feel/career/CareerSidebar";
import { Breadcrumb, PageHeader } from "@/shared/ui/headers/PageHeader";
import { TrendingUp } from "lucide-react";

export default function CareerPage() {
  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb
        items={[
          { label: "Feel" },
          { label: "Career" },
        ]}
      />

      <PageWrapper sidebar={<CareerSidebar />}>
        <PageHeader
          title="Career Context"
          description="Long-term growth, skill acquisition, and career trajectory."
          meta={
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-50 text-xs font-mono text-neutral-500 border border-neutral-100">
              Mode: Professional Development
            </div>
          }
        />

        <div className="flex flex-col items-center justify-center h-[50vh] text-neutral-400 text-center p-8 mt-8">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">Career Context</h2>
          <p className="max-w-xs mx-auto text-sm text-neutral-500">
            "Where a person is heading."
          </p>
        </div>
      </PageWrapper>
    </div>
  );
}
