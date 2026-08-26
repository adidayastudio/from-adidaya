"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, AlertCircle, CloudCheck } from "lucide-react";
import type { SaveStatus } from "@/lib/hooks/useAutoSave";
import clsx from "clsx";

interface SaveStatusProps {
  status: SaveStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function SaveStatusBadge({ status, errorMessage, onRetry, className }: SaveStatusProps) {
  const [showSavedBadge, setShowSavedBadge] = useState(false);

  useEffect(() => {
    if (status === "saved") {
      setShowSavedBadge(true);
      const timer = setTimeout(() => {
        setShowSavedBadge(false);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setShowSavedBadge(false);
    }
  }, [status]);

  if (status === "saving") {
    return (
      <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 font-medium transition-all", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
        <span>Menyimpan...</span>
      </div>
    );
  }

  if (status === "unsaved") {
    return (
      <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 font-medium transition-all", className)}>
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Ada draf</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <button
        onClick={onRetry}
        title={errorMessage || "Gagal menyimpan, klik untuk mencoba lagi"}
        className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-700 border border-red-200/80 font-medium hover:bg-red-100 transition-colors", className)}
      >
        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
        <span>Gagal Save (Coba Lagi)</span>
      </button>
    );
  }

  if (status === "saved" && showSavedBadge) {
    return (
      <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium transition-all duration-300", className)}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Tersimpan</span>
      </div>
    );
  }

  return null;
}

export function SaveFloatingToast({ status, errorMessage, onRetry }: SaveStatusProps) {
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    if (status === "saved") {
      setShowSavedToast(true);
      const timer = setTimeout(() => {
        setShowSavedToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowSavedToast(false);
    }
  }, [status]);

  if (status === "saved" && showSavedToast) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900/80 text-white shadow-md backdrop-blur-sm border border-neutral-700/40 text-xs font-medium animate-in fade-in duration-200">
        <CloudCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Tersimpan</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        onClick={onRetry}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-950/95 text-red-100 shadow-xl backdrop-blur-sm border border-red-800/60 text-xs font-medium cursor-pointer hover:bg-red-900 transition-colors animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        <span>{errorMessage || "Gagal menyimpan. Klik untuk mencoba lagi"}</span>
      </div>
    );
  }

  return null;
}
