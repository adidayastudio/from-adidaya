import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform, Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    Section,
    TextField,
    Button,
    HStack,
    VStack,
    ZStack,
    Spacer,
    Picker,
    DateTimePicker,
    Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    shadow,
    cornerRadius,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { NativeFinanceList } from '@/modules/native-toolbar-button';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext, MANAGEMENT_ROLES } from '@/context/UserProvider';
import { ReceivingQueueItem } from '@/lib/api/resourcesReceiving';

export interface SwiftUIReceivingDetailSheetProps {
    isOpened?: boolean;
    visible?: boolean;
    onClose: () => void;
    item: ReceivingQueueItem | null;
    onConfirmReceipt: (item: ReceivingQueueItem, receivedQty: number, notes: string) => void;
}

const CONDITIONS = ['Good / Intact', 'Damaged / Needs Repair', 'Pending Inspection'];
const LOCATIONS = ['Warehouse A', 'Warehouse B', 'Site Storage C', 'Workshop', 'Central Tool Hub'];
const SERVICE_STATUSES = ['Completed', 'Partial', 'In Progress', 'Rejected / Needs Revision'];
const DEPARTMENTS = ['Site & Construction', 'Operations Hub', 'Architecture & Design', 'Office & Admin', 'Procurement'];
const MATCH_OPTIONS = ['Existing Item', 'Create New'];

export const SwiftUIReceivingDetailSheet: React.FC<SwiftUIReceivingDetailSheetProps> = ({
    isOpened,
    visible,
    onClose,
    item,
    onConfirmReceipt,
}) => {
    const sheetOpened = Boolean(isOpened ?? visible);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const blueColor = '#007AFF';

    const isPresentedNatively = useRef(false);
    const [isFullDetent, setIsFullDetent] = useState(false);
    const sheetBg = isFullDetent ? (isDark ? '#000000' : '#FFFFFF') : 'clear';

    const { profile } = useUserContext();
    const isManager = profile ? MANAGEMENT_ROLES.includes(profile.role) : true;

    // Form states
    const [qtyInput, setQtyInput] = useState('');
    const [notesInput, setNotesInput] = useState('');
    const [matchIndex, setMatchIndex] = useState(0);
    const [locationIndex, setLocationIndex] = useState(0);
    const [conditionIndex, setConditionIndex] = useState(0);
    const [deptIndex, setDeptIndex] = useState(0);
    const [serviceStatusIndex, setServiceStatusIndex] = useState(0);
    const [receivingDate, setReceivingDate] = useState<Date>(() => new Date());
    const [suratJalanNo, setSuratJalanNo] = useState('');
    const [suratJalanDate, setSuratJalanDate] = useState('13 Sep 2026');
    const [custodian, setCustodian] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [brandInput, setBrandInput] = useState('');
    const [modelInput, setModelInput] = useState('');

    useEffect(() => {
        if (sheetOpened && item) {
            const remaining = Math.max(0, item.expectedQty - item.receivedQty);
            setQtyInput(remaining > 0 ? String(remaining) : String(item.expectedQty));
            setNotesInput('');
            setMatchIndex(0);
            const foundLocIdx = LOCATIONS.indexOf(item.location || 'Warehouse A');
            setLocationIndex(foundLocIdx >= 0 ? foundLocIdx : 0);
            setConditionIndex(0);
            setDeptIndex(0);
            setServiceStatusIndex(0);
            setReceivingDate(new Date());
            setSuratJalanNo('SJ-' + (item.sourceDocNo ? item.sourceDocNo.replace(/[^0-9]/g, '') : '260901'));
            setSuratJalanDate('13 Sep 2026');
            setCustodian(profile?.full_name || 'Budi Santoso');
            setSerialNumber('');
            setBrandInput('');
            setModelInput('');
        }
    }, [sheetOpened, item, profile]);

    if (!item) return null;

    const rType = item.resourceType || 'Material';
    const isMaterial = rType === 'Material';
    const isTools = rType === 'Tools';
    const isAssets = rType === 'Assets';
    const isServices = rType === 'Services';

    const getResourceCode = () => {
        if (isMaterial) return 'MT-01030200';
        if (isTools) return 'TL-00010100';
        if (isAssets) return 'AS-00011200';
        if (isServices) return 'SV-00010000';
        return item.sourceDocNo || 'RC-00000000';
    };

    const remainingQty = Math.max(0, item.expectedQty - item.receivedQty);
    const parsedQty = parseFloat(qtyInput) || 0;
    const isValid = isServices ? true : (parsedQty > 0);

    const handleConfirm = () => {
        if (!isValid) {
            Alert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0.');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onConfirmReceipt(item, isServices ? 1 : parsedQty, notesInput);
        onClose();
    };

    const handleQuickFullReceive = () => {
        Haptics.selectionAsync();
        setQtyInput(String(remainingQty > 0 ? remainingQty : item.expectedQty));
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={sheetOpened}
                presentationDetents={[0.85, 'large']}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (opened) {
                        isPresentedNatively.current = true;
                    } else {
                        if (isPresentedNatively.current) {
                            isPresentedNatively.current = false;
                            onClose();
                        }
                    }
                }}
            >
                <ZStack>
                    <View
                        pointerEvents="none"
                        onLayout={(event) => {
                            const sheetHeight = event.nativeEvent.layout.height;
                            const screenHeight = Dimensions.get('window').height;
                            setIsFullDetent(sheetHeight >= screenHeight * 0.92);
                        }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backgroundColor: sheetBg,
                        }}
                    />
                    <VStack
                        spacing={0}
                        modifiers={[
                            ignoreSafeArea({ edges: 'bottom' }),
                            background(sheetBg),
                        ]}
                    >
                        {/* Native SwiftUI Header */}
                        <HStack
                            alignment="center"
                            modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}
                        >
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                {getResourceCode()}
                            </SwiftUIText>
                            <Spacer />
                            <Button
                                systemImage="xmark"
                                role="cancel"
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                                modifiers={[shadow({ radius: 0, x: 0, y: 0, color: 'transparent' })]}
                            />
                        </HStack>

                        {/* SwiftUI Form using NativeFinanceList */}
                        <NativeFinanceList backgroundColor={isDark ? '#000000' : '#FFFFFF'}>
                            {/* Section 1 — Item */}
                            <Section title="Item">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Item</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" color={textColor}>
                                        {item.itemName}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Resource Type</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={blueColor}>
                                        {rType}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>SKU / Code</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {getResourceCode()}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Vendor</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {item.vendor}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Finance Source</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={subtextColor}>
                                        {item.sourceDocNo}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Category</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {rType}
                                    </SwiftUIText>
                                </HStack>
                            </Section>

                            {/* Section 2 — Resource Matching */}
                            <Section title="Resource Matching">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Match To</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>Existing Item</SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Item Master</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {item.itemName}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Variant / Brand</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={subtextColor}>
                                        Canonical Standard
                                    </SwiftUIText>
                                </HStack>
                            </Section>

                            {/* Section 3 — Quantity / Service Scope */}
                            {!isServices ? (
                                <Section title="Quantity">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Expected</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>
                                            {`${item.expectedQty} ${item.unit}`}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Previously Received</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={item.receivedQty > 0 ? '#34C759' : subtextColor}>
                                            {`${item.receivedQty} ${item.unit}`}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Remaining</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText weight="semibold" color={remainingQty > 0 ? '#FF9500' : '#34C759'}>
                                            {`${remainingQty} ${item.unit}`}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Receive Now</SwiftUIText>
                                        <Spacer />
                                        {remainingQty > 0 && (
                                            <Button
                                                variant="plain"
                                                color="#007AFF"
                                                onPress={handleQuickFullReceive}
                                            >
                                                Receive All
                                            </Button>
                                        )}
                                        <TextField
                                            placeholder="0"
                                            defaultValue={qtyInput}
                                            keyboardType="numeric"
                                            onChangeText={setQtyInput}
                                            modifiers={[frame({ width: 70 })]}
                                        />
                                        <SwiftUIText color={subtextColor}>{item.unit}</SwiftUIText>
                                    </HStack>
                                </Section>
                            ) : (
                                <Section title="Service Scope">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Service Date</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>13 Sep 2026</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Period / Retainer</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={subtextColor}>Monthly Service</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Scope / Description</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>Site Maintenance & Inspection</SwiftUIText>
                                    </HStack>
                                </Section>
                            )}

                            {/* Section 4 — Receiving Information / Service Confirmation */}
                            <Section title={isServices ? "Service Confirmation" : "Receiving Information"}>
                                {!isServices ? (
                                    <>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Receiving Date</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>13 Sep 2026</SwiftUIText>
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Receiving Location</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={blueColor}>{LOCATIONS[locationIndex]}</SwiftUIText>
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Received By</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>
                                                {profile?.full_name || 'Admin Lead'}
                                            </SwiftUIText>
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Condition</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={CONDITIONS[conditionIndex].includes('Damaged') ? '#FF3B30' : '#34C759'}>
                                                {CONDITIONS[conditionIndex]}
                                            </SwiftUIText>
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Surat Jalan No.</SwiftUIText>
                                            <Spacer />
                                            <TextField
                                                placeholder="SJ-2026-..."
                                                defaultValue={suratJalanNo}
                                                onChangeText={setSuratJalanNo}
                                                modifiers={[frame({ width: 140 })]}
                                            />
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Surat Jalan Date</SwiftUIText>
                                            <Spacer />
                                            <TextField
                                                placeholder="13 Sep 2026"
                                                defaultValue={suratJalanDate}
                                                onChangeText={setSuratJalanDate}
                                                modifiers={[frame({ width: 120 })]}
                                            />
                                        </HStack>
                                        <HStack alignment="center">
                                            <SwiftUIText color={subtextColor}>Attachment</SwiftUIText>
                                            <Spacer />
                                            <Button
                                                systemImage="paperclip"
                                                variant="plain"
                                                color="#007AFF"
                                                onPress={() => Alert.alert('Attachment', 'Attach delivery note or photo.')}
                                            >
                                                Add Photo / File
                                            </Button>
                                        </HStack>
                                    </>
                                ) : (
                                    <>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Confirmed By</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>
                                                {profile?.full_name || 'Project Lead'}
                                            </SwiftUIText>
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Completion Date</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>13 Sep 2026</SwiftUIText>
                                        </HStack>
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Completion Status</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color="#34C759">{SERVICE_STATUSES[serviceStatusIndex]}</SwiftUIText>
                                        </HStack>
                                        <HStack alignment="center">
                                            <SwiftUIText color={subtextColor}>Work Report</SwiftUIText>
                                            <Spacer />
                                            <Button
                                                systemImage="doc.text"
                                                variant="plain"
                                                color="#007AFF"
                                                onPress={() => Alert.alert('Work Report', 'Upload service report or proof.')}
                                            >
                                                Upload Report
                                            </Button>
                                        </HStack>
                                    </>
                                )}
                            </Section>

                            {/* Section 5 — Ownership & Destination */}
                            <Section title="Ownership & Destination">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Department</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>{DEPARTMENTS[deptIndex]}</SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Project</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={subtextColor}>PRJ-GMR-001</SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Storage Location</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>{LOCATIONS[locationIndex]}</SwiftUIText>
                                </HStack>
                                {(isTools || isAssets) && (
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Custodian</SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            placeholder="Custodian name..."
                                            defaultValue={custodian}
                                            onChangeText={setCustodian}
                                            modifiers={[frame({ width: 140 })]}
                                        />
                                    </HStack>
                                )}
                            </Section>

                            {/* Section 6 — Type-Specific Details */}
                            {isTools && (
                                <Section title="Tool Details">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Brand / Model</SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            placeholder="e.g. Makita HP1630"
                                            defaultValue={brandInput}
                                            onChangeText={setBrandInput}
                                            modifiers={[frame({ width: 160 })]}
                                        />
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Serial Number</SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            placeholder="Optional SN..."
                                            defaultValue={serialNumber}
                                            onChangeText={setSerialNumber}
                                            modifiers={[frame({ width: 140 })]}
                                        />
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Tool Tag</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={subtextColor}>TL-2026-0031</SwiftUIText>
                                    </HStack>
                                </Section>
                            )}

                            {isAssets && (
                                <Section title="Asset Details">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Brand / Model</SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            placeholder="e.g. Apple M4"
                                            defaultValue={modelInput}
                                            onChangeText={setModelInput}
                                            modifiers={[frame({ width: 160 })]}
                                        />
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Serial Number</SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            placeholder="Required for Assets..."
                                            defaultValue={serialNumber}
                                            onChangeText={setSerialNumber}
                                            modifiers={[frame({ width: 140 })]}
                                        />
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Asset Tag</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={subtextColor}>AST-2026-0019</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Acquisition Date</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={subtextColor}>10 Sep 2026</SwiftUIText>
                                    </HStack>
                                    {isManager && (
                                        <HStack>
                                            <SwiftUIText color={subtextColor}>Financial Value</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" color="#34C759">Rp 24.500.000</SwiftUIText>
                                        </HStack>
                                    )}
                                </Section>
                            )}

                            {/* Section 7 — Notes */}
                            <Section title="Notes">
                                <TextField
                                    placeholder="Add notes…"
                                    defaultValue={notesInput}
                                    onChangeText={setNotesInput}
                                />
                            </Section>

                            {/* Section 8 — Source & History */}
                            <Section title="Source & History">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Finance Mapping</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={subtextColor}>{rType}</SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Original Department</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={subtextColor}>{item.department || 'Site & Construction'}</SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Paid Date</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={subtextColor}>10 Sep 2026</SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Receiving No.</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText weight="bold" color={blueColor}>RC-26090031</SwiftUIText>
                                </HStack>
                            </Section>
                        </NativeFinanceList>

                        {/* Bottom Action Button identical to Finance */}
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            disabled={!isValid}
                            onPress={handleConfirm}
                            modifiers={[
                                padding({ leading: 20, trailing: 20, top: 10, bottom: 34 }),
                                frame({ maxWidth: Infinity }),
                            ]}
                        >
                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}>
                                <Spacer />
                                <SwiftUIText size={17} weight="semibold" color="#FFFFFF">
                                    Confirm Receipt
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </VStack>
                </ZStack>
            </BottomSheet>
        </Host>
    );
};

export const ReceivingDetailModal = SwiftUIReceivingDetailSheet;
