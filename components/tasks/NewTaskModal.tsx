"use client";

import { X } from "lucide-react";
import NewTaskForm from "./NewTaskForm";

export default function NewTaskModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[90] transition-all duration-500"
        onClick={onClose}
      />

      {/* Bottom Floating Drawer */}
      <div className="fixed bottom-2 left-2 right-2 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/40 rounded-[56px] shadow-2xl z-[100] animate-in slide-in-from-bottom duration-500 overflow-hidden flex flex-col max-h-[85vh]">

        {/* Subtle Blue Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-400/15 blur-[100px] pointer-events-none" />

        {/* Drag Handle Indicator */}
        <div className="flex-shrink-0 pt-3 flex justify-center relative z-10">
          <div className="w-10 h-1.5 rounded-full bg-neutral-200/50" />
        </div>

        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-6 relative z-10">
          <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight">
            New Task
          </h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-xl border border-black/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 active:scale-95 transition-all shadow-sm">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto relative z-10">
          <NewTaskForm onClose={onClose} />
        </div>
      </div>
    </>
  );
}
