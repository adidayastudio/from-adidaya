"use client";

export default function SearchItem({
  item,
  onClick,
}: {
  item: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 flex flex-col"
    >
      <span className="text-neutral-200">{item.title}</span>
      <span className="text-neutral-500 text-sm">{item.subtitle}</span>
    </button>
  );
}
