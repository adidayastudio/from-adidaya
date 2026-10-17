import React from 'react';
import { CrewAdjustmentModal } from './CrewAdjustmentModal';
import { CrewMember } from './mockData';

interface SwiftUIAdjustmentSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (amount: number, reason: string, proofName: string, proofUrl: string, isPositive: boolean) => void;
    crewMember: CrewMember | null;
    initialAmount: number;
    initialReason: string;
    initialProofName: string;
    initialProofUrl: string;
    initialIsPositive: boolean;
}

export const SwiftUIAdjustmentSheet: React.FC<SwiftUIAdjustmentSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    crewMember,
    initialAmount,
    initialReason,
    initialProofName,
    initialProofUrl,
    initialIsPositive,
}) => {
    return (
        <CrewAdjustmentModal
            visible={isOpened}
            onClose={onClose}
            onSave={onSave}
            member={crewMember}
            initialAmount={initialAmount}
            initialReason={initialReason}
            initialProofName={initialProofName}
            initialProofUrl={initialProofUrl}
            initialIsPositive={initialIsPositive}
        />
    );
};
