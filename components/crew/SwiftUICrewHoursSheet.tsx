import React from 'react';
import { CrewHoursModal } from './CrewHoursModal';
import { DailyLog } from './mockData';

interface SwiftUICrewHoursSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (regularHours: number, ot1: number, ot2: number, ot3: number) => void;
    log: DailyLog | null;
    crewName: string;
    crewRole: string;
}

export const SwiftUICrewHoursSheet: React.FC<SwiftUICrewHoursSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    log,
    crewName,
    crewRole,
}) => {
    return (
        <CrewHoursModal
            visible={isOpened}
            onClose={onClose}
            onSave={onSave}
            log={log}
            crewName={crewName}
            crewRole={crewRole}
        />
    );
};
