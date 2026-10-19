import React from 'react';
import { Section, TextField, Button, HStack, VStack, Text } from '@expo/ui/swift-ui';
import { disabled as disabledModifier } from '@expo/ui/swift-ui/modifiers';
import type { AdminTransactionEdit } from '@/hooks/useAdminTransactionEdit';
const money = (value: number) => `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
export function AdminTransactionFields({ editor, disabled }: { editor: AdminTransactionEdit; disabled: boolean }) {
    if (!editor.enabled) return null;
    return <Section title="Payment Details">
        <Text>{`Total Paid: ${money(editor.paid)}`}</Text>
        <Text>{`Remaining: ${money(editor.remaining)}`}</Text>
        {editor.payments.map((payment, index) => <VStack key={`${editor.initialization}-${payment.id}`} alignment="leading" spacing={10}>
            <Text weight="semibold">{`Payment ${index + 1}`}</Text>
            <TextField defaultValue={payment.amount} onChangeText={value => editor.update(payment.id, 'amount', value)} placeholder="Amount (Rp)" keyboardType="decimal-pad" modifiers={[disabledModifier(disabled)]} />
            <TextField defaultValue={payment.date} onChangeText={value => editor.update(payment.id, 'date', value)} placeholder="Payment Date (YYYY-MM-DD)" modifiers={[disabledModifier(disabled)]} />
            {payment.proofs.map((file, proofIndex) => <VStack key={`${proofIndex}-${file.uri}`} alignment="leading" spacing={8}>
                <Text>{file.name || `Payment Proof ${proofIndex + 1}`}</Text>
                <HStack spacing={16}>
                    <Button disabled={disabled} onPress={() => editor.pick(payment.id, proofIndex)}><Text color="#159957">Replace</Text></Button>
                    <Button disabled={disabled} onPress={() => editor.removeProof(payment.id, proofIndex)}><Text color="#FF3B30">Remove</Text></Button>
                </HStack>
            </VStack>)}
            <Button disabled={disabled} onPress={() => editor.pick(payment.id)}><Text color="#159957">Add Payment Proof</Text></Button>
            <Button disabled={disabled} onPress={() => editor.remove(payment.id)}><Text color="#FF3B30">Remove Payment</Text></Button>
        </VStack>)}
        <Button disabled={disabled} onPress={editor.add}><Text color="#159957">Add Payment</Text></Button>
    </Section>;
}
