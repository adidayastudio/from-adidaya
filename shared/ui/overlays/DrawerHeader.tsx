export function DrawerHeader({
  title,
  onClose,
}: {
  title?: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {onClose && (
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}
