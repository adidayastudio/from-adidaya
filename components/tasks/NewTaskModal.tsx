"use client";

import clsx from "clsx";
import NewTaskForm from "./NewTaskForm";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { Button } from "@/shared/ui/primitives/button/button";


export default function NewTaskModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />

      {/* MODAL */}
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-lg">
        <div className="border-b border-neutral-200 px-4 py-3">
          <p className="text-sm font-semibold text-neutral-900">
            New Task
          </p>
        </div>

        <NewTaskForm onClose={onClose} />
      </div>
    </div>
  );
}
