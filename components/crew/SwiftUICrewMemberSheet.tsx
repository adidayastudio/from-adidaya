import React from 'react';
import { CrewMemberModal } from './CrewMemberModal';
import { CrewMember } from './mockData';

interface SwiftUICrewMemberSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (member: CrewMember) => void;
    member: CrewMember | null;
}

export const SwiftUICrewMemberSheet: React.FC<SwiftUICrewMemberSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    member,
}) => {
    return (
        <CrewMemberModal
            visible={isOpened}
            onClose={onClose}
            onSave={onSave}
            member={member}
        />
    );
};
