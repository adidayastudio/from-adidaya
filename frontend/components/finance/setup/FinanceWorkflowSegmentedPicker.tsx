import React from 'react';
import { Platform } from 'react-native';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';

interface FinanceWorkflowSegmentedPickerProps {
    activeTab: 'purchasing' | 'reimbursement';
    onTabChange: (tab: 'purchasing' | 'reimbursement') => void;
}

const SEGMENTS: Segment[] = [
    { id: 'purchasing', label: 'Purchasing' },
    { id: 'reimbursement', label: 'Reimbursement' },
];

export const FinanceWorkflowSegmentedPicker: React.FC<FinanceWorkflowSegmentedPickerProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceWorkflowSegmentedPicker.ios').FinanceWorkflowSegmentedPicker || require('./FinanceWorkflowSegmentedPicker.ios').default;
        return <Comp {...props} />;
    }

    const { activeTab, onTabChange } = props;

    return (
        <SegmentedControl
            segments={SEGMENTS}
            activeSegment={activeTab}
            onSegmentChange={(id) => onTabChange(id as 'purchasing' | 'reimbursement')}
            fullWidth
        />
    );
};

export default FinanceWorkflowSegmentedPicker;
