import { isFinanceSuperadmin } from '@/lib/financeRoles';
import { useTenantContext } from '@/context/TenantContext';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useUserContext } from '@/context/UserProvider';
import { assertSuperadminFinanceEdit } from '@/lib/financeAccess';
import { uploadFinanceAttachment, UploadFile } from '@/lib/uploadFinanceAttachment';
import { financePaymentRecords, validateFinancePayments } from '@/lib/financePayments';

type EditablePayment = { id: string; amount: string; date: string; proofs: UploadFile[]; source_of_fund_id?: string };
export function useAdminTransactionEdit(request: any, visible: boolean, total: number) {
    const { profile } = useUserContext();
    const { tenantRole } = useTenantContext();
    const enabled = !!request?.adminEdit && isFinanceSuperadmin(tenantRole || profile?.role);
    const [payments, setPayments] = useState<EditablePayment[]>([]);
    const [initialization, setInitialization] = useState(0);
    useEffect(() => {
        if (!visible) return;
        setPayments(financePaymentRecords(request).map(record => ({ ...record, amount: record.amount ? String(record.amount) : '', proofs: record.proofs.map(file => ({ uri: file.path, name: file.name })) })));
        setInitialization(value => value + 1);
    }, [request, visible]);
    const update = (id: string, field: 'amount' | 'date', value: string) => setPayments(current => current.map(payment => payment.id === id ? { ...payment, [field]: value } : payment));
    const pick = async (id: string, index?: number) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], multiple: index === undefined, copyToCacheDirectory: true });
            if (result.canceled) return;
            const files = result.assets.map(file => ({ uri: file.uri, name: file.name, mimeType: file.mimeType, file: file.file }));
            setPayments(current => current.map(payment => payment.id !== id ? payment : { ...payment, proofs: index === undefined ? [...payment.proofs, ...files] : payment.proofs.flatMap((file, i) => i === index ? files : [file]) }));
        } catch (error: any) { Alert.alert('Upload File', error.message || 'Unable to select file.'); }
    };
    const amountNumber = (value: string) => Number(value.replace(',', '.'));
    const paid = payments.reduce((sum, payment) => sum + (amountNumber(payment.amount) || 0), 0);
    const save = async () => {
        if (request?.adminEdit && !enabled) throw new Error('Only Superadmin can edit transaction records.');
        if (!enabled) return {};
        await assertSuperadminFinanceEdit();
        const records = payments.map(payment => ({ id: payment.id, source_of_fund_id: payment.source_of_fund_id, amount: amountNumber(payment.amount), date: payment.date, proofs: payment.proofs.map(file => ({ path: file.uploadedPath || file.uri, name: file.name || 'Payment Proof' })) }));
        validateFinancePayments(records, total);
        for (const [index, payment] of payments.entries()) {
            for (const [fileIndex, file] of payment.proofs.entries()) {
                const path = await uploadFinanceAttachment(file, 'payment-proof');
                records[index].proofs[fileIndex].path = path;
                setPayments(current => current.map(row => row.id !== payment.id ? row : { ...row, proofs: row.proofs.map(item => item === file ? { ...item, uploadedPath: path } : item) }));
            }
        }
        return { adminEdit: true, payment_records: records };
    };
    return { enabled, initialization, payments, total, paid, remaining: Math.max(0, total - paid), update, pick,
        add: () => setPayments(current => [...current, { id: `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`, amount: '', date: new Date().toLocaleDateString('en-CA'), proofs: [] }]),
        remove: (id: string) => setPayments(current => current.filter(payment => payment.id !== id)),
        removeProof: (id: string, index: number) => setPayments(current => current.map(payment => payment.id !== id ? payment : { ...payment, proofs: payment.proofs.filter((_, i) => i !== index) })), save };
}
export type AdminTransactionEdit = ReturnType<typeof useAdminTransactionEdit>;
