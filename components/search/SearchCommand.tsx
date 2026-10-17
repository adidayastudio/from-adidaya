export default function SearchCommand({
  query,
  onSelect,
}: {
  query: string;
  onSelect: () => void;
}) {
  const commands = [
    { cmd: "/new project", action: () => console.log("new project") },
    { cmd: "/add task", action: () => console.log("add task") },
    { cmd: "/upload doc", action: () => console.log("upload doc") },
    { cmd: "/new expense", action: () => console.log("new expense") },
  ];

  const filtered = commands.filter((c) =>
    c.cmd.includes(query.toLowerCase())
  );

  return (
    <div className="p-2">
      {filtered.map((c, i) => (
        <button
          key={i}
          onClick={() => {
            c.action();
            onSelect();
          }}
          className="block w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800"
        >
          {c.cmd}
        </button>
      ))}
    </div>
  );
}
