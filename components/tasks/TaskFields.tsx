"use client";

export default {
  Title({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Task name
        </label>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Update layout gym lantai 2"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-red"
        />
      </div>
    );
  },

  Project({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Project
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Select project</option>
          <option value="Precision Gym">Precision Gym</option>
          <option value="Padel JPF">Padel JPF</option>
          <option value="Rumah Tinggal X">Rumah Tinggal X</option>
        </select>
      </div>
    );
  },

  Priority({
    value,
    onChange,
  }: {
    value: "Low" | "Medium" | "High" | "Urgent";
    onChange: (v: any) => void;
  }) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Priority
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>
    );
  },

  Deadline({
    value,
    onChange,
    onClear,
  }: {
    value?: string;
    onChange: (v: string) => void;
    onClear: () => void;
  }) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Deadline
        </label>

        {value ? (
          <div className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <span>{value}</span>
            <button
              onClick={onClear}
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              Clear
            </button>
          </div>
        ) : (
          <input
            type="date"
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        )}
      </div>
    );
  },
};
