"use client";

import { useState, useEffect } from "react";
import { searchQuery } from "../lib/api/search";

export type SearchMode = "default" | "search" | "command";

export function useSearch(query: string) {
  const [results, setResults] = useState<any>(null);
  const [mode, setMode] = useState<SearchMode>("default");

  // Detect command mode
  useEffect(() => {
    if (query.startsWith("/")) {
      setMode("command");
      return;
    }
    if (query.length === 0) {
      setMode("default");
      return;
    }
    setMode("search");
  }, [query]);

  // Debounce search
  useEffect(() => {
    if (mode !== "search") return;
    const timeout = setTimeout(async () => {
      const res = await searchQuery(query);
      setResults(res);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, mode]);

  return { mode, results };
}
