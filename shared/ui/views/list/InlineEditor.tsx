"use client";

import { useState } from "react";
import clsx from "clsx";

export function InlineEditor({
  value,
  completed,
}: {
  value: string;
  completed?: boolean;
}) {
  const [text, setText] = useState(value);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(false);
          if (e.key === "Escape") {
            setText(value);
            setEditing(false);
          }
        }}
        className="w-full text-sm font-semibold outline-none border-b border-neutral-300 focus:border-brand-red"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={clsx(
        "text-left w-full truncate text-sm font-semibold",
        completed ? "line-through text-neutral-400" : "text-neutral-900"
      )}
    >
      {text}
    </button>
  );
}
