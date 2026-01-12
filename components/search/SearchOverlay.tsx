"use client";

import { useState } from "react";
import { useSearch } from "@/hooks/useSearch";
import SearchInput from "./SearchInput";
import SearchResults from "./SearchResults";
import SearchCommand from "./SearchCommand";

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { mode, results } = useSearch(query);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] p-4 flex justify-center">
      <div className="w-full max-w-2xl mt-20 rounded-xl bg-neutral-900 border border-red-600/40 shadow-xl">
        <div className="p-4">
          <SearchInput value={query} onChange={setQuery} onClose={onClose} />
        </div>

        {mode === "default" && <div className="p-4 text-neutral-500">Start typing to search…</div>}

        {mode === "search" && (
          <SearchResults results={results} onSelect={onClose} />
        )}

        {mode === "command" && <SearchCommand query={query} onSelect={onClose} />}
      </div>
    </div>
  );
}
