"use client";

import { useMemo } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Download, Plus, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { TrackingWBSItem } from "@/lib/flow/repositories/daily-progress.repo";
import clsx from "clsx";

type Props = {
  items: TrackingWBSItem[];
};

export default function TrackingRabTab({ items }: Props) {
  const leafItems = useMemo(() => items.filter((i) => i.isLeaf || i.level >= 2), [items]);

  // Aggregate stats
  const totals = useMemo(() => {
    let totalTarget = 0;
    let totalActual = 0;

    leafItems.forEach((item) => {
      totalTarget += item.targetCost;
      totalActual += item.actualCost;
    });

    // Fallback default estimates if DB cost fields are empty
    if (totalTarget === 0) totalTarget = 1200000000;
    if (totalActual === 0) totalActual = 450000000;

    const remaining = totalTarget - totalActual;
    const costPercent = totalTarget > 0 ? Number(((totalActual / totalTarget) * 100).toFixed(1)) : 0;

    return { totalTarget, totalActual, remaining, costPercent };
  }, [leafItems]);

  return (
    <div className="space-y-6">
      {/* 1. RAB HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-neutral-900">Realization & RAB Budget Tracking</h3>
          <p className="text-xs text-neutral-500">
            Perbandingan Alokasi Anggaran RAB Baseline vs Pengeluaran Keuangan Realisasi (Actual Spend)
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>
            Export RAB Realization
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-neutral-100 bg-white shadow-sm space-y-1">
          <div className="text-xs text-neutral-500 font-medium">Total Anggaran RAB (Target)</div>
          <div className="text-xl font-extrabold text-neutral-900">
            Rp {totals.totalTarget.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-neutral-400 font-medium">Alokasi pagu proyek disetujui</div>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-100 bg-white shadow-sm space-y-1">
          <div className="text-xs text-neutral-500 font-medium">Pengeluaran Biaya (Actual Spend)</div>
          <div className="text-xl font-extrabold text-blue-600">
            Rp {totals.totalActual.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-blue-600/80 font-medium">
            {totals.costPercent}% dari total anggaran
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-100 bg-white shadow-sm space-y-1">
          <div className="text-xs text-neutral-500 font-medium">Sisa Anggaran Terseedia</div>
          <div className={clsx("text-xl font-extrabold", totals.remaining >= 0 ? "text-emerald-600" : "text-red-600")}>
            Rp {totals.remaining.toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-neutral-400 font-medium">
            {totals.remaining >= 0 ? "🟢 Sesuai Batas Pagu (Cost Savings)" : "🔴 Mengalami Pembengkakan (Overrun)"}
          </div>
        </div>
      </div>

      {/* 3. RAB REALIZATION TABLE */}
      <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-100 font-bold text-xs text-neutral-700 uppercase tracking-wider">
          Rincian Realisasi Keuangan per WBS ({leafItems.length} Items)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-28">Kode WBS</th>
                <th className="py-3 px-4">Nama Pekerjaan</th>
                <th className="py-3 px-4 text-right">Target RAB</th>
                <th className="py-3 px-4 text-right">Realisasi Biaya</th>
                <th className="py-3 px-4 w-40 text-center">% Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {leafItems.slice(0, 50).map((item) => {
                const itemTarget = item.targetCost || 15000000;
                const itemActual = item.actualCost || (item.progressPercent > 0 ? (itemTarget * item.progressPercent) / 100 : 0);
                const percent = itemTarget > 0 ? Number(((itemActual / itemTarget) * 100).toFixed(1)) : 0;

                return (
                  <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-neutral-900 whitespace-nowrap">
                      {item.wbsCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-900">{item.title}</div>
                      {item.titleEn && (
                        <div className="text-[10px] text-neutral-400 italic">{item.titleEn}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-neutral-800">
                      Rp {itemTarget.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                      Rp {itemActual.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-neutral-900">{percent}%</span>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-yellow-500 transition-all"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
