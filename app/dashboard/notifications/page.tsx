"use client";

import { useState, Suspense, memo, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, ListFilter, X, Loader2 } from "lucide-react";
import clsx from "clsx";
import PageWrapper from "@/components/layout/PageWrapper";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import NotificationsContent, { NotificationSection } from "@/components/dashboard/notifications/NotificationsContent";
import { useHeader } from "@/components/providers/HeaderProvider";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { createNotification } from "@/lib/api/notifications";
import { toast } from "react-hot-toast";

// Stable component with URL state and expandable UI
const NotificationHeaderActions = memo(() => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(!!searchParams.get("q"));
  const [localQuery, setLocalQuery] = useState(searchParams.get("q") || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setHasPermission(Notification.permission === "granted");
      
      const interval = setInterval(() => {
        setHasPermission(Notification.permission === "granted");
      }, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleSendTestNotification = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to test notifications.");
      return;
    }

    setIsTesting(true);
    try {
      const success = await createNotification({
        user_id: user.id,
        type: "success",
        category: "system",
        title: "Test Push System",
        description: "If you see this, push notifications are working correctly! 🎉",
        link: "/dashboard/notifications"
      });
      if (success) {
        toast.success("Test notification sent!");
      } else {
        toast.error("Failed to send test notification.");
      }
    } catch (err) {
      console.error("Test notification error:", err);
      toast.error("An error occurred while sending.");
    } finally {
      setIsTesting(false);
    }
  };

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
      {hasPermission && (
        <button
          onClick={handleSendTestNotification}
          disabled={isTesting}
          className="h-9 px-4 flex items-center gap-1.5 rounded-full border bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl hover:bg-white/20 dark:hover:bg-neutral-700/40 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 transition-all active:scale-95 disabled:opacity-50 shadow-sm shrink-0"
        >
          {isTesting ? (
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sending...
            </span>
          ) : (
            "Send Notif."
          )}
        </button>
      )}

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
