export default function SearchSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="text-sm text-neutral-400 px-2 mb-2">{title}</div>
      <div>{children}</div>
    </div>
  );
}
