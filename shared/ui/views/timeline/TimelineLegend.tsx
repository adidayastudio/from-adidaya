import clsx from "clsx";
import { STATUS_BAR_STYLE } from "./timeline.constants";
import { TaskStatus } from "./timeline.types";

export function TimelineLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
      {(Object.keys(STATUS_BAR_STYLE) as TaskStatus[]).map((s) => (
        <div
          key={s}
          className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1"
        >
          <span
            className={clsx("h-2.5 w-2.5 rounded-sm border", STATUS_BAR_STYLE[s])}
          />
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
}
