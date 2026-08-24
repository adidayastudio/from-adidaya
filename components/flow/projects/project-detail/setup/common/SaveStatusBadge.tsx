"use client";

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
  if (status === "saving") {
    return (
      <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200/80 font-medium animate-pulse", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
        <span>Menyimpan...</span>
      </div>
    );
  }

  if (status === "unsaved") {
    return (
      <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-orange-50 text-orange-700 border border-orange-200/80 font-medium", className)}>
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
        <span>Ada perubahan</span>
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

  return (
    <div className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium", className)}>
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      <span>Ter-simpan</span>
    </div>
  );
}

export function SaveFloatingToast({ status, errorMessage, onRetry }: SaveStatusProps) {
  if (status === "saved") {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-neutral-900/90 text-white shadow-xl backdrop-blur-sm border border-neutral-700/50 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-300">
        <CloudCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Perubahan berhasil tersimpan</span>
      </div>
    );
  }

  if (status === "saving") {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-950/90 text-amber-200 shadow-xl backdrop-blur-sm border border-amber-800/50 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-300">
        <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
        <span>Menyimpan perubahan...</span>
      </div>
    );
  }

  if (status === "unsaved") {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-neutral-900/90 text-orange-200 shadow-xl backdrop-blur-sm border border-orange-800/50 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-300">
        <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
        <span>Ada perubahan draf</span>
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
