import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
interface Props { reportId?: string; reportType: string; exportPdf?: boolean; onClose: () => void; onSaved: () => void }
export default function AdidayaReportEditor({ onClose }: Props) {
    return <View style={{ padding: 24, gap: 20 }}><Text>Editor dokumen Adidaya tersedia di versi web.</Text><TouchableOpacity onPress={onClose}><Text>Kembali ke Reports</Text></TouchableOpacity></View>;
}
