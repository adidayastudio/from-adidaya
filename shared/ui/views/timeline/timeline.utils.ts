export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDaysISO(iso: string, days: number) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDaysISO(aISO: string, bISO: string) {
  const a = fromISODate(aISO);
  const b = fromISODate(bISO);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const offset = (day + 6) % 7;
  x.setDate(x.getDate() - offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function clampRange(startDate: string, endDate: string) {
  if (fromISODate(startDate) <= fromISODate(endDate)) {
    return { startDate, endDate };
  }
  return { startDate: endDate, endDate: startDate };
}

