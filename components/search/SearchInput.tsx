"use client";

export default function SearchInput({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="w-full bg-neutral-800 text-neutral-100 px-4 py-3 rounded-lg outline-none"
      placeholder="Search anything... (Cmd+K to close)"
    />
  );
}
