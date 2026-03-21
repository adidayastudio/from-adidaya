"use client";

import { useState, Suspense, memo, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, ListFilter, X } from "lucide-react";
import clsx from "clsx";
import PageWrapper from "@/components/layout/PageWrapper";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import NotificationsContent, { NotificationSection } from "@/components/dashboard/notifications/NotificationsContent";
import { useHeader } from "@/components/providers/HeaderProvider";
import { motion, AnimatePresence } from "framer-motion";

// Stable component with URL state and expandable UI
const NotificationHeaderActions = memo(() => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(!!searchParams.get("q"));
  const [localQuery, setLocalQuery] = useState(searchParams.get("q") || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSearch = (val: string) => {
    setLocalQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
        params.set("q", val);
    } else {
        params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setIsExpanded(false);
  };

  const toggleExpand = () => {
    if (!isExpanded) {
        setIsExpanded(true);
    }
  };

  return (
    <div className="flex items-center gap-2 pointer-events-auto">
      {/* Search Bubble */}
      <div 
        onClick={toggleExpand}
        className={clsx(
            "flex h-9 items-center rounded-full border bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl shadow-sm transition-all duration-300 cursor-pointer relative",
            isExpanded ? "w-[240px]" : "w-9"
        )}
      >
        <div className="w-9 h-9 flex items-center justify-center shrink-0">
          <Search size={18} strokeWidth={1.5} className="text-neutral-800 dark:text-neutral-200" />
        </div>
        
        <div className="flex-1 h-full min-w-0 flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search"
              value={localQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onBlur={() => !localQuery && setIsExpanded(false)}
              className="bg-transparent border-none outline-none text-[12px] font-medium text-neutral-800 dark:text-white placeholder:text-neutral-500 w-full h-full pr-2"
            />
        </div>

        {localQuery && (
          <button 
            onClick={clearSearch}
            className="w-8 h-8 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 rounded-full transition-colors mr-1 shrink-0 group/btn"
          >
            <X size={16} strokeWidth={2} className="text-neutral-500 group-hover/btn:text-neutral-800 dark:group-hover/btn:text-white transition-colors" />
          </button>
        )}
      </div>

      {/* Filter Bubble */}
      <button className="h-9 w-9 flex items-center justify-center rounded-full border bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl hover:bg-white/20 dark:hover:bg-neutral-700/40 text-neutral-800 dark:text-neutral-200 transition-all active:scale-95 shadow-sm">
        <ListFilter size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
});

NotificationHeaderActions.displayName = "NotificationHeaderActions";

function NotificationsPageContent() {
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") as NotificationSection) || "all";
  const searchQuery = searchParams.get("q") || "";

  // Stable header config
  const headerConfig = useMemo(() => ({
    right: <NotificationHeaderActions />
  }), []);

  useHeader(headerConfig);

  return (
    <PageWrapper
        sidebar={<DashboardSidebar />}
        isTransparent
    >
      <div className="w-full">
        <NotificationsContent 
          section={section} 
          externalSearchQuery={searchQuery} 
          onSearchChange={() => {}} // Not needed as we use URL state
        />
      </div>
    </PageWrapper>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<GlobalLoading />}>
      <NotificationsPageContent />
    </Suspense>
  );
}
