import { CalendarCell } from "./CalendarCell";
import { CalendarTask } from "./calendar.types";
import { DAYS } from "./calendar.constants";
import { toISO } from "./calendar.utils";
import clsx from "clsx";

export function CalendarGrid({
  monthDate,
  tasks,
  todayISO,
  onMoveTask,
}: {
  monthDate: Date;
  tasks: CalendarTask[];
  todayISO: string;
  onMoveTask: (taskId: string, dateISO: string) => void;
}) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  const startOffset = (start.getDay() + 6) % 7;
  const totalDays = end.getDate();
  const cells = Array.from({ length: startOffset + totalDays });

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-200">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={clsx(
              "px-2 py-2 text-xs font-medium",
              i === 6 ? "text-red-600" : "text-neutral-600",
              i !== 6 && "border-r border-neutral-100"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((_, index) => {
          const dateNum = index - startOffset + 1;
          const isValid = dateNum > 0 && dateNum <= totalDays;

          const dateISO = isValid
            ? toISO(
                new Date(
                  monthDate.getFullYear(),
                  monthDate.getMonth(),
                  dateNum
                )
              )
            : "";

          const isToday = dateISO === todayISO;
          const isSunday = index % 7 === 6;

          const dayTasks = isValid
            ? tasks.filter((t) => t.dateISO === dateISO)
            : [];

          return (
            <CalendarCell
              key={index}
              dateNum={dateNum}
              dateISO={dateISO}
              isValid={isValid}
              isToday={isToday}
              isSunday={isSunday}
              tasks={dayTasks}
              onMoveTask={(taskId) =>
                onMoveTask(taskId, dateISO)
              }
            />
          );
        })}
      </div>
    </div>
  );
}
