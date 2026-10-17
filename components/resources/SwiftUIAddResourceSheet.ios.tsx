import React, { useState, useEffect, useRef } from 'react';
import { View, Dimensions, Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    Section,
    Button,
    HStack,
    VStack,
    ZStack,
    Spacer,
    TextField,
    Picker,
    Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    shadow,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { NativeFinanceList } from '@/modules/native-toolbar-button';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

export interface SwiftUIAddResourceSheetProps {
    isOpened: boolean;
    onClose: () => void;
    initialCategory?: 'material' | 'tool' | 'asset' | 'service';
    onResourceCreated?: (newResource: any) => void;
}

const CATEGORIES = ['Material', 'Tool', 'Asset', 'Service'];
const LOCATIONS = ['Warehouse A', 'Warehouse B', 'Site Storage C', 'Workshop', 'Central Tool Hub'];

export const SwiftUIAddResourceSheet: React.FC<SwiftUIAddResourceSheetProps> = ({
    isOpened,
    onClose,
    initialCategory = 'material',
    onResourceCreated,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const blueColor = '#007AFF';

    const isPresentedNatively = useRef(false);
    const [isFullDetent, setIsFullDetent] = useState(false);
    const sheetBg = isFullDetent ? (isDark ? '#000000' : '#FFFFFF') : 'clear';

    // Form fields
    const [name, setName] = useState('');
    const [categoryIndex, setCategoryIndex] = useState(0);
    const [subcategory, setSubcategory] = useState('');
    const [groupName, setGroupName] = useState('');
    const [unit, setUnit] = useState('unit');
    const [price, setPrice] = useState('');
    const [initialQty, setInitialQty] = useState('');
    const [locationIndex, setLocationIndex] = useState(0);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpened) {
            setName('');
            const foundCatIdx = CATEGORIES.findIndex(c => c.toLowerCase() === initialCategory.toLowerCase());
            setCategoryIndex(foundCatIdx >= 0 ? foundCatIdx : 0);
            setSubcategory('');
            setGroupName('');
            setUnit(initialCategory === 'material' ? 'zak' : 'unit');
            setPrice('');
            setInitialQty('');
            setLocationIndex(0);
            setDescription('');
            setIsSubmitting(false);
        }
    }, [isOpened, initialCategory]);

    const selectedCat = CATEGORIES[categoryIndex].toLowerCase();
    const isService = selectedCat === 'service';
    const isValid = name.trim().length > 0 && unit.trim().length > 0;

    const handleSubmit = async () => {
        if (!isValid) {
            Alert.alert('Validation Error', 'Please enter a valid item name and unit.');
            return;
        }

        setIsSubmitting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newResource = {
            id: 'res-' + Date.now(),
            name: name.trim(),
            category: selectedCat,
            subcategory: subcategory.trim() || undefined,
            group_name: groupName.trim() || undefined,
            unit: unit.trim(),
            price_default: parseFloat(price.replace(/[^0-9]/g, '')) || 0,
            description: description.trim() || undefined,
            initialQty: parseFloat(initialQty) || 0,
            location: LOCATIONS[locationIndex],
            created_at: new Date().toISOString(),
        };

        try {
            // Attempt to insert into supabase if table exists
            const { data: wsData } = await supabase.from('workspaces').select('id').limit(1);
            const wsId = wsData?.[0]?.id;

            await supabase.from('catalog_resources').insert([{
                name: newResource.name,
                category: newResource.category,
                subcategory: newResource.subcategory,
                group_name: newResource.group_name,
                unit: newResource.unit,
                price_default: newResource.price_default,
                description: newResource.description,
                workspace_id: wsId,
            }]);
        } catch (e) {
            console.log('Supabase insert fallback:', e);
        }

        if (onResourceCreated) {
            onResourceCreated(newResource);
        }

        setIsSubmitting(false);
        onClose();
        Alert.alert('Success', `${newResource.name} registered successfully!`);
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
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
                                {`Add ${CATEGORIES[categoryIndex]}`}
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
                            {/* Section 1 — Identity */}
                            <Section title="Resource Identity">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Item Name</SwiftUIText>
                                    <Spacer />
                                    <TextField
                                        placeholder="e.g. Semen Gresik 40kg"
                                        defaultValue={name}
                                        onChangeText={setName}
                                        modifiers={[frame({ width: 200 })]}
                                    />
                                </HStack>

                                <Picker
                                    label="Category"
                                    options={CATEGORIES}
                                    selectedIndex={categoryIndex}
                                    onOptionSelected={(e) => setCategoryIndex(e.nativeEvent.index)}
                                    variant="menu"
                                />

                                <HStack>
                                    <SwiftUIText color={subtextColor}>Sub-Category</SwiftUIText>
                                    <Spacer />
                                    <TextField
                                        placeholder="e.g. struktur / finishing"
                                        defaultValue={subcategory}
                                        onChangeText={setSubcategory}
                                        modifiers={[frame({ width: 180 })]}
                                    />
                                </HStack>

                                <HStack>
                                    <SwiftUIText color={subtextColor}>Grouping / Tag</SwiftUIText>
                                    <Spacer />
                                    <TextField
                                        placeholder="e.g. semen, besi, pipa"
                                        defaultValue={groupName}
                                        onChangeText={setGroupName}
                                        modifiers={[frame({ width: 160 })]}
                                    />
                                </HStack>

                                <HStack>
                                    <SwiftUIText color={subtextColor}>Unit of Measure</SwiftUIText>
                                    <Spacer />
                                    <TextField
                                        placeholder="e.g. zak, btg, unit, pcs"
                                        defaultValue={unit}
                                        onChangeText={setUnit}
                                        modifiers={[frame({ width: 120 })]}
                                    />
                                </HStack>

                                <HStack>
                                    <SwiftUIText color={subtextColor}>Standard Price (Rp)</SwiftUIText>
                                    <Spacer />
                                    <TextField
                                        placeholder="0"
                                        defaultValue={price}
                                        keyboardType="numeric"
                                        onChangeText={setPrice}
                                        modifiers={[frame({ width: 140 })]}
                                    />
                                </HStack>
                            </Section>

                            {/* Section 2 — Initial Stock & Storage */}
                            {!isService && (
                                <Section title="Initial Inventory & Storage">
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Initial Quantity</SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            placeholder="0"
                                            defaultValue={initialQty}
                                            keyboardType="numeric"
                                            onChangeText={setInitialQty}
                                            modifiers={[frame({ width: 100 })]}
                                        />
                                        <SwiftUIText color={subtextColor}>{unit}</SwiftUIText>
                                    </HStack>

                                    <Picker
                                        label="Storage Location"
                                        options={LOCATIONS}
                                        selectedIndex={locationIndex}
                                        onOptionSelected={(e) => setLocationIndex(e.nativeEvent.index)}
                                        variant="menu"
                                    />
                                </Section>
                            )}

                            {/* Section 3 — Description */}
                            <Section title="Notes & Specifications">
                                <TextField
                                    placeholder="Add description or specifications…"
                                    defaultValue={description}
                                    onChangeText={setDescription}
                                />
                            </Section>
                        </NativeFinanceList>

                        {/* Bottom Save Action Button */}
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            disabled={!isValid || isSubmitting}
                            onPress={handleSubmit}
                            modifiers={[
                                padding({ leading: 20, trailing: 20, top: 10, bottom: 34 }),
                                frame({ maxWidth: Infinity }),
                            ]}
                        >
                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}>
                                <Spacer />
                                <SwiftUIText size={17} weight="semibold" color="#FFFFFF">
                                    {isSubmitting ? 'Saving…' : `Register ${CATEGORIES[categoryIndex]}`}
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

export default SwiftUIAddResourceSheet;
