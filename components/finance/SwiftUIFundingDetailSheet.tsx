import React from 'react';
import { FundingDetailModal } from './FundingDetailModal';

interface SwiftUIFundingDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    source: any | null;
    matchedTransactions: any[];
    onEdit: (source: any) => void;
    isEmbedded?: boolean;
}

export const SwiftUIFundingDetailSheet: React.FC<SwiftUIFundingDetailSheetProps> = ({
    isOpened,
    onClose,
    source,
    matchedTransactions,
    onEdit,
    isEmbedded = false,
}) => {
    return (
        <FundingDetailModal
            visible={isOpened}
            onClose={onClose}
            source={source}
            matchedTransactions={matchedTransactions}
            onEdit={onEdit}
            isEmbedded={isEmbedded}
        />
    );
};
