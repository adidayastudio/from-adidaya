"use client";

import { useState } from "react";
import LearnPageWrapper from "@/components/frame/learn/LearnPageWrapper";
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
    alert("Add Knowledge modal coming soon!");
  };

  const handleQuickViewChange = (newView: QuickView) => {
    setActiveQuickView(newView);
    setSelectedType("ALL");
  };

  const header = (
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
  );

  return (
    <LearnPageWrapper
      breadcrumbItems={[{ label: "Frame" }, { label: "Learn" }]}
      header={header}
      sidebar={
        <LearnSidebar
          activeView={activeQuickView}
          onViewChange={handleQuickViewChange}
          onAskAI={handleAskAI}
        />
      }
    >
      <LearnContent
        view={view}
        quickView={activeQuickView}
        department={selectedDepartment}
        docType={selectedType}
        searchQuery={searchQuery}
      />
    </LearnPageWrapper>
  );
}
