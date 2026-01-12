"use client";

import { useState, useCallback, useEffect } from "react";
import TaskSection from "./sections/TaskSection";
import TaskTable from "./sections/TaskTable";
import TaskDetailDrawer from "./TaskDetailDrawer";
import { edTasks, ED_SECTIONS, getEDTasksBySection } from "./data/ed";
import { calcSectionSummary } from "./sections/utils/calcSectionSummary";
import { Task } from "./types";
import {
    redistributeTaskWeights,
    redistributeAfterDelete,
    handleWeightEdit,
    getSectionWeight
} from "./logic/weightHelpers";

function renumberTasks(tasks: Task[], sectionCode: string): Task[] {
    const sectionNum = sectionCode.split("-")[1];
    const rootTasks = tasks.filter(t => !t.parentId);
    const subtasks = tasks.filter(t => t.parentId);

    const reNumberedRoot = rootTasks.map((task, index) => ({
        ...task,
        code: `${sectionNum}-${(index + 1).toString().padStart(2, '0')}`
    }));

    const parentSubMap = new Map<string, Task[]>();
    subtasks.forEach(st => {
        const parentId = st.parentId!;
        if (!parentSubMap.has(parentId)) parentSubMap.set(parentId, []);
        parentSubMap.get(parentId)!.push(st);
    });

    const reNumberedSubs: Task[] = [];
    reNumberedRoot.forEach(parent => {
        const subs = parentSubMap.get(parent.id) || [];
        subs.forEach((sub, idx) => {
            reNumberedSubs.push({
                ...sub,
                code: `${parent.code}-${(idx + 1).toString().padStart(2, '0')}`
            });
        });
    });

    const result: Task[] = [];
    reNumberedRoot.forEach(parent => {
        result.push(parent);
        const subs = reNumberedSubs.filter(s => s.parentId === parent.id);
        result.push(...subs);
    });

    return result;
}

export default function StageED() {
    const [openSection, setOpenSection] = useState<string | null>("ED-01");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [allTasks, setAllTasks] = useState<Record<string, Task[]>>(() => {
        const grouped: Record<string, Task[]> = {};
        ED_SECTIONS.forEach(section => {
            grouped[section.code] = getEDTasksBySection(section.code);
        });
        return grouped;
    });

    const [summaries, setSummaries] = useState<Record<string, { totalWeight: number, progress: number }>>({});

    useEffect(() => {
        const newSummaries: Record<string, { totalWeight: number, progress: number }> = {};
        Object.keys(allTasks).forEach(key => {
            newSummaries[key] = calcSectionSummary(allTasks[key]);
        });
        setSummaries(newSummaries);
    }, [allTasks]);

    const toggleSection = (code: string) => {
        setOpenSection(prev => prev === code ? null : code);
    };

    const handleAddTask = useCallback((sectionCode: string, parentId?: string, mode?: "above" | "below" | "subtask", relativeId?: string) => {
        setAllTasks(prev => {
            let sectionTasks = [...(prev[sectionCode] || [])];
            const sectionWeight = getSectionWeight(ED_SECTIONS, sectionCode);

            let insertIndex = sectionTasks.length;
            let newParentId = parentId;

            if (mode === "subtask" && relativeId) {
                const parentTaskIndex = sectionTasks.findIndex(t => t.id === relativeId);
                if (parentTaskIndex === -1) return prev;
                newParentId = sectionTasks[parentTaskIndex].id;
                insertIndex = parentTaskIndex + 1;
            } else if (mode === "above" && relativeId) {
                const relIndex = sectionTasks.findIndex(t => t.id === relativeId);
                insertIndex = relIndex >= 0 ? relIndex : sectionTasks.length;
            } else if (mode === "below" && relativeId) {
                const relIndex = sectionTasks.findIndex(t => t.id === relativeId);
                insertIndex = relIndex >= 0 ? relIndex + 1 : sectionTasks.length;
            }

            const newTask: Task = {
                id: `${sectionCode.toLowerCase()}-${Date.now().toString().slice(-6)}`,
                code: "XX-XX",
                name: "",
                stage: "ED",
                sectionCode: sectionCode,
                weight: 0,
                parentId: newParentId
            };

            sectionTasks.splice(insertIndex, 0, newTask);
            sectionTasks = renumberTasks(sectionTasks, sectionCode);
            sectionTasks = redistributeTaskWeights(sectionTasks, sectionWeight, 0);

            return { ...prev, [sectionCode]: sectionTasks };
        });
    }, []);

    const handleUpdateTask = useCallback((sectionCode: string, taskId: string, field: keyof Task, value: any) => {
        setAllTasks(prev => {
            const sectionTasks = prev[sectionCode] || [];
            const sectionWeight = getSectionWeight(ED_SECTIONS, sectionCode);

            let updatedTasks: Task[];

            if (field === "weight") {
                const tasksWithNewWeight = sectionTasks.map(t => t.id === taskId ? { ...t, weight: value } : t);
                updatedTasks = handleWeightEdit(tasksWithNewWeight, taskId, value, sectionWeight);
            } else {
                updatedTasks = sectionTasks.map(t => t.id === taskId ? { ...t, [field]: value } : t);
            }

            if (selectedTask && selectedTask.id === taskId) {
                const updated = updatedTasks.find(t => t.id === taskId);
                if (updated) setSelectedTask(updated);
            }

            return { ...prev, [sectionCode]: updatedTasks };
        });
    }, [selectedTask]);

    const handleDeleteTask = useCallback((sectionCode: string, taskId: string) => {
        setAllTasks(prev => {
            const oldTasks = prev[sectionCode] || [];
            const deletedTask = oldTasks.find(t => t.id === taskId);
            const sectionWeight = getSectionWeight(ED_SECTIONS, sectionCode);

            let sectionTasks = oldTasks.filter(t => t.id !== taskId);
            sectionTasks = renumberTasks(sectionTasks, sectionCode);

            if (deletedTask && sectionTasks.length > 0) {
                sectionTasks = redistributeAfterDelete(sectionTasks, sectionWeight, deletedTask.weight || 0);
            }

            return { ...prev, [sectionCode]: sectionTasks };
        });
        if (selectedTask?.id === taskId) setIsDrawerOpen(false);
    }, [selectedTask]);

    const handleReorderTask = useCallback((sectionCode: string, fromIndex: number, toIndex: number) => {
        setAllTasks(prev => {
            let sectionTasks = [...(prev[sectionCode] || [])];
            const [moved] = sectionTasks.splice(fromIndex, 1);
            sectionTasks.splice(toIndex, 0, moved);
            sectionTasks = renumberTasks(sectionTasks, sectionCode);
            return { ...prev, [sectionCode]: sectionTasks };
        });
    }, []);

    const handleViewDetail = (task: Task) => {
        setSelectedTask(task);
        setIsDrawerOpen(true);
    };

    const renderSection = (code: string, title: string) => {
        const sectionTasks = allTasks[code] || [];
        const section = ED_SECTIONS.find(s => s.code === code);
        const sectionWeight = section?.weight || 0;

        return (
            <TaskSection
                key={code}
                code={code}
                title={title}
                isOpen={openSection === code}
                onToggle={() => toggleSection(code)}
                totalWeight={sectionWeight}
            >
                <TaskTable
                    tasks={sectionTasks}
                    onAddTask={(parentId, mode, relId) => handleAddTask(code, parentId, mode, relId)}
                    onUpdateTask={(id, field, val) => handleUpdateTask(code, id, field, val)}
                    onDeleteTask={(id) => handleDeleteTask(code, id)}
                    onViewDetail={handleViewDetail}
                    onReorder={(from, to) => handleReorderTask(code, from, to)}
                />
            </TaskSection>
        );
    };

    return (
        <>
            <div className="space-y-0 divide-y divide-neutral-100">
                {ED_SECTIONS.map(section => renderSection(section.code, section.title))}
            </div>

            <TaskDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                task={selectedTask}
                onUpdate={(id, f, v) => handleUpdateTask(selectedTask?.sectionCode || "", id, f, v)}
            />
        </>
    );
}
