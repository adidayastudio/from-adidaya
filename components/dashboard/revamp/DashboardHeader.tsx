"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import useUserProfile from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { Bell, User, Settings, LogOut, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import { useTheme } from "next-themes";

interface DashboardHeaderProps {
  onOpenNotifications: () => void;
}

export default function DashboardHeader({ onOpenNotifications }: DashboardHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUserProfile();
  const { unreadCount } = useNotifications();
  const { theme, setTheme } = useTheme();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMeMenuOpen, setIsMeMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const meMenuRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch by only rendering theme-dependent UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute is enough for greeting
    return () => clearInterval(timer);
  }, []);

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

  const getGreeting = (date: Date) => {
    const hours = date.getHours();
    if (hours >= 5 && hours < 11) return "Good Morning";
    if (hours >= 11 && hours < 15) return "Good Afternoon";
    if (hours >= 15 && hours < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const greeting = getGreeting(currentTime);
  const firstName = profile?.name?.split(' ')[0] || "Adi";

  return (
    <div className="flex items-center justify-between py-6 px-4 relative z-50">
      {/* Greeting Section */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white transition-colors">
          {greeting}, {firstName}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mt-1 transition-colors">
          {greeting === "Good Morning" && "Ready to start your day?"}
          {greeting === "Good Afternoon" && "Hope your day is going well."}
          {greeting === "Good Evening" && "Time to wind down."}
        </p>
      </div>

      {/* Actions Section */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onOpenNotifications}
          className="w-11 h-11 rounded-full flex items-center justify-center relative border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm transition-colors"
        >
          <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-300" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900" />
          )}
        </motion.button>

        {/* Theme Toggle */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-11 h-11 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm transition-colors"
        >
          {mounted && (
            theme === "dark" ? (
              <Sun className="w-5 h-5 text-neutral-300" strokeWidth={1.5} />
            ) : (
              <Moon className="w-5 h-5 text-neutral-600" strokeWidth={1.5} />
            )
          )}
        </motion.button>

        {/* User Profile / Me Menu */}
        <div className="relative" ref={meMenuRef}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsMeMenuOpen(!isMeMenuOpen)}
            className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm transition-colors"
          >
            {/* Placeholder Avatar or User Icon */}
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-neutral-600 dark:text-neutral-300" strokeWidth={1.5} />
            )}
          </motion.button>

          <AnimatePresence>
            {isMeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.1 }}
                className="absolute top-14 right-0 w-48 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-neutral-800 z-50 p-1.5 origin-top-right transition-colors"
              >
                <button
                  onClick={() => { setIsMeMenuOpen(false); router.push("/feel/people/profile"); }} // Updated to correct profile path as per history
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors text-left text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => { setIsMeMenuOpen(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors text-left text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1 transition-colors" />
                <button
                  onClick={() => { setIsMeMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50/50 text-red-600 transition-colors text-left text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
