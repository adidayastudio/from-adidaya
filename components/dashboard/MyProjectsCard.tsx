export default function MyProjectsCard() {
  return (
    <section className="rounded-[8px] bg-neutral-100 p-4 h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          My Projects
        </h3>
        <button className="text-xs text-neutral-500 hover:text-red-600 transition">
          View all
        </button>
      </div>

      {/* PROJECT LIST */}
      <div className="space-y-2">
        <ProjectRow
          code="PRG"
          name="Precision Gym"
          stage="ED"
          progress={65}
        />
        <ProjectRow
          code="JPF"
          name="JPadel Fatmawati"
          stage="SD"
          progress={26}
        />
        <ProjectRow
          code="TPC"
          name="Torpedo Clinic"
          stage="ED"
          progress={75}
        />
      </div>
    </section>
  );
}

function ProjectRow({
  code,
  name,
  stage,
  progress,
}: {
  code: string;
  name: string;
  stage: string;
  progress: number;
}) {
  const { bar, text } = getProgressColor(progress);

  return (
    <div className="grid grid-cols-[48px_1fr_56px_120px_32px] items-center gap-2 px-2 py-2 rounded-md hover:bg-white transition cursor-pointer">
      {/* CODE */}
      <span className="text-xs text-neutral-500">
        {code}
      </span>

      {/* NAME */}
      <p className="text-sm font-medium text-neutral-900 truncate">
        {name}
      </p>

      {/* STAGE */}
      <span className="text-xs text-neutral-500">
        {stage}
      </span>

      {/* PROGRESS */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-full rounded-full bg-neutral-300/40 overflow-hidden">
          <div
            className={`h-full rounded-full ${bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${text} w-[32px] text-right`}>
          {progress}%
        </span>
      </div>

      {/* ARROW */}
      <span className="text-neutral-400 text-sm">›</span>
    </div>
  );
}

function getProgressColor(progress: number) {
  if (progress < 25) {
    return {
      bar: "bg-red-500",
      text: "text-red-600",
    };
  }

  if (progress < 50) {
    return {
      bar: "bg-orange-500",
      text: "text-orange-600",
    };
  }

  if (progress < 75) {
    return {
      bar: "bg-blue-500",
      text: "text-blue-600",
    };
  }

  return {
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  };
}
