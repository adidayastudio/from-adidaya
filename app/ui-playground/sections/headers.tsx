"use client";

import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { HeaderMetaItem } from "@/shared/ui/headers/HeaderMetaItem";
import { Button } from "@/shared/ui/primitives";
import { ProjectContextHeader } from "@/shared/ui/headers/ProjectContextHeader";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <p className="text-xs font-medium uppercase text-neutral-500">
        {title}
      </p>
      {children}
    </section>
  );
}

export default function HeadersPlayground() {
  return (
    <div className="space-y-12 p-6">

      {/* A — Title only */}
      <Section title="PageHeader — Title only">
        <PageHeader title="Tasks" />
      </Section>

      {/* B — Title + Meta */}
      <Section title="PageHeader — With meta">
        <PageHeader
          title="Tasks"
          meta={
            <>
              <HeaderMetaItem>24 active</HeaderMetaItem>
              <span className="text-neutral-400">·</span>
              <HeaderMetaItem tone="danger">
                6 overdue
              </HeaderMetaItem>
            </>
          }
        />
      </Section>

      {/* C — Title + Actions */}
      <Section title="PageHeader — With actions">
        <PageHeader
          title="Tasks"
          actions={
            <Button size="sm">
              + New Task
            </Button>
          }
        />
      </Section>

      {/* D — Title + Meta + Actions */}
      <Section title="PageHeader — Full">
        <PageHeader
          title="Tasks"
          meta={
            <>
              <HeaderMetaItem>24 active</HeaderMetaItem>
              <span className="text-neutral-400">·</span>
              <HeaderMetaItem tone="danger">
                6 overdue
              </HeaderMetaItem>
            </>
          }
          actions={
            <>
              <Button variant="secondary" size="sm">
                Filter
              </Button>
              <Button size="sm">
                + New Task
              </Button>
            </>
          }
        />
      </Section>

      {/* ------------------------------------------------ */}
      {/* PROJECT CONTEXT HEADER */}
      {/* ------------------------------------------------ */}

      <Section title="ProjectContextHeader — Basic">
        <ProjectContextHeader
          projectName="Precision Gym Jakarta"
          meta={
            <>
              <HeaderMetaItem>Design Development</HeaderMetaItem>
              <span className="text-neutral-400">·</span>
              <HeaderMetaItem tone="warning">
                Deadline approaching
              </HeaderMetaItem>
            </>
          }
        />
      </Section>

      <Section title="ProjectContextHeader — With progress">
        <ProjectContextHeader
          projectName="Precision Gym Jakarta"
          meta={
            <>
              <HeaderMetaItem>Construction</HeaderMetaItem>
              <span className="text-neutral-400">·</span>
              <HeaderMetaItem tone="danger">
                12 issues
              </HeaderMetaItem>
            </>
          }
          progress={
            <div className="w-40">
              <div className="text-xs text-neutral-500 mb-1">
                Progress
              </div>
              <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: "62%" }}
                />
              </div>
            </div>
          }
        />
      </Section>

      <Section title="ProjectContextHeader — Full">
        <ProjectContextHeader
          projectName="Precision Gym Jakarta"
          meta={
            <>
              <HeaderMetaItem>Construction</HeaderMetaItem>
              <span className="text-neutral-400">·</span>
              <HeaderMetaItem tone="danger">
                12 issues
              </HeaderMetaItem>
            </>
          }
          progress={
            <div className="w-40">
              <div className="text-xs text-neutral-500 mb-1">
                Progress
              </div>
              <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: "62%" }}
                />
              </div>
            </div>
          }
          actions={
            <Button size="sm">
              Project Settings
            </Button>
          }
        />
      </Section>


    </div>
  );
}
