import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import type { Project } from '@/lib/api/projects';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PlanningSection, ProjectPlanningPanel } from './ProjectPlanningPanel';

const SECTIONS: { id: PlanningSection; label: string }[] = [
    { id: 'stages', label: 'Stages & Work' },
    { id: 'wbs', label: 'WBS' },
    { id: 'volume', label: 'Volume' },
    { id: 'rab', label: 'RAB' },
    { id: 'schedule', label: 'Schedule' },
];

export function ProjectPlanningNavigation({ project, isDark }: { project: Project; isDark: boolean }) {
    const [section, setSection] = useState<PlanningSection>('stages');
    const [dirty, setDirty] = useState(false);
    const select = (value: string) => {
        const apply = () => { setDirty(false); setSection(value as PlanningSection); };
        if (value === section) return;
        if (!dirty) { apply(); return; }
        if (Platform.OS === 'web') { if (window.confirm('Discard unsaved changes?')) apply(); }
        else Alert.alert('Unsaved changes', 'Discard unsaved changes?', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: apply }]);
    };
    return <View>
        <SegmentedControl segments={SECTIONS} activeSegment={section} onSegmentChange={select} />
        <ProjectPlanningPanel key={section} project={project} section={section} isDark={isDark} onDirtyChange={setDirty} />
    </View>;
}
