import { useClockLocation } from '@/lib/clock/useClockLocation';
import { clockConfirmationIssue } from '@/lib/clockConfirmation';
import { PillButton } from '@/components/ui/PillButton';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Colors, FormaBlue } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { uploadClockFileBase64 } from '@/lib/api/attendance';
import { Ionicons } from '@expo/vector-icons';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAttendancePosition } from '@/lib/attendanceLocation';
import { supabase } from '@/lib/supabase';
import { useTenantContext } from '@/context/TenantContext';

type RemoteMode = 'WFH' | 'WFA' | 'Business Trip' | 'Other';

export interface ClockConfirmPayload {
    modeCode?: string;
    photoUrl?: string;
    photoUri?: string;
    faceCount?: number;
    watermarkText?: string;
    overrideReason?: string;
    latitude?: number;
    longitude?: number;
    detectedLocationCode?: string;
    detectedLocationType?: string;
    locationStatus?: 'inside' | 'outside';
}

interface ClockConfirmContentProps {
    isClockedIn: boolean;
    userName: string;
    onConfirm: (payload: ClockConfirmPayload) => void | Promise<void>;
    onCancel: () => void;
}

interface CapturedPhoto {
    uri: string;
    watermarkedUri?: string;
    photoUrl?: string;
    faceCount: number;
    watermarkText: string;
}

export type ClockPhotoAsset = Pick<CameraCapturedPicture, 'uri' | 'width' | 'height' | 'base64' | 'exif'> & {
    mimeType?: string;
};

export interface ClockLocation {
    code: string;
    name: string;
    type: 'office' | 'project';
    latitude: number;
    longitude: number;
    radius: number;
}

const MODE_CODES: Record<RemoteMode, string> = {
    WFH: 'WFH',
    WFA: 'WFA',
    'Business Trip': 'BST',
    Other: 'OTH',
};

export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    const km = meters / 1000;
    return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export async function detectFacesInPhoto(uri: string) {
    return 1;
}

function formatCoordinate(value: number, axis: 'lat' | 'lng') {
    const suffix = axis === 'lat'
        ? value >= 0 ? 'N' : 'S'
        : value >= 0 ? 'E' : 'W';
    return `${Math.abs(value).toFixed(6)} ${suffix}`;
}

export function buildWatermarkText(userName: string, latitude?: number, longitude?: number, locationName?: string) {
    const timestamp = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });

    const latStr = latitude !== undefined ? formatCoordinate(latitude, 'lat') : '--';
    const lngStr = longitude !== undefined ? formatCoordinate(longitude, 'lng') : '--';
    const locName = locationName || 'Unknown Location';

    return [
        timestamp,
        locName,
        `${latStr}, ${lngStr}`,
        userName,
    ].join('\n');
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}

interface SvgRotationProps {
    svgWidth: number;
    svgHeight: number;
    imageTransform: string;
}

export function getSvgRotationProps(width: number, height: number, orientation?: number | string): SvgRotationProps {
    const o = typeof orientation === 'string' ? parseInt(orientation, 10) : Number(orientation);
    
    if (o === 8 || (isNaN(o) && width > height)) {
        return {
            svgWidth: height,
            svgHeight: width,
            imageTransform: `translate(0, ${width}) rotate(-90)`,
        };
    }
    if (o === 6) {
        return {
            svgWidth: height,
            svgHeight: width,
            imageTransform: `translate(${height}, 0) rotate(90)`,
        };
    }
    if (o === 3) {
        return {
            svgWidth: width,
            svgHeight: height,
            imageTransform: `translate(${width}, ${height}) rotate(180)`,
        };
    }

    return {
        svgWidth: width,
        svgHeight: height,
        imageTransform: '',
    };
}

export async function createWatermarkedSvg(asset: ClockPhotoAsset, watermarkText: string) {
    if (!asset.base64) {
        throw new Error('Captured photo did not include base64 data.');
    }

    const width = asset.width || 1080;
    const height = asset.height || 1440;
    const mimeType = asset.mimeType || 'image/jpeg';

    const orientation = asset.exif?.Orientation || asset.exif?.orientation;
    const { svgWidth, svgHeight, imageTransform } = getSvgRotationProps(width, height, orientation);

    const lineHeight = Math.max(34, Math.round(svgWidth * 0.035));
    const fontSize = Math.max(24, Math.round(svgWidth * 0.027));
    const padding = Math.max(28, Math.round(svgWidth * 0.04));
    const lines = watermarkText.split('\n');
    const panelHeight = padding * 2 + lineHeight * lines.length;
    const lineNodes = lines.map((line, index) => (
        `<tspan x="${padding}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )).join('');

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <image href="data:${mimeType};base64,${asset.base64}" width="${width}" height="${height}" ${imageTransform ? `transform="${imageTransform}"` : ''} preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="${svgHeight - panelHeight}" width="${svgWidth}" height="${panelHeight}" fill="rgba(0,0,0,0.62)"/>
  <text x="${padding}" y="${svgHeight - panelHeight + padding + fontSize}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#FFFFFF">${lineNodes}</text>
</svg>`.trim();

    if (Platform.OS === 'web') {
        const svgBase64 = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(svg))) : Buffer.from(svg).toString('base64');
        const fileUri = `data:image/svg+xml;base64,${svgBase64}`;
        return { fileUri, photoUrl: fileUri };
    }

    const cacheDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!cacheDirectory) {
        throw new Error('Unable to access local file storage.');
    }

    const fileUri = `${cacheDirectory}clock-watermark-${Date.now()}.svg`;
    await FileSystem.writeAsStringAsync(fileUri, svg, { encoding: FileSystem.EncodingType.UTF8 });

    return { fileUri, photoUrl: fileUri };
}

export function ClockConfirmContent({ isClockedIn, userName, onConfirm, onCancel }: ClockConfirmContentProps) {
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<CameraView>(null);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const webVideoRef = useRef<HTMLVideoElement | null>(null);
    const webStreamRef = useRef<MediaStream | null>(null);
    const [webCameraError, setWebCameraError] = useState<string | null>(null);
    const isDark = resolvedTheme === 'dark';
    const [selectedMode, setSelectedMode] = useState<RemoteMode | null>('WFH');
    const [notes, setNotes] = useState('');
    const [isInsideArea, setIsInsideArea] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const submitInFlight = useRef(false);
    const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const startWebCamera = async () => {
        if (Platform.OS !== 'web') return;
        try {
            setWebCameraError(null);
            if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                webStreamRef.current = stream;
                if (webVideoRef.current) {
                    webVideoRef.current.srcObject = stream;
                    webVideoRef.current.play().catch(() => {});
                }
            } else {
                setWebCameraError('Camera API is not supported on this browser.');
            }
        } catch (err: any) {
            console.warn('Web camera error:', err);
            setWebCameraError('Camera access required. Please allow camera access in your browser settings.');
        }
    };

    useEffect(() => {
        if (Platform.OS === 'web') {
            startWebCamera();
        }
        return () => {
            if (webStreamRef.current) {
                webStreamRef.current.getTracks().forEach((track) => track.stop());
                webStreamRef.current = null;
            }
        };
    }, []);

    const handleRetake = () => {
        setCapturedPhoto(null);
        if (Platform.OS === 'web') {
            if (!webStreamRef.current || !webStreamRef.current.active) {
                startWebCamera();
            } else if (webVideoRef.current) {
                webVideoRef.current.srcObject = webStreamRef.current;
                webVideoRef.current.play().catch(() => {});
            }
        }
    };

    const adidayaLocation = useClockLocation();
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [detectedLocationName, setDetectedLocationName] = useState('Detecting location...');
    const [detectedLocationCode, setDetectedLocationCode] = useState<string | null>(null);
    const [detectedLocationType, setDetectedLocationType] = useState<string | null>(null);
    const [locationDistance, setLocationDistance] = useState<number | null>(null);

    const textColor = Colors[resolvedTheme].text;
    const subtextColor = Colors[resolvedTheme].icon;
    const isClockIn = !isClockedIn;
    const actionLabel = isClockIn ? 'Clock IN' : 'Clock OUT';
    const actionColor = isClockIn ? 'blue' : 'red';

    const fetchLocation = async (forceFresh = false) => {
        if (Platform.OS === 'web') { adidayaLocation.refresh(); return; }
        setLocationLoading(true);
        setLocationError(null);
        try {
            const loc = await getAttendancePosition(forceFresh);

            const { latitude, longitude } = loc.coords;
            setCoords({ latitude, longitude });
            setSubmitError('');

            // Build active locations list from active tenant + projects
            const activeLocations: ClockLocation[] = [];

            // 1. Primary Tenant Office
            if (activeTenant?.latitude != null && activeTenant?.longitude != null) {
                const officeLat = Number(activeTenant.latitude);
                const officeLng = Number(activeTenant.longitude);
                const officeRadius = Number(activeTenant.attendance_radius) || 50;
                if (!isNaN(officeLat) && !isNaN(officeLng)) {
                    activeLocations.push({
                        code: activeTenant.company_code || 'HQ',
                        name: activeTenant.branding_name || activeTenant.name || 'Kantor Pusat',
                        type: 'office',
                        latitude: officeLat,
                        longitude: officeLng,
                        radius: officeRadius,
                    });
                }
            }

            // 2. Tenant Projects from DB
            if (activeTenant?.id) {
                try {
                    const { data } = await supabase
                        .from('projects')
                        .select('project_code, project_name, location')
                        .eq('tenant_id', activeTenant.id);
                    if (data && data.length > 0) {
                        data.forEach((dbProj) => {
                            const dbLoc = dbProj.location;
                            if (dbLoc && typeof dbLoc === 'object') {
                                const parsedLat = typeof dbLoc.latitude === 'string' ? parseFloat(dbLoc.latitude) : dbLoc.latitude;
                                const parsedLng = typeof dbLoc.longitude === 'string' ? parseFloat(dbLoc.longitude) : dbLoc.longitude;
                                const parsedRad = typeof dbLoc.radius === 'string' ? parseFloat(dbLoc.radius) : (dbLoc.radius || dbLoc.radius_meters || 50);

                                if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                                    activeLocations.push({
                                        code: dbProj.project_code || activeTenant.company_code || 'PRJ',
                                        name: dbProj.project_name || 'Project',
                                        type: 'project',
                                        latitude: parsedLat,
                                        longitude: parsedLng,
                                        radius: !isNaN(parsedRad) ? parsedRad : 50,
                                    });
                                }
                            }
                        });
                    }
                } catch (dbErr) {
                    console.warn('Failed to fetch projects from DB:', dbErr);
                }
            }

            // 3. Match coordinates against registered locations
            let matchedLocation: ClockLocation | null = null;
            let closestLocation: ClockLocation | null = null;
            let minDistance = Infinity;

            for (const targetLoc of activeLocations) {
                const dist = getDistance(latitude, longitude, targetLoc.latitude, targetLoc.longitude);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestLocation = targetLoc;
                }
                if (dist <= targetLoc.radius) {
                    matchedLocation = targetLoc;
                }
            }

            if (matchedLocation) {
                setIsInsideArea(true);
                setDetectedLocationName(matchedLocation.name);
                setDetectedLocationCode(matchedLocation.code);
                setDetectedLocationType(matchedLocation.type === 'office' ? 'Office' : 'Project');
                setLocationDistance(minDistance);
            } else {
                setIsInsideArea(false);
                setDetectedLocationName('Outside registered area');
                setDetectedLocationCode(closestLocation?.code || activeTenant?.company_code || null);
                setDetectedLocationType('Remote');
                setLocationDistance(minDistance !== Infinity ? minDistance : null);
            }
        } catch (err: any) {
            console.error('Location fetch failed:', err);
            setLocationError(err?.message || 'Failed to fetch location');
            setDetectedLocationName('Location unavailable');
            setIsInsideArea(false);
        } finally {
            setLocationLoading(false);
        }
    };

    useEffect(() => {
        if (Platform.OS !== 'web') void fetchLocation();
    }, [activeTenant]);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const { userCoords, detection, loading, error } = adidayaLocation;
        setLocationLoading(loading);
        setLocationError(error);
        setCoords(userCoords ? { latitude: userCoords.latitude, longitude: userCoords.longitude } : null);
        const inside = detection?.status === 'inside';
        setIsInsideArea(inside);
        setDetectedLocationName(inside ? detection.location?.code || 'Registered area' : error ? 'Location unavailable' : 'Outside registered area');
        setDetectedLocationCode(inside ? detection.location?.code || null : null);
        setDetectedLocationType(inside ? detection.location?.type === 'office' ? 'Office' : 'Project' : 'Remote');
        setLocationDistance(detection?.distance ?? null);
        if (userCoords) setSubmitError('');
    }, [adidayaLocation.userCoords, adidayaLocation.detection, adidayaLocation.loading, adidayaLocation.error]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !navigator.permissions?.query) return;
        let disposed = false;
        let permission: PermissionStatus | undefined;
        const handlePermission = () => {
            if (!disposed && permission?.state === 'granted') void fetchLocation(true);
        };
        void navigator.permissions.query({ name: 'geolocation' }).then(status => {
            if (disposed) return;
            permission = status;
            status.addEventListener('change', handlePermission);
        }).catch(() => {});
        return () => { disposed = true; permission?.removeEventListener('change', handlePermission); };
    }, []);

    const watermarkPreview = useMemo(() => {
        return buildWatermarkText(userName, coords?.latitude, coords?.longitude, isInsideArea ? `[${detectedLocationCode}] ${detectedLocationName}` : (selectedMode || 'Remote'));
    }, [userName, coords, isInsideArea, detectedLocationName, detectedLocationCode, selectedMode]);

    const confirmationIssue = clockConfirmationIssue({ insideArea: isInsideArea, remoteMode: selectedMode, note: notes, coords, photoUri: capturedPhoto?.watermarkedUri || capturedPhoto?.uri, capturing: isCapturing });
    const canConfirm = confirmationIssue === null;

    const onRefresh = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        fetchLocation(true);
    };

    const handleCapturePhoto = async () => {
        if (isCapturing) return;
        if (!coords) { setSubmitError('Location is not available yet. Use Refresh Location before taking the photo.'); return; }
        setSubmitError('');
        setIsCapturing(true);
        try {
            // Instant web capture directly from live video feed into canvas (matching from-adidaya)
            if (Platform.OS === 'web') {
                const video = webVideoRef.current;
                if (!video || !video.videoWidth) {
                    Alert.alert('Camera Not Ready', 'Please allow camera permission in your browser to capture your attendance photo.');
                    setIsCapturing(false);
                    return;
                }

                try {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 640;
                    const srcW = video.videoWidth || 640;
                    const srcH = video.videoHeight || 480;
                    const scale = MAX_WIDTH / Math.max(srcW, 1);
                    const width = MAX_WIDTH;
                    const height = Math.round(Math.max(srcH, 1) * scale);
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // Mirror horizontally to match the front-facing viewfinder
                        ctx.save();
                        ctx.translate(width, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(video, 0, 0, width, height);
                        ctx.restore();

                        // Watermark semi-transparent background bar
                        const barHeight = 56;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.fillRect(0, height - barHeight, width, barHeight);

                        // Watermark text
                        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                        ctx.fillStyle = '#FFFFFF';
                        ctx.textAlign = 'left';

                        const timestampStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' });
                        const locText = isInsideArea ? `[${detectedLocationCode || 'HQ'}] ${detectedLocationName}` : (selectedMode || 'Remote');
                        const coordsText = coords ? `${formatCoordinate(coords.latitude, 'lat')}, ${formatCoordinate(coords.longitude, 'lng')}` : '';

                        ctx.fillText(`🕒 ${timestampStr}`, 14, height - 33);
                        ctx.fillText(`📍 ${locText}${coordsText ? ` (${coordsText})` : ''}`, 14, height - 13);

                        ctx.textAlign = 'right';
                        ctx.fillText(`👤 ${userName}`, width - 14, height - 23);

                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        const watermarkText = buildWatermarkText(
                            userName,
                            coords?.latitude,
                            coords?.longitude,
                            locText
                        );

                        setCapturedPhoto({
                            uri: dataUrl,
                            watermarkedUri: dataUrl,
                            photoUrl: dataUrl,
                            faceCount: 1,
                            watermarkText,
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        return;
                    }
                } catch (canvasErr) {
                    console.warn('Canvas capture error:', canvasErr);
                    Alert.alert('Capture Error', 'Failed to snapshot camera frame. Please try again.');
                    setIsCapturing(false);
                    return;
                }
            }

            let permission = cameraPermission;
            if (!permission?.granted) {
                permission = await requestCameraPermission();
            }

            let asset: any = null;
            if (cameraRef.current && permission?.granted) {
                try {
                    asset = await cameraRef.current.takePictureAsync({
                        quality: 0.85,
                        base64: true,
                        exif: true,
                        shutterSound: false,
                    });
                } catch (camErr) {
                    console.warn('CameraView capture failed, falling back to ImagePicker:', camErr);
                }
            }

            if (Platform.OS !== 'web' && (!asset || !asset.base64)) {
                try {
                    const imgRes = await ImagePicker.launchCameraAsync({
                        mediaTypes: ['images'],
                        quality: 0.85,
                        base64: true,
                        cameraType: ImagePicker.CameraType.front,
                    });
                    if (!imgRes.canceled && imgRes.assets?.[0]?.base64) {
                        asset = imgRes.assets[0];
                    }
                } catch (ipErr) {
                    console.warn('ImagePicker camera failed:', ipErr);
                }
            }

            const watermarkText = buildWatermarkText(
                userName,
                coords?.latitude,
                coords?.longitude,
                isInsideArea ? `[${detectedLocationCode}] ${detectedLocationName}` : detectedLocationName
            );

            if (asset && asset.base64) {
                const watermarked = await createWatermarkedSvg(asset as any, watermarkText);
                setCapturedPhoto({
                    uri: asset.uri,
                    watermarkedUri: watermarked.fileUri,
                    photoUrl: watermarked.photoUrl,
                    faceCount: 1,
                    watermarkText,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                return;
            }

            throw new Error('A camera photo is required. Please allow camera access and try again.');
        } catch (error: any) {
            console.error('Clock photo capture error:', error);
            setCapturedPhoto(null);
            Alert.alert('Photo required', error?.message || 'Please take a camera photo to continue.');
        } finally {
            setIsCapturing(false);
        }
    };

    const handleConfirm = async () => {
        if (submitInFlight.current || isCapturing) return;
        if (!canConfirm) { setSubmitError(confirmationIssue || 'Complete your attendance details.'); return; }
        submitInFlight.current = true;
        setIsSubmitting(true);
        setSubmitError('');
        try {

        const modeCode = isInsideArea ? (detectedLocationCode || activeTenant?.company_code || 'HQ') : selectedMode ? MODE_CODES[selectedMode] : undefined;
        let photoUrl = capturedPhoto?.photoUrl;
        if (Platform.OS === 'web' && photoUrl?.startsWith('data:')) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Please sign in to record attendance.');
            const encoded = photoUrl.slice(photoUrl.indexOf(',') + 1);
            const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
            const fileName = user.id + '-' + (isClockIn ? 'IN' : 'OUT') + '-' + Date.now() + '.jpg';
            const { error: uploadError } = await supabase.storage.from('attendance_photos').upload(fileName, bytes, { contentType: 'image/jpeg' });
            if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message);
            photoUrl = supabase.storage.from('attendance_photos').getPublicUrl(fileName).data.publicUrl;
            setCapturedPhoto(previous => previous ? { ...previous, photoUrl } : previous);
        }
        await onConfirm({
            modeCode,
            photoUrl,
            photoUri: capturedPhoto?.watermarkedUri || capturedPhoto?.uri,
            faceCount: capturedPhoto?.faceCount ?? 1,
            watermarkText: capturedPhoto?.watermarkText || watermarkPreview,
            overrideReason: notes.trim() || undefined,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            detectedLocationCode: isInsideArea ? detectedLocationCode || modeCode : modeCode,
            detectedLocationType: isInsideArea ? (detectedLocationType || 'Office') : 'Remote',
            locationStatus: isInsideArea ? 'inside' : 'outside',
        });
        } catch (error: any) {
            setSubmitError(error?.message || 'Attendance could not be saved. Please try again.');
        } finally {
            submitInFlight.current = false;
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onCancel();
    };

    return (
        <View style={{ width: '100%', flex: 1, minHeight: 0, paddingTop: 18, paddingBottom: 0, paddingHorizontal: 0 }}>
            <View style={[styles.modalHeader, { paddingHorizontal: 24 }]}>
                <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={[styles.modalTitle, { color: textColor }]}>
                        Confirm {actionLabel}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleCancel}
                    style={[
                        styles.closeCircle,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                    ]}
                    activeOpacity={0.72}
                >
                    <Ionicons name="close" size={18} color={subtextColor} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flexShrink: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 2, paddingBottom: 20 }}
            >
                <Text style={[styles.modalSectionTitle, { color: subtextColor }]}>Location</Text>
                <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                    <View style={styles.infoRow}>
                        <View style={[
                            styles.rowIcon,
                            { backgroundColor: locationLoading ? 'rgba(142,142,147,0.16)' : isInsideArea ? 'rgba(52,199,89,0.16)' : 'rgba(255,149,0,0.16)' }
                        ]}>
                            <PlatformIcon
                                name={locationLoading ? 'location.fill' : isInsideArea ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                                size={18}
                                tintColor={locationLoading ? '#8E8E93' : isInsideArea ? '#34C759' : '#FF9500'}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            {locationLoading ? (
                                <>
                                    <Text style={[styles.locationTitle, { color: textColor }]}>
                                        Detecting Location...
                                    </Text>
                                    <Text style={[styles.locationSubtitle, { color: subtextColor }]}>
                                        Retrieving GPS coordinates from device
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={[styles.locationTitle, { color: isInsideArea ? '#34C759' : (isDark ? '#FFB74D' : '#995700') }]}>
                                        {locationError && !coords ? 'Location unavailable' : isInsideArea ? detectedLocationName : 'Outside registered area'}
                                    </Text>
                                    <Text style={[styles.locationSubtitle, { color: subtextColor }]}>
                                        {locationError && !coords ? locationError : detectedLocationCode && locationDistance !== null
                                            ? `${detectedLocationCode} · ${formatDistance(locationDistance)}`
                                            : (detectedLocationCode ? `${detectedLocationCode} · GPS signal not detected` : 'You are not within any registered office area')}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                    {!isInsideArea && !locationLoading && (
                        <>
                            <View style={[styles.rowDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.14)' }]} />
                            <TouchableOpacity
                                onPress={onRefresh}
                                style={[
                                    styles.formActionRow,
                                    { backgroundColor: isDark ? 'rgba(86,151,255,0.18)' : 'rgba(86,151,255,0.12)' }
                                ]}
                            >
                                <PlatformIcon name="location.fill" size={17} tintColor={FormaBlue[400]} />
                                <Text style={[styles.formActionText, { color: FormaBlue[400] }]}>Refresh Location</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {!isInsideArea && (
                    <View style={{ marginTop: 16 }}>
                        <Text style={[styles.modalSectionTitle, { color: subtextColor }]}>Select Remote Mode</Text>
                        <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <SegmentedControl
                                segments={[
                                    { id: 'WFH', label: 'WFH', icon: 'house' },
                                    { id: 'WFA', label: 'WFA', icon: 'globe' },
                                    { id: 'Business Trip', label: 'Trip', icon: 'airplane' },
                                    { id: 'Other', label: 'Other', icon: 'ellipsis.circle' },
                                ]}
                                activeSegment={selectedMode || ''}
                                onSegmentChange={(val) => {
                                    Haptics.selectionAsync();
                                    setSelectedMode(val as RemoteMode);
                                }}
                            />

                            <View style={[styles.rowDivider, { marginVertical: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.14)' }]} />
                            <Text style={[styles.inputLabel, { color: subtextColor }]}>
                                Activity Note <Text style={{ color: '#FF3B30' }}>*</Text>
                            </Text>
                            <TextInput
                                style={[
                                    styles.textArea,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)',
                                        color: textColor,
                                    }
                                ]}
                                placeholder="Add a brief note..."
                                placeholderTextColor={subtextColor}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={2}
                            />
                        </View>
                    </View>
                )}

                <View style={{ marginTop: 16 }}>
                    <Text style={[styles.modalSectionTitle, { color: subtextColor }]}>Photo Verification</Text>
                    <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                        <View style={styles.infoRow}>
                            <View style={[
                                styles.rowIcon,
                                { backgroundColor: capturedPhoto ? 'rgba(52,199,89,0.16)' : (isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7') }
                            ]}>
                                <PlatformIcon name={capturedPhoto ? 'checkmark.circle.fill' : 'camera.fill'} size={18} tintColor={capturedPhoto ? '#34C759' : subtextColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.locationTitle, { color: capturedPhoto ? '#34C759' : textColor }]}>
                                    {capturedPhoto ? 'Photo Ready' : 'Camera Required'}
                                </Text>
                                <Text style={[styles.locationSubtitle, { color: subtextColor }]}>
                                    {capturedPhoto ? 'Watermarked attendance photo is ready.' : 'Take a photo to verify attendance.'}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.cameraPreview, { borderColor: capturedPhoto ? '#34C759' : 'transparent' }]}>
                            {capturedPhoto ? (
                                <>
                                    <Image
                                        source={{ uri: capturedPhoto.watermarkedUri || capturedPhoto.uri }}
                                        style={StyleSheet.absoluteFill}
                                        contentFit="cover"
                                    />
                                    <View style={styles.faceBadge}>
                                        <PlatformIcon name="checkmark.circle.fill" size={13} tintColor="#FFFFFF" />
                                        <Text style={styles.faceBadgeText}>Photo Captured</Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {Platform.OS === 'web' ? (
                                        webCameraError ? (
                                            <View style={styles.cameraEmpty}>
                                                <PlatformIcon name="camera.fill" size={34} tintColor="#FF3B30" />
                                                <Text style={[styles.cameraEmptyTitle, { color: textColor }]}>Camera Access Required</Text>
                                                <Text style={[styles.cameraEmptyText, { color: subtextColor, maxWidth: 260, textAlign: 'center' }]}>
                                                    {webCameraError}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={startWebCamera}
                                                    style={{ marginTop: 12, paddingHorizontal: 18, paddingVertical: 8, backgroundColor: '#0036F8', borderRadius: 999 }}
                                                >
                                                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Allow Camera</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                                                <video
                                                    ref={(el) => {
                                                        webVideoRef.current = el;
                                                        if (el && webStreamRef.current && el.srcObject !== webStreamRef.current) {
                                                            el.srcObject = webStreamRef.current;
                                                            el.play().catch(() => {});
                                                        }
                                                    }}
                                                    playsInline
                                                    autoPlay
                                                    muted
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        transform: 'scaleX(-1)',
                                                    }}
                                                />
                                            </div>
                                        )
                                    ) : (
                                        cameraPermission?.granted ? (
                                            <CameraView
                                                ref={cameraRef}
                                                style={StyleSheet.absoluteFill}
                                                facing="front"
                                                mirror
                                                mode="picture"
                                            />
                                        ) : (
                                            <View style={styles.cameraEmpty}>
                                                <PlatformIcon name="camera.fill" size={34} tintColor={subtextColor} />
                                                <Text style={[styles.cameraEmptyTitle, { color: textColor }]}>Camera Access Needed</Text>
                                                <Text style={[styles.cameraEmptyText, { color: subtextColor }]}>Tap Capture Photo to allow camera access.</Text>
                                            </View>
                                        )
                                    )}
                                    <View style={styles.cameraGuide}>
                                        <View style={styles.faceFrame} />
                                        <Text style={styles.cameraGuideText}>Position yourself in the camera view</Text>
                                    </View>
                                </>
                            )}
                        </View>

                        <PillButton
                            label={capturedPhoto ? 'Retake Photo' : (isCapturing ? 'Capturing...' : 'Capture Photo')}
                            onPress={capturedPhoto ? handleRetake : handleCapturePhoto}
                            variant="tinted"
                            color="blue"
                            disabled={isCapturing}
                            noBorder={true}
                            noShadow={true}
                            textColor={isDark ? '#93C5FD' : '#0036F8'}
                            icon={<PlatformIcon name="camera.fill" size={18} tintColor={isDark ? '#93C5FD' : '#0036F8'} />}
                            style={{ marginTop: 12 }}
                        />
                    </View>
                </View>

            </ScrollView>

            <View style={[
                styles.modalActionsRow,
                {
                    paddingHorizontal: 24,
                    backgroundColor: isDark ? '#121212' : '#F2F2F7',
                    paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16)
                }
            ]}>
                {!!(submitError || confirmationIssue) && <Text accessibilityRole="alert" style={{ color: submitError ? '#FF453A' : subtextColor, fontSize: 12, width: '100%', textAlign: 'center' }}>{submitError || confirmationIssue}</Text>}
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={actionLabel}
                    accessibilityState={{ disabled: isSubmitting || isCapturing, busy: isSubmitting }}
                    onPress={() => { void handleConfirm(); }}
                    disabled={isSubmitting || isCapturing}
                    activeOpacity={0.8}
                    style={{ width: '100%', height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: isClockIn ? '#0036F8' : '#FF3B30', opacity: isSubmitting || isCapturing ? 0.6 : 1 }}
                >
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{isSubmitting ? 'Saving…' : actionLabel}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    modalDragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(142,142,147,0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 7,
        textTransform: 'uppercase',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
        marginBottom: 16,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rowIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 46,
        marginVertical: 12,
    },
    formActionRow: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 24,
    },
    formActionText: {
        fontSize: 16,
        fontWeight: '700',
    },
    locationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        gap: 12,
        borderWidth: 1,
    },
    locationTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 3,
    },
    locationSubtitle: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    locationIconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 2,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.2,
        marginBottom: 8,
    },
    textArea: {
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '500',
        minHeight: 68,
        textAlignVertical: 'top',
    },
    cameraPreview: {
        height: 280,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        backgroundColor: 'rgba(142,142,147,0.12)',
        marginTop: 14,
    },
    cameraGuide: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    faceFrame: {
        width: 160,
        height: 210,
        borderRadius: 90,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
        backgroundColor: 'transparent',
    },
    cameraGuideText: {
        position: 'absolute',
        bottom: 14,
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        overflow: 'hidden',
    },
    cameraEmpty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    cameraEmptyTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginTop: 12,
    },
    cameraEmptyText: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
        marginTop: 4,
        textAlign: 'center',
    },
    faceBadge: {
        position: 'absolute',
        left: 12,
        top: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(52,199,89,0.9)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    faceBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    watermarkCard: {
        marginTop: 12,
        borderRadius: 16,
        padding: 14,
    },
    watermarkLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    watermarkText: {
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 19,
    },
    modalActionsRow: {
        flexDirection: 'column',
        flexShrink: 0,
        alignItems: 'stretch',
        gap: 12,
        justifyContent: 'center',
        paddingTop: 12,
    },
    footerButton: {
        borderRadius: 26,
    },
});
