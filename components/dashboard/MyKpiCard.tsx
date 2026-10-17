export default function MyKpiCard() {
  /* ======================
     DUMMY DATA (FROM API LATER)
  ====================== */
  const tasksCompleted = 3;
  const taskTarget = 15;

  const projectsInvolved = 3;
  const insightsPublished = 4;

  /* ======================
     DERIVED STATE
  ====================== */
  let taskPercentage = 0;

  if (taskTarget > 0) {
    taskPercentage = Math.round(
      (tasksCompleted / taskTarget) * 100
    );
  }

  const taskValueColor = getTaskKpiColor(tasksCompleted, taskTarget);
  const projectValueColor = getNeutralKpiColor(projectsInvolved);
  const insightValueColor = getNeutralKpiColor(insightsPublished);

  return (
    <section className="rounded-[8px] bg-neutral-100 p-4 h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          My KPI
        </h3>
        <button className="text-xs text-neutral-500 hover:text-red-600 transition">
          View detail
        </button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-3 divide-x divide-neutral-300/60">
        <KpiColumn
          label="Tasks completed"
          value={`${tasksCompleted} / ${taskTarget}`}
          sub={`${taskPercentage}% this week`}
          valueClass={taskValueColor}
        />

        <KpiColumn
          label="Projects involved"
          value={projectsInvolved.toString()}
          sub="active projects"
          valueClass={projectValueColor}
        />

        <KpiColumn
          label="Insights published"
          value={insightsPublished.toString()}
          sub="this month"
          valueClass={insightValueColor}
        />
      </div>
    </section>
  );
}

/* ======================
   SUB COMPONENT
====================== */
function KpiColumn({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass: string;
}) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="text-xs text-neutral-500 mb-1">
        {label}
      </p>
      <p className={`text-xl font-semibold ${valueClass}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-neutral-500 mt-0.5">
          {sub}
        </p>
      )}
    </div>
  );
}

/* ======================
   HELPER FUNCTIONS
====================== */
function getTaskKpiColor(completed: number, target: number) {
  if (target === 0) {
    return "text-neutral-400";
  }

  const pct = (completed / target) * 100;

  if (pct < 50) {
    return "text-red-600";
  }

  if (pct <= 75) {
    return "text-orange-600";
  }

  return "text-emerald-600";
}

function getNeutralKpiColor(value: number) {
  if (value === 0) {
    return "text-neutral-400";
  }

  return "text-neutral-900";
}
