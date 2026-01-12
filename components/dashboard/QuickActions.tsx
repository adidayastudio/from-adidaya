export default function QuickActions() {
  return (
    <div className="flex gap-2 mb-4">
      <ActionButton label="Absen" icon="⏱️" />
      <ActionButton label="Log Task" icon="📝" />
      <ActionButton label="Progress" icon="📈" />
      <ActionButton label="Upload" icon="⬆️" />
    </div>
  );
}

function ActionButton({ label, icon }: { label: string; icon: string }) {
  return (
    <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-neutral-200 text-sm shadow-sm hover:bg-neutral-100">
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
