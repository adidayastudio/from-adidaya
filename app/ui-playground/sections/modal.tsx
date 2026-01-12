"use client";

import { useState } from "react";
import { ModalConfirm, ModalDetail } from "@/shared/ui/modal";

/**
 * UI Playground section.
 * - No styling improvisation
 * - Only uses existing tokens/classes
 * - Only responsible to open/close modals for preview
 */
export function ModalSection() {
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);

  return (
    <div className="space-y-6">
      {/* Triggers (minimal, neutral) */}
      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex items-center rounded-md border border-stroke-subtle bg-bg-200 px-3 py-2 text-small text-text-primary hover:bg-bg-300"
          onClick={() => setOpenConfirm(true)}
          type="button"
        >
          Open Confirm
        </button>

        <button
          className="inline-flex items-center rounded-md border border-stroke-subtle bg-bg-200 px-3 py-2 text-small text-text-primary hover:bg-bg-300"
          onClick={() => setOpenDetail(true)}
          type="button"
        >
          Open Detail
        </button>
      </div>

      {/* Confirm Modal */}
      <ModalConfirm
        open={openConfirm}
        onOpenChange={setOpenConfirm}
        status="danger"
        title="Delete task?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          // preview only
          console.log("confirmed");
        }}
      />

      {/* Detail Modal */}
      <ModalDetail
        open={openDetail}
        onOpenChange={setOpenDetail}
        title="Task – Struktur Kolom Lt.2"
        subtitle="In Progress · STR-02"
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-stroke-subtle bg-bg-200 p-4">
            <div className="text-small text-text-muted">Description</div>
            <div className="mt-1 text-body text-text-primary">
              Isi detail modal di sini (preview).
            </div>
          </div>

          <div className="rounded-lg border border-stroke-subtle bg-bg-200 p-4">
            <div className="text-small text-text-muted">Meta</div>
            <div className="mt-1 text-body text-text-primary">
              Assignee: Adi · Due: 2025-12-25
            </div>
          </div>
        </div>
      </ModalDetail>
    </div>
  );
}
