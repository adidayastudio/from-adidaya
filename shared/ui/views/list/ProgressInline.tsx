import clsx from "clsx";

export function ProgressInline({
  value,
  label,
  dimmed,
}: {
  value: number;
  label?: string;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-neutral-200">
        <div
          className={clsx(
            "h-2 rounded-full transition-all",
            dimmed ? "bg-neutral-300" : "bg-brand-red"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      {label && <span className="text-xs text-neutral-500">{label}</span>}
    </div>
  );
}
