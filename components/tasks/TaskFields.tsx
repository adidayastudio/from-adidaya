"use client";

import { ChevronDown } from "lucide-react";

export default {
  Title({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div className="px-8 mb-6">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Task Title *</label>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Audit Safety Plan"
          className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 focus:bg-white focus:border-blue-400/30 outline-none transition-all shadow-sm shadow-black/[0.02] placeholder:text-neutral-300 font-sans"
        />
      </div>
    );
  },

  Project({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div className="px-8 mb-6">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Project *</label>
        <div className="relative w-full">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[13px] font-bold text-neutral-800 px-4 appearance-none cursor-pointer outline-none focus:bg-white focus:border-blue-400/30 transition-all font-sans"
          >
            <option value="">Select project</option>
            <option value="Precision Gym">PRG - Precision Gym</option>
            <option value="Padel JPF">JPF - Padel JPF</option>
            <option value="Rumah Tinggal X">RTX - Rumah Tinggal X</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
            <ChevronDown size={18} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    );
  },

  Priority({
    value,
    onChange,
  }: {
    value: "Low" | "Medium" | "High" | "Urgent";
    onChange: (v: any) => void;
  }) {
    return (
      <div className="px-8 mb-6">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Priority</label>
        <div className="relative w-full">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[13px] font-bold text-neutral-800 px-4 appearance-none cursor-pointer outline-none focus:bg-white focus:border-blue-400/30 transition-all font-sans"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
            <ChevronDown size={18} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    );
  },

  Deadline({
    value,
    onChange,
    onClear,
  }: {
    value?: string;
    onChange: (v: string) => void;
    onClear: () => void;
  }) {
    return (
      <div className="px-8 mb-8">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Deadline</label>
        <div className="relative">
          {value ? (
            <div className="flex items-center justify-between bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 px-5 text-[14px] font-medium text-neutral-800">
              <span className="font-sans">{value}</span>
              <button
                onClick={onClear}
                className="text-[11px] font-bold text-blue-500 uppercase tracking-wider"
              >
                Clear
              </button>
            </div>
          ) : (
            <input
              type="date"
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 focus:bg-white focus:border-blue-400/30 outline-none transition-all shadow-sm font-sans"
            />
          )}
        </div>
      </div>
    );
  },
};
