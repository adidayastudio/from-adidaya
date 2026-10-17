// shared/ui/headers/HeaderMetaItem.tsx
import clsx from "clsx";

type Tone = "default" | "success" | "warning" | "danger";

export function HeaderMetaItem({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={clsx(
        "text-sm",
        tone === "default" && "text-neutral-500",
        tone === "success" && "text-green-600",
        tone === "warning" && "text-amber-600",
        tone === "danger" && "text-red-600 font-medium"
      )}
    >
      {children}
    </span>
  );
}
