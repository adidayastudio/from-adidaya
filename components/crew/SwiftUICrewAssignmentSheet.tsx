import React from 'react';
import { CrewAssignmentModal } from './CrewAssignmentModal';
import { Assignment, CrewMember, Project, CrewDocument } from './mockData';

interface SwiftUICrewAssignmentSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (assignment: Assignment, updatedPreviousAssignment?: Assignment, newDocument?: CrewDocument) => void;
    onDelete?: (id: string) => void;
    assignment: Assignment | null;
    preselectedCrewId?: string;
    crewMembers: CrewMember[];
    projects: Project[];
    assignments: Assignment[];
    onViewDocument?: (html: string, title: string) => void;
}

export const SwiftUICrewAssignmentSheet: React.FC<SwiftUICrewAssignmentSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    onDelete,
    assignment,
    preselectedCrewId,
    crewMembers,
    projects,
    assignments,
    onViewDocument,
}) => {
    return (
        <CrewAssignmentModal
            visible={isOpened}
            onClose={onClose}
            onSave={onSave}
            onDelete={onDelete}
            assignment={assignment}
            preselectedCrewId={preselectedCrewId}
            crewMembers={crewMembers}
            projects={projects}
            assignments={assignments}
            onViewDocument={onViewDocument}
        />
    );
};
