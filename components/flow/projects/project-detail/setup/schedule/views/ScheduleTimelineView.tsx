"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/* ================= TYPES ================= */

type ScheduleRow = {
  code: string;
  name: string;
  level: number;
  start?: string;
  finish?: string;
  duration?: number;
  calendar?: string;
  children?: ScheduleRow[];
};

/* ================= DUMMY DATA ================= */

const RAW_DATA: ScheduleRow[] = [
  {
    code: "S",
    name: "Structure",
    level: 1,
    children: [
      {
        code: "S.1",
        name: "Substructure",
        level: 2,
        children: [
          {
            code: "S.1.1",
            name: "Excavation",
            level: 3,
            start: "2026-01-06",
            finish: "2026-01-13",
            duration: 8,
            calendar: "Normal",
          },
          {
            code: "S.1.2",
            name: "Foundation",
            level: 3,
            start: "2026-01-11",
            finish: "2026-01-31",
            duration: 21,
            calendar: "Normal",
          },
        ],
      },
    ],
  },
];

/* ================= DATE UTILS ================= */

const DAY = 86400000;

function daysBetween(a: string, b: string) {
  return Math.round((+new Date(b) - +new Date(a)) / DAY) + 1;
}

function addDays(start: string, days: number) {
  const d = new Date(start);
  d.setDate(d.getDate() + days - 1);
  return d.toISOString().slice(0, 10);
}

/* ================= AUTO CALC ================= */

function autoCalc(row: ScheduleRow): ScheduleRow {
  if (!row.children?.length) return row;

  const children = row.children.map(autoCalc);
  const starts = children.map(c => c.start).filter(Boolean) as string[];
  const finishes = children.map(c => c.finish).filter(Boolean) as string[];

  if (starts.length && finishes.length) {
    const start = starts.sort()[0];
    const finish = finishes.sort().slice(-1)[0];
    return {
      ...row,
      start,
      finish,
      duration: daysBetween(start, finish),
      children,
    };
  }

  return { ...row, children };
}

/* ================= COMPONENT ================= */

export default function ScheduleTimelineView() {
  const [data, setData] = useState(RAW_DATA.map(autoCalc));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    S: true,
    "S.1": true,
  });
  const [editing, setEditing] = useState<string | null>(null);

  function toggle(code: string) {
    setExpanded(s => ({ ...s, [code]: !s[code] }));
  }

  function updateLeaf(code: string, patch: Partial<ScheduleRow>) {
    function walk(row: ScheduleRow): ScheduleRow {
      if (row.code === code && !row.children) {
        const next = { ...row, ...patch };

        if (next.start && next.finish)
          next.duration = daysBetween(next.start, next.finish);

        if (next.start && next.duration && !patch.finish)
          next.finish = addDays(next.start, next.duration);

        return next;
      }
      if (row.children)
        return { ...row, children: row.children.map(walk) };

      return row;
    }
    setData(d => d.map(r => autoCalc(walk(r))));
  }

  function renderRow(row: ScheduleRow): React.ReactNode[] {
    const rows: React.ReactNode[] = [];
    const hasChildren = !!row.children?.length;
    const isOpen = expanded[row.code];
    const isParent = hasChildren;

    rows.push(
      <tr key={row.code} className="border-b text-xs border-neutral-100">
        {/* CODE */}
        <td className="px-4 py-2 font-mono text-neutral-600 w-[120px]">
          <div
            className="flex items-center gap-1"
            style={{ paddingLeft: `${(row.level - 1) * 12}px` }}
          >
            {hasChildren && (
              <button onClick={() => toggle(row.code)}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            {row.code}
          </div>
        </td>

        {/* ACTIVITY */}
        <td className="px-4 py-3 pr-6">{row.name}</td>

        {/* START */}
        <td className="px-4 py-3 w-[130px]">
          {isParent ? (
            <span className="text-neutral-500">{row.start ?? "—"}</span>
          ) : editing === `${row.code}:start` ? (
            <input
              type="date"
              value={row.start}
              autoFocus
              className="border rounded px-1 text-xs w-full"
              onBlur={() => setEditing(null)}
              onChange={e =>
                updateLeaf(row.code, { start: e.target.value })
              }
            />
          ) : (
            <span
              className="cursor-text"
              onClick={() => setEditing(`${row.code}:start`)}
            >
              {row.start}
            </span>
          )}
        </td>

        {/* FINISH */}
        <td className="px-4 py-3 w-[130px]">
          {isParent ? (
            <span className="text-neutral-500">{row.finish ?? "—"}</span>
          ) : editing === `${row.code}:finish` ? (
            <input
              type="date"
              value={row.finish}
              autoFocus
              className="border rounded px-1 text-xs w-full"
              onBlur={() => setEditing(null)}
              onChange={e =>
                updateLeaf(row.code, { finish: e.target.value })
              }
            />
          ) : (
            <span
              className="cursor-text"
              onClick={() => setEditing(`${row.code}:finish`)}
            >
              {row.finish}
            </span>
          )}
        </td>

        {/* DURATION */}
        <td className="px-4 py-3 pr-6 text-right w-[140px]">
          {isParent ? (
            row.duration ?? "—"
          ) : editing === `${row.code}:duration` ? (
            <input
              type="number"
              value={row.duration}
              autoFocus
              className="border rounded px-1 text-xs w-full text-right"
              onBlur={() => setEditing(null)}
              onChange={e =>
                updateLeaf(row.code, {
                  duration: Number(e.target.value),
                })
              }
            />
          ) : (
            <span
              className="cursor-text"
              onClick={() => setEditing(`${row.code}:duration`)}
            >
              {row.duration}
            </span>
          )}
        </td>

        {/* DEPENDENCY */}
        <td className="px-4 py-3 w-[140px] text-neutral-400">—</td>

        {/* CALENDAR */}
        <td className="px-4 py-3 w-[110px] text-neutral-500">
          {row.calendar ?? "Normal"}
        </td>
      </tr>
    );

    if (hasChildren && isOpen)
      row.children!.forEach(c => rows.push(...renderRow(c)));

    return rows;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
        <tr className="border-b border-neutral-200">
            <th className="px-4 py-3 text-left text-neutral-500 w-[120px]">
            Code
            </th>
            <th className="px-4 py-3 pr-6 text-left text-neutral-500">
            Activity
            </th>
            <th className="px-4 py-3 text-left text-neutral-500 w-[140px]">
            Start
            </th>
            <th className="px-4 py-3 text-left text-neutral-500 w-[140px]">
            Finish
            </th>
            <th className="px-4 py-3 text-right text-neutral-500 w-[160px]">
            Duration (days)
            </th>
            <th className="px-4 py-3 text-left text-neutral-500 w-[160px]">
            Dependency
            </th>
            <th className="px-4 py-3 text-left text-neutral-500 w-[120px]">
            Calendar
            </th>
        </tr>
        </thead>


        <tbody>{data.flatMap(renderRow)}</tbody>
      </table>
    </div>
  );
}
