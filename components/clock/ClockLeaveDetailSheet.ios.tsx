import React from 'react';
import { Alert, Share } from 'react-native';
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
import { LeaveRequest, RequestStatus } from '@/lib/api/attendance';
import { format, differenceInCalendarDays } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '../ui/PlatformIcon';
import { shareIndividualLeave } from '@/lib/shareHelper';

interface ClockLeaveDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    request: LeaveRequest | null;
    viewMode: 'personal' | 'team';
    onCancel: (id: string) => void;
    onViewCertificate: (url: string) => void;
    onApprove?: () => void;
    onReject?: () => void;
    onRevision?: () => void;
    onDelete?: () => void;
}

export const ClockLeaveDetailSheet: React.FC<ClockLeaveDetailSheetProps> = ({
    isOpened,
    onClose,
    request,
    viewMode,
    onCancel,
    onViewCertificate,
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

    if (!request) return null;

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

    const duration = getDuration(request.startDate, request.endDate);
    const statusColor = getStatusColor(request.status);

    const handleCancelPress = () => {
        onClose();
        onCancel(request.id);
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
                            {request.requestNumber || 'Leave Request'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="square.and.arrow.up"
                            color="gray"
                            onPress={() => shareIndividualLeave(request)}
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
                        <Section title="Leave Information">
                            {viewMode === 'team' && request.userName && (
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Employee</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor} weight="semibold">
                                        {request.userName}
                                    </SwiftUIText>
                                </HStack>
                            )}
                            <HStack>
                                <SwiftUIText color={subtextColor}>Request No</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor} weight="medium">
                                    {request.requestNumber || '-'}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Type</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {request.type}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Subtype</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {request.subtype ? request.subtype.replace('_', ' ') : '-'}
                                </SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Dates</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {formatDateRange(request.startDate, request.endDate)}
                                </SwiftUIText>
                            </HStack>
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
                                    {request.status.toUpperCase()}
                                </SwiftUIText>
                            </HStack>
                        </Section>

                        {request.reason && (
                            <Section title="Reason">
                                <SwiftUIText color={textColor} modifiers={[padding({ vertical: 4 })]}>
                                    {request.reason}
                                </SwiftUIText>
                            </Section>
                        )}

                        {request.rejectReason && (
                            <Section title={(request.status === 'revision' || request.status === 'need revision') ? "Revision Instructions" : "Rejection Reason"}>
                                <SwiftUIText 
                                    color={(request.status === 'revision' || request.status === 'need revision') ? "#FF9500" : "#FF3B30"} 
                                    weight="medium" 
                                    modifiers={[padding({ vertical: 4 })]}
                                >
                                    {request.rejectReason}
                                </SwiftUIText>
                            </Section>
                        )}
                    </Form>

                    {/* Footer / Actions */}
                    <VStack spacing={8} modifiers={[
                        background(sheetBg),
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 30 })
                    ]}>
                        {request.fileUrl && (
                            <Button
                                variant="glass"
                                color="#007AFF"
                                onPress={() => onViewCertificate(request.fileUrl!)}
                                modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                            >
                                <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color="#007AFF">View Certificate</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        )}

                        {viewMode === 'team' && request.status === 'pending' ? (
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
                            viewMode === 'personal' && request.status === 'pending' ? (
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
