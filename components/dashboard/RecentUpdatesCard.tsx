"use client";

export default function RecentUpdatesCard() {
  return (
    <section className="rounded-[8px] bg-neutral-100 p-4 h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          Recent Updates
        </h3>
        <button className="text-xs text-neutral-500 hover:text-red-600 transition">
          View all
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-1">
        <UpdateRow
          id="u1"
          title="Task assigned to you"
          meta="Finalize render · JPadel"
        />
        <UpdateRow
          id="u2"
          title="New comment added"
          meta="ED revision · Precision Gym"
        />
        <UpdateRow
          id="u3"
          title="Document uploaded"
          meta="Handover checklist · Torpedo Clinic"
        />
      </div>
    </section>
  );
}

function UpdateRow({
  id,
  title,
  meta,
}: {
  id: string;
  title: string;
  meta: string;
}) {
  return (
    <div
      className="px-2 py-2 rounded-md hover:bg-white transition cursor-pointer"
      onClick={() => {
        // nanti: route ke task / doc / comment terkait
        console.log("Go to update:", id);
      }}
    >
      <p className="text-sm font-medium text-neutral-900 leading-tight">
        {title}
      </p>
      <p className="text-xs text-neutral-500">
        {meta}
      </p>
    </div>
  );
}
