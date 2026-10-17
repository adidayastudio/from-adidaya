import React from 'react';
import { AddFundingSourceModal } from './AddFundingSourceModal';

interface SwiftUIAddFundingSourceSheetProps {
    isOpened: boolean;
    onClose: () => void;
    source?: any | null;
    isEmbedded?: boolean;
}

export const SwiftUIAddFundingSourceSheet: React.FC<SwiftUIAddFundingSourceSheetProps> = ({
    isOpened,
    onClose,
    source = null,
    isEmbedded = false,
}) => {
    return (
        <AddFundingSourceModal
            visible={isOpened}
            onClose={onClose}
            source={source}
            isEmbedded={isEmbedded}
        />
    );
};
