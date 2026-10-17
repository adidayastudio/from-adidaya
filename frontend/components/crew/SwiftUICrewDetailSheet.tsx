import React from 'react';
import { CrewDetailModal } from './CrewDetailModal';
import { CrewMember, Assignment, Project } from './mockData';

interface SwiftUICrewDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    member: CrewMember | null;
    onEdit?: (member: CrewMember) => void;
    onSave?: (member: CrewMember) => void;
    onDelete?: (id: string) => void;
    onViewDocument?: (html: string, title: string) => void;
    onViewImage?: (imageUrl: string, title: string) => void;
    assignments?: Assignment[];
    projects?: Project[];
    crewMembers?: CrewMember[];
}

export const SwiftUICrewDetailSheet: React.FC<SwiftUICrewDetailSheetProps> = ({
    isOpened,
    onClose,
    member,
    onEdit,
    onSave,
    onDelete,
    onViewDocument,
    onViewImage,
    assignments = [],
    projects = [],
    crewMembers = [],
}) => {
    return (
        <CrewDetailModal
            visible={isOpened}
            onClose={onClose}
            member={member}
            onEdit={onEdit}
            onSave={onSave}
            onDelete={onDelete}
            assignments={assignments}
            projects={projects}
            crewMembers={crewMembers}
            onViewImage={onViewImage}
            onViewDocument={onViewDocument}
        />
    );
};
