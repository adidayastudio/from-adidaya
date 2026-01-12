"use client";

import { useState, useMemo } from "react";
import { Project, ProjectView, MOCK_PROJECTS } from "../projects/types";
import ProjectsPageHeader from "../projects/ProjectsPageHeader";
import ProjectsListView from "../projects/ProjectsListView";
import ProjectsBoardView from "../projects/ProjectsBoardView";
import ProjectsCalendarView from "../projects/ProjectsCalendarView";
import ProjectDetail from "../projects/ProjectDetail";
import ProjectForm from "../projects/ProjectForm";

export default function WebsiteProjectsPage() {
    // DATA STATE (Simulated DB)
    const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

    // VIEW STATE
    const [view, setView] = useState<ProjectView>("BOARD");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // NAVIGATION STATE
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Filter Logic
    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            const matchesCategory = categoryFilter === "All" || (project.categories || []).includes(categoryFilter as any);
            const matchesStatus = statusFilter === "All" || project.status === statusFilter;
            return matchesCategory && matchesStatus;
        });
    }, [projects, categoryFilter, statusFilter]);

    // Calendar Navigation State
    const [currentDate, setCurrentDate] = useState(new Date());

    const handleNavigateMonth = (direction: -1 | 1) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    // --- ACTIONS ---

    const handleAddProject = () => {
        setActiveProject(null);
        setIsEditing(true);
    };

    const handleViewProject = (project: Project) => {
        setActiveProject(project);
        setIsEditing(false);
    };

    const handleSaveProject = (projectData: Project) => {
        if (projectData.id) {
            // Update existing - reset to WRITING if was APPROVED/SCHEDULED/PUBLISHED (requires re-approval)
            const original = projects.find(p => p.id === projectData.id);
            if (original && ["APPROVED", "SCHEDULED", "PUBLISHED"].includes(original.status)) {
                projectData = { ...projectData, status: "WRITING" };
            }
            setProjects(prev => prev.map(p => p.id === projectData.id ? projectData : p));
        } else {
            // Create new
            const newProject = { ...projectData, id: Math.random().toString(36).substr(2, 9) };
            setProjects(prev => [newProject, ...prev]);
        }
        setIsEditing(false);
        if (projectData.id) setActiveProject(projectData); // Go back to detail if editing
        else setActiveProject(null); // Go back to list if creating
    };

    const handleDeleteProject = (project: Project) => {
        if (confirm("Are you sure you want to delete " + project.name + "?")) {
            setProjects(prev => prev.filter(p => p.id !== project.id));
            setActiveProject(null);
            setIsEditing(false);
        }
    };

    const handleBack = () => {
        if (isEditing && activeProject) {
            setIsEditing(false); // Back to detail
        } else {
            setActiveProject(null);
            setIsEditing(false); // Back to list
        }
    };

    // Workflow Actions
    const handleSubmitForReview = (project: Project) => {
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: "IN_REVIEW" } : p));
        setActiveProject({ ...project, status: "IN_REVIEW" });
    };

    const handleNeedRevision = (project: Project) => {
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: "NEED_REVISION" } : p));
        setActiveProject({ ...project, status: "NEED_REVISION" });
    };

    const handleApprove = (project: Project) => {
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: "APPROVED" } : p));
        setActiveProject({ ...project, status: "APPROVED" });
    };

    const handlePublish = (project: Project) => {
        const publishDate = new Date().toISOString().split('T')[0];
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: "PUBLISHED", publishDate } : p));
        setActiveProject({ ...project, status: "PUBLISHED", publishDate });
    };

    const handleUnpublish = (project: Project) => {
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: "APPROVED" } : p));
        setActiveProject({ ...project, status: "APPROVED" });
    };

    // --- RENDER ---

    // 1. EDIT/CREATE MODE
    if (isEditing) {
        return (
            <div className="pb-20">
                <ProjectForm
                    initialData={activeProject || undefined}
                    onSave={handleSaveProject}
                    onCancel={handleBack}
                />
            </div>
        );
    }

    // 2. DETAIL MODE
    if (activeProject) {
        return (
            <div>
                <ProjectDetail
                    project={activeProject}
                    onEdit={() => setIsEditing(true)}
                    onDelete={() => handleDeleteProject(activeProject)}
                    onBack={() => setActiveProject(null)}
                    onSubmit={() => handleSubmitForReview(activeProject)}
                    onApprove={() => handleApprove(activeProject)}
                    onNeedRevision={() => handleNeedRevision(activeProject)}
                    onPublish={() => handlePublish(activeProject)}
                    onUnpublish={() => handleUnpublish(activeProject)}
                />
            </div>
        );
    }

    // 3. DASHBOARD MODE (List/Board/Calendar)
    return (
        <div className="space-y-6 pb-20">
            <ProjectsPageHeader
                view={view}
                onChangeView={setView}
                onAddProject={handleAddProject}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
            />

            {view === "LIST" && (
                <ProjectsListView
                    projects={filteredProjects}
                    onEditProject={handleViewProject}
                    onDeleteProject={handleDeleteProject}
                />
            )}

            {view === "BOARD" && (
                <ProjectsBoardView
                    projects={filteredProjects}
                    onEditProject={handleViewProject}
                />
            )}

            {view === "CALENDAR" && (
                <ProjectsCalendarView
                    projects={filteredProjects}
                    currentDate={currentDate}
                    onNavigateMonth={handleNavigateMonth}
                    onCreateProject={(date) => {
                        console.log("Create on date", date);
                        handleAddProject();
                    }}
                    onEditProject={handleViewProject}
                />
            )}
        </div>
    );
}
