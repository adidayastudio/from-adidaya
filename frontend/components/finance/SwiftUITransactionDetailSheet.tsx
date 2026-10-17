import React from 'react';
import { TransactionDetailDrawer } from './TransactionDetailDrawer';

interface SwiftUITransactionDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    request: any | null;
    actions?: { id: string; label: string; color: string; type: string; icon: string }[];
    onAction?: (actionId: string, request: any) => void;
    isEmbedded?: boolean;
}

export const SwiftUITransactionDetailSheet: React.FC<SwiftUITransactionDetailSheetProps> = ({
    isOpened,
    onClose,
    request,
    actions = [],
    onAction,
    isEmbedded = false,
}) => {
    return (
        <TransactionDetailDrawer
            visible={isOpened}
            onClose={onClose}
            request={request}
            actions={actions}
            onAction={onAction}
            isEmbedded={isEmbedded}
        />
    );
};
