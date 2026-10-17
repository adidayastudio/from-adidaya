import React from 'react';
import { CreateRequestDrawer } from './CreateRequestDrawer';

interface SwiftUICreateRequestSheetProps {
    isOpened: boolean;
    onClose: () => void;
    initialType?: 'purchase' | 'reimburse';
    locked?: boolean;
    editRequest?: any | null;
    isEmbedded?: boolean;
}

export const SwiftUICreateRequestSheet: React.FC<SwiftUICreateRequestSheetProps> = ({
    isOpened,
    onClose,
    initialType = 'purchase',
    locked = false,
    editRequest = null,
    isEmbedded = false,
}) => {
    return (
        <CreateRequestDrawer
            visible={isOpened}
            onClose={onClose}
            initialType={initialType}
            locked={locked}
            editRequest={editRequest}
            isEmbedded={isEmbedded}
        />
    );
};

