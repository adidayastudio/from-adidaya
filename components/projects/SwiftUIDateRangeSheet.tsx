import React from 'react';

export interface DateRangeValue {
    startDate: Date | null;
    endDate: Date | null;
    label?: string;
}

export interface SwiftUIDateRangeSheetProps {
    isOpened: boolean;
    onClose: () => void;
    currentRange?: DateRangeValue;
    onApplyRange: (range: DateRangeValue) => void;
}

export const SwiftUIDateRangeSheet: React.FC<SwiftUIDateRangeSheetProps> = ({
    isOpened,
    onClose,
    currentRange,
    onApplyRange,
}) => {
    return null;
};
