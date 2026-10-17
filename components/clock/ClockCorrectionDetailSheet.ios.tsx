import React from 'react';
import { Share } from 'react-native';
import {
    Host,
    Form,
    Section,
    Button,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Image,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    cornerRadius,
    frame,
} from '@expo/ui/swift-ui/modifiers';
import { AttendanceCorrectionRequest, RequestStatus } from '@/lib/api/attendance';
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';

interface ClockCorrectionDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    item: AttendanceCorrectionRequest | null;
    viewMode?: 'personal' | 'team';
    onViewProof?: (url: string) => void;
    onApprove?: () => void;
    onReject?: () => void;
    onRevision?: () => void;
}

export const ClockCorrectionDetailSheet: React.FC<ClockCorrectionDetailSheetProps> = ({
    isOpened,
    onClose,
    item,
    viewMode = 'personal',
    onViewProof,
    onApprove,
    onReject,
    onRevision,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    if (!item) return null;

    const getStatusColor = (status: RequestStatus) => {
        switch (status) {
            case 'approved': return '#34C759';
            case 'rejected': return '#FF3B30';
            case 'pending': return '#FF9500';
            case 'revision':
            case 'need revision':
                return '#FF9500';
            default: return '#8E8E93';
        }
    };

    const formatDateStr = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd MMM yyyy');
        } catch {
            return dateStr;
        }
    };

    const formatCorrectionTypeName = (type: string) => {
        switch (type) {
            case 'clock_in': return 'Clock-in Time';
            case 'clock_out': return 'Clock-out Time';
            case 'work_location': return 'Work Location';
            case 'attendance_status': return 'Attendance Status';
            default: return type;
        }
    };

    const statusColor = getStatusColor(item.status);

    const handleShare = () => {
        Share.share({
            message: `[Attendance Correction] ${item.userName || 'Employee'} - Date: ${item.attendanceDate} - ${formatCorrectionTypeName(item.correctionType)}: ${item.originalValue} -> ${item.requestedValue}`,
        });
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.82]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                        frame({ maxWidth: Infinity }),
                        padding({ bottom: 20 }),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[padding({ top: 16, leading: 20, trailing: 20, bottom: 8 })]}
                    >
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={20} weight="bold" color={textColor}>
                                Attendance Correction
                            </SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>
                                {item.requestNumber || 'AC-007-00000'}
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        <HStack spacing={12}>
                            <Button systemImage="square.and.arrow.up" color="gray" onPress={handleShare} />
                            <Button systemImage="xmark" role="cancel" color="gray" onPress={onClose} />
                        </HStack>
                    </HStack>

                    <Form>
                        {/* Status & Employee Info */}
                        <Section>
                            <HStack alignment="center">
                                <SwiftUIText size={15} color={textColor}>Status</SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={15} weight="bold" color={statusColor}>
                                    {item.status.toUpperCase()}
                                </SwiftUIText>
                            </HStack>
                            <HStack alignment="center">
                                <SwiftUIText size={15} color={textColor}>Employee</SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={15} color={subtextColor}>
                                    {item.userName || 'Employee'}
                                </SwiftUIText>
                            </HStack>
                            <HStack alignment="center">
                                <SwiftUIText size={15} color={textColor}>Attendance Date</SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={15} color={subtextColor}>
                                    {formatDateStr(item.attendanceDate)}
                                </SwiftUIText>
                            </HStack>
                            <HStack alignment="center">
                                <SwiftUIText size={15} color={textColor}>Correction Type</SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={15} weight="semibold" color="#AF52DE">
                                    {formatCorrectionTypeName(item.correctionType)}
                                </SwiftUIText>
                            </HStack>
                        </Section>

                        {/* Comparison: Before -> After */}
                        <Section title="Requested Changes (Before → After)">
                            <HStack alignment="center">
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={12} color={subtextColor}>ORIGINAL VALUE</SwiftUIText>
                                    <SwiftUIText size={16} weight="medium" color={textColor}>
                                        {item.originalValue}
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <SwiftUIText size={18} color={subtextColor}>➔</SwiftUIText>
                                <Spacer />
                                <VStack alignment="trailing" spacing={2}>
                                    <SwiftUIText size={12} color={subtextColor}>REQUESTED VALUE</SwiftUIText>
                                    <SwiftUIText size={16} weight="bold" color="#34C759">
                                        {item.requestedValue}
                                    </SwiftUIText>
                                </VStack>
                            </HStack>
                        </Section>

                        {/* Reason & Evidence */}
                        <Section title="Reason & Supporting Evidence">
                            <VStack alignment="leading" spacing={4}>
                                <SwiftUIText size={12} color={subtextColor}>JUSTIFICATION</SwiftUIText>
                                <SwiftUIText size={14} color={textColor}>
                                    {item.reason || 'No reason provided'}
                                </SwiftUIText>
                            </VStack>

                            {item.evidenceUrl && (
                                <Button
                                    onPress={() => onViewProof?.(item.evidenceUrl!)}
                                    color="gray"
                                >
                                    <HStack alignment="center" spacing={6}>
                                        <Image systemName="paperclip" size={14} color={subtextColor} />
                                        <SwiftUIText size={15} weight="semibold" color={textColor}>
                                            View Evidence Photo
                                        </SwiftUIText>
                                    </HStack>
                                </Button>
                            )}

                            {item.rejectReason && (
                                <VStack alignment="leading" spacing={4} modifiers={[padding({ top: 6 })]}>
                                    <SwiftUIText size={12} color="#FF3B30">REJECTION REASON</SwiftUIText>
                                    <SwiftUIText size={14} color={textColor}>
                                        {item.rejectReason}
                                    </SwiftUIText>
                                </VStack>
                            )}
                        </Section>

                        {/* Audit Trail info if approved */}
                        {item.approvedBy && (
                            <Section title="Audit Trail">
                                <HStack alignment="center">
                                    <SwiftUIText size={15} color={textColor}>Approved By</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText size={15} color={subtextColor}>
                                        {item.approvedBy}
                                    </SwiftUIText>
                                </HStack>
                                {item.approvedAt && (
                                    <HStack alignment="center">
                                        <SwiftUIText size={15} color={textColor}>Approved At</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} color={subtextColor}>
                                            {format(new Date(item.approvedAt), 'dd MMM yyyy, HH:mm')}
                                        </SwiftUIText>
                                    </HStack>
                                )}
                            </Section>
                        )}
                    </Form>

                    {/* Bottom Actions Outside Form */}
                    <VStack spacing={12} modifiers={[padding({ horizontal: 20, top: 12, bottom: 10 })]}>
                        {viewMode === 'team' && item.status === 'pending' ? (
                            <VStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
                                {/* Top Row: Reject & Revision */}
                                <HStack spacing={10}>
                                    <Button
                                        variant="glass"
                                        color="red"
                                        onPress={onReject}
                                        modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                    >
                                        <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={17} color="#FF3B30">Reject</SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                    {onRevision && (
                                        <Button
                                            variant="glass"
                                            color="orange"
                                            onPress={onRevision}
                                            modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                        >
                                            <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                                <Spacer />
                                                <SwiftUIText weight="semibold" size={17} color="#FF9500">Revision</SwiftUIText>
                                                <Spacer />
                                            </HStack>
                                        </Button>
                                    )}
                                </HStack>

                                {/* Bottom Row: Big Approve & Apply */}
                                <Button
                                    variant="borderedProminent"
                                    color="#34C759"
                                    onPress={onApprove}
                                    modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                >
                                    <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                        <Spacer />
                                        <SwiftUIText weight="bold" size={17} color="#FFFFFF">Approve & Apply</SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
                            </VStack>
                        ) : (
                            <Button
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                                modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                            >
                                <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color={textColor}>Close</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        )}
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
