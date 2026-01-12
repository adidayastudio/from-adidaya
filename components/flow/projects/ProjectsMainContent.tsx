"use client";

import { ProjectsGroupBy, ProjectsView } from "./ProjectsPageHeader";
import ProjectsListTable from "./ProjectsListTable";
import ProjectsBoardView from "./ProjectsBoardView";

import { Project } from "./data";

export default function ProjectsMainContent({
  view,
  groupBy,
  projects,
}: {
  view: ProjectsView;
  groupBy: ProjectsGroupBy;
  projects: Project[];
}) {
  if (view === "list") return <ProjectsListTable groupBy={groupBy} projects={projects} />;
  if (view === "board") return <ProjectsBoardView groupBy={groupBy} projects={projects} />;
  return null;
}
