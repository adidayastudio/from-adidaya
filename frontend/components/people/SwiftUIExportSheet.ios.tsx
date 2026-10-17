import React, { useState, useEffect } from 'react';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    Switch
} from '@expo/ui/swift-ui';
import { 
    padding, 
    background, 
    ignoreSafeArea, 
    frame, 
    cornerRadius, 
    tint 
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

export interface SwiftUIExportSheetProps {
    isOpened: boolean;
    onClose: () => void;
    activeSegment: string;
    onPreview: (selectedOptions: Record<string, boolean>) => void;
}

export const SwiftUIExportSheet: React.FC<SwiftUIExportSheetProps> = ({
    isOpened,
    onClose,
    activeSegment,
    onPreview,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const sheetBg = 'clear';

    const isPerformanceTab = activeSegment === 'performance';

    const [profileOptions, setProfileOptions] = useState<Record<string, boolean>>({
        identity: true,
        address: true,
        emergency: true,
        social: true,
        employment: true,
        access: true,
        account: true,
        finance: true,
        documents: true,
    });

    const [perfOptions, setPerfOptions] = useState<Record<string, boolean>>({
        overallIndex: true,
        periodInfo: true,
        attendance: true,
        taskCompletion: true,
        projectInvolvement: true,
        taskQuality: true,
        peerReview: true,
        teamBenchmark: true,
    });

    useEffect(() => {
        if (isOpened) {
            // Reset to true on open
            if (isPerformanceTab) {
                setPerfOptions({
                    overallIndex: true,
                    periodInfo: true,
                    attendance: true,
                    taskCompletion: true,
                    projectInvolvement: true,
                    taskQuality: true,
                    peerReview: true,
                    teamBenchmark: true,
                });
            } else {
                setProfileOptions({
                    identity: true,
                    address: true,
                    emergency: true,
                    social: true,
                    employment: true,
                    access: true,
                    account: true,
                    finance: true,
                    documents: true,
                });
            }
        }
    }, [isOpened, isPerformanceTab]);

    const currentOptions = isPerformanceTab ? perfOptions : profileOptions;

    const toggleSelectAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isPerformanceTab) {
            const allSelected = Object.values(perfOptions).every(Boolean);
            const next = Object.keys(perfOptions).reduce((acc, k) => {
                acc[k] = !allSelected;
                return acc;
            }, {} as Record<string, boolean>);
            setPerfOptions(next);
        } else {
            const allSelected = Object.values(profileOptions).every(Boolean);
            const next = Object.keys(profileOptions).reduce((acc, k) => {
                acc[k] = !allSelected;
                return acc;
            }, {} as Record<string, boolean>);
            setProfileOptions(next);
        }
    };

    const handlePreview = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        onPreview(currentOptions);
    };

    const title = isPerformanceTab ? 'Export Performance' : 'Export Profile';

    const allSelected = Object.values(currentOptions).every(Boolean);

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.85, 0.95]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg),
                    frame({ maxWidth: Infinity })
                ]}>
                    {/* Native SwiftUI Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 16, leading: 20, trailing: 20, bottom: 8 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {title}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            variant="glass"
                            color="#007AFF"
                            onPress={toggleSelectAll}
                            modifiers={[padding({ horizontal: 6 })]}
                        >
                            <SwiftUIText size={13} weight="semibold" color="#007AFF">
                                {allSelected ? 'Deselect All' : 'Select All'}
                            </SwiftUIText>
                        </Button>
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Native SwiftUI Form with Inset Grouped Sections */}
                    <Form modifiers={[background(sheetBg)]}>
                        {isPerformanceTab ? (
                            <>
                                <Section title="Snapshot & Timeline">
                                    <Switch
                                        label="Overall Index Score"
                                        value={perfOptions.overallIndex}
                                        onValueChange={(val) => setPerfOptions(prev => ({ ...prev, overallIndex: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Evaluation Timeline & Dates"
                                        value={perfOptions.periodInfo}
                                        onValueChange={(val) => setPerfOptions(prev => ({ ...prev, periodInfo: val }))}
                                        color="#007AFF"
                                    />
                                </Section>

                                <Section title="Core Evaluation Metrics">
                                    <Switch
                                        label="Attendance & Punctuality"
                                        value={perfOptions.attendance}
                                        onValueChange={(val) => setPerfOptions(prev => ({ ...prev, attendance: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Task Completion & Velocity"
                                        value={perfOptions.taskCompletion}
                                        onValueChange={(val) => setPerfOptions(prev => ({ ...prev, taskCompletion: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Project Involvement"
                                        value={perfOptions.projectInvolvement}
                                        onValueChange={(val) => setPerfOptions(prev => ({ ...prev, projectInvolvement: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Task Quality Standards"
                                        value={perfOptions.taskQuality}
                                        onValueChange={(val) => setPerfOptions(prev => ({ ...prev, taskQuality: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Peer & Manager Review"
                                        value={perfOptions.peerReview}
                                        onValueChange={(val) => setPerfOptions(prev => ({ ...prev, peerReview: val }))}
                                        color="#007AFF"
                                    />
                                </Section>

                                <Section title="Benchmarks & Comparisons">
                                    <Switch
                                        label="Team Average Benchmark (KKM)"
                                        value={perfOptions.teamBenchmark}
                                        onValueChange={(val) => setPerfOptions(prev => ({ ...prev, teamBenchmark: val }))}
                                        color="#007AFF"
                                    />
                                </Section>
                            </>
                        ) : (
                            <>
                                <Section title="Personal Identity & Contact">
                                    <Switch
                                        label="Personal Identity"
                                        value={profileOptions.identity}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, identity: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Address Details"
                                        value={profileOptions.address}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, address: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Emergency Contact"
                                        value={profileOptions.emergency}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, emergency: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Social Profiles"
                                        value={profileOptions.social}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, social: val }))}
                                        color="#007AFF"
                                    />
                                </Section>

                                <Section title="Employment & Access">
                                    <Switch
                                        label="Employment Details"
                                        value={profileOptions.employment}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, employment: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Access Role & Security"
                                        value={profileOptions.access}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, access: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Account Info"
                                        value={profileOptions.account}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, account: val }))}
                                        color="#007AFF"
                                    />
                                </Section>

                                <Section title="Financials & Documents">
                                    <Switch
                                        label="Finance & Banking"
                                        value={profileOptions.finance}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, finance: val }))}
                                        color="#007AFF"
                                    />
                                    <Switch
                                        label="Uploaded Documents"
                                        value={profileOptions.documents}
                                        onValueChange={(val) => setProfileOptions(prev => ({ ...prev, documents: val }))}
                                        color="#007AFF"
                                    />
                                </Section>
                            </>
                        )}
                    </Form>

                    {/* Native SwiftUI Footer Button */}
                    <VStack modifiers={[
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 24 }),
                        background(sheetBg),
                        frame({ maxWidth: Infinity })
                    ]}>
                        <Button
                            variant="borderedProminent"
                            color="#007AFF"
                            onPress={handlePreview}
                            modifiers={[
                                frame({ maxWidth: Infinity }),
                                cornerRadius(999)
                            ]}
                        >
                            <HStack modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 46 })
                            ]}>
                                <Spacer />
                                <SwiftUIText weight="bold" size={16} color="#FFFFFF">
                                    Preview PDF Report
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
