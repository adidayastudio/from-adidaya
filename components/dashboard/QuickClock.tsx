export default function QuickClock() {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-sm text-neutral-500">Today’s work</p>
        <p className="text-2xl font-semibold text-neutral-900 mt-1">
          02:35
        </p>
        <div className="inline-flex items-center gap-2 mt-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-emerald-700">On Time</span>
        </div>
      </div>

      <button className="px-5 py-2 rounded-xl bg-red-600 text-white font-medium">
        Clock Out
      </button>
    </div>
  );
}
