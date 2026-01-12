"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import LearnSidebar from "@/components/frame/learn/LearnSidebar";
import LearnPageHeader, { LearnView } from "@/components/frame/learn/LearnPageHeader";
import LearnContent from "@/components/frame/learn/LearnContent";
import { QuickView, Department, KnowledgeType } from "@/components/frame/learn/types";

export default function FrameLearnPage() {
  const [view, setView] = useState<LearnView>("list");
  const [activeQuickView, setActiveQuickView] = useState<QuickView>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<Department>("ALL");
  const [selectedType, setSelectedType] = useState<KnowledgeType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAskAI = () => {
    window.location.href = "/frame/learn/ai";
  };

  const handleAddKnowledge = () => {
    // TODO: Open add knowledge modal or navigate to add page
    alert("Add Knowledge modal coming soon!");
  };

  const handleQuickViewChange = (newView: QuickView) => {
    setActiveQuickView(newView);
    setSelectedType("ALL"); // Reset type filter when changing broad category
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb
        items={[
          { label: "Frame" },
          { label: "Learn" },
        ]}
      />

      <PageWrapper
        sidebar={
          <LearnSidebar
            activeView={activeQuickView}
            onViewChange={handleQuickViewChange}
            onAskAI={handleAskAI}
          />
        }
      >
        <div className="space-y-6">
          <LearnPageHeader
            view={view}
            onChangeView={setView}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddKnowledge={handleAddKnowledge}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            activeQuickView={activeQuickView}
          />

          <LearnContent
            view={view}
            quickView={activeQuickView}
            department={selectedDepartment}
            docType={selectedType}
            searchQuery={searchQuery}
          />
        </div>
      </PageWrapper>
    </div>
  );
}
