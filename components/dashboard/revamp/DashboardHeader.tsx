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
import Image from "next/image";

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

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
  const firstName = profile?.name?.split(' ')[0] || "Team";

  return (
    <>
      {isScrolled && <div className="h-[52px]" />}
      <div className={clsx(
        "flex items-center justify-between pt-4 pb-2 px-4 z-50 transition-all duration-200",
        isScrolled
          ? "fixed top-0 left-0 right-0"
          : "relative"
      )}>
        {/* Greeting Section */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-none flex items-center justify-center border border-neutral-100 dark:border-neutral-700 overflow-hidden">
            <Image src="/logo-adidaya-red.svg" alt="Adidaya" width={20} height={20} className="w-5 h-5 object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white transition-colors">
            {greeting}, {firstName}
          </h1>
        </div>

        {/* Actions Section */}
        <div className="flex items-center relative" ref={meMenuRef}>
          <div className="flex items-center gap-1 bg-white/50 dark:bg-neutral-800/80 backdrop-blur-2xl rounded-full px-1.5 py-1.5 shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-none border border-white/60 dark:border-neutral-800">
            {/* Notification Bell */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onOpenNotifications}
              className="w-8 h-8 rounded-full flex items-center justify-center relative transition-colors text-neutral-800 dark:text-neutral-200"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-neutral-800" />
              )}
            </motion.button>

            {/* Theme Toggle */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-neutral-800 dark:text-neutral-200"
            >
              {mounted && (
                theme === "dark" ? (
                  <Sun className="w-[18px] h-[18px]" strokeWidth={2} />
                ) : (
                  <Moon className="w-[18px] h-[18px]" strokeWidth={2} />
                )
              )}
            </motion.button>

            {/* User Profile Info Toggle */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsMeMenuOpen(!isMeMenuOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden transition-colors text-neutral-800 dark:text-neutral-200"
            >
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-[18px] h-[18px]" strokeWidth={2} />
              )}
            </motion.button>
          </div>

          {/* Me Menu Dropdown */}
          <AnimatePresence>
            {isMeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.1 }}
                className="absolute top-14 right-0 w-48 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-neutral-800 z-50 p-1.5 origin-top-right transition-colors"
              >
                <button
                  onClick={() => { setIsMeMenuOpen(false); router.push("/feel/people/profile"); }}
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
    </>
  );
}
