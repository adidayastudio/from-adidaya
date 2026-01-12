export function PriorityPill({ value }: { value: string }) {
  const map: Record<string, string> = {
    Urgent: "bg-brand-red/10 text-brand-red border border-brand-red/20",
    High: "bg-orange-100 text-orange-700 border border-orange-200",
    Medium: "bg-neutral-100 text-neutral-700 border border-neutral-200",
    Low: "bg-neutral-50 text-neutral-500 border border-neutral-200",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${map[value]}`}>
      {value}
    </span>
  );
}
