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
import { BusinessTrip, RequestStatus } from '@/lib/api/attendance';
import { format, differenceInCalendarDays } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '../ui/PlatformIcon';
import { shareIndividualTrip } from '@/lib/shareHelper';

interface ClockTripDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    trip: BusinessTrip | null;
    viewMode: 'personal' | 'team';
    onCancel: (id: string) => void;
    onViewAttachment: (url: string) => void;
    onApprove?: () => void;
    onReject?: () => void;
    onRevision?: () => void;
    onDelete?: () => void;
}

export const ClockTripDetailSheet: React.FC<ClockTripDetailSheetProps> = ({
    isOpened,
    onClose,
    trip,
    viewMode,
    onCancel,
    onViewAttachment,
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

    if (!trip) return null;

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

    const formatDateRange = (startStr: string, endStr: string) => {
        try {
            const start = new Date(startStr);
            const end = new Date(endStr);
            if (startStr === endStr) {
                return format(start, 'dd MMM yyyy');
            }
            return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
        } catch {
            return '';
        }
    };

    const getDuration = (startStr: string, endStr: string) => {
        try {
            const start = new Date(startStr);
            const end = new Date(endStr);
            return differenceInCalendarDays(end, start) + 1;
        } catch {
            return 0;
        }
    };

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return '-';
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const duration = getDuration(trip.startDate, trip.endDate);
    const statusColor = getStatusColor(trip.status);

    const handleCancelPress = () => {
        onClose();
        onCancel(trip.id);
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.85]}
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
                            {trip.requestNumber || 'Business Trip'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="square.and.arrow.up"
                            color="gray"
                            onPress={() => shareIndividualTrip(trip)}
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
                        <Section title="Business Trip Information">
                            {viewMode === 'team' && trip.userName && (
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Employee</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor} weight="semibold">
                                        {trip.userName}
                                    </SwiftUIText>
                                </HStack>
                            )}
                            <HStack>
                                <SwiftUIText color={subtextColor}>Request No</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor} weight="medium">
                                    {trip.requestNumber || '-'}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Project</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {trip.projectId === 'BSI TRIP' ? 'BSI TRIP' : (trip.projectId?.toUpperCase() || 'BSI TRIP')}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Destination</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {trip.destination}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Dates</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {formatDateRange(trip.startDate, trip.endDate)}
                                </SwiftUIText>
                            </HStack>
                            {trip.transportation && (
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Transport</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {trip.transportation.charAt(0).toUpperCase() + trip.transportation.slice(1)}
                                    </SwiftUIText>
                                </HStack>
                            )}
                            <HStack>
                                <SwiftUIText color={subtextColor}>Total Duration</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor} weight="semibold">
                                    {`${duration} ${duration === 1 ? 'day' : 'days'}`}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                <Spacer />
                                <SwiftUIText 
                                    weight="bold" 
                                    color={statusColor}
                                >
                                    {trip.status.toUpperCase()}
                                </SwiftUIText>
                            </HStack>
                        </Section>

                        {trip.estimatedCost !== undefined && trip.estimatedCost !== null && (
                            <Section title="Estimated Cost">
                                <SwiftUIText color={textColor} weight="bold" size={17} modifiers={[padding({ vertical: 4 })]}>
                                    {formatCurrency(trip.estimatedCost)}
                                </SwiftUIText>
                            </Section>
                        )}

                        {trip.purpose && (
                            <Section title="Purpose">
                                <SwiftUIText color={textColor} modifiers={[padding({ vertical: 4 })]}>
                                    {trip.purpose}
                                </SwiftUIText>
                            </Section>
                        )}

                        {trip.accommodation && (
                            <Section title="Accommodation">
                                <SwiftUIText color={textColor} modifiers={[padding({ vertical: 4 })]}>
                                    {trip.accommodation}
                                </SwiftUIText>
                            </Section>
                        )}

                        {trip.notes && (
                            <Section title="Notes">
                                <SwiftUIText color={textColor} modifiers={[padding({ vertical: 4 })]}>
                                    {trip.notes}
                                </SwiftUIText>
                            </Section>
                        )}

                        {trip.rejectReason && (
                            <Section title={(trip.status === 'revision' || trip.status === 'need revision') ? "Revision Instructions" : "Rejection Reason"}>
                                <SwiftUIText 
                                    color={(trip.status === 'revision' || trip.status === 'need revision') ? "#FF9500" : "#FF3B30"} 
                                    weight="medium" 
                                    modifiers={[padding({ vertical: 4 })]}
                                >
                                    {trip.rejectReason}
                                </SwiftUIText>
                            </Section>
                        )}
                    </Form>

                    {/* Footer / Actions */}
                    <VStack spacing={8} modifiers={[
                        background(sheetBg),
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 30 })
                    ]}>
                        {trip.fileUrl && (
                            <Button
                                variant="glass"
                                color="#007AFF"
                                onPress={() => onViewAttachment(trip.fileUrl!)}
                                modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                            >
                                <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color="#007AFF">View Attachment</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        )}

                        {viewMode === 'team' && trip.status === 'pending' ? (
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
                            viewMode === 'personal' && trip.status === 'pending' ? (
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
