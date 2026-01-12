"use client";

import { useState } from "react";
import SearchInput from "@/components/search/SearchInput";
import SearchResults from "@/components/search/SearchResults";
import { useSearch } from "@/hooks/useSearch";
import PageWrapper from "@/components/layout/PageWrapper";
import SearchSidebar, { SearchSection } from "@/components/search/SearchSidebar";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { mode, results } = useSearch(query);
  const [section, setSection] = useState<SearchSection>("all");

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <PageWrapper sidebar={<SearchSidebar activeSection={section} onSectionChange={setSection} />}>
        <div className="max-w-3xl mx-auto">
          <SearchInput value={query} onChange={setQuery} onClose={() => { }} />

          <div className="mt-8">
            {mode === "default" && (
              <div className="text-center py-20 text-neutral-400">
                <p>Start typing to search across Adidaya OS...</p>
              </div>
            )}
            {mode === "search" && <SearchResults results={results} onSelect={() => { }} />}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
