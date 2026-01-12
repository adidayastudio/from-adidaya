"use client";

export default function UpcomingEventsCard() {
  return (
    <section className="rounded-[8px] bg-neutral-100 p-4 h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          Upcoming Events
        </h3>
        <button className="text-xs text-neutral-500 hover:text-red-600 transition">
          View calendar
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-1">
        <EventRow
          id="e1"
          title="Site meeting"
          date="Today · 14:00"
        />
        <EventRow
          id="e2"
          title="Client presentation"
          date="Thu · 10:00"
        />
        <EventRow
          id="e3"
          title="ED submission deadline"
          date="Fri"
        />
      </div>
    </section>
  );
}

function EventRow({
  id,
  title,
  date,
}: {
  id: string;
  title: string;
  date: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-white transition cursor-pointer"
      onClick={() => {
        // nanti: router.push(`/calendar/${id}`)
        console.log("Go to event:", id);
      }}
    >
      <p className="text-sm font-medium text-neutral-900">
        {title}
      </p>
      <span className="text-xs text-neutral-500 whitespace-nowrap">
        {date}
      </span>
    </div>
  );
}
