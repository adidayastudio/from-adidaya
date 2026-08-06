"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Bell, Sun, Moon, User, Settings, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useNotifications } from "@/hooks/useNotifications";
import useUserProfile from "@/hooks/useUserProfile";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useHeader } from "@/components/providers/HeaderProvider";
import clsx from "clsx";

export default function WebHeader({
  onOpenNotifications
}: {
  onOpenNotifications?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const { profile } = useUserProfile();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const { headerContent } = useHeader();
  const [isMeMenuOpen, setIsMeMenuOpen] = useState(false);
  const meMenuRef = useRef<HTMLDivElement>(null);

  // Dynamic project name tracking state
  const [projectNameLoaded, setProjectNameLoaded] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLoaded = () => {
      setProjectNameLoaded(prev => prev + 1);
    };
    window.addEventListener('project-name-loaded', handleLoaded);
    return () => window.removeEventListener('project-name-loaded', handleLoaded);
  }, []);

  // History state for back/next buttons
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Robust history tracking 
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHistoryButtons = () => {
      const state = window.history.state;

      if (state && typeof state.index === 'number') {
        const currentIdx = state.index;
        setCanGoBack(currentIdx > 0);

        // Track the maximum index reached in this session
        const maxIdx = parseInt(sessionStorage.getItem('adh_max_idx') || '0');
        const newMax = Math.max(maxIdx, currentIdx);
        sessionStorage.setItem('adh_max_idx', newMax.toString());

        setCanGoForward(currentIdx < newMax);
      } else {
        // Fallback for environments without index
        setCanGoBack(window.history.length > 1);
        setCanGoForward(true); // Permissive fallback
      }
    };

    updateHistoryButtons();
    window.addEventListener('popstate', updateHistoryButtons);
    return () => window.removeEventListener('popstate', updateHistoryButtons);
  }, [pathname]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (meMenuRef.current && !meMenuRef.current.contains(event.target as Node)) {
        setIsMeMenuOpen(false);
      }
    };
    if (isMeMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMeMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Filter out tech segments from breadcrumb
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter(s => !["flow", "feel", "frame"].includes(s.toLowerCase()));
  const isVibeActive = !!headerContent.shellBackground;
  const isFinanceRoute = pathname.includes('/flow/finance');
  const hideDefaults = isFinanceRoute || headerContent.hideGlobalActions;
  const isProjectRoute = pathname.includes('/flow/projects') || pathname.includes('/project');

  return (
    <header className="h-[60px] flex items-start px-4 md:px-0 pt-0 gap-3 select-none bg-transparent absolute top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Navigation Buttons Bubble (Hidden on Project pages to avoid clutter over sidebar) */}
      {!isProjectRoute && (
        <div className={clsx(
          "flex h-9 items-center gap-0.5 p-1 rounded-full border shadow-sm pointer-events-auto transition-all duration-500",
          isVibeActive
            ? "bg-white/10 dark:bg-black/10 border-white/10 dark:border-white/5 backdrop-blur-md"
            : "bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl"
        )}>
          {headerContent.left ? (
            headerContent.left
          ) : (
            <>
              <button
                onClick={() => canGoBack && router.back()}
              disabled={!canGoBack}
              className={clsx(
                "p-1.5 rounded-full transition-all",
                isVibeActive
                  ? (canGoBack ? "hover:bg-white/10 text-white" : "opacity-20 text-white cursor-not-allowed")
                  : (canGoBack ? "hover:bg-white/20 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200" : "opacity-30 text-neutral-400 cursor-not-allowed")
              )}
              title="Back"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => canGoForward && window.history.forward()}
              disabled={!canGoForward}
              className={clsx(
                "p-1.5 rounded-full transition-all",
                isVibeActive
                  ? (canGoForward ? "hover:bg-white/10 text-white" : "opacity-20 text-white cursor-not-allowed")
                  : (canGoForward ? "hover:bg-white/20 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200" : "opacity-30 text-neutral-400 cursor-not-allowed")
              )}
              title="Forward"
            >
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
      )}

      {/* Custom Left for Finance (if provided) */}
      {isFinanceRoute && headerContent.left && (
        <div className="pointer-events-auto">
          {headerContent.left}
        </div>
      )}

      <div className="flex-1 flex justify-center min-w-0">
        <div className={clsx(
          "flex items-center gap-2 px-6 rounded-full border shadow-sm text-[11px] font-medium pointer-events-auto truncate max-w-full h-9 transition-all duration-500 tracking-tight",
          isVibeActive
            ? "bg-white/10 dark:bg-black/10 border-white/10 dark:border-white/5 backdrop-blur-md text-white/90"
            : "bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl text-neutral-800 dark:text-neutral-200"
        )}>
          {headerContent.middle ? (
            headerContent.middle
          ) : (
            <>
              {/* Desktop breadcrumbs (full) */}
              <div className="hidden lg:flex items-center gap-2 truncate">
                {segments.map((segment, i) => {
                  const isDashboard = segment.toLowerCase() === 'dashboard';
                  const path = isDashboard ? '/dashboard' : '/' + segments.slice(0, i + 1).map(s => s.toLowerCase()).join('/');
                  
                  // Resolve dynamic project name if it is the project segment (index 1)
                  let label = segment;
                  if (i === 1) {
                    if (mounted && typeof window !== 'undefined') {
                      label = sessionStorage.getItem('project_name_' + segment) || 'Project';
                    } else {
                      label = 'Project';
                    }
                  }

                  return (
                    <React.Fragment key={segment}>
                      <Link href={path} className="capitalize opacity-90 truncate hover:opacity-100 transition-opacity">
                        {label.replace(/-/g, ' ')}
                      </Link>
                      {i < segments.length - 1 && (
                        <ChevronRight size={12} className={isVibeActive ? "text-white/40" : "text-neutral-400"} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Smaller screens breadcrumbs (current segment only) */}
              <div className="flex lg:hidden items-center gap-2 truncate">
                {segments.length > 0 ? (
                  <span className="capitalize opacity-100 truncate">
                    {(() => {
                      const idx = segments.length - 1;
                      const segment = segments[idx];
                      if (idx === 1) {
                        if (mounted && typeof window !== 'undefined') {
                          return (sessionStorage.getItem('project_name_' + segment) || 'Project').replace(/-/g, ' ');
                        }
                        return 'Project';
                      }
                      return segment.replace(/-/g, ' ');
                    })()}
                  </span>
                ) : (
                  <Link href="/dashboard" className="hover:opacity-100 transition-opacity">Dashboard</Link>
                )}
              </div>

              {segments.length === 0 && <Link href="/dashboard" className="hidden lg:block hover:opacity-100 transition-opacity">Dashboard</Link>}
            </>
          )}
        </div>
      </div>

      {/* Action Icons Area */}
      <div className="flex items-center gap-2 relative" ref={meMenuRef}>
        {headerContent.right && (
          <div className="pointer-events-auto">
            {headerContent.right}
          </div>
        )}

        {/* Standard Global Icons - Individual Bubbles */}
        {!hideDefaults && (
          <div className="flex items-center gap-2">
            {/* Notification Bubble */}
            <div className={clsx(
              "h-9 w-9 flex items-center justify-center rounded-full border shadow-sm pointer-events-auto transition-all duration-500",
              isVibeActive
                ? "bg-white/10 dark:bg-black/10 border-white/10 dark:border-white/5 backdrop-blur-md"
                : "bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl"
            )}>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onOpenNotifications}
                className={clsx(
                  "p-1.5 rounded-full transition-colors relative",
                  isVibeActive ? "hover:bg-white/10 text-white" : "hover:bg-white/20 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200"
                )}
              >
                <Bell size={18} strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-neutral-800" />
                )}
              </motion.button>
            </div>

          {/* Theme Bubble */}
          <div className={clsx(
            "h-9 w-9 flex items-center justify-center rounded-full border shadow-sm pointer-events-auto transition-all duration-500",
            isVibeActive
              ? "bg-white/10 dark:bg-black/10 border-white/10 dark:border-white/5 backdrop-blur-md"
              : "bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl"
          )}>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={clsx(
                "p-1.5 rounded-full transition-colors",
                isVibeActive ? "hover:bg-white/10 text-white" : "hover:bg-white/20 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200"
              )}
            >
              {mounted && (
                theme === "dark" ? (
                  <Sun size={18} strokeWidth={1.5} />
                ) : (
                  <Moon size={18} strokeWidth={1.5} />
                )
              )}
            </motion.button>
          </div>

          {/* Profile Bubble */}
          <div className={clsx(
            "h-9 w-9 flex items-center justify-center rounded-full border shadow-sm pointer-events-auto transition-all duration-500",
            isVibeActive
              ? "bg-white/10 dark:bg-black/10 border-white/10 dark:border-white/5 backdrop-blur-md"
              : "bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl"
          )}>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsMeMenuOpen(!isMeMenuOpen)}
              className={clsx(
                "w-[28px] h-[28px] rounded-full transition-all overflow-hidden flex items-center justify-center",
                isVibeActive ? "hover:bg-white/10 text-white" : "hover:bg-white/20 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200"
              )}
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={18} strokeWidth={1.5} />
              )}
            </motion.button>
          </div>
        </div>
        )}
        {/* Me Menu Dropdown - Web specific positioning */}
        <AnimatePresence>
          {isMeMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className={clsx(
                "absolute top-12 right-0 w-44 rounded-[22px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] border z-50 p-1 origin-top-right transition-all pointer-events-auto overflow-hidden",
                isVibeActive
                  ? "bg-white/10 dark:bg-black/20 backdrop-blur-3xl border-white/10"
                  : "bg-white/20 dark:bg-neutral-900/40 backdrop-blur-3xl border-white/40 dark:border-white/10"
              )}
            >
              {/* Subtle top highlight glow */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

              <button
                onClick={() => { setIsMeMenuOpen(false); router.push("/feel/people/profile"); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[12px] hover:bg-white/40 dark:hover:bg-white/5 transition-all text-left text-[12px] font-medium text-neutral-800 dark:text-neutral-100 group"
              >
                <User size={13} strokeWidth={1.5} className="text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                Profile
              </button>
              <button
                onClick={() => { setIsMeMenuOpen(false); router.push("/settings"); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[12px] hover:bg-white/40 dark:hover:bg-white/5 transition-all text-left text-[12px] font-medium text-neutral-800 dark:text-neutral-100 group"
              >
                <Settings size={13} strokeWidth={1.5} className="text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                Settings
              </button>
              <div className="h-px bg-neutral-800/5 dark:bg-white/5 my-0.5 mx-1 transition-colors" />
              <button
                onClick={() => { setIsMeMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[12px] hover:bg-red-500/10 transition-all text-left text-[12px] font-medium text-red-500 group"
              >
                <LogOut size={13} strokeWidth={1.5} />
                Log Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
