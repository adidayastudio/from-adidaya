import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as XLSX from 'xlsx';
import { BlurView } from 'expo-blur';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { FilePreviewResolution } from '@/lib/filePreviewStrategy';

export interface ParsedSpreadsheetSheet {
    name: string;
    columns: string[];
    rows: string[][];
}

const DEFAULT_SPREADSHEET_SHEETS: ParsedSpreadsheetSheet[] = [
    {
        name: 'Bill of Quantities',
        columns: ['#', 'Item Description', 'Category', 'Unit', 'Qty', 'Unit Price ($)', 'Total ($)', 'Status'],
        rows: [
            ['1', 'Structural Beam 400x200', 'Material', 'm', '120', '85.00', '10,200.00', 'Delivered'],
            ['2', 'Rebar Grade 60 (D16)', 'Material', 'ton', '4.5', '920.00', '4,140.00', 'In Transit'],
            ['3', 'High-Strength Concrete f\'c 35', 'Mix', 'm3', '85', '110.00', '9,350.00', 'Approved'],
            ['4', 'Formwork Plywood 18mm', 'Equipment', 'pcs', '250', '28.50', '7,125.00', 'In Stock'],
            ['5', 'Tower Crane Rental (Month 1)', 'Machinery', 'mo', '1', '4,500.00', '4,500.00', 'Active'],
            ['6', 'Surveying Equipment Calibration', 'Services', 'lot', '1', '750.00', '750.00', 'Completed'],
            ['7', 'Safety Helmets & Harnesses', 'EHS', 'sets', '40', '45.00', '1,800.00', 'Inspected'],
            ['8', 'Anchor Bolts M24 Grade 8.8', 'Hardware', 'pcs', '320', '12.50', '4,000.00', 'Delivered'],
            ['9', 'Curing Compound Membrane', 'Chemicals', 'drum', '12', '185.00', '2,220.00', 'In Stock'],
            ['10', 'Site Office Utilities', 'Overheads', 'mo', '1', '1,200.00', '1,200.00', 'Active'],
        ],
    },
    {
        name: 'Labor & Plant',
        columns: ['Code', 'Resource Name', 'Trade / Role', 'Headcount', 'Rate / Day ($)', 'Days', 'Subtotal ($)', 'Allocation'],
        rows: [
            ['LAB-01', 'Structural Ironworkers', 'Steel Fixing', '8', '140.00', '24', '26,880.00', '100%'],
            ['LAB-02', 'Formwork Carpenters', 'Carpentry', '12', '130.00', '20', '31,200.00', '100%'],
            ['LAB-03', 'Concrete Pouring Crew', 'Masonry', '6', '125.00', '14', '10,500.00', '80%'],
            ['PLN-01', 'Hydraulic Mobile Crane 50T', 'Heavy Plant', '1', '650.00', '18', '11,700.00', '90%'],
            ['PLN-02', 'Transit Concrete Mixer', 'Transport', '2', '280.00', '12', '6,720.00', '75%'],
            ['PLN-03', 'Site Generator 150kVA', 'Power', '2', '95.00', '30', '5,700.00', '100%'],
        ],
    },
    {
        name: 'Cost Summary',
        columns: ['WBS', 'Cost Category', 'Budgeted ($)', 'Committed ($)', 'Actual to Date ($)', 'Variance ($)', '% Incurred'],
        rows: [
            ['1.0', 'Civil & Substructure Works', '145,000.00', '138,500.00', '132,000.00', '+13,000.00', '91.0%'],
            ['2.0', 'Superstructure & Framing', '280,000.00', '265,000.00', '248,500.00', '+31,500.00', '88.8%'],
            ['3.0', 'Mechanical & Electrical (MEP)', '190,000.00', '182,000.00', '175,000.00', '+15,000.00', '92.1%'],
            ['4.0', 'Site Preliminaries & EHS', '45,000.00', '42,000.00', '40,500.00', '+4,500.00', '90.0%'],
            ['TOTAL', 'Project Consolidated Cost', '660,000.00', '627,500.00', '596,000.00', '+64,000.00', '90.3%'],
        ],
    },
];

interface SpreadsheetViewerProps {
    uri?: string;
    resolution: FilePreviewResolution;
    isDark: boolean;
    paddingTop?: number;
    paddingBottom?: number;
    onDownload?: () => void;
    onShare?: () => void;
}

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({
    uri,
    resolution,
    isDark,
    paddingTop = 0,
    paddingBottom = 0,
    onDownload,
    onShare,
}) => {
    const [sheets, setSheets] = useState<ParsedSpreadsheetSheet[]>(DEFAULT_SPREADSHEET_SHEETS);
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const tableSlideAnim = useRef(new RNAnimated.Value(0)).current;
    const tableOpacityAnim = useRef(new RNAnimated.Value(1)).current;

    const tabLayouts = useRef<{ [key: number]: { x: number; width: number } }>({});
    const pillTranslateX = useRef(new RNAnimated.Value(0)).current;
    const pillWidth = useRef(new RNAnimated.Value(0)).current;
    const [hasMeasuredPill, setHasMeasuredPill] = useState(false);

    const targetUri = uri || resolution.previewUrl || resolution.originalUrl;
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    const subTextColor = isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0';
    const headerBg = isDark ? '#1E293B' : '#F1F5F9';
    const cardBg = isDark ? 'rgba(22, 24, 30, 0.95)' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0';
    const tableHeadBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F8FAFC';
    const tableBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
    const sheetThemeColor = resolution.badgeColor || '#10B981';

    const animatePillToTab = useCallback((index: number) => {
        const layout = tabLayouts.current[index];
        if (layout) {
            RNAnimated.parallel([
                RNAnimated.spring(pillTranslateX, {
                    toValue: layout.x,
                    friction: 9,
                    tension: 80,
                    useNativeDriver: false,
                }),
                RNAnimated.spring(pillWidth, {
                    toValue: layout.width,
                    friction: 9,
                    tension: 80,
                    useNativeDriver: false,
                }),
            ]).start();
            if (!hasMeasuredPill) setHasMeasuredPill(true);
        }
    }, [hasMeasuredPill, pillTranslateX, pillWidth]);

    const handleSheetChange = useCallback((newIdx: number) => {
        if (newIdx === activeSheetIndex) return;
        const direction = newIdx > activeSheetIndex ? 1 : -1;
        Haptics.selectionAsync();

        animatePillToTab(newIdx);

        tableSlideAnim.setValue(direction * 48);
        tableOpacityAnim.setValue(0.2);
        setActiveSheetIndex(newIdx);

        RNAnimated.parallel([
            RNAnimated.spring(tableSlideAnim, {
                toValue: 0,
                friction: 8,
                tension: 60,
                useNativeDriver: true,
            }),
            RNAnimated.timing(tableOpacityAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start();
    }, [activeSheetIndex, animatePillToTab, tableSlideAnim, tableOpacityAnim]);

    useEffect(() => {
        if (!targetUri || (!targetUri.startsWith('http') && !targetUri.startsWith('blob:') && !targetUri.startsWith('data:'))) {
            return;
        }

        let isCancelled = false;
        setIsLoading(true);

        const parseFile = async () => {
            try {
                const response = await fetch(targetUri);
                if (!response.ok) throw new Error('Failed to fetch spreadsheet');
                const arrayBuffer = await response.arrayBuffer();

                if (isCancelled) return;

                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const parsedSheets: ParsedSpreadsheetSheet[] = workbook.SheetNames.map((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
                    if (!jsonData || jsonData.length === 0) {
                        return { name: sheetName, columns: ['A'], rows: [] };
                    }
                    const maxCols = Math.max(...jsonData.map((r) => (Array.isArray(r) ? r.length : 0)), 1);
                    const cols = Array.from({ length: maxCols }, (_, idx) => {
                        let cName = '';
                        let temp = idx;
                        while (temp >= 0) {
                            cName = String.fromCharCode(65 + (temp % 26)) + cName;
                            temp = Math.floor(temp / 26) - 1;
                        }
                        return cName;
                    });
                    const rows = jsonData.map((row) =>
                        Array.from({ length: maxCols }, (_, idx) =>
                            row && row[idx] !== undefined ? String(row[idx]) : ''
                        )
                    );
                    return { name: sheetName, columns: cols, rows };
                });

                if (!isCancelled && parsedSheets.length > 0) {
                    setSheets(parsedSheets);
                    setActiveSheetIndex(0);
                }
            } catch (err) {
                console.warn('[SpreadsheetViewer] parsing failed, using default sheets:', err);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        parseFile();

        return () => {
            isCancelled = true;
        };
    }, [targetUri]);

    const currentSheet = sheets[activeSheetIndex] || sheets[0] || DEFAULT_SPREADSHEET_SHEETS[0];
    const filteredRows = searchQuery.trim()
        ? currentSheet.rows.filter((row) =>
              row.some((cell) => cell.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : currentSheet.rows;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#121214' : '#F8FAFC', paddingTop, paddingBottom }]}>
            {/* Top Sheet Tabs & Search */}
            <View style={styles.tableTopHeaderWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tableSheetTabsScrollContent}
                >
                    <BlurView intensity={isDark ? 40 : 70} tint={isDark ? 'dark' : 'light'} style={styles.tableSheetTabsCapsule}>
                        {hasMeasuredPill && (
                            <RNAnimated.View
                                style={[
                                    styles.tableSheetActivePillIndicator,
                                    {
                                        backgroundColor: sheetThemeColor,
                                        transform: [{ translateX: pillTranslateX }],
                                        width: pillWidth,
                                    },
                                ]}
                            />
                        )}
                        {sheets.map((sheet, sIdx) => {
                            const isActive = activeSheetIndex === sIdx;
                            return (
                                <TouchableOpacity
                                    key={sIdx}
                                    activeOpacity={0.7}
                                    onLayout={(e) => {
                                        const { x, width } = e.nativeEvent.layout;
                                        tabLayouts.current[sIdx] = { x, width };
                                        if (sIdx === activeSheetIndex && !hasMeasuredPill) {
                                            pillTranslateX.setValue(x);
                                            pillWidth.setValue(width);
                                            setHasMeasuredPill(true);
                                        }
                                    }}
                                    onPress={() => handleSheetChange(sIdx)}
                                    style={styles.tableSheetTabItem}
                                >
                                    <PlatformIcon
                                        name="tablecells"
                                        size={12}
                                        tintColor={isActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')}
                                    />
                                    <Text
                                        style={[
                                            styles.tableSheetTabText,
                                            { color: isActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B') },
                                            isActive && { fontWeight: '700' },
                                        ]}
                                    >
                                        {sheet.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </BlurView>
                </ScrollView>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchBoxWrapper, { paddingHorizontal: 16, marginBottom: 8 }]}>
                <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor }]}>
                    <Ionicons name="search" size={15} color={subTextColor} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search sheet data…"
                        placeholderTextColor={subTextColor}
                        style={[styles.searchInput, { color: textColor }]}
                    />
                    {Boolean(searchQuery) && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color={subTextColor} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Table Sheet Content */}
            <RNAnimated.View
                style={{
                    flex: 1,
                    transform: [{ translateX: tableSlideAnim }],
                    opacity: tableOpacityAnim,
                }}
            >
                <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                        <View style={[styles.tableSheetWrapper, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            {/* Table Header Row */}
                            <View style={[styles.tableHeadRow, { backgroundColor: tableHeadBg, borderBottomColor: tableBorder }]}>
                                {currentSheet.columns.map((col, idx) => (
                                    <View key={idx} style={[styles.tableHeadCell, { width: idx === 0 ? 55 : idx === 1 ? 200 : 120, borderRightColor: tableBorder }]}>
                                        <Text style={[styles.tableHeadText, { color: textColor }]}>{col}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Table Data Rows */}
                            {filteredRows.map((row, rIdx) => (
                                <View
                                    key={rIdx}
                                    style={[
                                        styles.tableDataRow,
                                        {
                                            backgroundColor: rIdx % 2 === 1 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)') : 'transparent',
                                            borderBottomColor: tableBorder,
                                        },
                                    ]}
                                >
                                    {currentSheet.columns.map((_, cIdx) => (
                                        <View key={cIdx} style={[styles.tableDataCell, { width: cIdx === 0 ? 55 : cIdx === 1 ? 200 : 120, borderRightColor: tableBorder }]}>
                                            <Text
                                                style={[
                                                    styles.tableDataText,
                                                    { color: textColor },
                                                    cIdx === 0 && { color: subTextColor, textAlign: 'center', fontWeight: '600' },
                                                    cIdx >= 4 && { fontVariant: ['tabular-nums'] },
                                                    row[cIdx]?.toLowerCase() === 'delivered' || row[cIdx]?.toLowerCase() === 'approved' || row[cIdx]?.toLowerCase() === 'completed'
                                                        ? { color: '#10B981', fontWeight: '700' }
                                                        : row[cIdx]?.toLowerCase() === 'active' || row[cIdx]?.toLowerCase() === 'in transit'
                                                        ? { color: '#3B82F6', fontWeight: '600' }
                                                        : row[cIdx]?.toLowerCase() === 'in stock'
                                                        ? { color: '#F59E0B', fontWeight: '600' }
                                                        : {},
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {row[cIdx] ?? ''}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </ScrollView>
            </RNAnimated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    tableTopHeaderWrapper: {
        width: '100%',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    tableSheetTabsScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tableSheetTabsCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        position: 'relative',
    },
    tableSheetActivePillIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 16,
        zIndex: 1,
    },
    tableSheetTabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        zIndex: 2,
    },
    tableSheetTabText: {
        fontSize: 12,
        fontWeight: '600',
    },
    searchBoxWrapper: {
        width: '100%',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        padding: 0,
    },
    tableSheetWrapper: {
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        minWidth: '100%',
    },
    tableHeadRow: {
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tableHeadCell: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        justifyContent: 'center',
        borderRightWidth: StyleSheet.hairlineWidth,
    },
    tableHeadText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    tableDataRow: {
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tableDataCell: {
        paddingHorizontal: 10,
        paddingVertical: 9,
        justifyContent: 'center',
        borderRightWidth: StyleSheet.hairlineWidth,
    },
    tableDataText: {
        fontSize: 12,
    },
});

