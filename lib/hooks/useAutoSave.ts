"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface UseAutoSaveOptions<T> {
  onSave: (data: T) => Promise<void>;
  delayMs?: number;
}

export function useAutoSave<T>({ onSave, delayMs = 5000 }: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const isPendingSaveRef = useRef<boolean>(false);

  const executeSave = useCallback(
    async (dataToSave: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      try {
        isSavingRef.current = true;
        isPendingSaveRef.current = false;
        setStatus("saving");
        setErrorMessage(null);

        await onSave(dataToSave);

        setStatus("saved");
      } catch (err: any) {
        const msg = err?.message || err?.details || err?.hint || (typeof err === "object" ? JSON.stringify(err) : String(err));
        console.error("Auto-save error:", msg, err);
        setStatus("error");
        setErrorMessage(msg || "Gagal menyimpan perubahan");
      } finally {
        isSavingRef.current = false;

        // If another save was queued during execution, run it now
        if (isPendingSaveRef.current && latestDataRef.current !== null) {
          executeSave(latestDataRef.current);
        }
      }
    },
    [onSave]
  );

  const scheduleSave = useCallback(
    (data: T) => {
      latestDataRef.current = data;
      setStatus("unsaved");
      isPendingSaveRef.current = true;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        executeSave(data);
      }, delayMs);
    },
    [delayMs, executeSave]
  );

  const triggerImmediateSave = useCallback(
    async (data?: T) => {
      const dataToSave = data !== undefined ? data : latestDataRef.current;
      if (dataToSave !== null) {
        await executeSave(dataToSave);
      }
    },
    [executeSave]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    errorMessage,
    scheduleSave,
    triggerImmediateSave,
    setStatus,
  };
}
