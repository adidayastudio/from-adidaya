import React, { useState } from 'react';
import { View } from 'react-native';
import { ProjectDeliverablesDashboard } from './ProjectDeliverablesDashboard';
import { ProjectStageDeliverableEditor } from './ProjectStageDeliverableEditor';

interface ProjectDeliverablesWorkspaceProps {
    project: any;
    isDark: boolean;
    onProjectMetaChange?: (meta: any) => void;
    onDirtyChange?: (dirty: boolean) => void;
}

export function ProjectDeliverablesWorkspace({
    project,
    isDark,
    onProjectMetaChange,
    onDirtyChange
}: ProjectDeliverablesWorkspaceProps) {
    const [selectedStageCode, setSelectedStageCode] = useState<string | null>(null);
    const [selectedSectionCode, setSelectedSectionCode] = useState<string | undefined>(undefined);

    if (selectedStageCode) {
        return (
            <ProjectStageDeliverableEditor
                project={project}
                stageCode={selectedStageCode}
                initialSectionCode={selectedSectionCode}
                isDark={isDark}
                onBack={() => {
                    setSelectedStageCode(null);
                    setSelectedSectionCode(undefined);
                    onDirtyChange?.(false);
                }}
                onProjectMetaChange={onProjectMetaChange}
                onDirtyChange={onDirtyChange}
            />
        );
    }

    return (
        <ProjectDeliverablesDashboard
            project={project}
            isDark={isDark}
            onOpenStageEditor={(stageCode, sectionCode) => {
                setSelectedStageCode(stageCode);
                setSelectedSectionCode(sectionCode);
            }}
        />
    );
}
