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
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, cornerRadius, frame, foregroundColor, tint } from '@expo/ui/swift-ui/modifiers';
import { OvertimeLog, RequestStatus } from '@/lib/api/attendance';
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '../ui/PlatformIcon';
import { shareIndividualOvertime } from '@/lib/shareHelper';

interface ClockOvertimeDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    log: OvertimeLog | null;
    viewMode: 'personal' | 'team';
    onCancel: (id: string) => void;
    onViewProof: (url: string) => void;
    onApprove?: () => void;
    onReject?: () => void;
    onRevision?: () => void;
    onDelete?: () => void;
}

export const ClockOvertimeDetailSheet: React.FC<ClockOvertimeDetailSheetProps> = ({
    isOpened,
    onClose,
    log,
    viewMode,
    onCancel,
    onViewProof,
    onApprove,
    onReject,
    onRevision,
    onDelete,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';

    if (!log) return null;

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

    const formatLogDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd MMM yyyy');
        } catch {
            return dateStr;
        }
    };

    const calculateDuration = (start: string, end: string) => {
        try {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            let diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff < 0) diff += 24 * 60;
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return `${h}h ${m}m`;
        } catch {
            return '';
        }
    };

    const durationStr = calculateDuration(log.startTime, log.endTime);
    const statusColor = getStatusColor(log.status);

    const handleCancelPress = () => {
        onClose();
        onCancel(log.id);
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.8]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg),
                    tint('#8E8E93')
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {log.requestNumber || 'Overtime Request'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="square.and.arrow.up"
                            color="gray"
                            onPress={() => shareIndividualOvertime(log)}
                            modifiers={[padding({ trailing: 8 })]}
                        />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* SwiftUI Form Details */}
                    <Form modifiers={[background(sheetBg)]}>
                        <Section title="Overtime Information">
                            {viewMode === 'team' && log.userName && (
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Employee</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor} weight="semibold">
                                        {log.userName}
                                    </SwiftUIText>
                                </HStack>
                            )}
                            <HStack>
                                <SwiftUIText color={subtextColor}>Request No</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor} weight="medium">
                                    {log.requestNumber || '-'}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Project</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {log.projectId === 'ady_ops' ? 'ADIDAYA OPS' : (log.projectId?.toUpperCase() || 'ADY')}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Date</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {formatLogDate(log.date)}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Time</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {`${log.startTime} - ${log.endTime}`}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Total Duration</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor} weight="semibold">
                                    {durationStr}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                <Spacer />
                                <SwiftUIText 
                                    weight="bold" 
                                    color={statusColor}
                                >
                                    {log.status.toUpperCase()}
                                </SwiftUIText>
                            </HStack>
                        </Section>

                        {log.description && (
                            <Section title="Description of Work">
                                <SwiftUIText color={textColor} modifiers={[padding({ vertical: 4 })]}>
                                    {log.description}
                                </SwiftUIText>
                            </Section>
                        )}

                        {log.rejectReason && (
                            <Section title={(log.status === 'revision' || log.status === 'need revision') ? "Revision Instructions" : "Rejection Reason"}>
                                <SwiftUIText 
                                    color={(log.status === 'revision' || log.status === 'need revision') ? "#FF9500" : "#FF3B30"} 
                                    weight="medium" 
                                    modifiers={[padding({ vertical: 4 })]}
                                >
                                    {log.rejectReason}
                                </SwiftUIText>
                            </Section>
                        )}
                    </Form>

                    {/* Footer / Actions */}
                    <VStack spacing={8} modifiers={[
                        background(sheetBg),
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 30 })
                    ]}>
                        {log.photoUrl && (
                            <Button
                                variant="glass"
                                color="#007AFF"
                                onPress={() => onViewProof(log.photoUrl!)}
                                modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                            >
                                <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color="#007AFF">View Proof</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        )}

                        {viewMode === 'team' && log.status === 'pending' ? (
                            <VStack spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
                                {/* Top Row: Delete, Reject, Revision */}
                                <HStack spacing={10}>
                                    <Button
                                        variant="glass"
                                        color="gray"
                                        onPress={onDelete}
                                        modifiers={[frame({ width: 56 }), cornerRadius(999)]}
                                    >
                                        <HStack alignment="center" modifiers={[frame({ height: 48 })]}>
                                            <Spacer />
                                            <PlatformIcon name="trash" size={20} tintColor={isDark ? '#A1A1A6' : '#8E8E93'} />
                                            <Spacer />
                                        </HStack>
                                    </Button>
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
                                </HStack>

                                {/* Bottom Row: Big Approve */}
                                <Button
                                    variant="borderedProminent"
                                    color="#34C759"
                                    onPress={onApprove}
                                    modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                >
                                    <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                        <Spacer />
                                        <SwiftUIText weight="bold" size={17} color="#FFFFFF">Approve</SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
                            </VStack>
                        ) : (
                            viewMode === 'personal' && log.status === 'pending' ? (
                                <Button
                                    variant="glass"
                                    color="gray"
                                    onPress={handleCancelPress}
                                    modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                                >
                                    <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                        <Spacer />
                                        <SwiftUIText weight="semibold" size={17} color={textColor}>Cancel Request</SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
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
                            )
                        )}
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
