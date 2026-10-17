import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    Pressable,
    StyleProp,
    ViewStyle,
    StyleSheet,
    ScrollView,
    Image,
    Share,
    Alert,
    Dimensions,
    Platform,
    StatusBar as RNStatusBar,
    ActivityIndicator,
    Animated as RNAnimated,
    LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GlassView } from '../ui/GlassView';
import { GlassEffectContainer } from '../ui/GlassEffectContainer';
import { PlatformIcon } from '../ui/PlatformIcon';
import {
    Host,
    Button as SwiftUIButton,
    Spacer as SwiftUISpacer,
    Slider as SwiftUISlider,
    GlassEffectContainer as SwiftUIGlassEffectContainer,
    Image as SwiftUIImage,
    Text as SwiftUIText,
    HStack as SwiftUIHStack,
    frame,
    glassEffect,
    cornerRadius,
    padding as swiftUIPadding,
} from '@/lib/swiftui';
import {
    resolveFilePreview,
    FilePreviewItem,
    FilePreviewResolution,
} from '@/lib/filePreviewStrategy';
import { PdfViewer } from '@/components/file-preview/PdfViewer';
import { DocxViewer } from '@/components/file-preview/DocxViewer';
import { SpreadsheetViewer } from '@/components/file-preview/SpreadsheetViewer';
import { FileFallbackCard } from '@/components/file-preview/FileFallbackCard';
import * as XLSX from 'xlsx';
import * as docxPreview from 'docx-preview';

export interface ParsedSpreadsheetSheet {
    name: string;
    columns: string[];
    rows: string[][];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const BouncyActionButton = ({
    onPress,
    icon,
    label,
    variant = 'secondary',
    isDark,
    style,
}: {
    onPress: () => void;
    icon?: string;
    label: string;
    variant?: 'primary' | 'secondary';
    isDark: boolean;
    style?: StyleProp<ViewStyle>;
}) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const isPrimary = variant === 'primary';
    const bg = isPrimary
        ? '#0A84FF'
        : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)');
    const textColor = isPrimary
        ? '#FFFFFF'
        : (isDark ? 'rgba(255, 255, 255, 0.95)' : '#0F172A');
    const iconColor = isPrimary
        ? '#FFFFFF'
        : (isDark ? 'rgba(255, 255, 255, 0.85)' : '#334155');

    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            onPressIn={() => {
                'worklet';
                scale.value = withSpring(0.94, {
                    damping: 18,
                    stiffness: 350,
                    mass: 0.6,
                });
            }}
            onPressOut={() => {
                'worklet';
                scale.value = withSpring(1, {
                    damping: 18,
                    stiffness: 350,
                    mass: 0.6,
                });
            }}
            style={[{ overflow: 'visible' }, style]}
        >
            <Animated.View
                style={[
                    {
                        height: isPrimary ? 50 : 44,
                        borderRadius: 25,
                        backgroundColor: bg,
                        borderWidth: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 20,
                        gap: 7,
                        overflow: 'hidden',
                        ...(isPrimary ? {
                            shadowColor: '#0A84FF',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.25,
                            shadowRadius: 10,
                            elevation: 2,
                        } : {}),
                    },
                    animatedStyle,
                ]}
            >
                {!isPrimary && (
                    <BlurView
                        intensity={isDark ? 25 : 45}
                        tint={isDark ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />
                )}
                {icon && <PlatformIcon name={icon} size={isPrimary ? 18 : 15} tintColor={iconColor} />}
                <Text
                    style={{
                        fontSize: isPrimary ? 16 : 14,
                        fontWeight: isPrimary ? '700' : '600',
                        color: textColor,
                        letterSpacing: -0.2,
                    }}
                >
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
};

const HeroDocIcon = ({
    badgeCode,
    badgeColor,
    fileFamily,
    isDark,
}: {
    badgeCode: string;
    badgeColor: string;
    fileFamily?: string;
    isDark: boolean;
}) => {
    const pageBg = isDark ? '#1C1C22' : '#FFFFFF';
    const pageBorder = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
    const lineBase = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.12)';
    const badgeBg = isDark ? `${badgeColor}30` : `${badgeColor}18`;

    return (
        <View
            style={{
                width: 74,
                height: 94,
                borderRadius: 16,
                backgroundColor: pageBg,
                borderWidth: 1.5,
                borderColor: pageBorder,
                padding: 7,
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1.5 },
                shadowOpacity: isDark ? 0.25 : 0.04,
                shadowRadius: 5,
                elevation: 2,
                marginBottom: 18,
            }}
        >
            {/* Top row: Format tag & mini emblem dot */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View
                    style={{
                        backgroundColor: badgeBg,
                        paddingHorizontal: 6,
                        paddingVertical: 2.5,
                        borderRadius: 6,
                    }}
                >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: badgeColor, letterSpacing: -0.2 }}>
                        {badgeCode}
                    </Text>
                </View>
                <View
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: 3.5,
                        backgroundColor: badgeColor,
                        opacity: 0.85,
                    }}
                />
            </View>

            {/* Center visual motif matching file family / layout type */}
            {fileFamily === '3d' ? (
                <View style={{ height: 38, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: 20, height: 20, borderWidth: 1.5, borderColor: badgeColor, borderRadius: 4, opacity: 0.75, transform: [{ rotate: '45deg' }] }} />
                </View>
            ) : fileFamily === 'archive' ? (
                <View style={{ gap: 4, marginVertical: 4, alignItems: 'center' }}>
                    <View style={{ width: 28, height: 3, backgroundColor: lineBase, borderRadius: 1.5 }} />
                    <View style={{ width: 14, height: 3.5, backgroundColor: badgeColor, borderRadius: 2, opacity: 0.75 }} />
                </View>
            ) : (
                <View
                    style={{
                        height: 38,
                        borderWidth: 1.2,
                        borderColor: lineBase,
                        borderRadius: 6,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    }}
                >
                    <View style={{ width: 22, height: 1.5, backgroundColor: badgeColor, opacity: 0.7, borderRadius: 1 }} />
                    <View style={{ width: 1.5, height: 18, backgroundColor: badgeColor, opacity: 0.7, position: 'absolute', borderRadius: 1 }} />
                </View>
            )}

            {/* Bottom minimal spacer */}
            <View style={{ height: 2 }} />
        </View>
    );
};



interface FormaUniversalFileViewerProps {
    visible: boolean;
    onClose: () => void;
    item: FilePreviewItem | null;
    onShare?: () => void;
    onDownload?: () => void;
    onGetInfo?: () => void;
    onToggleBookmark?: () => void;
    isBookmarked?: boolean;
    isDark?: boolean;
    // Media Player states
    activePhotoIndex?: number;
    setActivePhotoIndex?: (idx: number) => void;
    isVideoPlaying?: boolean;
    setIsVideoPlaying?: (playing: boolean) => void;
    videoProgress?: number;
    setVideoProgress?: (val: number) => void;
    videoDurationSec?: number;
    photoScrollRef?: any;
}

const DEFAULT_SPREADSHEET_SHEETS = [
    {
        name: 'Bill of Quantities',
        columns: ['#', 'Item Description', 'Category', 'Unit', 'Qty', 'Unit Price (IDR)', 'Total (IDR)', 'Status'],
        rows: [
            ['1', 'Structural Beam 400x200', 'Material', 'm', '120', '850,000', '102,000,000', 'Delivered'],
            ['2', 'Rebar Grade 60 (D16)', 'Material', 'ton', '4.5', '14,500,000', '65,250,000', 'In Transit'],
            ['3', 'High-Strength Concrete f\'c 35', 'Mix', 'm3', '85', '1,350,000', '114,750,000', 'Approved'],
            ['4', 'Formwork Plywood 18mm', 'Equipment', 'pcs', '250', '285,000', '71,250,000', 'In Stock'],
            ['5', 'Tower Crane Rental (Month 1)', 'Machinery', 'mo', '1', '45,000,000', '45,000,000', 'Active'],
            ['6', 'Surveying Equipment Calibration', 'Services', 'lot', '1', '7,500,000', '7,500,000', 'Completed'],
            ['7', 'Safety Helmets & Harnesses', 'EHS', 'sets', '40', '450,000', '18,000,000', 'Inspected'],
            ['8', 'Anchor Bolts M24 Grade 8.8', 'Hardware', 'pcs', '320', '125,000', '40,000,000', 'Delivered'],
            ['9', 'Curing Compound Membrane', 'Chemicals', 'drum', '12', '1,850,000', '22,200,000', 'In Stock'],
            ['10', 'Site Office Utilities', 'Overheads', 'mo', '1', '12,000,000', '12,000,000', 'Active'],
        ],
    },
    {
        name: 'Labor & Plant',
        columns: ['Code', 'Resource Name', 'Trade / Role', 'Headcount', 'Rate / Day (IDR)', 'Days', 'Subtotal (IDR)', 'Allocation'],
        rows: [
            ['LAB-01', 'Structural Ironworkers', 'Steel Fixing', '8', '240,000', '24', '46,080,000', '100%'],
            ['LAB-02', 'Formwork Carpenters', 'Carpentry', '12', '220,000', '20', '52,800,000', '100%'],
            ['LAB-03', 'Concrete Pouring Crew', 'Masonry', '6', '200,000', '14', '16,800,000', '80%'],
            ['PLN-01', 'Hydraulic Mobile Crane 50T', 'Heavy Plant', '1', '6,500,000', '18', '117,000,000', '90%'],
            ['PLN-02', 'Transit Concrete Mixer', 'Transport', '2', '2,800,000', '12', '67,200,000', '75%'],
            ['PLN-03', 'Site Generator 150kVA', 'Power', '2', '950,000', '30', '57,000,000', '100%'],
        ],
    },
    {
        name: 'Cost Summary',
        columns: ['WBS', 'Cost Category', 'Budgeted (IDR)', 'Committed (IDR)', 'Actual to Date (IDR)', 'Variance (IDR)', '% Incurred'],
        rows: [
            ['1.0', 'Civil & Substructure Works', '450,000,000', '438,500,000', '412,000,000', '+38,000,000', '91.5%'],
            ['2.0', 'Superstructure & Framing', '680,000,000', '645,000,000', '598,500,000', '+81,500,000', '88.0%'],
            ['3.0', 'Mechanical & Electrical (MEP)', '390,000,000', '362,000,000', '345,000,000', '+45,000,000', '88.4%'],
            ['4.0', 'Site Preliminaries & EHS', '95,000,000', '88,000,000', '82,500,000', '+12,500,000', '86.8%'],
            ['TOTAL', 'Project Consolidated Cost', '1,615,000,000', '1,533,500,000', '1,438,000,000', '+177,000,000', '89.0%'],
        ],
    },
];

export const FormaUniversalFileViewer: React.FC<FormaUniversalFileViewerProps> = ({
    visible,
    onClose,
    item,
    onShare,
    onDownload,
    onGetInfo,
    onToggleBookmark,
    isBookmarked = false,
    isDark = true,
    activePhotoIndex: propActiveIndex,
    setActivePhotoIndex: propSetActiveIndex,
    isVideoPlaying = false,
    setIsVideoPlaying = () => {},
    videoProgress = 14,
    setVideoProgress = () => {},
    videoDurationSec = 78,
    photoScrollRef: propPhotoScrollRef,
}) => {
    const insets = useSafeAreaInsets();
    const [internalIndex, setInternalIndex] = useState(item?.activeIndex ?? propActiveIndex ?? 0);
    const activePhotoIndex = propSetActiveIndex && propActiveIndex !== undefined ? propActiveIndex : internalIndex;
    const internalPhotoScrollRef = useRef<ScrollView>(null);
    const photoScrollRef = propPhotoScrollRef || internalPhotoScrollRef;

    const [activePage, setActivePage] = useState(0);
    const [activeTableSheet, setActiveTableSheet] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [markdownMode, setMarkdownMode] = useState<'rendered' | 'source'>('rendered');
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(32);

    const [isZoomed, setIsZoomed] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const stripAnim = useRef(new RNAnimated.Value(1)).current;
    const sliderAnim = useRef(new RNAnimated.Value(1)).current;
    const controlsHideTimer = useRef<any>(null);
    const stripHideTimer = useRef<any>(null);
    const thumbnailScrollRef = useRef<ScrollView>(null);

    // Gesture-based zoom shared values
    const zoomScale = useSharedValue(1);
    const savedZoomScale = useSharedValue(1);
    const zoomTranslateX = useSharedValue(0);
    const zoomTranslateY = useSharedValue(0);
    const savedZoomTranslateX = useSharedValue(0);
    const savedZoomTranslateY = useSharedValue(0);

    const resetZoom = useCallback(() => {
        zoomScale.value = withTiming(1, { duration: 180 });
        savedZoomScale.value = 1;
        zoomTranslateX.value = withTiming(0, { duration: 180 });
        zoomTranslateY.value = withTiming(0, { duration: 180 });
        savedZoomTranslateX.value = 0;
        savedZoomTranslateY.value = 0;
        setIsZoomed(false);
    }, []);

    const zoomAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: zoomTranslateX.value },
            { translateY: zoomTranslateY.value },
            { scale: zoomScale.value },
        ],
    }));

    const updateIsZoomed = useCallback((zoomed: boolean) => {
        setIsZoomed(zoomed);
    }, []);

    const pinchGesture = useMemo(() => Gesture.Pinch()
        .onStart(() => {
            'worklet';
            runOnJS(updateIsZoomed)(true);
        })
        .onUpdate((e) => {
            'worklet';
            zoomScale.value = Math.max(0.75, savedZoomScale.value * e.scale);
        })
        .onEnd(() => {
            'worklet';
            if (zoomScale.value < 1.05) {
                zoomScale.value = withTiming(1, { duration: 200 });
                savedZoomScale.value = 1;
                zoomTranslateX.value = withTiming(0, { duration: 200 });
                zoomTranslateY.value = withTiming(0, { duration: 200 });
                savedZoomTranslateX.value = 0;
                savedZoomTranslateY.value = 0;
                runOnJS(updateIsZoomed)(false);
            } else if (zoomScale.value > 5) {
                zoomScale.value = withTiming(5, { duration: 200 });
                savedZoomScale.value = 5;
                runOnJS(updateIsZoomed)(true);
            } else {
                savedZoomScale.value = zoomScale.value;
                runOnJS(updateIsZoomed)(true);
            }
        }), [updateIsZoomed]);

    const panGesture = useMemo(() => Gesture.Pan()
        .minPointers(1)
        .maxPointers(2)
        .onUpdate((e) => {
            'worklet';
            if (savedZoomScale.value > 1.05 || zoomScale.value > 1.05) {
                zoomTranslateX.value = savedZoomTranslateX.value + e.translationX;
                zoomTranslateY.value = savedZoomTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            'worklet';
            if (savedZoomScale.value > 1.05 || zoomScale.value > 1.05) {
                savedZoomTranslateX.value = zoomTranslateX.value;
                savedZoomTranslateY.value = zoomTranslateY.value;
            }
        }), []);

    const doubleTapGesture = useMemo(() => Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            'worklet';
            if (savedZoomScale.value > 1.1) {
                zoomScale.value = withTiming(1, { duration: 250 });
                savedZoomScale.value = 1;
                zoomTranslateX.value = withTiming(0, { duration: 250 });
                zoomTranslateY.value = withTiming(0, { duration: 250 });
                savedZoomTranslateX.value = 0;
                savedZoomTranslateY.value = 0;
                runOnJS(updateIsZoomed)(false);
            } else {
                zoomScale.value = withTiming(2.5, { duration: 250 });
                savedZoomScale.value = 2.5;
                runOnJS(updateIsZoomed)(true);
            }
        }), [updateIsZoomed]);

    const composedZoomGesture = useMemo(() =>
        Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture),
        [pinchGesture, panGesture, doubleTapGesture]);

    useEffect(() => {
        if (item?.activeIndex !== undefined) {
            setInternalIndex(item.activeIndex);
            resetZoom();
            setTimeout(() => {
                photoScrollRef.current?.scrollTo({ x: item.activeIndex * screenWidth, animated: false });
                thumbnailScrollRef.current?.scrollTo({ x: item.activeIndex * 40, animated: false });
            }, 60);
        }
    }, [item?.activeIndex]);

    const clearAllTimers = useCallback(() => {
        if (controlsHideTimer.current) {
            clearTimeout(controlsHideTimer.current);
            controlsHideTimer.current = null;
        }
        if (stripHideTimer.current) {
            clearTimeout(stripHideTimer.current);
            stripHideTimer.current = null;
        }
    }, []);

    const startHideSequence = useCallback(() => {
        clearAllTimers();
        // Step 1: Smoothly fade out bottom thumbnail preview strip first (after 800ms of video playing)
        stripHideTimer.current = setTimeout(() => {
            RNAnimated.timing(stripAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }, 800);

        // Step 2: After 5 seconds of video playing, smoothly fade out slider capsule
        controlsHideTimer.current = setTimeout(() => {
            RNAnimated.timing(sliderAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                setControlsVisible(false);
            });
        }, 5000);
    }, [clearAllTimers, stripAnim, sliderAnim]);

    const showAllControls = useCallback(() => {
        clearAllTimers();
        setControlsVisible(true);
        RNAnimated.parallel([
            RNAnimated.timing(stripAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
            RNAnimated.timing(sliderAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
        if (thumbnailScrollRef.current) {
            thumbnailScrollRef.current.scrollTo({ x: activePhotoIndex * 40, animated: true });
        }
    }, [clearAllTimers, stripAnim, sliderAnim, activePhotoIndex]);

    useEffect(() => {
        if (isVideoPlaying) {
            startHideSequence();
        } else {
            showAllControls();
        }
        return () => {
            clearAllTimers();
        };
    }, [isVideoPlaying, startHideSequence, showAllControls, clearAllTimers]);

    const handleToggleControls = useCallback(() => {
        if (!controlsVisible) {
            // Reappear BOTH bottom thumbnails and slider capsule smoothly
            showAllControls();
            if (isVideoPlaying) {
                startHideSequence();
            }
        } else {
            // Hide smoothly
            clearAllTimers();
            RNAnimated.parallel([
                RNAnimated.timing(stripAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(sliderAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setControlsVisible(false);
            });
        }
    }, [controlsVisible, isVideoPlaying, showAllControls, startHideSequence, clearAllTimers, stripAnim, sliderAnim]);

    const pagePillOpacity = useRef(new RNAnimated.Value(0)).current;
    const pagePillHideTimer = useRef<any>(null);

    const tableSlideAnim = useRef(new RNAnimated.Value(0)).current;
    const tableOpacityAnim = useRef(new RNAnimated.Value(1)).current;

    const tabLayouts = useRef<{ [key: number]: { x: number; width: number } }>({});
    const pillTranslateX = useRef(new RNAnimated.Value(0)).current;
    const pillWidth = useRef(new RNAnimated.Value(0)).current;
    const [hasMeasuredPill, setHasMeasuredPill] = useState(false);

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

    const handleTableSheetChange = useCallback((newIdx: number) => {
        if (newIdx === activeTableSheet) return;
        const direction = newIdx > activeTableSheet ? 1 : -1;
        Haptics.selectionAsync();
        
        animatePillToTab(newIdx);

        tableSlideAnim.setValue(direction * 48);
        tableOpacityAnim.setValue(0.2);
        setActiveTableSheet(newIdx);

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
    }, [activeTableSheet, animatePillToTab, tableSlideAnim, tableOpacityAnim]);

    const showPagePill = useCallback(() => {
        RNAnimated.timing(pagePillOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();

        if (pagePillHideTimer.current) {
            clearTimeout(pagePillHideTimer.current);
        }
        pagePillHideTimer.current = setTimeout(() => {
            RNAnimated.timing(pagePillOpacity, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            }).start();
        }, 1000);
    }, [pagePillOpacity]);

    useEffect(() => {
        if (visible) {
            setIsScrolled(false);
            showPagePill();
        }
    }, [visible, showPagePill]);

    const resolution: FilePreviewResolution = useMemo(() => {
        if (!item) {
            return resolveFilePreview({ name: 'unknown_file' });
        }
        return resolveFilePreview(item);
    }, [item]);

    const pdfTargetUri = useMemo(() => {
        const raw = item?.url || item?.uri || resolution.previewUrl || '';
        if (!raw) return '';
        const trimmed = raw.trim();
        if (
            trimmed.startsWith('http://') ||
            trimmed.startsWith('https://') ||
            trimmed.startsWith('file://') ||
            trimmed.startsWith('content://') ||
            trimmed.startsWith('blob:') ||
            trimmed.startsWith('data:') ||
            trimmed.startsWith('/')
        ) {
            return trimmed;
        }
        return '';
    }, [item?.url, item?.uri, resolution.previewUrl]);

    const [parsedSheets, setParsedSheets] = useState<ParsedSpreadsheetSheet[] | null>(null);
    const [isParsingSheet, setIsParsingSheet] = useState(false);

    const isSpreadsheet = resolution.strategy === 'table' || /\.(xlsx?|csv|tsv|numbers|xlsm)$/i.test(resolution.displayName);

    useEffect(() => {
        if (!isSpreadsheet || !pdfTargetUri || !visible) {
            setParsedSheets(null);
            return;
        }

        let isMounted = true;
        async function loadSpreadsheet() {
            try {
                setIsParsingSheet(true);
                let wb: XLSX.WorkBook;

                if (pdfTargetUri.startsWith('data:')) {
                    const base64Data = pdfTargetUri.split(',')[1];
                    wb = XLSX.read(base64Data, { type: 'base64' });
                } else {
                    const response = await fetch(pdfTargetUri);
                    const arrayBuffer = await response.arrayBuffer();
                    wb = XLSX.read(arrayBuffer, { type: 'array' });
                }

                if (!isMounted) return;

                const sheets: ParsedSpreadsheetSheet[] = wb.SheetNames.map((sheetName) => {
                    const ws = wb.Sheets[sheetName];
                    const rawJson: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                    if (!rawJson || rawJson.length === 0) {
                        return { name: sheetName, columns: ['A', 'B', 'C', 'D'], rows: [] };
                    }
                    const firstRow = rawJson[0] || [];
                    const columns = firstRow.map((c, i) => (c !== undefined && c !== '' ? String(c) : `Col ${i + 1}`));
                    const rows = rawJson.slice(1).map((r) => r.map((c) => (c !== undefined && c !== null ? String(c) : '')));
                    return { name: sheetName, columns, rows };
                });

                if (sheets.length > 0) {
                    setParsedSheets(sheets);
                    setActiveTableSheet(0);
                } else {
                    setParsedSheets(null);
                }
            } catch (err) {
                console.warn('XLSX parse error in viewer:', err);
                if (isMounted) setParsedSheets(null);
            } finally {
                if (isMounted) setIsParsingSheet(false);
            }
        }

        loadSpreadsheet();
        return () => {
            isMounted = false;
        };
    }, [isSpreadsheet, pdfTargetUri, visible]);

    const docxContainerRef = useRef<HTMLDivElement | null>(null);
    const [isDocxParsing, setIsDocxParsing] = useState(false);
    const [isDocxRendered, setIsDocxRendered] = useState(false);

    const isDocx = /\.(docx?|odt|pages)$/i.test(resolution.displayName) || resolution.strategy === 'converted-pdf';

    useEffect(() => {
        if (!isDocx || !pdfTargetUri || !visible || Platform.OS !== 'web') {
            setIsDocxRendered(false);
            return;
        }

        let isMounted = true;
        async function loadDocx() {
            try {
                setIsDocxParsing(true);
                const res = await fetch(pdfTargetUri);
                const blob = await res.blob();
                if (!isMounted || !docxContainerRef.current) return;
                docxContainerRef.current.innerHTML = '';
                await docxPreview.renderAsync(blob, docxContainerRef.current, undefined, {
                    className: 'docx-preview-wrapper',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    breakPages: true,
                });
                if (isMounted) setIsDocxRendered(true);
            } catch (err) {
                console.warn('Docx render error in viewer:', err);
                if (isMounted) setIsDocxRendered(false);
            } finally {
                if (isMounted) setIsDocxParsing(false);
            }
        }

        loadDocx();
        return () => {
            isMounted = false;
        };
    }, [isDocx, pdfTargetUri, visible]);

    const galleryList = useMemo(() => {
        if (!item) return [];
        if (item.gallery && item.gallery.length > 0) {
            return item.gallery;
        }
        if (item.thumbnails && item.thumbnails.length > 0) {
            return item.thumbnails.map((thumbUri, idx) => ({
                id: `thumb-${idx}`,
                title: item.title || item.name || '',
                name: item.name || item.title || '',
                type: 'image' as const,
                uri: thumbUri,
                url: thumbUri,
                duration: item.duration,
                uploadedBy: item.uploadedBy,
                time: item.time,
                size: item.size,
            }));
        }
        if (resolution.strategy === 'image' || resolution.strategy === 'video') {
            return [{
                id: item.id || 'media-0',
                title: item.title || item.name || '',
                name: item.name || item.title || '',
                type: resolution.strategy as 'image' | 'video',
                uri: item.uri || item.url || (resolution.strategy === 'video' ? 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80'),
                url: item.url || item.uri,
                duration: item.duration || '00:24',
                uploadedBy: item.uploadedBy,
                time: item.time,
                size: item.size,
            }];
        }
        return [];
    }, [item, resolution.strategy]);

    const activeMediaItem = useMemo(() => {
        if (galleryList.length > 0 && activePhotoIndex < galleryList.length) {
            return galleryList[activePhotoIndex];
        }
        return null;
    }, [galleryList, activePhotoIndex]);

    const isCurrentActiveVideo = activeMediaItem?.type === 'video' || (!activeMediaItem && resolution.strategy === 'video');

    const handleSelectMediaIndex = useCallback((idx: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        resetZoom();
        setInternalIndex(idx);
        propSetActiveIndex?.(idx);
        setVideoProgress?.(0);
        setIsVideoPlaying?.(false);
        showAllControls();
        thumbnailScrollRef.current?.scrollTo({ x: idx * 40, animated: true });
        photoScrollRef.current?.scrollTo({ x: idx * screenWidth, animated: true });
    }, [propSetActiveIndex, setVideoProgress, setIsVideoPlaying, showAllControls, photoScrollRef]);

    if (!item) return null;

    const isMedia = resolution.strategy === 'image' || resolution.strategy === 'video';
    const effectiveDark = isMedia ? true : isDark;

    useEffect(() => {
        if (visible && Platform.OS === 'web' && typeof document !== 'undefined') {
            const originalBg = document.body.style.backgroundColor;
            const originalDocBg = document.documentElement.style.backgroundColor;
            let metaThemeColor = document.querySelector('meta[name="theme-color"]');
            const originalThemeColor = metaThemeColor?.getAttribute('content');

            if (effectiveDark) {
                document.body.style.backgroundColor = '#000000';
                document.documentElement.style.backgroundColor = '#000000';
                if (!metaThemeColor) {
                    metaThemeColor = document.createElement('meta');
                    metaThemeColor.setAttribute('name', 'theme-color');
                    document.head.appendChild(metaThemeColor);
                }
                metaThemeColor.setAttribute('content', '#000000');
            }

            return () => {
                document.body.style.backgroundColor = originalBg;
                document.documentElement.style.backgroundColor = originalDocBg;
                if (metaThemeColor && originalThemeColor) {
                    metaThemeColor.setAttribute('content', originalThemeColor);
                }
            };
        }
    }, [visible, effectiveDark]);

    const activeMedia = isMedia && galleryList.length > 0 ? (galleryList[activePhotoIndex] || galleryList[0]) : null;
    const currentMediaUrl = activeMedia?.uri || activeMedia?.url || resolution.originalUrl || resolution.previewUrl;
    const currentMediaName = activeMedia?.name || activeMedia?.title || (isMedia ? `forma-media-${activePhotoIndex + 1}` : resolution.displayName);

    const handleShare = async () => {
        Haptics.selectionAsync();
        if (onShare) {
            onShare();
            return;
        }
        try {
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
                await (navigator as any).share({
                    title: currentMediaName,
                    url: currentMediaUrl,
                });
            } else {
                await Share.share({
                    title: currentMediaName,
                    url: currentMediaUrl,
                    message: Platform.OS === 'android' ? currentMediaUrl : undefined,
                });
            }
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('Abort') || err?.message?.includes('cancel')) {
                return;
            }
            console.log('Share dismissed');
        }
    };

    const handleDownload = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (onDownload) {
            onDownload();
            return;
        }
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            try {
                const response = await fetch(currentMediaUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                let filename = currentMediaName || 'forma-media';
                if (!filename.includes('.')) {
                    filename += (resolution.strategy === 'video' ? '.mp4' : '.jpg');
                }
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            } catch (err) {
                const link = document.createElement('a');
                link.href = currentMediaUrl;
                link.download = currentMediaName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };

    const handlePhotoScroll = (e: any) => {
        const layoutW = e.nativeEvent.layoutMeasurement?.width || screenWidth;
        if (!layoutW || layoutW <= 0) return;
        const page = Math.round(e.nativeEvent.contentOffset.x / layoutW);
        if (page >= 0 && page < galleryList.length && page !== activePhotoIndex) {
            handleSelectMediaIndex(page);
        }
    };

    const handleOpenInApp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handleShare();
    };

    const cardBg = effectiveDark ? 'rgba(22, 24, 30, 0.95)' : '#FFFFFF';
    const cardBorder = effectiveDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0';
    const textColor = effectiveDark ? '#FFFFFF' : '#0F172A';
    const subTextColor = effectiveDark ? '#94A3B8' : '#64748B';
    const calloutBg = effectiveDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9';
    const calloutText = effectiveDark ? '#E2E8F0' : '#334155';
    const secondaryBtnBg = effectiveDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9';
    const secondaryBtnText = effectiveDark ? '#FFFFFF' : '#0F172A';
    const secondaryBtnIcon = effectiveDark ? '#FFFFFF' : '#0F172A';
    const codeBg = effectiveDark ? 'rgba(15, 17, 23, 0.95)' : '#FFFFFF';
    const codeBorder = effectiveDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0';
    const tableHeadBg = effectiveDark ? 'rgba(255, 255, 255, 0.08)' : '#F8FAFC';
    const tableBorder = effectiveDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.fullscreenContainer, { backgroundColor: effectiveDark ? '#000000' : '#F2F2F7' }]}>
                <RNStatusBar barStyle={effectiveDark ? 'light-content' : 'dark-content'} translucent={true} backgroundColor="transparent" />

                {/* Floating Top Navigation Header (Liquid Glass Circle Back + Capsule Actions) */}
                <View
                    style={[
                        styles.floatingTopHeader,
                        {
                            top: insets.top > 0 ? insets.top + 6 : 16,
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    {/* Left: Circle Glass Back Button */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onClose();
                        }}
                        style={styles.floatingCircleNavBtn}
                    >
                        {Platform.OS === 'ios' ? (
                            <Host style={StyleSheet.absoluteFill} colorScheme={effectiveDark ? 'dark' : 'light'}>
                                <SwiftUIGlassEffectContainer modifiers={[
                                    frame({ width: 44, height: 44 }),
                                    cornerRadius(22),
                                    glassEffect({ shape: 'circle' })
                                ]}>
                                    <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                        <SwiftUISpacer />
                                    </SwiftUIHStack>
                                </SwiftUIGlassEffectContainer>
                            </Host>
                        ) : (
                            <GlassView
                                intensity={70}
                                style={[
                                    StyleSheet.absoluteFillObject,
                                    {
                                        backgroundColor: effectiveDark ? 'rgba(28, 28, 30, 0.72)' : 'rgba(255, 255, 255, 0.75)',
                                        borderColor: effectiveDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                                        borderWidth: 1,
                                        borderRadius: 22,
                                    }
                                ]}
                            />
                        )}
                        <Ionicons
                            name="chevron-back"
                            size={22}
                            color={effectiveDark ? '#FFFFFF' : '#0F172A'}
                            style={{ marginLeft: -2 }}
                        />
                    </TouchableOpacity>

                    {/* Right: Floating Glass Capsule with Actions (Share & Download) */}
                    <View style={styles.floatingRightActionsPill}>
                        {Platform.OS === 'ios' ? (
                            <Host style={StyleSheet.absoluteFill} colorScheme={effectiveDark ? 'dark' : 'light'}>
                                <SwiftUIGlassEffectContainer modifiers={[
                                    frame({ height: 44 }),
                                    cornerRadius(22),
                                    glassEffect({ shape: 'capsule' })
                                ]}>
                                    <SwiftUIHStack alignment="center" modifiers={[
                                        frame({ height: 44 }),
                                        swiftUIPadding({ leading: 12, trailing: 12 })
                                    ]}>
                                        <SwiftUISpacer />
                                    </SwiftUIHStack>
                                </SwiftUIGlassEffectContainer>
                            </Host>
                        ) : (
                            <GlassView
                                intensity={70}
                                style={[
                                    StyleSheet.absoluteFillObject,
                                    {
                                        backgroundColor: effectiveDark ? 'rgba(28, 28, 30, 0.72)' : 'rgba(255, 255, 255, 0.75)',
                                        borderColor: effectiveDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                                        borderWidth: 1,
                                        borderRadius: 22,
                                    }
                                ]}
                            />
                        )}
                        <View style={styles.floatingPillInnerRow}>
                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={handleShare}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                style={styles.floatingPillActionBtn}
                            >
                                <PlatformIcon
                                    name="square.and.arrow.up"
                                    size={19}
                                    tintColor={effectiveDark ? '#FFFFFF' : '#0F172A'}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={handleDownload}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                style={styles.floatingPillActionBtn}
                            >
                                <PlatformIcon
                                    name="arrow.down.to.line"
                                    size={19}
                                    tintColor={effectiveDark ? '#FFFFFF' : '#0F172A'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Main Content Area */}
                <View style={styles.bodyContainer}>
                    {/* 1. MEDIA GALLERY PREVIEW (Photo & Video with Pinch-to-Zoom & Horizontal Swipe) */}
                    {isMedia && (
                        <ScrollView
                            ref={photoScrollRef}
                            horizontal
                            pagingEnabled
                            scrollEnabled={!isZoomed}
                            showsHorizontalScrollIndicator={false}
                            scrollEventThrottle={16}
                            onScroll={handlePhotoScroll}
                            onMomentumScrollEnd={handlePhotoScroll}
                            style={{ width: '100%', flex: 1 }}
                        >
                            {galleryList.map((media, idx) => {
                                const isVid = media.type === 'video';
                                return (
                                    <View key={media.id || idx} style={{ width: screenWidth, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                        {isVid ? (
                                            <TouchableOpacity
                                                activeOpacity={1}
                                                onPress={handleToggleControls}
                                                style={styles.videoPlayerWrapper}
                                            >
                                                <Image
                                                    source={{ uri: media.uri || media.url || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format&fit=crop&q=80' }}
                                                    style={styles.videoPlayerImage}
                                                    resizeMode="contain"
                                                />
                                                <RNAnimated.View
                                                    pointerEvents={controlsVisible && !isZoomed ? 'auto' : 'none'}
                                                    style={[styles.videoCenterPlayContainer, { opacity: sliderAnim }]}
                                                >
                                                    <TouchableOpacity
                                                        activeOpacity={0.8}
                                                        onPress={() => {
                                                            Haptics.selectionAsync();
                                                            setIsVideoPlaying?.(!isVideoPlaying);
                                                        }}
                                                    >
                                                        {Platform.OS === 'ios' ? (
                                                            <Host style={{ width: 76, height: 76 }} colorScheme="dark">
                                                                    <SwiftUIGlassEffectContainer modifiers={[
                                                                        frame({ width: 76, height: 76 }),
                                                                        cornerRadius(38),
                                                                        glassEffect({ shape: 'circle' }),
                                                                    ]}>
                                                                        <SwiftUIImage
                                                                            systemName={isVideoPlaying ? 'pause.fill' : 'play.fill'}
                                                                            size={32}
                                                                            color="#FFFFFF"
                                                                        />
                                                                    </SwiftUIGlassEffectContainer>
                                                                </Host>
                                                            ) : (
                                                                <View style={styles.videoCenterPlayFallback}>
                                                                    <Ionicons name={isVideoPlaying ? 'pause' : 'play'} size={32} color="#FFFFFF" style={{ marginLeft: isVideoPlaying ? 0 : 3 }} />
                                                                </View>
                                                            )}
                                                        </TouchableOpacity>
                                                    </RNAnimated.View>
                                            </TouchableOpacity>
                                        ) : (
                                            <GestureDetector gesture={composedZoomGesture}>
                                                <Animated.Image
                                                    source={{
                                                        uri: media.uri || media.url || (media as any).image || 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80'
                                                    }}
                                                    style={[{ width: screenWidth, height: screenHeight * 0.72, alignSelf: 'center' }, zoomAnimatedStyle]}
                                                    resizeMode="contain"
                                                />
                                            </GestureDetector>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* 3. AUDIO PREVIEW */}
                    {resolution.strategy === 'audio' && (
                        <View style={styles.audioViewerWrapper}>
                            <GlassView intensity={effectiveDark ? 40 : 20} tint={effectiveDark ? 'dark' : 'light'} style={[styles.audioCard, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }]}>
                                <View style={[styles.audioBadge, { backgroundColor: `${resolution.badgeColor}25` }]}>
                                    <PlatformIcon name="waveform" size={32} tintColor={resolution.badgeColor} />
                                </View>
                                <Text style={[styles.audioTitle, { color: textColor }]} numberOfLines={1}>{resolution.displayName}</Text>
                                <Text style={[styles.audioMeta, { color: subTextColor }]}>{resolution.displaySize} • Audio Recording</Text>

                                {/* Waveform visualizer */}
                                <View style={styles.waveformContainer}>
                                    {[18, 35, 60, 40, 80, 50, 70, 95, 65, 45, 85, 30, 75, 90, 55, 35, 70, 40, 85, 50, 60, 30, 20].map((h, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.waveformBar,
                                                {
                                                    height: h * 0.45,
                                                    backgroundColor: i < 12 ? '#3B82F6' : (effectiveDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)'),
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>

                                {/* Play / Pause controls */}
                                <View style={styles.audioControlsRow}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setIsAudioPlaying(!isAudioPlaying);
                                        }}
                                        style={styles.audioPlayBtn}
                                    >
                                        <Ionicons name={isAudioPlaying ? 'pause' : 'play'} size={24} color="#FFFFFF" style={{ marginLeft: isAudioPlaying ? 0 : 2 }} />
                                    </TouchableOpacity>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <View style={[styles.audioProgressTrack, { backgroundColor: effectiveDark ? 'rgba(255,255,255,0.2)' : '#E2E8F0' }]}>
                                            <View style={[styles.audioProgressFill, { width: `${audioProgress}%` }]} />
                                        </View>
                                        <View style={styles.audioTimeRow}>
                                            <Text style={[styles.audioTimeText, { color: subTextColor }]}>00:14</Text>
                                            <Text style={[styles.audioTimeText, { color: subTextColor }]}>01:18</Text>
                                        </View>
                                    </View>
                                </View>
                            </GlassView>
                        </View>
                    )}

                    {/* 4. PDF & CONVERTED-PDF PREVIEW */}
                    {(resolution.strategy === 'pdf' || resolution.strategy === 'converted-pdf') && (
                        isDocx ? (
                            <DocxViewer
                                uri={pdfTargetUri}
                                resolution={resolution}
                                isDark={effectiveDark}
                                paddingTop={(insets.top > 0 ? insets.top : 12) + 66}
                                paddingBottom={insets.bottom || 20}
                                onDownload={handleDownload}
                                onShare={handleShare}
                            />
                        ) : (
                            <PdfViewer
                                uri={pdfTargetUri}
                                resolution={resolution}
                                isDark={effectiveDark}
                                paddingTop={(insets.top > 0 ? insets.top : 12) + 66}
                                paddingBottom={insets.bottom || 20}
                                onDownload={handleDownload}
                                onShare={handleShare}
                            />
                        )
                    )}

                    {/* 5. TABLE / CSV / SPREADSHEET */}
                    {resolution.strategy === 'table' && (
                        <SpreadsheetViewer
                            uri={pdfTargetUri}
                            resolution={resolution}
                            isDark={effectiveDark}
                            paddingTop={(insets.top > 0 ? insets.top : 12) + 66}
                            paddingBottom={(insets.bottom || 20) + 16}
                            onDownload={handleDownload}
                            onShare={handleShare}
                        />
                    )}

                    {/* 6. OTHER / FALLBACK */}
                    {!isMedia && resolution.strategy !== 'audio' && resolution.strategy !== 'pdf' && resolution.strategy !== 'converted-pdf' && resolution.strategy !== 'table' && (
                        <View style={[styles.landingContainer, { paddingTop: (insets.top > 0 ? insets.top : 12) + 66 }]}>
                            <FileFallbackCard
                                resolution={resolution}
                                isDark={effectiveDark}
                                onDownload={handleDownload}
                                onShare={handleShare}
                            />
                        </View>
                    )}
                </View>

                {/* Bottom Floating Bar: Video Timeline (when active item is video) */}
                {isCurrentActiveVideo && !isZoomed && (
                    <RNAnimated.View
                        pointerEvents={controlsVisible ? 'box-none' : 'none'}
                        style={[
                            styles.videoControlsOverlay,
                            {
                                bottom:
                                    isMedia && galleryList.length > 1
                                        ? insets.bottom > 0
                                            ? insets.bottom + 76
                                            : 86
                                        : insets.bottom > 0
                                        ? insets.bottom + 16
                                        : 26,
                                opacity: sliderAnim,
                                transform: [
                                    {
                                        translateY: sliderAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [16, 0],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.videoControlsPill}>
                            {Platform.OS === 'ios' ? (
                                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                                    <Host style={StyleSheet.absoluteFill} colorScheme="dark">
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ maxWidth: Infinity, height: 52 }),
                                            cornerRadius(26),
                                            glassEffect({ shape: 'capsule' }),
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[
                                                frame({ maxWidth: Infinity, height: 52 }),
                                            ]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                </View>
                            ) : (
                                <BlurView
                                    intensity={80}
                                    tint="dark"
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <View style={styles.videoControlsInner}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setIsVideoPlaying?.(!isVideoPlaying);
                                    }}
                                    style={styles.videoPlayToggleBtn}
                                >
                                    <Ionicons
                                        name={isVideoPlaying ? 'pause' : 'play'}
                                        size={18}
                                        color="#FFFFFF"
                                        style={{ marginLeft: isVideoPlaying ? 0 : 2 }}
                                    />
                                </TouchableOpacity>

                                <View style={styles.videoSliderWrapper}>
                                    {Platform.OS === 'ios' ? (
                                        <Host style={styles.swiftUiHost}>
                                            <SwiftUISlider
                                                min={0}
                                                max={videoDurationSec}
                                                value={videoProgress}
                                                color="#FFFFFF"
                                                onValueChange={(val: number) => {
                                                    setVideoProgress?.(val);
                                                }}
                                            />
                                        </Host>
                                    ) : (
                                        <View style={styles.fallbackProgressTrack}>
                                            <View
                                                style={[
                                                    styles.fallbackProgressFill,
                                                    { width: `${Math.min(100, (videoProgress / Math.max(1, videoDurationSec)) * 100)}%` },
                                                ]}
                                            />
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.videoTimeCounter}>
                                    {`${String(Math.floor(videoProgress / 60)).padStart(2, '0')}:${String(Math.floor(videoProgress % 60)).padStart(2, '0')} / ${String(Math.floor(videoDurationSec / 60)).padStart(2, '0')}:${String(Math.floor(videoDurationSec % 60)).padStart(2, '0')}`}
                                </Text>
                            </View>
                        </View>
                    </RNAnimated.View>
                )}

                {/* Bottom Thumbnail Strip: Rendered only when galleryList.length > 1 and not zoomed */}
                {isMedia && galleryList.length > 1 && !isZoomed && (
                    <RNAnimated.View
                        pointerEvents={controlsVisible ? 'auto' : 'none'}
                        style={[
                            styles.bottomThumbnailStripWrapper,
                            {
                                bottom: insets.bottom > 0 ? insets.bottom + 4 : 14,
                                opacity: stripAnim,
                                transform: [
                                    {
                                        translateY: stripAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [20, 0],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <ScrollView
                            ref={thumbnailScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.thumbnailStripContent}
                            style={styles.thumbnailStripScroll}
                        >
                            {galleryList.map((media, idx) => {
                                const isSelected = idx === activePhotoIndex;
                                const isVid = media.type === 'video';
                                return (
                                    <View key={media.id || idx} style={styles.thumbItemContainer}>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            onPress={() => handleSelectMediaIndex(idx)}
                                            style={[
                                                styles.thumbImageCard,
                                                isSelected ? styles.thumbActiveCard : styles.thumbInactiveCard,
                                            ]}
                                        >
                                            <Image
                                                source={{ uri: media.uri || media.url }}
                                                style={styles.thumbStripImage}
                                                resizeMode="cover"
                                            />
                                            {isVid && (
                                                <View style={styles.thumbVideoBadge}>
                                                    <Ionicons name="videocam" size={10} color="#FFFFFF" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                        {/* Forma Blue Dot indicator outside the thumbnail */}
                                        <View style={styles.thumbDotSlot}>
                                            {isSelected && <View style={styles.thumbActiveDot} />}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </RNAnimated.View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    fullscreenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        ...(Platform.OS === 'web' ? {
            position: 'fixed' as any,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
        } : {}),
    },
    floatingTopHeader: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 99,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    floatingCircleNavBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    floatingCircleNavFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
    },
    floatingRightActionsPill: {
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    floatingPillFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
    },
    floatingPillInnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        gap: 12,
        zIndex: 2,
    },
    floatingPillActionBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bodyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Video Player
    videoPlayerWrapper: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoPlayerImage: {
        width: screenWidth,
        height: screenHeight * 0.72,
        alignSelf: 'center',
    },
    videoCenterPlayContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoCenterPlayFallback: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoControlsOverlay: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 60,
    },
    videoControlsPill: {
        width: '100%',
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    videoControlsInner: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 10,
    },
    videoPlayToggleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoSliderWrapper: {
        flex: 1,
        height: 36,
        justifyContent: 'center',
    },
    swiftUiHost: {
        width: '100%',
        height: 36,
        justifyContent: 'center',
    },
    fallbackProgressTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
    },
    fallbackProgressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
    },
    videoTimeCounter: {
        fontSize: 11.5,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.85)',
        fontVariant: ['tabular-nums'],
    },

    // Thumbnail strip
    bottomThumbnailStripWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 50,
    },
    thumbnailStripScroll: {
        width: '100%',
    },
    thumbnailStripContent: {
        paddingHorizontal: (screenWidth - 48) / 2,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
    },
    thumbItemContainer: {
        alignItems: 'center',
        gap: 4,
    },
    thumbImageCard: {
        height: 48,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#1E2026',
    },
    thumbActiveCard: {
        width: 48,
        opacity: 1,
    },
    thumbInactiveCard: {
        width: 32,
        opacity: 0.65,
    },
    thumbStripImage: {
        width: '100%',
        height: '100%',
    },
    thumbVideoBadge: {
        position: 'absolute',
        top: 3,
        right: 3,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbDotSlot: {
        height: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbActiveDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#0036F8',
        shadowColor: '#0036F8',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.9,
        shadowRadius: 3,
        elevation: 2,
    },

    // PDF Sheets
    docViewerWrapper: {
        width: '100%',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pdfVerticalContentContainer: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 90,
    },
    pdfPaperSheet: {
        width: screenWidth - 28,
        minHeight: screenHeight * 0.72,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
        overflow: 'hidden',
        padding: 16,
        marginBottom: 16,
    },
    pdfSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1.5,
        borderBottomColor: '#0F172A',
        paddingBottom: 8,
        marginBottom: 10,
    },
    pdfCompanyText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: 0.5,
    },
    pdfProjectTitleText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#475569',
        marginTop: 2,
    },
    pdfScaleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        backgroundColor: '#F1F5F9',
        borderWidth: 0.5,
        borderColor: '#CBD5E1',
    },
    pdfScaleText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#334155',
    },
    pdfDrawingCanvas: {
        flex: 1,
        justifyContent: 'space-between',
    },
    pdfGridHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    pdfGridLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#0284C7',
    },
    pdfPlanFrame: {
        flex: 1,
        marginVertical: 6,
        borderWidth: 1.5,
        borderColor: '#0284C7',
        borderStyle: 'dashed',
        borderRadius: 6,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pdfColumnA: { position: 'absolute', top: 6, left: 6, width: 14, height: 14, backgroundColor: '#0F172A', borderRadius: 2 },
    pdfColumnB: { position: 'absolute', top: 6, right: 6, width: 14, height: 14, backgroundColor: '#0F172A', borderRadius: 2 },
    pdfColumnC: { position: 'absolute', bottom: 6, left: 6, width: 14, height: 14, backgroundColor: '#0F172A', borderRadius: 2 },
    pdfColumnD: { position: 'absolute', bottom: 6, right: 6, width: 14, height: 14, backgroundColor: '#0F172A', borderRadius: 2 },
    pdfGirderSpanX: { position: 'absolute', top: 12, left: 16, right: 16, height: 2, backgroundColor: '#0284C7' },
    pdfGirderSpanY: { position: 'absolute', bottom: 12, left: 16, right: 16, height: 2, backgroundColor: '#0284C7' },
    pdfBraceLeft: { position: 'absolute', width: '80%', height: 1, backgroundColor: '#94A3B8', transform: [{ rotate: '25deg' }] },
    pdfBraceRight: { position: 'absolute', width: '80%', height: 1, backgroundColor: '#94A3B8', transform: [{ rotate: '-25deg' }] },
    pdfDimLineX: { position: 'absolute', top: -10, backgroundColor: '#FFFFFF', paddingHorizontal: 6, borderWidth: 0.5, borderColor: '#94A3B8', borderRadius: 4 },
    pdfDimLineY: { position: 'absolute', right: -12, backgroundColor: '#FFFFFF', paddingHorizontal: 6, borderWidth: 0.5, borderColor: '#94A3B8', borderRadius: 4 },
    pdfDimText: { fontSize: 8, fontWeight: '700', color: '#334155' },
    pdfTargetBox: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#0284C7',
        borderRadius: 4,
        shadowColor: '#0284C7',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    pdfTargetText: { fontSize: 10, fontWeight: '900', color: '#0284C7', letterSpacing: 0.5 },
    pdfTitleBlockContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#CBD5E1',
        paddingTop: 8,
    },
    pdfTitleBlockInfo: { flex: 1 },
    pdfDwgTitle: { fontSize: 9, fontWeight: '800', color: '#0F172A' },
    pdfDwgMeta: { fontSize: 7.5, color: '#64748B', marginTop: 1 },
    pdfApprovedStamp: {
        borderWidth: 1.5,
        borderColor: '#0284C7',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignItems: 'center',
        transform: [{ rotate: '-4deg' }],
    },
    pdfStampTextTop: { fontSize: 8, fontWeight: '900', color: '#0284C7' },
    pdfStampTextSub: { fontSize: 6.5, fontWeight: '700', color: '#0284C7' },
    pdfStampTextId: { fontSize: 6.5, fontWeight: '600', color: '#0284C7' },

    // Standard Doc Content
    standardDocContent: { flex: 1, paddingVertical: 10 },
    docSummaryHeader: { fontSize: 11, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
    docParagraph: { fontSize: 10, lineHeight: 15, color: '#334155' },
    docMetaGrid: { flexDirection: 'row', gap: 10, marginVertical: 14, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8 },
    docMetaCol: { flex: 1 },
    docMetaKey: { fontSize: 7.5, fontWeight: '700', color: '#64748B' },
    docMetaVal: { fontSize: 9.5, fontWeight: '800', color: '#0F172A', marginTop: 2 },
    docApprovalBox: { marginTop: 'auto', padding: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#F8FAFC' },
    docSignLabel: { fontSize: 8, fontWeight: '800', color: '#0F172A' },
    docSignVal: { fontSize: 7.5, color: '#64748B', marginTop: 2 },

    // Doc Table Page
    pdfTableContainer: { flex: 1 },
    pdfTableHeaderRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4 },
    pdfTableTh: { fontSize: 8, fontWeight: '800', color: '#334155' },
    pdfTableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0' },
    pdfTableTd: { fontSize: 8, color: '#334155' },
    pdfNotesBlock: { marginTop: 12, padding: 8, backgroundColor: '#F8FAFC', borderRadius: 6 },
    pdfNotesTitle: { fontSize: 7.5, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
    pdfNotesItem: { fontSize: 7, color: '#475569', marginTop: 1 },

    // Doc Detail Signoff Page
    pdfDetailCanvas: { flex: 1, justifyContent: 'space-between', paddingVertical: 8 },
    pdfDetailCallouts: { gap: 6, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8 },
    pdfCalloutText: { fontSize: 8.5, color: '#334155', fontWeight: '500' },
    pdfSignoffRow: { flexDirection: 'row', gap: 12 },
    pdfSignBox: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6 },
    pdfSignRole: { fontSize: 7, fontWeight: '800', color: '#64748B' },
    pdfSignName: { fontSize: 9, fontWeight: '800', color: '#0F172A', marginTop: 4 },
    pdfSignDate: { fontSize: 7.5, color: '#94A3B8', marginTop: 2 },

    // Floating Page Pill (Liquid Glass Bubble matching chat date indicator)
    docFloatingPagePill: {
        position: 'absolute',
        bottom: 24,
        alignItems: 'center',
        alignSelf: 'center',
        zIndex: 40,
    },
    floatingPagePillContainer: {
        height: 28,
        minWidth: 70,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingPagePillInner: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingPagePillText: {
        fontSize: 11.5,
        fontWeight: '600',
        letterSpacing: -0.1,
    },

    // Preparing Preview
    preparingPreviewContainer: { alignItems: 'center', justifyContent: 'center', padding: 32 },
    preparingPreviewTitle: { fontSize: 16, fontWeight: '700', marginTop: 16 },
    preparingPreviewSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 6, maxWidth: 260 },

    // Audio Player Card
    audioViewerWrapper: { width: screenWidth - 40, alignItems: 'center' },
    audioCard: {
        width: '100%',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
    },
    audioBadge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    audioTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
    audioMeta: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
    waveformContainer: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 60, marginVertical: 20 },
    waveformBar: { width: 4, borderRadius: 2 },
    audioControlsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
    audioPlayBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
    audioProgressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
    audioProgressFill: { height: '100%', backgroundColor: '#3B82F6' },
    audioTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    audioTimeText: { fontSize: 11, color: '#94A3B8', fontVariant: ['tabular-nums'] },

    // Table / CSV
    tableViewerContainer: { flex: 1, width: '100%', paddingHorizontal: 12 },
    tableSheetWrapper: { backgroundColor: 'rgba(20, 22, 28, 0.95)', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tableHeadRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
    tableHeadCell: { paddingHorizontal: 12, paddingVertical: 10, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' },
    tableHeadText: { fontSize: 12, fontWeight: '700', color: '#F1F5F9' },
    tableDataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tableDataCell: { paddingHorizontal: 12, paddingVertical: 9, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)' },
    tableDataText: { fontSize: 12, color: '#E2E8F0' },
    tableTopHeaderWrapper: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 4,
        zIndex: 10,
    },
    tableSheetTabsScrollContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tableSheetTabsCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    tableSheetActivePillIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 18,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
    },
    tableSheetTabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 13,
        paddingVertical: 6,
        borderRadius: 18,
        zIndex: 2,
    },
    tableSheetTabText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Text & Markdown
    textViewerContainer: { flex: 1, width: '100%' },
    markdownToggleRow: { alignItems: 'center', paddingVertical: 8 },
    markdownTogglePill: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 3 },
    markdownToggleBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 13 },
    markdownToggleBtnActive: { backgroundColor: '#3B82F6' },
    markdownToggleBtnText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
    markdownToggleBtnTextActive: { color: '#FFFFFF' },
    textContentScroll: { flex: 1 },
    mdH1: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
    mdH2: { fontSize: 16, fontWeight: '700', color: '#F1F5F9', marginTop: 12, marginBottom: 6 },
    mdParagraph: { fontSize: 14, lineHeight: 22, color: '#CBD5E1', marginBottom: 6 },
    mdCodeBlock: { backgroundColor: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 8, marginVertical: 8 },
    mdCodeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, color: '#60A5FA' },
    sourceMonospaceText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 18, color: '#E2E8F0' },
    codeSnippetContainer: { backgroundColor: 'rgba(15, 17, 23, 0.95)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    landingContainer: { width: screenWidth - 32, alignItems: 'center' },
    landingCard: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    landingIconBadge: {
        width: 80,
        height: 80,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    landingIconCode: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    landingTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    landingMetaBlock: {
        alignItems: 'center',
        gap: 2,
        marginBottom: 16,
    },
    landingMetaLine: {
        fontSize: 13,
        color: '#94A3B8',
    },
    landingCallout: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 22,
        marginBottom: 20,
        borderWidth: 0,
    },
    landingCalloutText: {
        fontSize: 13,
        color: '#E2E8F0',
        fontWeight: '500',
    },
    landingPrimaryBtn: {
        width: '100%',
        height: 48,
        backgroundColor: '#0A84FF',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    landingPrimaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    landingSecondaryRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        justifyContent: 'center',
    },
    landingSecondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    landingSecondaryBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
