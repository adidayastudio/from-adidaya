import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Image, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import * as ImagePicker from 'expo-image-picker';
import { uploadFinanceFileBase64, fetchProjects } from '@/lib/api/finance';
import { Category, CATEGORY_OPTIONS, SUBCATEGORY_OPTIONS, PurchaseStage, UNIT_OPTIONS } from './constants';

interface AddPurchaseModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({ visible, onClose }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    
    const { addPurchasingRequest } = useFinance();

    const [projects, setProjects] = useState<any[]>([]);
    
    // Core Fields
    const [projectCode, setProjectCode] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<Category | ''>('');
    const [subcategory, setSubcategory] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetDate, setTargetDate] = useState('');
    const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
    const [stage, setStage] = useState<PurchaseStage>('PLANNED');
    
    // Vendor Info
    const [vendorName, setVendorName] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    const [items, setItems] = useState([{ id: '1', name: '', qty: 1, unit: 'pcs', price: 0 }]);
    const [invoiceImage, setInvoiceImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [activeSelect, setActiveSelect] = useState<'project' | 'category' | 'subcategory' | null>(null);

    useEffect(() => {
        if (visible) {
            fetchProjects().then(setProjects);
        }
    }, [visible]);

    const handleAddItem = () => {
        setItems([...items, { id: Math.random().toString(), name: '', qty: 1, unit: 'pcs', price: 0 }]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleUpdateItem = (id: string, field: string, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    }, [items]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setInvoiceImage(result.assets[0]);
        }
    };

    const handleSubmit = async (asDraft = false) => {
        if (!projectCode || !category || items.some(i => !i.name)) {
            Alert.alert('Missing Info', 'Please fill in all required fields (Project, Category, Item Names).');
            return;
        }

        setIsSubmitting(true);
        try {
            let invoice_url = '';
            
            if (invoiceImage && invoiceImage.base64) {
                const ext = invoiceImage.uri.split('.').pop() || 'jpg';
                const uploadedPath = await uploadFinanceFileBase64(
                    invoiceImage.base64,
                    ext,
                    invoiceImage.mimeType || 'image/jpeg',
                    'purchasing'
                );
                invoice_url = uploadedPath;
            }

            const selectedProject = projects.find(p => p.project_code === projectCode) || { id: projectCode };

            await addPurchasingRequest({
                project_id: selectedProject.id,
                date: invoiceDate,
                target_date: targetDate || undefined,
                description: title || items.map(i => i.name).join(', '),
                category,
                subcategory,
                priority,
                amount: totalAmount,
                status: asDraft ? 'DRAFT' : 'SUBMITTED',
                statusTag: asDraft ? 'draft' : 'pending',
                purchase_stage: stage,
                beneficiary_bank: bankName || undefined,
                beneficiary_number: accountNumber || undefined,
                beneficiary_name: accountName || undefined,
                vendor_name: vendorName || undefined,
                items: items.map(i => ({
                    name: i.name,
                    qty: i.qty,
                    unit: i.unit,
                    unit_price: i.price,
                    total: i.qty * i.price
                })),
                invoice_url: invoice_url || undefined,
            } as any);

            Alert.alert('Success', asDraft ? 'Draft saved.' : 'Purchase request submitted.');
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const SelectModal = () => {
        if (!activeSelect) return null;
        
        let options: {value: string, label: string}[] = [];
        let title = '';
        
        if (activeSelect === 'project') {
            options = projects.map(p => ({ value: p.project_code, label: `${p.project_code} - ${p.project_name}` }));
            title = 'Select Project';
        } else if (activeSelect === 'category') {
            options = CATEGORY_OPTIONS;
            title = 'Select Category';
        } else if (activeSelect === 'subcategory' && category) {
            options = SUBCATEGORY_OPTIONS[category] || [];
            title = 'Select Subcategory';
        }

        return (
            <Modal visible={!!activeSelect} transparent animationType="fade">
                <View style={s.modalOverlay}>
                    <GlassView intensity={60} tint={isDark ? 'dark' : 'light'} style={[s.modalContent, { backgroundColor: isDark ? 'rgba(28,28,30,0.9)' : 'rgba(255,255,255,0.9)' }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: textColor }]}>{title}</Text>
                            <TouchableOpacity onPress={() => setActiveSelect(null)}>
                                <PlatformIcon name="xmark.circle.fill" size={24} tintColor={subtextColor} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {options.map((opt, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[s.modalOption, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                    onPress={() => {
                                        if (activeSelect === 'project') setProjectCode(opt.value);
                                        if (activeSelect === 'category') {
                                            setCategory(opt.value as Category);
                                            setSubcategory('');
                                        }
                                        if (activeSelect === 'subcategory') setSubcategory(opt.value);
                                        setActiveSelect(null);
                                    }}
                                >
                                    <Text style={[s.modalOptionText, { color: textColor }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </GlassView>
                </View>
            </Modal>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[s.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}>
                <View style={[s.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[s.headerTitle, { color: textColor }]}>Purchase Request</Text>
                    <TouchableOpacity onPress={onClose} disabled={isSubmitting} style={s.closeBtn}>
                        <PlatformIcon name="xmark" size={20} tintColor={subtextColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* General Information */}
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <PlatformIcon name="briefcase.fill" size={14} tintColor={subtextColor} />
                            <Text style={[s.sectionTitle, { color: textColor }]}>General Information</Text>
                        </View>
                        
                        <Text style={[s.label, { color: subtextColor }]}>PROJECT</Text>
                        <TouchableOpacity 
                            style={[s.selectTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]} 
                            onPress={() => setActiveSelect('project')}
                        >
                            <Text style={{ color: projectCode ? textColor : subtextColor }}>
                                {projectCode || 'Select project...'}
                            </Text>
                            <PlatformIcon name="chevron.down" size={12} tintColor={subtextColor} />
                        </TouchableOpacity>

                        <View style={s.row}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={[s.label, { color: subtextColor }]}>INVOICE DATE</Text>
                                <TextInput
                                    style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    value={invoiceDate}
                                    onChangeText={setInvoiceDate}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.label, { color: subtextColor }]}>TARGET DATE</Text>
                                <TextInput
                                    style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    value={targetDate}
                                    onChangeText={setTargetDate}
                                    placeholder="YYYY-MM-DD"
                                />
                            </View>
                        </View>

                        <View style={s.row}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={[s.label, { color: subtextColor }]}>CATEGORY</Text>
                                <TouchableOpacity 
                                    style={[s.selectTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]} 
                                    onPress={() => setActiveSelect('category')}
                                >
                                    <Text style={{ color: category ? textColor : subtextColor }}>
                                        {category || 'Select...'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.label, { color: subtextColor }]}>SUBCATEGORY</Text>
                                <TouchableOpacity 
                                    style={[s.selectTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]} 
                                    onPress={() => category ? setActiveSelect('subcategory') : Alert.alert('Pick Category First')}
                                >
                                    <Text style={{ color: subcategory ? textColor : subtextColor }}>
                                        {subcategory || (category ? 'Select...' : 'Category first')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={[s.label, { color: subtextColor, marginTop: 12 }]}>PRIORITY LEVEL</Text>
                        <View style={s.priorityRow}>
                            {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                                <TouchableOpacity 
                                    key={p} 
                                    style={[s.priorityPill, priority === p && { backgroundColor: p === 'URGENT' ? '#FF3B30' : (p === 'HIGH' ? '#FF9500' : (p === 'MEDIUM' ? '#AF52DE' : '#8E8E93')) }]}
                                    onPress={() => setPriority(p)}
                                >
                                    <Text style={[s.priorityText, priority === p && { color: '#FFF' }]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Order Progress */}
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <PlatformIcon name="clock.fill" size={14} tintColor={subtextColor} />
                            <Text style={[s.sectionTitle, { color: textColor }]}>Order Progress</Text>
                        </View>
                        <View style={s.stageContainer}>
                            {(['PLANNED', 'INVOICED', 'RECEIVED', 'PAID'] as PurchaseStage[]).map((st) => (
                                <TouchableOpacity key={st} style={s.stageItem} onPress={() => setStage(st)}>
                                    <View style={[s.stageCircle, stage === st && s.stageCircleActive]}>
                                        {stage === st && <View style={s.stageCircleInner} />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.stageLabel, { color: stage === st ? textColor : subtextColor }]}>
                                            {st === 'PLANNED' ? 'Planned (Estimation)' : (st === 'INVOICED' ? 'Invoiced (Billed)' : (st === 'RECEIVED' ? 'Received (Goods)' : 'Paid (Completed)'))}
                                        </Text>
                                        <Text style={s.stageSub}>{st === 'PLANNED' ? 'Not yet purchased, no invoice.' : (st === 'INVOICED' ? 'Invoice received from vendor.' : (st === 'RECEIVED' ? 'Goods delivered/received.' : 'Payment has been processed.'))}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Items */}
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <PlatformIcon name="list.bullet" size={14} tintColor={subtextColor} />
                            <Text style={[s.sectionTitle, { color: textColor }]}>Items & Pricing</Text>
                        </View>
                        {items.map((item, index) => (
                            <View key={item.id} style={s.itemCard}>
                                <View style={s.itemCardHeader}>
                                    <Text style={[s.itemIndex, { color: subtextColor }]}>ITEM {index + 1}</Text>
                                    {items.length > 1 && (
                                        <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                                            <PlatformIcon name="trash" size={14} tintColor="#FF3B30" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TextInput
                                    style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    placeholder="Item name/description"
                                    placeholderTextColor={subtextColor}
                                    value={item.name}
                                    onChangeText={(v) => handleUpdateItem(item.id, 'name', v)}
                                />
                                <View style={s.row}>
                                    <View style={{ width: 80, marginRight: 12 }}>
                                        <Text style={[s.label, { color: subtextColor }]}>QTY</Text>
                                        <TextInput
                                            style={[s.input, { textAlign: 'center', color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                            keyboardType="numeric"
                                            value={item.qty.toString()}
                                            onChangeText={(v) => handleUpdateItem(item.id, 'qty', parseInt(v) || 0)}
                                        />
                                    </View>
                                    <View style={{ width: 80, marginRight: 12 }}>
                                        <Text style={[s.label, { color: subtextColor }]}>UNIT</Text>
                                        <TextInput
                                            style={[s.input, { textAlign: 'center', color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                            value={item.unit}
                                            onChangeText={(v) => handleUpdateItem(item.id, 'unit', v)}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.label, { color: subtextColor }]}>PRICE</Text>
                                        <TextInput
                                            style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                            keyboardType="numeric"
                                            value={item.price.toString()}
                                            onChangeText={(v) => handleUpdateItem(item.id, 'price', parseInt(v) || 0)}
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={s.addItemBtn} onPress={handleAddItem}>
                            <PlatformIcon name="plus" size={14} tintColor="#007AFF" />
                            <Text style={s.addItemText}>Add Another Item</Text>
                        </TouchableOpacity>

                        <View style={[s.totalCard, { backgroundColor: isDark ? 'rgba(199,58,64,0.1)' : 'rgba(199,58,64,0.05)' }]}>
                            <Text style={[s.totalLabel, { color: subtextColor }]}>Estimated Total</Text>
                            <Text style={[s.totalAmount, { color: '#007AFF' }]}>
                                Rp {totalAmount.toLocaleString('id-ID')}
                            </Text>
                        </View>
                    </View>

                    {/* Vendor/Bank */}
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <PlatformIcon name="creditcard.fill" size={14} tintColor={subtextColor} />
                            <Text style={[s.sectionTitle, { color: textColor }]}>Beneficiary & Vendor</Text>
                        </View>
                        <TextInput
                            style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            placeholder="Vendor Name (Optional)"
                            placeholderTextColor={subtextColor}
                            value={vendorName}
                            onChangeText={setVendorName}
                        />
                        <View style={s.row}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <TextInput
                                    style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    placeholder="Bank Name"
                                    placeholderTextColor={subtextColor}
                                    value={bankName}
                                    onChangeText={setBankName}
                                />
                            </View>
                            <View style={{ flex: 1.5 }}>
                                <TextInput
                                    style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    placeholder="Account Number"
                                    placeholderTextColor={subtextColor}
                                    keyboardType="numeric"
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                />
                            </View>
                        </View>
                        <TextInput
                            style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                            placeholder="Account Name"
                            placeholderTextColor={subtextColor}
                            value={accountName}
                            onChangeText={setAccountName}
                        />
                    </View>

                    {/* Proof */}
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <PlatformIcon name="doc.fill" size={14} tintColor={subtextColor} />
                            <Text style={[s.sectionTitle, { color: textColor }]}>Proof Documents</Text>
                        </View>
                        <TouchableOpacity style={[s.uploadBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]} onPress={pickImage}>
                            {invoiceImage ? (
                                <Image source={{ uri: invoiceImage.uri }} style={s.previewImg} />
                            ) : (
                                <>
                                    <PlatformIcon name="camera.fill" size={24} tintColor={subtextColor} />
                                    <Text style={[s.uploadText, { color: subtextColor }]}>Upload Invoice/Receipt</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Buttons */}
                    <View style={s.footer}>
                        <TouchableOpacity 
                            style={[s.draftBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} 
                            onPress={() => handleSubmit(true)}
                            disabled={isSubmitting}
                        >
                            <Text style={[s.draftBtnText, { color: textColor }]}>Save Draft</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={s.submitBtn} 
                            onPress={() => handleSubmit(false)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={s.submitBtnText}>Submit Request</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                <SelectModal />
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    closeBtn: { padding: 4 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    label: { fontSize: 10, fontWeight: '700', marginBottom: 6, opacity: 0.6 },
    input: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
    },
    row: { flexDirection: 'row', gap: 0 },
    selectTrigger: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priorityRow: { flexDirection: 'row', gap: 8 },
    priorityPill: {
        flex: 1,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(120,120,128,0.1)',
    },
    priorityText: { fontSize: 11, fontWeight: '700', color: '#8E8E93' },
    stageContainer: { gap: 16 },
    stageItem: { flexDirection: 'row', gap: 12 },
    stageCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#8E8E93', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    stageCircleActive: { borderColor: '#007AFF' },
    stageCircleInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF' },
    stageLabel: { fontSize: 14, fontWeight: '700' },
    stageSub: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
    itemCard: { marginBottom: 16, padding: 12, borderRadius: 24, backgroundColor: 'rgba(120,120,128,0.05)' },
    itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    itemIndex: { fontSize: 10, fontWeight: '800' },
    addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 8 },
    addItemText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
    totalCard: { marginTop: 20, padding: 20, borderRadius: 24, alignItems: 'center' },
    totalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    totalAmount: { fontSize: 24, fontWeight: '800' },
    uploadBox: { height: 120, borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: '#8E8E93', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    uploadText: { fontSize: 13, fontWeight: '600', marginTop: 8 },
    previewImg: { width: '100%', height: '100%' },
    footer: { flexDirection: 'row', gap: 12, marginTop: 12 },
    draftBtn: { flex: 1, height: 56, borderRadius: 28, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    draftBtnText: { fontSize: 16, fontWeight: '700' },
    submitBtn: { flex: 2, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 24, padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    modalOption: { paddingVertical: 16, borderBottomWidth: 1 },
    modalOptionText: { fontSize: 16, fontWeight: '500' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
});
