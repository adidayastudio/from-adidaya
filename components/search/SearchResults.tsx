"use client";

import SearchSection from "./SearchSection";
import SearchItem from "./SearchItem";

export default function SearchResults({
  results,
  onSelect,
}: {
  results: any;
  onSelect: () => void;
}) {
  if (!results)
    return <div className="p-4 text-neutral-500">Searching…</div>;

  const sections = [
    { key: "projects", label: "Projects" },
    { key: "tasks", label: "Tasks" },
    { key: "documents", label: "Documents" },
    { key: "people", label: "People" },
    { key: "expenses", label: "Expenses" },
  ];

  return (
    <div className="p-2">
      {sections.map(
        (section) =>
          results[section.key]?.length > 0 && (
            <SearchSection key={section.key} title={section.label}>
              {results[section.key].map((item: any, idx: number) => (
                <SearchItem key={idx} item={item} onClick={onSelect} />
              ))}
            </SearchSection>
          )
      )}
    </div>
  );
}
