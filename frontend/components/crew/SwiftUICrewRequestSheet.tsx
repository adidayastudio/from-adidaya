import React from 'react';
import { CrewRequestModal } from './CrewRequestModal';
import { CrewRequest, CrewMember, Project } from './mockData';

interface SwiftUICrewRequestSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (request: CrewRequest) => void;
    request: CrewRequest | null;
    crewMembers: CrewMember[];
    projects: Project[];
}

export const SwiftUICrewRequestSheet: React.FC<SwiftUICrewRequestSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    request,
    crewMembers,
    projects,
}) => {
    return (
        <CrewRequestModal
            visible={isOpened}
            onClose={onClose}
            onSave={onSave}
            request={request}
            crewMembers={crewMembers}
            projects={projects}
        />
    );
};
