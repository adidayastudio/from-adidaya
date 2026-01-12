"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Sun, Moon, Sunrise, Sunset, CloudSun } from "lucide-react";
import useUserProfile from "@/hooks/useUserProfile";

export default function DashboardHeader() {
  const { profile } = useUserProfile();
  const userName = profile?.name || "Adi"; // Fallback to Adi
  const [currentTime, setCurrentTime] = useState(new Date());

  // Time Phase Logic (Matched with FEEL/Clock)
  const getPhase = (date: Date) => {
    const hours = date.getHours();
    if (hours >= 5 && hours < 11) return "morning";
    if (hours >= 11 && hours < 15) return "afternoon";
    if (hours >= 15 && hours < 18) return "late-afternoon";
    if (hours >= 18 && hours < 21) return "evening";
    return "night";
  };

  const phases = {
    morning: { greeting: "Good Morning", color: "text-amber-600", bg: "bg-amber-100", icon: Sunrise },
    afternoon: { greeting: "Good Afternoon", color: "text-blue-600", bg: "bg-blue-100", icon: Sun },
    "late-afternoon": { greeting: "Good Afternoon", color: "text-orange-600", bg: "bg-orange-100", icon: Sunset },
    evening: { greeting: "Good Evening", color: "text-purple-600", bg: "bg-purple-100", icon: CloudSun },
    night: { greeting: "Good Night", color: "text-indigo-900", bg: "bg-indigo-100", icon: Moon },
  };

  const currentPhaseKey = getPhase(currentTime);
  const phase = phases[currentPhaseKey];
  const PhaseIcon = phase.icon;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Live update minute
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-6">
        <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-500", phase.bg)}>
          <PhaseIcon className={clsx("w-6 h-6 transition-colors duration-500", phase.color)} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {phase.greeting}, {userName}
          </h1>
          <p className="text-neutral-500 text-sm">
            Here is what&apos;s happening in your workspace today.
          </p>
        </div>
      </div>
      <div className="h-px bg-neutral-200 w-full" />
    </div>
  );
}
