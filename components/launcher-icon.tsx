export function LauncherIcon({ title, subtitle, icon }: any) {
  return (
    <div className="group cursor-pointer rounded-2xl bg-neutral-900 border border-neutral-800 p-6 hover:border-red-500 transition-all">
      <div className="mb-4 text-red-400 group-hover:text-red-500 transition">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-neutral-500 text-sm leading-tight">{subtitle}</p>
    </div>
  );
}
