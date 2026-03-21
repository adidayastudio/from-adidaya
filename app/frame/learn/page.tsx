"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useSearchParams } from "next/navigation";
import LearnPageWrapper from "@/components/frame/learn/LearnPageWrapper";
import LearnSidebar from "@/components/frame/learn/LearnSidebar";
import LearnPageHeader, { LearnView } from "@/components/frame/learn/LearnPageHeader";
import LearnContent, { KnowledgeItem } from "@/components/frame/learn/LearnContent";
import { QuickView, Department, KnowledgeType, getTypeOptions, SortOptionValue } from "@/components/frame/learn/types";

export default function FrameLearnPage() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<LearnView>("list");
  const [activeQuickView, setActiveQuickView] = useState<QuickView>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string[]>(["ALL"]);
  const [selectedType, setSelectedType] = useState<string[]>(["ALL"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOptionValue>("name-asc");

  const supabase = createClient();

  // Sync with URL params
  useEffect(() => {
    const category = searchParams.get("category");
    const viewParam = searchParams.get("view");

    if (viewParam === "favorite") {
      setActiveQuickView("favorite");
    } else if (category === "documentation") {
      setActiveQuickView("documentation");
    } else if (category === "templates") {
      setActiveQuickView("templates");
    } else if (category === "references") {
      setActiveQuickView("references");
    } else {
      setActiveQuickView("all");
    }
  }, [searchParams]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map DB fields to component fields if necessary
      const mappedItems = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        category: item.category,
        department: item.department,
        lastUpdated: item.updated_at || item.created_at,
        isFavorite: item.is_favorite || false,
        format: item.format || "pdf"
      }));

      setItems(mappedItems);
    } catch (err) {
      console.error("Error fetching knowledge items:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleQuickViewChange = (newView: QuickView) => {
    setActiveQuickView(newView);
    setSelectedType(["ALL"]);
  };

  const handleDepartmentToggle = (dept: string) => {
    setSelectedDepartment((prev: string[]) => {
      if (dept === "ALL") return ["ALL"];
      const next = prev.filter(d => d !== "ALL");
      if (next.includes(dept)) {
        const filtered = next.filter(d => d !== dept);
        return filtered.length === 0 ? ["ALL"] : filtered;
      }
      return [...next, dept];
    });
  };

  const handleTypeToggle = (type: string) => {
    setSelectedType((prev: string[]) => {
      if (type === "ALL") return ["ALL"];
      const next = prev.filter(t => t !== "ALL");
      if (next.includes(type)) {
        const filtered = next.filter(t => t !== type);
        return filtered.length === 0 ? ["ALL"] : filtered;
      }
      return [...next, type];
    });
  };

  const header = (
    <LearnPageHeader
      view={view}
      onChangeView={setView}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onAddKnowledge={() => { }} // Controlled by wrapper/drawer on mobile
      selectedDepartment={selectedDepartment[0] as any} // Fallback for desktop single select
      onDepartmentChange={(dept) => handleDepartmentToggle(dept as string)}
      selectedType={selectedType[0] as any} // Fallback for desktop single select
      onTypeChange={(type) => handleTypeToggle(type as string)}
      activeQuickView={activeQuickView}
    />
  );

  const typeOptions = getTypeOptions(activeQuickView);

  return (
    <LearnPageWrapper
      breadcrumbItems={[{ label: "Frame" }, { label: "Learn" }]}
      header={header}
      onAddKnowledgeSuccess={fetchItems}
      view={view}
      onChangeView={setView}
      selectedDepartment={selectedDepartment}
      onDepartmentChange={handleDepartmentToggle}
      selectedType={selectedType}
      onTypeChange={handleTypeToggle}
      typeOptions={typeOptions}
      selectedSort={sortOption}
      onSortChange={(val) => setSortOption(val as SortOptionValue)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      activeQuickView={activeQuickView}
      sidebar={
        <LearnSidebar
          activeView={activeQuickView}
          onViewChange={handleQuickViewChange}
        />
      }
    >
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <LearnContent
          view={view}
          quickView={activeQuickView}
          department={selectedDepartment}
          docType={selectedType}
          searchQuery={searchQuery}
          items={items}
          sortOption={sortOption}
          onSortChange={setSortOption}
        />
      )}
    </LearnPageWrapper>
  );
}
