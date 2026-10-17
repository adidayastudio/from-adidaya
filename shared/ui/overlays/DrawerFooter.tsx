export function DrawerFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="border-t px-4 py-3 bg-neutral-50">
      {children}
    </div>
  );
}
