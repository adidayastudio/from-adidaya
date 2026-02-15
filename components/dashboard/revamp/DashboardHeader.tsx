"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import useUserProfile from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { Bell, User, Settings, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";

interface DashboardHeaderProps {
  onOpenNotifications: () => void;
}

export default function DashboardHeader({ onOpenNotifications }: DashboardHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUserProfile();
  const { unreadCount } = useNotifications();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMeMenuOpen, setIsMeMenuOpen] = useState(false);
  const meMenuRef = useRef<HTMLDivElement>(null);

  // Notification drawer state - this usually lives in the parent page
  // We'll emit an event or use a callback if passed, but for now let's assume 
  // we might need to lift this state up or provided via context.
  // For the sake of this revamp, let's accept props or just emit a custom event 
  // or use a global store if one existed. 
  // However, looking at the previous Dashboard code, it had `setIsNotifSheetOpen`.
  // I will assume for now we can pass a prop `onOpenNotifications`.

  // NOTE: TO keep this component clean, I will add `onOpenNotifications` to props later. 
  // For now, I'll define the interface.

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
    <div className="flex items-center justify-between py-6 px-1 relative z-10">
      {/* Greeting Section */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
          {greeting}, {firstName}
        </h1>
        <p className="text-white/80 text-sm font-medium mt-1 drop-shadow-sm">
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
          className="w-11 h-11 rounded-full flex items-center justify-center relative border border-neutral-200/30 shadow-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <Bell className="w-5 h-5 text-white" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </motion.button>


        {/* User Profile / Me Menu */}
        <div className="relative" ref={meMenuRef}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsMeMenuOpen(!isMeMenuOpen)}
            className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden border border-neutral-200/30 shadow-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            {/* Placeholder Avatar or User Icon */}
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-white" strokeWidth={1.5} />
            )}
          </motion.button>

          <AnimatePresence>
            {isMeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.1 }}
                className="absolute top-14 right-0 w-48 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 z-50 p-1.5 origin-top-right"
              >
                <button
                  onClick={() => { setIsMeMenuOpen(false); router.push("/feel/people/profile"); }} // Updated to correct profile path as per history
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-100/50 transition-colors text-left text-sm font-medium text-neutral-700"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => { setIsMeMenuOpen(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-100/50 transition-colors text-left text-sm font-medium text-neutral-700"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="h-px bg-neutral-100 my-1" />
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
