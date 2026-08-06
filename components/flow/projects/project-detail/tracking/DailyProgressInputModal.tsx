"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { TrackingWBSItem, updateDailyWBSProgress } from "@/lib/flow/repositories/daily-progress.repo";
import { Calendar, CloudSun, AlertTriangle, CheckCircle2, DollarSign, Layers, X } from "lucide-react";
import clsx from "clsx";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: TrackingWBSItem[];
  preSelectedItem?: TrackingWBSItem | null;
  onSuccess: () => void;
};

export default function DailyProgressInputModal({
  isOpen,
  onClose,
  items,
  preSelectedItem,
  onSuccess,
}: Props) {
  const leafItems = useMemo(() => items.filter((i) => i.isLeaf), [items]);

  const [selectedWbsId, setSelectedWbsId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addedQuantity, setAddedQuantity] = useState<number | "">("");
  const [targetQuantityInput, setTargetQuantityInput] = useState<number | "">("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [weather, setWeather] = useState<string>("Cerah");
  const [status, setStatus] = useState<"in_progress" | "delayed" | "completed" | "pending">("in_progress");
  const [delayDays, setDelayDays] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [actualCost, setActualCost] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set initial selected item when modal opens
  useEffect(() => {
    if (preSelectedItem) {
      setSelectedWbsId(preSelectedItem.id);
      setTargetQuantityInput(preSelectedItem.targetQuantity);
      setStatus(preSelectedItem.status);
      setDelayDays(preSelectedItem.delayDays);
    } else if (leafItems.length > 0 && !selectedWbsId) {
      setSelectedWbsId(leafItems[0].id);
      setTargetQuantityInput(leafItems[0].targetQuantity);
    }
  }, [preSelectedItem, leafItems, isOpen]);

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedWbsId) || null;
  }, [items, selectedWbsId]);

  // Handle changing selected WBS item
  const handleSelectWBS = (id: string) => {
    setSelectedWbsId(id);
    const found = items.find((i) => i.id === id);
    if (found) {
      setTargetQuantityInput(found.targetQuantity);
      setStatus(found.status);
      setDelayDays(found.delayDays);
    }
  };

  // Calculations
  const targetQty = Number(targetQuantityInput || selectedItem?.targetQuantity || 0);
  const currentActual = selectedItem?.actualQuantity || 0;
  const addedQty = Number(addedQuantity || 0);
  const newTotalActual = currentActual + addedQty;
  const newProgressPercent = targetQty > 0 ? Math.min(100, Number(((newTotalActual / targetQty) * 100).toFixed(1))) : 0;
  const remainingVolume = Math.max(0, targetQty - newTotalActual);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return leafItems.slice(0, 30);
    const q = searchQuery.toLowerCase();
    return leafItems.filter(
      (item) => item.wbsCode.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [leafItems, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWbsId) return;

    try {
      setIsSubmitting(true);
      const success = await updateDailyWBSProgress({
        wbsId: selectedWbsId,
        addedQuantity: addedQty,
        totalActualQuantity: newTotalActual,
        targetQuantity: targetQty,
        date,
        weather,
        notes,
        actualCost: Number(actualCost || 0),
        statusOverride: status,
        delayDaysOverride: delayDays,
      });

      if (success) {
        onSuccess();
        onClose();
        // Reset form
        setAddedQuantity("");
        setNotes("");
        setActualCost("");
      } else {
        alert("❌ Gagal menyimpan progres harian. Silakan coba lagi.");
      }
    } catch (err: any) {
      console.error(err);
      alert("❌ Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-2xl w-full bg-white p-6 rounded-2xl shadow-xl border border-neutral-100 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <span className="p-2 bg-brand-red/10 text-brand-red rounded-lg">
              <Layers className="w-5 h-5" />
            </span>
            Input Progres & Realisasi Lapangan Harian
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* 1. SELECT WBS ITEM */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
              Pilih Pekerjaan WBS
            </label>
            <div className="space-y-2">
              <Input
                placeholder="Cari Kode atau Nama Pekerjaan WBS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm bg-neutral-50"
              />
              <select
                value={selectedWbsId}
                onChange={(e) => handleSelectWBS(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-neutral-200 bg-white font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              >
                {filteredItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.wbsCode} - {item.title} ({item.targetQuantity} {item.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ITEM SUMMARY CARD */}
          {selectedItem && (
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-brand-red">{selectedItem.wbsCode}</div>
                  <div className="text-sm font-semibold text-neutral-900">{selectedItem.title}</div>
                  {selectedItem.titleEn && (
                    <div className="text-xs text-neutral-400 italic">{selectedItem.titleEn}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500 font-medium">Progress Saat Ini</div>
                  <div className="text-base font-extrabold text-neutral-900">{selectedItem.progressPercent}%</div>
                </div>
              </div>

              {/* TARGET VS ACTUAL SUMMARY METRIC */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/60 text-center">
                <div className="bg-white p-2 rounded-lg border border-neutral-100">
                  <div className="text-[10px] text-neutral-400 font-medium">Target Volume</div>
                  <div className="text-xs font-bold text-neutral-800">
                    {targetQty} {selectedItem.unit}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-neutral-100">
                  <div className="text-[10px] text-neutral-400 font-medium">Terpasang Sebelum</div>
                  <div className="text-xs font-bold text-blue-600">
                    {currentActual} {selectedItem.unit}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-neutral-100">
                  <div className="text-[10px] text-neutral-400 font-medium">Sisa Volume</div>
                  <div className="text-xs font-bold text-orange-600">
                    {remainingVolume} {selectedItem.unit}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. VOLUME ENTRY & PROGRESS AUTO CALCULATOR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Tambahan Volume Hari Ini ({selectedItem?.unit || "m³"}) <span className="text-brand-red">*</span>
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 15"
                value={addedQuantity}
                onChange={(e) => setAddedQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-10 text-sm font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Update Target Volume Total ({selectedItem?.unit || "m³"})
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Baseline Target"
                value={targetQuantityInput}
                onChange={(e) => setTargetQuantityInput(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-10 text-sm bg-neutral-50"
              />
            </div>
          </div>

          {/* AUTO CALCULATED RESULT BADGE */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Total Volume Terpasang Baru:</span>
              <strong className="text-blue-900 font-extrabold">{newTotalActual} {selectedItem?.unit || "m³"}</strong>
            </div>
            <div className="bg-blue-600 text-white font-extrabold px-2.5 py-1 rounded-full text-xs">
              → {newProgressPercent}% Progres
            </div>
          </div>

          {/* 3. STATUS & DELAY SELECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">Status Pekerjaan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-neutral-200 bg-white font-medium text-neutral-900 focus:outline-none"
              >
                <option value="in_progress">🟡 Dalam Proses (In Progress)</option>
                <option value="delayed">🔴 Terlambat (Delayed)</option>
                <option value="completed">🟢 Selesai (Completed - 100%)</option>
                <option value="pending">⚪ Belum Mulai (Pending)</option>
              </select>
            </div>

            {status === "delayed" && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Keterlambatan (Hari)
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Estimasi keterlambatan hari..."
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="h-10 text-sm border-red-200 bg-red-50/50 font-bold text-red-700"
                />
              </div>
            )}

            {status !== "delayed" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" /> Tanggal Update
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            )}
          </div>

          {/* 4. WEATHER & FINANCE EXPENSE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                <CloudSun className="w-3.5 h-3.5 text-yellow-500" /> Kondisi Cuaca Lapangan
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-neutral-200 bg-white font-medium text-neutral-900 focus:outline-none"
              >
                <option value="Cerah">☀️ Cerah / Normal</option>
                <option value="Berawan">☁️ Berawan</option>
                <option value="Hujan Gerimis">🌧️ Hujan Gerimis</option>
                <option value="Hujan Deras">⛈️ Hujan Deras / Penghentian Pekerjaan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Realisasi Biaya / Finance (Rp)
              </label>
              <Input
                type="number"
                placeholder="Pengeluaran harian / Pembelian bahan"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* 5. FIELD NOTES */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Catatan & Kendala Lapangan</label>
            <textarea
              rows={3}
              placeholder="Catatan tambahan (misal: pengadaan semen tertunda, kendala akses jalan masuk, dll)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-sm rounded-xl border border-neutral-200 bg-white font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-neutral-100 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedWbsId}>
              {isSubmitting ? "Saving..." : "Simpan Progres Harian"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
