export function DuePill({ value }: { value: string }) {
  const cls =
    value === "Overdue"
      ? "bg-brand-red/10 text-brand-red border border-brand-red/20"
      : value === "Today"
      ? "bg-orange-100 text-orange-700 border border-orange-200"
      : "bg-neutral-100 text-neutral-700 border border-neutral-200";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {value}
    </span>
  );
}
