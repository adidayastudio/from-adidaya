"use client";

import { createContext, useContext, useEffect, useState } from "react";
import SearchOverlay from "@/components/search/SearchOverlay";

const SearchContext = createContext({
  open: false,
  setOpen: (v: boolean) => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Keyboard listener for Cmd+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </SearchContext.Provider>
  );
}

export const useSearchContext = () => useContext(SearchContext);
