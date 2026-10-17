import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { BottomSheet, Button, DateTimePicker, Form, Host, HStack, Picker, Section, Spacer, TextField, Text as SwiftUIText, VStack } from '@expo/ui/swift-ui';
import { background, frame, ignoreSafeArea, padding } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { PurchasingConsolidationItem } from '@/lib/api/financeConsolidation';
import { uploadFinanceFileBase64 } from '@/lib/api/finance';

interface Props {
    visible: boolean;
    onClose: () => void;
    consolidation: PurchasingConsolidationItem | null;
    preSelectedRequestIds?: string[];
}

interface PaymentFile { uri: string; name: string; mimeType?: string }

const money = (amount: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(amount || 0).replace('IDR', 'Rp');

export const ConsolidationPaymentModal: React.FC<Props> = ({ visible, onClose, consolidation, preSelectedRequestIds = [] }) => {
    const { resolvedTheme } = useTheme();
    const { fundingSources, payConsolidationBatch } = useFinance();
    const [sourceIndex, setSourceIndex] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [proofs, setProofs] = useState<PaymentFile[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [paymentTypeIndex, setPaymentTypeIndex] = useState(0);
    const [partialAmount, setPartialAmount] = useState('');
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#6E6E73';
    const requests = useMemo(() => {
        const available = (consolidation?.requests || []).filter(request => Number(request._paid_amount || 0) < Number(request.amount || 0));
        return preSelectedRequestIds.length ? available.filter(request => preSelectedRequestIds.includes(request.id)) : available;
    }, [consolidation, preSelectedRequestIds]);
    const outstandingTotal = useMemo(() => requests.reduce((sum, request) => (
        sum + Math.max(0, Number(request.amount || 0) - Number(request._paid_amount || 0))
    ), 0), [requests]);
    const parsedPartialAmount = Number(partialAmount.replace(/[^0-9]/g, '')) || 0;
    const paymentAmount = paymentTypeIndex === 1 ? parsedPartialAmount : outstandingTotal;
    const activeSource = fundingSources[sourceIndex];

    useEffect(() => {
        if (!visible) return;
        setSourceIndex(0);
        setPaymentDate(new Date());
        setNotes('');
        setProofs([]);
        setSubmitting(false);
        setPaymentTypeIndex(0);
        setPartialAmount('');
    }, [visible, consolidation?.id]);

    if (!consolidation) return null;

    const pickProof = () => Alert.alert('Payment Proof', 'Choose source', [
        { text: 'Photo Library', onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
            if (!result.canceled) setProofs(current => [...current, ...result.assets.map(asset => ({ uri: asset.uri, name: asset.fileName || 'Payment Proof.jpg', mimeType: asset.mimeType || 'image/jpeg' }))]);
        } },
        { text: 'Files', onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
            if (!result.canceled) setProofs(current => [...current, ...result.assets.map(asset => ({ uri: asset.uri, name: asset.name || 'Payment Proof', mimeType: asset.mimeType }))]);
        } },
        { text: 'Cancel', style: 'cancel' },
    ]);

    const handleSubmit = async () => {
        if (!activeSource || !requests.length) return;
        if (paymentAmount <= 0) {
            Alert.alert('Invalid Amount', 'Enter a payment amount greater than zero.');
            return;
        }
        if (paymentAmount > outstandingTotal) {
            Alert.alert('Invalid Amount', `Payment cannot exceed the remaining ${money(outstandingTotal)}.`);
            return;
        }
        if (paymentTypeIndex === 1 && paymentAmount === outstandingTotal) {
            Alert.alert('Use Full Payment', 'The entered amount covers the full remaining balance.');
            return;
        }
        if (Number(activeSource.balance || 0) < paymentAmount) {
            Alert.alert('Insufficient Balance', `Available balance is less than ${money(paymentAmount)}.`);
            return;
        }
        setSubmitting(true);
        try {
            const proofUrls = await Promise.all(proofs.map(async file => {
                if (!file.uri.startsWith('file://')) return file.uri;
                const extension = file.name.split('.').pop() || 'jpg';
                const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
                return uploadFinanceFileBase64(base64, extension, file.mimeType || 'application/octet-stream', 'purchase');
            }));
            await payConsolidationBatch(consolidation.id, requests.map(request => request.id), {
                source_of_fund_id: activeSource.id,
                payment_date: paymentDate.toISOString().split('T')[0],
                payment_proof_url: proofUrls.join(','),
                amount: paymentAmount,
                notes: notes.trim() || undefined,
                request_amounts: Object.fromEntries(requests.map(request => [request.id, Number(request.amount || 0)])),
            });
            onClose();
        } catch (error: any) {
            Alert.alert('Payment Failed', error.message || 'Could not process payment.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet isOpened={visible} presentationDetents={[0.85, 'large']} presentationDragIndicator="visible" onIsOpenedChange={opened => { if (!opened) onClose(); }}>
                <VStack spacing={0} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background('clear')]}>
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={22} weight="bold" color={textColor}>Process Payment</SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>{consolidation.document_number}</SwiftUIText>
                        </VStack>
                        <Spacer />
                        <Button systemImage="xmark" role="cancel" variant="glass" color="gray" onPress={onClose} />
                    </HStack>
                    <Form modifiers={[background('clear')]}>
                        <Section title="Payment Details">
                            <Picker label="Payment Type" options={['Full Payment', 'Partial Payment']} selectedIndex={paymentTypeIndex} onOptionSelected={event => setPaymentTypeIndex(event.nativeEvent.index)} variant="menu" />
                            {paymentTypeIndex === 1 ? <TextField placeholder="Payment amount" defaultValue={partialAmount} keyboardType="numeric" onChangeText={value => setPartialAmount(value.replace(/[^0-9]/g, ''))} /> : null}
                            <Picker label="Source of Funds" options={fundingSources.map(source => `${source.provider || source.name} · ${money(source.balance || 0)}`)} selectedIndex={sourceIndex} onOptionSelected={event => setSourceIndex(event.nativeEvent.index)} variant="menu" />
                            <DateTimePicker title="Payment Date" initialDate={paymentDate.toISOString()} onDateSelected={setPaymentDate} variant="compact" displayedComponents="date" />
                        </Section>
                        <Section title={`Selected Requests (${requests.length})`}>
                            {requests.map(request => <HStack key={request.id}><VStack alignment="leading" spacing={2}><SwiftUIText weight="semibold" color={textColor}>{request.shortRef || request.ref || request.cardRef || 'PR'}</SwiftUIText><SwiftUIText size={12} color={subtextColor}>{request.title || request.description || 'Purchase Request'}</SwiftUIText></VStack><Spacer /><SwiftUIText weight="semibold" color={textColor}>{money(Math.max(0, Number(request.amount || 0) - Number(request._paid_amount || 0)))}</SwiftUIText></HStack>)}
                        </Section>
                        <Section title="Payment Proof">
                            <HStack><SwiftUIText color={subtextColor}>Attachments</SwiftUIText><Spacer />{proofs.length ? <SwiftUIText weight="semibold" color={textColor}>{`${proofs.length} ${proofs.length === 1 ? 'File' : 'Files'}`}</SwiftUIText> : null}<Button systemImage="plus" variant="plain" color="#007AFF" onPress={pickProof}>{proofs.length ? 'Add' : 'Attach'}</Button>{proofs.length ? <Button systemImage="xmark.circle.fill" variant="plain" color="#FF3B30" onPress={() => setProofs([])} /> : null}</HStack>
                            <TextField placeholder="Payment note (Optional)" defaultValue={notes} onChangeText={setNotes} />
                        </Section>
                        <Section title="Summary">
                            <HStack><SwiftUIText color={subtextColor}>Selected Requests</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{String(requests.length)}</SwiftUIText></HStack>
                            <HStack><SwiftUIText color={subtextColor}>Outstanding</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{money(outstandingTotal)}</SwiftUIText></HStack>
                            <HStack><SwiftUIText size={16} weight="bold" color={textColor}>Pay Now</SwiftUIText><Spacer /><SwiftUIText size={18} weight="bold" color="#007AFF">{money(paymentAmount)}</SwiftUIText></HStack>
                            {paymentAmount > 0 && paymentAmount < outstandingTotal ? <HStack><SwiftUIText color={subtextColor}>Remaining After Payment</SwiftUIText><Spacer /><SwiftUIText color={textColor}>{money(outstandingTotal - paymentAmount)}</SwiftUIText></HStack> : null}
                        </Section>
                    </Form>
                    <Button variant="glassProminent" color="#007AFF" disabled={submitting || !activeSource || !requests.length || paymentAmount <= 0} onPress={handleSubmit} modifiers={[padding({ leading: 20, trailing: 20, top: 10, bottom: 34 }), frame({ maxWidth: Infinity })]}>
                        <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}><Spacer /><SwiftUIText size={17} weight="semibold" color="#FFFFFF">{submitting ? 'Processing...' : `Process Payment (${money(paymentAmount)})`}</SwiftUIText><Spacer /></HStack>
                    </Button>
                </VStack>
            </BottomSheet>
        </Host>
    );
};

export default ConsolidationPaymentModal;
