import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard,
    Dimensions,
    Modal,
    Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeOutDown,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

// UI components
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { GlassEffectContainer } from '@/components/ui/GlassEffectContainer';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';

// Styling and context
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';

// API services
import { getProjects } from '@/lib/api/projects';
import { getTasks, createTaskApi, getProfiles, WBS_TEMPLATES } from '@/lib/api/tasks';
import { fetchPurchasingRequests, fetchReimburseRequests, createPurchasingRequest, uploadFinanceFileBase64 } from '@/lib/api/finance';
import { fetchCrewMembers, fetchCrewRequests } from '@/lib/api/crew';
import { fetchResourceOverviewData } from '@/lib/api/resources';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Safe lazy loading of SwiftUI components for native Glass input container
let SwiftUIHost: any = null;
let SwiftUIHStack: any = null;
let SwiftUIVStack: any = null;
let SwiftUIButton: any = null;
let SwiftUITextField: any = null;
let SwiftUIGlassEffectContainer: any = null;
let SwiftUIImage: any = null;
let SwiftUISpacer: any = null;
let SwiftUIText: any = null;
let SwiftUICircularProgress: any = null;
let swiftModifiers: any = null;

if (Platform.OS === 'ios') {
    try {
        const SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIHost = SwiftUI.Host;
        SwiftUIHStack = SwiftUI.HStack;
        SwiftUIVStack = SwiftUI.VStack;
        SwiftUIButton = SwiftUI.Button;
        SwiftUITextField = SwiftUI.TextField;
        SwiftUIGlassEffectContainer = SwiftUI.GlassEffectContainer;
        SwiftUIImage = SwiftUI.Image;
        SwiftUISpacer = SwiftUI.Spacer;
        SwiftUIText = SwiftUI.Text;
        SwiftUICircularProgress = SwiftUI.CircularProgress;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
    isReport?: boolean;
    attachment?: {
        name: string;
        url: string;
        mimeType?: string;
    };
    actionPending?: {
        id: string;
        action: 'create_task' | 'create_purchasing';
        payload: any;
        status: 'pending' | 'submitting' | 'submitted' | 'draft' | 'cancelled' | 'failed';
        errorMsg?: string;
        missingFields: Array<{
            field: string;
            label: string;
            description: string;
        }>;
        projectCode: string;
        projectName: string;
        projectId: string | null;
    };
}


// Bouncing Typing Dot Component
function TypingDot({ delay }: { delay: number }) {
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-6, { duration: 300 }),
                withTiming(0, { duration: 300 })
            ),
            -1,
            true
        );
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View style={[styles.typingDot, animStyle, { marginHorizontal: 2 }]} />
    );
}

// Helper to format currency
const formatCurrency = (val: number) => {
    if (val >= 1000000000) {
        return `Rp ${(val / 1000000000).toFixed(1)}M`;
    }
    if (val >= 1000000) {
        return `Rp ${(val / 1000000).toFixed(1)}Jt`;
    }
    return `Rp ${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

// Helper to determine if query is actually talking about a crew member name (with dictionary word collision prevention)
const isTalkingAboutCrew = (query: string, crewName: string): boolean => {
    if (!query || !crewName) return false;
    const nameLower = crewName.toLowerCase().trim();
    
    // Check if the query contains the name as a whole word
    const nameRegex = new RegExp(`\\b${nameLower}\\b`, 'i');
    if (!nameRegex.test(query)) return false;
    
    // If it's a direct exact match of the name
    if (query === nameLower) return true;
    
    // List of common dictionary words that are also crew names
    const commonWords = ['bagus', 'tri', 'arif', 'rohani', 'mamik', 'yudi'];
    
    if (commonWords.includes(nameLower)) {
        // Must contain crew context indicator keywords
        const crewContextKeywords = [
            'crew', 'tukang', 'pekerja', 'orang', 'absen', 'absensi', 'siapa', 
            'status', 'tugas', 'kerjaan', 'task', 'nomor', 'telp', 'telepon', 
            'phone', 'kontak', 'gaji', 'kasbon', 'cuti', 'peran', 'role'
        ];
        return crewContextKeywords.some(kw => query.includes(kw));
    }
    
    return true;
};

// Helper to determine if query is talking about a user profile
const isTalkingAboutProfile = (query: string, name: string): boolean => {
    if (!query || !name) return false;
    const nameLower = name.toLowerCase().trim();
    const nameRegex = new RegExp(`\\b${nameLower}\\b`, 'i');
    return nameRegex.test(query);
};

export default function AdidayaAIScreen() {
    const { isAuthenticated } = useUserContext();
    const { activeTenant } = useTenantContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ sessionId?: string; newChat?: string }>();
    const scrollViewRef = useRef<ScrollView>(null);

    const isAdidayaTenant = !!activeTenant && (
        (activeTenant.name || '').toLowerCase().includes('adidaya') ||
        (activeTenant.slug || '').toLowerCase().includes('adidaya') ||
        (activeTenant.company_code || '').toLowerCase().includes('adidaya') ||
        (activeTenant.branding_name || '').toLowerCase().includes('adidaya')
    );
    const tenantName = activeTenant?.name || (isAdidayaTenant ? 'Adidaya' : 'Forma');

    // States for data sources
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [financePO, setFinancePO] = useState<any[]>([]);
    const [financeRE, setFinanceRE] = useState<any[]>([]);
    const [crew, setCrew] = useState<any[]>([]);
    const [crewRequests, setCrewRequests] = useState<any[]>([]);
    const [resourceOverview, setResourceOverview] = useState<any>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>('00000000-0000-0000-0000-000000000000');

    const defaultWelcomeText = isAdidayaTenant
        ? 'Hello! I am **Adidaya Intelligence (AI)**, your smart operational assistant. \n\nI have connected to the Adidaya projects, finance, crew, and warehouse database in *real-time*. What would you like to analyze today?'
        : `Hello! I am **Forma AI**, your smart operational assistant. \n\nI have connected to the ${tenantName} projects, finance, and warehouse database in *real-time*. What would you like to analyze today?`;

    // Chat interface states
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            sender: 'ai',
            text: defaultWelcomeText,
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const textFieldRef = useRef<any>(null);

    // Keyboard visibility listeners to clear floating tab bar overlay
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const [uploadingInvoiceMap, setUploadingInvoiceMap] = useState<Record<string, boolean>>({});
    const [attachedFile, setAttachedFile] = useState<{ uri: string; name: string; mimeType: string; url?: string } | null>(null);
    const [attaching, setAttaching] = useState(false);

    // Chat History States
    const [sessions, setSessions] = useState<Array<{ id: string, title: string, createdAt: string }>>([]);
    const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null);
    const currentSessionIdRef = useRef<string | null>(null);

    const updateSessionId = (id: string | null) => {
        currentSessionIdRef.current = id;
        setCurrentSessionIdState(id);
    };

    const copyToClipboard = async (text: string) => {
        // Strip markdown bold tags (**) to copy clean text
        const cleanText = text.replace(/\*\*([^*]+)\*\*/g, '$1');
        try {
            await Clipboard.setStringAsync(cleanText);
            setToastMessage('Pesan disalin');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error("Failed to copy to clipboard:", e);
            setToastMessage('Gagal menyalin pesan');
        }
        setTimeout(() => {
            setToastMessage('');
        }, 1800);
    };

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    // History pruning helper (1 month / 30 days maximum limit)
    const pruneOldSessions = async (sessionsList: Array<{ id: string, title: string, createdAt: string }>) => {
        const PRUNE_THRESHOLD_DAYS = 30;
        const now = new Date();
        const activeSessions = [];
        const expiredSessionIds = [];

        for (const session of sessionsList) {
            const sessionDate = new Date(session.createdAt);
            const diffTime = Math.abs(now.getTime() - sessionDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= PRUNE_THRESHOLD_DAYS) {
                activeSessions.push(session);
            } else {
                expiredSessionIds.push(session.id);
            }
        }

        if (expiredSessionIds.length > 0) {
            try {
                await Promise.all(expiredSessionIds.map(id => AsyncStorage.removeItem(`adidaya_ai_session_${id}`)));
                await AsyncStorage.setItem('adidaya_ai_sessions_list', JSON.stringify(activeSessions));
            } catch (e) {
                console.error("Failed to clean up expired sessions from storage:", e);
            }
        }

        return activeSessions;
    };

    // Save active chat messages to local storage and update list metadata
    const saveCurrentSession = async (sessionId: string | null, sessionMessages: ChatMessage[]) => {
        // We only save if there is at least one user query (i.e. length > 1)
        if (sessionMessages.length <= 1) return sessionId || '';

        let activeId = sessionId;
        const isNew = !activeId;

        if (!activeId) {
            activeId = `session_${Date.now()}`;
        }

        try {
            await AsyncStorage.setItem(`adidaya_ai_session_${activeId}`, JSON.stringify(sessionMessages));

            const rawList = await AsyncStorage.getItem('adidaya_ai_sessions_list');
            let sessionsList: Array<{ id: string, title: string, createdAt: string }> = rawList ? JSON.parse(rawList) : [];

            if (isNew) {
                const firstUser = sessionMessages.find(m => m.sender === 'user')?.text || 'New Chat';
                const title = firstUser.length > 25 ? firstUser.substring(0, 25) + '...' : firstUser;

                sessionsList.unshift({
                    id: activeId,
                    title,
                    createdAt: new Date().toISOString()
                });
            } else {
                const idx = sessionsList.findIndex(s => s.id === activeId);
                if (idx > -1) {
                    const [item] = sessionsList.splice(idx, 1);
                    sessionsList.unshift(item);
                }
            }

            await AsyncStorage.setItem('adidaya_ai_sessions_list', JSON.stringify(sessionsList));
            setSessions(sessionsList);
        } catch (e) {
            console.error("Failed to save session:", e);
        }

        return activeId;
    };

    const loadSession = async (sessionId: string) => {
        try {
            const rawMessages = await AsyncStorage.getItem(`adidaya_ai_session_${sessionId}`);
            if (rawMessages) {
                const parsed: ChatMessage[] = JSON.parse(rawMessages);
                const deserialized = parsed.map(m => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
                setMessages(deserialized);
                updateSessionId(sessionId);
            }
        } catch (e) {
            console.error("Failed to load session:", e);
        }
    };

    const deleteSession = async (idToDelete: string) => {
        try {
            await AsyncStorage.removeItem(`adidaya_ai_session_${idToDelete}`);
            
            const rawList = await AsyncStorage.getItem('adidaya_ai_sessions_list');
            if (rawList) {
                let sessionsList: Array<{ id: string, title: string, createdAt: string }> = JSON.parse(rawList);
                sessionsList = sessionsList.filter(s => s.id !== idToDelete);
                await AsyncStorage.setItem('adidaya_ai_sessions_list', JSON.stringify(sessionsList));
                setSessions(sessionsList);
            }

            if (currentSessionIdRef.current === idToDelete) {
                startNewChat();
            }
        } catch (e) {
            console.error("Failed to delete session:", e);
        }
    };

    const startNewChat = () => {
        updateSessionId(null);
        setMessages([
            {
                id: 'welcome',
                sender: 'ai',
                text: defaultWelcomeText,
                timestamp: new Date()
            }
        ]);
    };

    // Load and prune on mount
    useEffect(() => {
        async function initHistory() {
            try {
                const rawList = await AsyncStorage.getItem('adidaya_ai_sessions_list');
                if (rawList) {
                    const parsedList = JSON.parse(rawList);
                    const activeSessions = await pruneOldSessions(parsedList);
                    setSessions(activeSessions);
                }
            } catch (e) {
                console.error("Failed to load history on mount:", e);
            }
        }
        initHistory();
    }, []);

    // Load requested session from router params if available
    useEffect(() => {
        if (params.sessionId) {
            loadSession(params.sessionId);
        }
    }, [params.sessionId]);

    // Handle new chat request from router params
    useEffect(() => {
        if (params.newChat === 'true') {
            startNewChat();
            router.setParams({ newChat: undefined });
        }
    }, [params.newChat]);

    // Load actual database tables
    const loadWorkspaceData = async () => {
        try {
            // Get current workspace ID and User ID
            const { data: wsData } = await supabase.from('workspaces').select('id').limit(1);
            const wsId = wsData?.[0]?.id || 'f39364e8-1376-4ff7-a716-78277e8d25b3';

            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || '00000000-0000-0000-0000-000000000000';
            setCurrentUserId(userId);

            // Fetch database records in parallel
            const [
                projectsRes,
                tasksRes,
                poRes,
                reRes,
                crewRes,
                crewReqsRes,
                resOverviewRes,
                profilesRes
            ] = await Promise.all([
                getProjects().catch(() => []),
                getTasks().catch(() => []),
                fetchPurchasingRequests(userId, true).catch(() => []),
                fetchReimburseRequests(userId, true).catch(() => []),
                isAdidayaTenant ? fetchCrewMembers(wsId).catch(() => []) : Promise.resolve([]),
                isAdidayaTenant ? fetchCrewRequests(wsId).catch(() => []) : Promise.resolve([]),
                fetchResourceOverviewData().catch(() => null),
                getProfiles().catch(() => [])
            ]);

            setProjects(projectsRes);
            setTasks(tasksRes);
            setFinancePO(poRes);
            setFinanceRE(reRes);
            setCrew(crewRes);
            setCrewRequests(crewReqsRes);
            setResourceOverview(resOverviewRes);
            setProfiles(profilesRes);
        } catch (error) {
            console.error("Adidaya AI error loading operational data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadWorkspaceData();
    }, []);

    // Auto-scroll messages to bottom when a new message is added or when typing starts
    useEffect(() => {
        if (messages.length <= 1 && !isTyping) {
            return;
        }
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages, isTyping]);

    // Operational dynamic reports compilers
    const compileProjectsReport = (): string => {
        const activeProjects = projects.filter(p => !p.isArchived);
        const totalActive = activeProjects.length;
        
        if (totalActive === 0) {
            return "📊 **Analisis Proyek Adidaya**:\nSaat ini tidak ada proyek aktif yang tercatat di database.";
        }

        const sumProgress = activeProjects.reduce((sum, p) => sum + (p.progress || 0), 0);
        const avgProgress = Math.round(sumProgress / totalActive);

        let report = `📊 **Analisis Proyek Adidaya**:\n`;
        report += `Kami sedang memantau **${totalActive} Proyek Aktif** dengan rata-rata kemajuan **${avgProgress}%**.\n\n`;
        report += `**Daftar Proyek Aktif**:\n`;

        activeProjects.forEach((p, idx) => {
            report += `${idx + 1}. **${p.title}** (${p.code}) — Progress: **${p.progress}%** [Fase: *${p.phase || 'N/A'}*]\n`;
        });

        // Search for high priority bottleneck tasks
        const overdueTasks = tasks.filter(t => 
            t.status !== 'done' && 
            (t.priority === 'high' || t.priority === 'urgent')
        );

        if (overdueTasks.length > 0) {
            report += `\n⚠️ **Kendala & Bottleneck Terdeteksi**:\nTerdapat **${overdueTasks.length} tugas prioritas tinggi** yang tertunda:\n`;
            overdueTasks.slice(0, 3).forEach(t => {
                report += `• **${t.title}** (${t.projectCode}) — Target: *${t.dueDate || 'Hari ini'}*\n`;
            });
            if (overdueTasks.length > 3) {
                report += `• ...dan *${overdueTasks.length - 3} tugas penting lainnya*.\n`;
            }
        } else {
            report += `\n✅ **Stabilitas Operasional**: Tidak ada tugas kritis/prioritas tinggi yang terlambat saat ini.`;
        }

        return report;
    };

    const compileFinanceReport = (): string => {
        // Pending POs: statustag = pending/draft
        const pendingPOs = financePO.filter(po => po.statusTag === 'pending');
        const poAmount = pendingPOs.reduce((sum, po) => sum + (po.amount || 0), 0);

        // Pending REs: statustag = pending
        const pendingREs = financeRE.filter(re => re.statusTag === 'pending');
        const reAmount = pendingREs.reduce((sum, re) => sum + (re.amount || 0), 0);

        const totalAmount = poAmount + reAmount;
        const totalRequests = pendingPOs.length + pendingREs.length;

        let report = `💰 **Audit Kesehatan Keuangan (Finance)**:\n`;
        report += `Sistem mencatat **${totalRequests} pengajuan dana** yang sedang **menunggu persetujuan**:\n\n`;
        
        report += `• **Purchase Request (PO)**: **${pendingPOs.length} Pengajuan**\n`;
        report += `  Total Pengeluaran: **${formatCurrency(poAmount)}**\n`;
        if (pendingPOs.length > 0) {
            report += `  *Vendor Teratas*: ${pendingPOs[0].vendor || 'Umum'} (${formatCurrency(pendingPOs[0].amount)})\n`;
        }
        report += `\n`;
        
        report += `• **Reimbursement (RE)**: **${pendingREs.length} Pengajuan**\n`;
        report += `  Total Pengeluaran: **${formatCurrency(reAmount)}**\n`;
        if (pendingREs.length > 0) {
            report += `  *Pengaju Terakhir*: ${pendingREs[0].submitted_by_name} (${formatCurrency(pendingREs[0].amount)})\n`;
        }
        report += `\n`;
        
        report += `💵 **Total Dana Tertahan**: **${formatCurrency(totalAmount)}**\n\n`;
        
        if (totalAmount > 50000000) {
            report += `⚠️ **Peringatan Likuiditas**: Total pengajuan pending cukup tinggi (**> Rp 50Jt**). Rekomendasi AI agar Direktur segera meninjau di halaman *Finance* untuk menjaga kelancaran pasokan material vendor.`;
        } else {
            report += `✅ **Kondisi Aman**: Total pengeluaran tertunda berada dalam batas operasional wajar.`;
        }

        return report;
    };

    const compileCrewReport = (): string => {
        const totalCrew = crew.length;
        const activeCrew = crew.filter(c => c.status === 'ACTIVE').length;

        // Group crew by project
        const projectDistribution: Record<string, number> = {};
        crew.forEach(c => {
            const code = c.projectCode || 'UNASSIGNED';
            projectDistribution[code] = (projectDistribution[code] || 0) + 1;
        });

        const pendingReqs = crewRequests.filter(r => r.status === 'PENDING' || r.status === 'pending');

        let report = `👷 **Laporan Status Crew & Absensi**:\n`;
        report += `Terdaftar **${totalCrew} anggota crew** dalam pangkalan data Adidaya.\n\n`;
        report += `• **Status Hari Ini**:\n`;
        report += `  Crew Aktif Bekerja: **${activeCrew} orang**\n`;
        report += `  Crew Istirahat/Off: **${totalCrew - activeCrew} orang**\n\n`;

        report += `• **Distribusi Crew di Lapangan**:\n`;
        Object.entries(projectDistribution).forEach(([proj, count]) => {
            report += `  - Proyek **${proj}**: **${count} orang**\n`;
        });
        report += `\n`;

        if (pendingReqs.length > 0) {
            report += `⚠️ **Pengajuan Cuti / Kasbon**: Ada **${pendingReqs.length} pengajuan crew** pending yang perlu ditinjau:\n`;
            pendingReqs.slice(0, 2).forEach(r => {
                report += `  - **${r.crewName}** mengajukan *${r.type}* sebesar *${r.amount ? formatCurrency(r.amount) : r.reason}*\n`;
            });
        } else {
            report += `✅ **Status Pengajuan**: Tidak ada pengajuan cuti atau administrasi crew yang tertunda hari ini.`;
        }

        return report;
    };

    const compileResourcesReport = (): string => {
        const materials = resourceOverview?.stats?.materials || 0;
        const tools = resourceOverview?.stats?.tools || 0;
        const assets = resourceOverview?.stats?.assets || 0;
        const services = resourceOverview?.stats?.services || 0;
        const activities = resourceOverview?.activity || [];

        let report = `📦 **Laporan Logistik & Stok Gudang**:\n`;
        report += `Berikut adalah data inventaris global Adidaya:\n\n`;
        report += `• **Katalog Sumber Daya**:\n`;
        report += `  - Material Terdaftar: **${materials} Item**\n`;
        report += `  - Peralatan Kerja: **${tools} Item**\n`;
        report += `  - Aset/Mesin Proyek: **${assets} Item**\n`;
        report += `  - Jasa Sub-Kontraktor: **${services} Layanan**\n\n`;

        if (activities.length > 0) {
            report += `🔄 **Sinkronisasi Stok Gudang Terbaru**:\n`;
            activities.slice(0, 3).forEach((act: any) => {
                report += `  - *${act.time}*: ${act.description}\n`;
            });
        } else {
            report += `ℹ️ Tidak ada log sinkronisasi gudang terbaru yang terekam dalam database hari ini.`;
        }

        return report;
    };

    const compileSmartRecommendations = (): string => {
        let recs = `💡 **Rekomendasi Pintar ${isAdidayaTenant ? 'Adidaya Intelligence (AI)' : 'Forma AI'}**:\n`;
        recs += `Berdasarkan analisis silang data operasional, berikut saran prioritas hari ini:\n\n`;

        let counter = 1;

        // 1. Check for overdue tasks
        const overdueTasks = tasks.filter(t => t.status !== 'done' && (t.priority === 'high' || t.priority === 'urgent'));
        if (overdueTasks.length > 0) {
            recs += `${counter++}. **Akselerasi Bottleneck Proyek**: Terdapat ${overdueTasks.length} tugas kritis tertunda. Prioritaskan pengerjaan *"${overdueTasks[0].title}"* pada proyek **${overdueTasks[0].projectCode}**.\n`;
        }

        // 2. Check for unpaid high cash requests
        const pendingPOs = financePO.filter(po => po.statusTag === 'pending');
        const poAmount = pendingPOs.reduce((sum, po) => sum + (po.amount || 0), 0);
        if (poAmount > 15000000) {
            recs += `${counter++}. **Pelepasan Likuiditas Vendor**: Segera verifikasi ${pendingPOs.length} Purchase Order pending untuk mempercepat pengiriman material di proyek konstruksi.\n`;
        }

        // 3. Crew allocations (Only for Adidaya)
        if (isAdidayaTenant) {
            const unassignedCrew = crew.filter(c => !c.projectCode && c.status === 'ACTIVE');
            if (unassignedCrew.length > 0) {
                recs += `${counter++}. **Optimalkan Tenaga Kerja**: Ada ${unassignedCrew.length} crew berstatus aktif namun tidak memiliki penugasan proyek. Alokasikan mereka ke proyek dengan tingkat kesibukan tinggi.\n`;
            }
        }

        // Default fallback recommendation
        recs += `${counter++}. **Sinkronisasi Gudang Harian**: Lakukan pembaruan berkala inventaris material untuk menghindari anomali pencatatan ganda.`;

        return recs;
    };

    // Chat processing engine
    const handleSendText = async (text: string, attachmentToSubmit?: { name: string; url: string; mimeType?: string }) => {
        if (!text.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'user',
            text: text.trim(),
            timestamp: new Date(),
            attachment: attachmentToSubmit
        };

        setMessages(prev => {
            const newMsgs = [...prev, userMsg];
            saveCurrentSession(currentSessionIdRef.current, newMsgs).then(id => {
                updateSessionId(id);
            });
            return newMsgs;
        });
        setInputText('');
        setIsTyping(true);

        // Run AI response pipeline
        setTimeout(async () => {
            const query = text.toLowerCase().trim();
            let aiText = '';
            let usedLLM = false;

            const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
            const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

            // Check if current user wants to clear or reset
            const cleanLower = text.toLowerCase().trim();
            if (cleanLower === 'clear' || cleanLower === 'reset' || cleanLower === '/clear') {
                startNewChat();
                setIsTyping(false);
                return;
            }

            let queryText = text;
            if (attachmentToSubmit) {
                queryText += `\n[User attached file: ${attachmentToSubmit.url} (named: ${attachmentToSubmit.name})]`;
            }

            // Construct workspace data summary context for RAG
            const systemPrompt = `
You are ${isAdidayaTenant ? 'Adidaya Intelligence (AI)' : 'Forma AI'}, a smart operational assistant for ${tenantName}.
You have access to the live project database of ${tenantName}.
Here is the current operational data of the workspace:

Active Projects:
${JSON.stringify(projects.map(p => ({ title: p.title, code: p.code, progress: p.progress, phase: p.phase, isArchived: p.isArchived })), null, 2)}

Profiles (Users/Staff/Managers available to be assigned to tasks/actions):
${JSON.stringify(profiles.map(p => ({ id: p.id, name: p.name })), null, 2)}

WBS (Work Breakdown Structure) Templates:
${JSON.stringify(WBS_TEMPLATES, null, 2)}
${isAdidayaTenant ? `
Crew Members:
${JSON.stringify(crew.map(c => ({ name: c.name, role: c.role, status: c.status, projectCode: c.projectCode })), null, 2)}
` : ''}
Tasks:
${JSON.stringify(tasks.map(t => ({ title: t.title, projectCode: t.projectCode, priority: t.priority, status: t.status, dueDate: t.dueDate })), null, 2)}

Finance PO (Purchase Orders - Pending):
${JSON.stringify(financePO.filter(po => po.statusTag === 'pending').map(po => ({ vendor: po.vendor, amount: po.amount, description: po.description })), null, 2)}

Finance Reimbursements (Pending):
${JSON.stringify(financeRE.filter(re => re.statusTag === 'pending').map(re => ({ name: re.submitted_by_name, amount: re.amount, category: re.category })), null, 2)}

Logistics & Warehouse Stocks:
${JSON.stringify(resourceOverview?.stats || {}, null, 2)}

Instructions:
- If the user asks a question about the projects${isAdidayaTenant ? ', crew' : ''}, finance, tasks, or logistics, answer it using the live data provided above.
- If the user asks a general question (e.g. general knowledge, suggestions, recommendations on products/brands like AC, materials, general conversational chat etc.), answer using your general knowledge.
- Keep answers professional, concise, clear, and in Indonesian (unless the user asks in English). Use bold formatting and bullet points where appropriate for readability.
${isAdidayaTenant ? `- When referring to crew roles: SKILLED is "Tukang", HELPER is "Helper/Kenek".\n- If the project code in crew assignments is formatted like "037-JPF", it corresponds to the project with code "JPF". Always map these prefixes properly.` : ''}
- If you don't know the answer or the data is missing, state it clearly.

CRITICAL ACTION COMMANDS:
1. Creating a Task:
   If the user asks you to create/buat task, add/tambah task, or schedule a task, you MUST append a JSON code block in backticks to the end of your response text using the following schema:
   \`\`\`json
   {
     "action": "create_task",
     "projectCode": "ADY", // Must match project code from Active Projects list
     "title": "Task title",
     "description": "Task description (optional)",
     "dueDate": "YYYY-MM-DD", // Extract date, default to current/target date if unspecified. Today is ${new Date().toISOString().split('T')[0]}
     "priority": "urgent" | "high" | "medium" | "low", // Default to medium if unspecified
     "wbsCode": "A.5", // Resolve from WBS Templates matching keyword (e.g., painting/cat -> A.5, structural/earthworks -> S.2). Set to null or omit if unspecified/unresolved.
     "assigneeIds": ["some-profile-uuid"] // Map requested assignee names (like Kukuh, Manu) to the Profile IDs. Set to [] if unspecified. Do NOT map to Crew Members (tukang/helpers) as they are NOT users. Tasks must ONLY be assigned to Profiles/Users.
   }
   \`\`\`

 2. Creating a Purchase Request (PO):
    If the user asks you to create/buat purchasing request, purchase order, or PO (e.g., "buat purchasing request beli semen 2 juta di proyek ADY dari vendor Semen Indah"), you MUST append a JSON code block in backticks to the end of your response text using the following schema:
    \`\`\`json
    {
      "action": "create_purchasing",
      "projectCode": "ADY", // Must match project code from Active Projects list
      "vendor": "Vendor name", // Default to 'Umum' if unspecified
      "amount": 2000000, // Total amount as a number (e.g., 2000000 from '2 juta')
      "description": "General item category/name", // e.g. "kursi pijat", "semen". Only name of the item, do NOT include quantity or price details here.
      "beneficiaryBank": "BCA" | "Mandiri" | "BRI" | "BNI" | etc., // Transfer bank name (optional, if specified)
      "beneficiaryNumber": "1234567890", // Account number (optional, if specified)
      "beneficiaryName": "Nama Pemilik Rekening", // Account owner name (optional, if specified)
      "invoiceUrl": "https://...", // Invoice document URL / attachment placeholder (optional, if specified)
      "items": [ // Detailed list of items purchased
        {
          "name": "kursi pijat", // Name of the item
          "qty": 5, // Quantity
          "unit": "pcs", // Unit (e.g. pcs, sak, kg, ltr, etc.)
          "unit_price": 23000, // Unit price
          "total": 115000 // Total price for this item (qty * unit_price)
        }
      ]
    }
    \`\`\`

3. Completing Data (Conversational Form Filling):
   - When the user asks to complete details, clicks "Lengkapi data", or answers form questions, look at the "Rincian saat ini" list in the context.
   - Cross-check the fields. If a field is already set to a valid value (not "Belum diatur", "Belum dipilih", "Belum diunggah"), do NOT ask for it.
   - Ask for the remaining missing fields ONE BY ONE (only ask one question per turn). Do not list all questions at once.
   - Keep your questions short, natural, and in Indonesian.

Double check that the project code matches one of the active project codes. Keep the JSON strictly valid and formatted.
`;
            // Build conversation history for the APIs (excluding welcome message to ensure it starts with a user turn)
            const historyToInclude = [...messages, userMsg].filter(m => m.id !== 'welcome' && m.text && m.text.trim());
            const slicedHistory = historyToInclude.slice(-15); // limit to last 15 messages to stay lightweight

            // Format for Gemini (ensuring alternating roles)
            const geminiContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
            slicedHistory.forEach((msg, idx) => {
                const role = msg.sender === 'user' ? 'user' : 'model';
                const text = (idx === slicedHistory.length - 1) ? queryText : msg.text;
                
                if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === role) {
                    geminiContents[geminiContents.length - 1].parts[0].text += `\n\n${text}`;
                } else {
                    geminiContents.push({
                        role,
                        parts: [{ text }]
                    });
                }
            });

            // Format for OpenAI
            const openAiMessages = [
                { role: 'system', content: systemPrompt },
                ...slicedHistory.slice(0, -1).map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                })),
                { role: 'user', content: queryText }
            ];

            const tryGemini = async (modelName: string): Promise<string | null> => {
                if (!geminiKey) return null;
                const maxRetries = 2; // Total of 3 attempts
                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                        if (attempt > 0) {
                            console.log(`[Adidaya AI] Retrying Gemini API (${modelName}) in 1.5s (Attempt ${attempt}/${maxRetries})...`);
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }

                        console.log(`[Adidaya AI] Calling Gemini model: ${modelName} (Attempt ${attempt + 1})...`);
                        const response = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    systemInstruction: {
                                        parts: [{ text: systemPrompt }]
                                    },
                                    contents: geminiContents
                                }),
                            }
                        );

                        if (response.ok) {
                            const data = await response.json();
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (text.trim()) return text.trim();
                        } else {
                            const errBody = await response.text();
                            console.error(`[Adidaya AI] Gemini API (${modelName}) returned status:`, response.status, errBody);
                            
                            // Only retry on transient/rate-limiting errors (429 or 5xx)
                            if (response.status !== 429 && response.status < 500) {
                                break;
                            }
                        }
                    } catch (err) {
                        console.error(`[Adidaya AI] Error calling Gemini API (${modelName}):`, err);
                    }
                }
                return null;
            };

            const tryOpenAI = async (): Promise<string | null> => {
                if (!openaiKey) return null;
                try {
                    console.log("[Adidaya AI] Calling OpenAI model: gpt-4o-mini...");
                    const response = await fetch(
                        'https://api.openai.com/v1/chat/completions',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${openaiKey}`
                            },
                            body: JSON.stringify({
                                model: 'gpt-4o-mini',
                                messages: openAiMessages
                            }),
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        const text = data.choices?.[0]?.message?.content || '';
                        if (text.trim()) return text.trim();
                    } else {
                        const errBody = await response.text();
                        console.error("[Adidaya AI] OpenAI API returned error code:", response.status, errBody);
                    }
                } catch (err) {
                    console.error("[Adidaya AI] Error calling OpenAI API:", err);
                }
                return null;
            };

            let resultText: string | null = null;

            if (geminiKey) {
                // 1. Try Gemini 2.5 Flash
                resultText = await tryGemini('gemini-2.5-flash');
            }

            // 2. Fallback to OpenAI if Gemini failed or is not available
            if (!resultText && openaiKey) {
                console.warn("[Adidaya AI] Gemini failed or is not configured. Falling back to OpenAI GPT-4o-mini...");
                resultText = await tryOpenAI();
            }

            if (resultText) {
                aiText = resultText;
                usedLLM = true;
            }

            if (!usedLLM) {
                const hasNotice = !geminiKey && !openaiKey;

                // 1. GREETINGS & GENERAL CONVERSATIONAL INTENTS
                if (query === 'halo' || query === 'hi' || query === 'hello' || query === 'pagi' || query === 'siang' || query === 'sore' || query === 'malam' || query === 'apa kabar' || query === 'hei') {
                    aiText = `Halo! Saya **Adidaya Intelligence (AI)**. Saya siap membantu Anda menganalisis data operasional Adidaya secara real-time.\n\nSaat ini saya terhubung ke:\n• **${projects.length} Proyek**\n• **${tasks.filter(t => t.status !== 'done').length} Tugas Pending**\n• **${crew.length} Anggota Crew**\n• Database Keuangan & Logistik Gudang.\n\nSilakan tanyakan spesifik, seperti: *"Bagaimana status crew?"*, *"Siapa yang mengajukan reimburse terbesar?"*, *"Tugas untuk proyek ADY"* atau *"Apa tugas Kukuh?"*`;
                } else if (query === 'terima kasih' || query === 'nuhun' || query === 'makasih' || query === 'thanks' || query === 'thank you') {
                    aiText = `Sama-sama! Senang bisa membantu kelancaran operasional Adidaya. Jangan ragu untuk menanyakan data operasional lainnya.`;
                } else if (query === 'mantap' || query === 'oke' || query === 'ok' || query === 'bagus' || query === 'mantaap') {
                    aiText = `Siap! Saya selalu standby untuk menyajikan data terbaru dari lapangan.`;
                }
                
                // 2. COMPOUND ENTITY CHECKS (Must evaluate first to handle multi-topic questions correctly)
                else if (
                    (query.includes('crew') || query.includes('tukang') || query.includes('pekerja') || query.includes('orang') || query.includes('absen') || query.includes('absensi') || query.includes('personil') || query.includes('anggota') || /\bkerja\b/.test(query) || /\bbekerja\b/.test(query)) && 
                    projects.length > 0 && 
                    projects.some(p => query.includes(p.code.toLowerCase()) || query.includes(p.title.toLowerCase()))
                ) {
                    const matchingProj = projects.find(p => query.includes(p.code.toLowerCase()) || query.includes(p.title.toLowerCase()));
                    if (matchingProj) {
                        const projectCrew = crew.filter(c => {
                            if (!c.projectCode) return false;
                            const cleanProjCode = c.projectCode.toLowerCase();
                            const cleanMatchCode = matchingProj.code.toLowerCase();
                            return cleanProjCode === cleanMatchCode || cleanProjCode.endsWith('-' + cleanMatchCode) || cleanProjCode.startsWith(cleanMatchCode + '-');
                        });
                        
                        if (projectCrew.length > 0) {
                            const skilledCount = projectCrew.filter(c => c.role === 'SKILLED').length;
                            const helperCount = projectCrew.filter(c => c.role === 'HELPER').length;
                            
                            let textResult = `👷 **Crew di Proyek ${matchingProj.title} (${matchingProj.code})**:\n`;
                            textResult += `Saat ini tercatat **${projectCrew.length} orang crew** aktif ditugaskan di proyek ini (**${skilledCount} Tukang**, **${helperCount} Helper**):\n\n`;
                            projectCrew.forEach((c, idx) => {
                                const indonesianRole = c.role === 'SKILLED' ? 'Tukang' : 'Helper';
                                textResult += `${idx + 1}. **${c.name}** — *${indonesianRole}*\n`;
                            });
                            aiText = textResult;
                        } else {
                            aiText = `👷 **Crew di Proyek ${matchingProj.title} (${matchingProj.code})**:\nSaat ini belum ada crew/tukang yang ditugaskan ke proyek ini di database.`;
                        }
                    }
                } else if (
                    (query.includes('tugas') || query.includes('task') || query.includes('kerjaan') || query.includes('outstanding') || query.includes('wbs')) &&
                    projects.length > 0 &&
                    projects.some(p => query.includes(p.code.toLowerCase()) || query.includes(p.title.toLowerCase()))
                ) {
                    const matchingProj = projects.find(p => query.includes(p.code.toLowerCase()) || query.includes(p.title.toLowerCase()));
                    if (matchingProj) {
                        const projTasks = tasks.filter(t => t.projectCode === matchingProj.code || t.projectCode === matchingProj.id);
                        let taskText = `📋 **Tugas Pending di Proyek ${matchingProj.title} (${matchingProj.code})**:\n`;
                        const pendingProjTasks = projTasks.filter(t => t.status !== 'done');
                        if (pendingProjTasks.length > 0) {
                            taskText += `Terdapat **${pendingProjTasks.length} tugas** belum selesai:\n\n`;
                            pendingProjTasks.slice(0, 5).forEach((t, idx) => {
                                taskText += `${idx + 1}. [ ] **${t.title}** (Prioritas: *${t.priority}*)\n`;
                            });
                            if (pendingProjTasks.length > 5) {
                                taskText += `• ...dan *${pendingProjTasks.length - 5} tugas lainnya*.\n`;
                            }
                        } else {
                            taskText += `✅ Semua tugas untuk proyek ini telah selesai!`;
                        }
                        aiText = taskText;
                    }
                } else if (
                    (query.includes('tugas') || query.includes('task') || query.includes('kerjaan') || query.includes('doing') || query.includes('outstanding')) &&
                    profiles.length > 0 &&
                    profiles.some(p => isTalkingAboutProfile(query, p.name))
                ) {
                    const matchingProfile = profiles.find(p => isTalkingAboutProfile(query, p.name));
                    if (matchingProfile) {
                        const profileTasks = tasks.filter(t => 
                            t.assignees?.some((a: any) => 
                                a.id === matchingProfile.id ||
                                a.name.toLowerCase().includes(matchingProfile.name.toLowerCase()) || 
                                matchingProfile.name.toLowerCase().includes(a.name.toLowerCase())
                            )
                        );
                        let taskText = `📋 **Tugas untuk ${matchingProfile.name}**:\n`;
                        const pendingProfileTasks = profileTasks.filter(t => t.status !== 'done');
                        if (pendingProfileTasks.length > 0) {
                            taskText += `Terdapat **${pendingProfileTasks.length} tugas pending**:\n\n`;
                            pendingProfileTasks.slice(0, 5).forEach((t, idx) => {
                                taskText += `${idx + 1}. [ ] **${t.title}** (Proyek: *${t.projectCode}*)\n`;
                            });
                            if (pendingProfileTasks.length > 5) {
                                taskText += `• ...dan *${pendingProfileTasks.length - 5} tugas lainnya*.\n`;
                            }
                        } else {
                            taskText += `✅ Tidak ada tugas pending untuk user ini saat ini.`;
                        }
                        aiText = taskText;
                    }
                }

                // 3. SINGLE ENTITY CHECKS (Crew member profile, specific project details)
                else if (crew.length > 0 && crew.some(c => isTalkingAboutCrew(query, c.name))) {
                    const matchingCrew = crew.find(c => isTalkingAboutCrew(query, c.name));
                    if (matchingCrew) {
                        let crewReport = `👷 **Informasi Crew: ${matchingCrew.name}**\n`;
                        crewReport += `• Peran: **${matchingCrew.role}**\n`;
                        crewReport += `• Status Hari Ini: **${matchingCrew.status === 'ACTIVE' ? '🟢 Aktif Bekerja' : '⚪ Istirahat/Off'}**\n`;
                        if (matchingCrew.projectCode) {
                            crewReport += `• Penugasan Proyek: **${matchingCrew.projectCode}**\n`;
                        } else {
                            crewReport += `• Penugasan Proyek: *Belum Ditugaskan*\n`;
                        }
                        if (matchingCrew.phone) {
                            crewReport += `• Kontak: ${matchingCrew.phone}\n`;
                        }
                        
                        const matchingRequests = crewRequests.filter(r => r.crewId === matchingCrew.id);
                        if (matchingRequests.length > 0) {
                            crewReport += `\n🔄 **Pengajuan Administrasi**:\n`;
                            matchingRequests.forEach(r => {
                                crewReport += `• Pengajuan *${r.type}* (${r.status}): **${r.amount ? formatCurrency(r.amount) : r.reason}**\n`;
                            });
                        }
                        aiText = crewReport;
                    }
                }

                // 4. CHECK FOR PROJECT SPECIFIC MATCHES (e.g. "ADY1", "PJ-01", etc.)
                else if (projects.length > 0 && projects.some(p => query.includes(p.code.toLowerCase()) || query.includes(p.title.toLowerCase()))) {
                    const matchingProject = projects.find(p => query.includes(p.code.toLowerCase()) || query.includes(p.title.toLowerCase()));
                    if (matchingProject) {
                        let projReport = `📊 **Detail Proyek: ${matchingProject.title} (${matchingProject.code})**\n`;
                        projReport += `• Kemajuan (Progress): **${matchingProject.progress}%**\n`;
                        projReport += `• Fase Saat Ini: *${matchingProject.phase || 'N/A'}*\n`;
                        projReport += `• Status: ${matchingProject.isArchived ? '📁 Diarsipkan' : '🟢 Aktif'}\n\n`;
                        
                        const projTasks = tasks.filter(t => t.projectCode === matchingProject.code || t.projectCode === matchingProject.id);
                        if (projTasks.length > 0) {
                            projReport += `📋 **Tugas Terkait (${projTasks.length})**:\n`;
                            const pendingProjTasks = projTasks.filter(t => t.status !== 'done');
                            if (pendingProjTasks.length > 0) {
                                projReport += `*Belum Selesai*:\n`;
                                pendingProjTasks.slice(0, 5).forEach(t => {
                                    projReport += `- [ ] **${t.title}** (Prioritas: *${t.priority}*)\n`;
                                });
                                if (pendingProjTasks.length > 5) {
                                    projReport += `- ...dan *${pendingProjTasks.length - 5} tugas lainnya*.\n`;
                                }
                            } else {
                                projReport += `✅ Semua tugas untuk proyek ini telah selesai!`;
                            }
                        } else {
                            projReport += `ℹ️ Tidak ada tugas terdaftar untuk proyek ini di database.`;
                        }
                        aiText = projReport;
                    }
                }

                // 5. DETAILED FINANCE QUERIES (e.g. reimburse, pending amounts, highest amount)
                else if (query.includes('reimburse') || query.includes('reimbursement')) {
                    const pendingREs = financeRE.filter(re => re.statusTag === 'pending');
                    let reText = `💵 **Audit Reimbursement (RE)**:\n`;
                    reText += `Sistem mencatat **${pendingREs.length} pengajuan RE** status pending:\n\n`;
                    if (pendingREs.length > 0) {
                        pendingREs.slice(0, 5).forEach((re, idx) => {
                            reText += `${idx + 1}. **${re.submitted_by_name}** — **${formatCurrency(re.amount)}** (*${re.category || 'Lainnya'}*)\n`;
                        });
                        if (pendingREs.length > 5) {
                            reText += `• ...dan *${pendingREs.length - 5} pengajuan lainnya*.\n`;
                        }
                        const totalRe = pendingREs.reduce((sum, r) => sum + (r.amount || 0), 0);
                        reText += `\nTotal RE pending: **${formatCurrency(totalRe)}**`;
                    } else {
                        reText += `✅ Tidak ada pengajuan reimbursement pending saat ini.`;
                    }
                    aiText = reText;
                } else if (query.includes('po') || query.includes('purchase') || query.includes('pembelian')) {
                    const pendingPOs = financePO.filter(po => po.statusTag === 'pending');
                    let poText = `🛍️ **Audit Purchase Request (PO)**:\n`;
                    poText += `Sistem mencatat **${pendingPOs.length} pengajuan PO** status pending:\n\n`;
                    if (pendingPOs.length > 0) {
                        pendingPOs.slice(0, 5).forEach((po, idx) => {
                            poText += `${idx + 1}. **${po.vendor || 'Umum'}** — **${formatCurrency(po.amount)}** (*${po.ref || 'PO'}*)\n`;
                        });
                        if (pendingPOs.length > 5) {
                            poText += `• ...dan *${pendingPOs.length - 5} pengajuan lainnya*.\n`;
                        }
                        const totalPo = pendingPOs.reduce((sum, r) => sum + (r.amount || 0), 0);
                        poText += `\nTotal PO pending: **${formatCurrency(totalPo)}**`;
                    } else {
                        poText += `✅ Tidak ada pengajuan PO pending saat ini.`;
                    }
                    aiText = poText;
                } else if (query.includes('terbesar') || query.includes('paling besar') || query.includes('paling mahal')) {
                    const pendingPOs = financePO.filter(po => po.statusTag === 'pending');
                    const pendingREs = financeRE.filter(re => re.statusTag === 'pending');
                    
                    let maxReq: any = null;
                    let reqType = '';
                    
                    pendingPOs.forEach(po => {
                        if (!maxReq || po.amount > maxReq.amount) {
                            maxReq = po;
                            reqType = 'PO (Purchase Request)';
                        }
                    });
                    
                    pendingREs.forEach(re => {
                        if (!maxReq || re.amount > maxReq.amount) {
                            maxReq = re;
                            reqType = 'Reimbursement';
                        }
                    });
                    
                    if (maxReq) {
                        aiText = `💰 **Pengajuan Dana Pending Terbesar**:\n\n• Jenis: **${reqType}**\n• Referensi/Nama: **${maxReq.ref || maxReq.submitted_by_name || 'N/A'}**\n• Vendor/Pihak: **${maxReq.vendor || maxReq.submitted_by_name || 'Umum'}**\n• Jumlah: **${formatCurrency(maxReq.amount)}**\n• Deskripsi: *${maxReq.description || maxReq.title || 'Tidak ada deskripsi'}*`;
                    } else {
                        aiText = `ℹ️ Tidak ada data pengajuan PO atau Reimbursement pending di database saat ini.`;
                    }
                } else if (query.includes('dana') || query.includes('duit') || query.includes('keuangan') || query.includes('total pending') || query.includes('cash')) {
                    aiText = compileFinanceReport();
                }

                // 6. PROJECTS AND TASKS ANALYSIS
                else if (query.includes('proyek') || query.includes('project')) {
                    if (query.includes('di bawah') || query.includes('rendah') || query.includes('lambat') || query.includes('<') || query.includes('kurang')) {
                        const lowProgressProjects = projects.filter(p => !p.isArchived && (p.progress || 0) < 50);
                        if (lowProgressProjects.length > 0) {
                            let lowReport = `📊 **Proyek dengan Progress Rendah (< 50%)**:\n\n`;
                            lowProgressProjects.forEach((p, idx) => {
                                lowReport += `${idx + 1}. **${p.title}** (${p.code}) — Progress: **${p.progress}%** [Fase: *${p.phase || 'N/A'}*]\n`;
                            });
                            aiText = lowReport;
                        } else {
                            aiText = `✅ **Hebat!** Tidak ada proyek aktif dengan progress di bawah 50% saat ini.`;
                        }
                    } else if (query.includes('selesai') || query.includes('100') || query.includes('rampung')) {
                        const completed = projects.filter(p => p.progress === 100);
                        if (completed.length > 0) {
                            let compReport = `✅ **Proyek yang Sudah Selesai (100%)**:\n\n`;
                            completed.forEach((p, idx) => {
                                compReport += `${idx + 1}. **${p.title}** (${p.code})\n`;
                            });
                            aiText = compReport;
                        } else {
                            aiText = `ℹ️ Belum ada proyek dengan status progress 100% di database.`;
                        }
                    } else {
                        aiText = compileProjectsReport();
                    }
                } else if (query.includes('tugas') || query.includes('task') || query.includes('wbs') || query.includes('outstanding') || query.includes('pending')) {
                    const pendingTasks = tasks.filter(t => t.status !== 'done');
                    if (pendingTasks.length > 0) {
                        let taskText = `📋 **Daftar Tugas Pending (${pendingTasks.length} outstanding)**:\n\n`;
                        const highTasks = pendingTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
                        
                        if (highTasks.length > 0) {
                            taskText += `⚠️ **Prioritas Tinggi & Kritis**:\n`;
                            highTasks.slice(0, 5).forEach(t => {
                                taskText += `• **${t.title}** (${t.projectCode}) — Target: *${t.dueDate || 'N/A'}*\n`;
                            });
                            if (highTasks.length > 5) {
                                taskText += `• ...dan *${highTasks.length - 5} tugas prioritas lainnya*.\n`;
                            }
                            taskText += `\n`;
                        }
                        
                        const normalTasks = pendingTasks.filter(t => t.priority !== 'high' && t.priority !== 'urgent');
                        if (normalTasks.length > 0) {
                            taskText += `📝 **Tugas Normal/Rendah**:\n`;
                            normalTasks.slice(0, 5).forEach(t => {
                                taskText += `• **${t.title}** (${t.projectCode}) — Target: *${t.dueDate || 'N/A'}*\n`;
                            });
                            if (normalTasks.length > 5) {
                                taskText += `• ...dan *${normalTasks.length - 5} tugas normal lainnya*.\n`;
                            }
                        }
                        aiText = taskText;
                    } else {
                        aiText = `✅ **Luar biasa!** Semua tugas di database telah diselesaikan.`;
                    }
                }

                // 7. CREW QUERIES
                else if (query.includes('crew') || query.includes('pekerja') || query.includes('absen') || query.includes('absensi') || query.includes('orang')) {
                    if (query.includes('aktif') || query.includes('kerja') || query.includes('lapangan')) {
                        const activeCrew = crew.filter(c => c.status === 'ACTIVE');
                        if (activeCrew.length > 0) {
                            let activeText = `🟢 **Crew Aktif Bekerja Hari Ini (${activeCrew.length} orang)**:\n\n`;
                            activeCrew.forEach((c, idx) => {
                                activeText += `${idx + 1}. **${c.name}** — *${c.role}* (Proyek: **${c.projectCode || 'Gudang/Office'}**)\n`;
                            });
                            aiText = activeText;
                        } else {
                            aiText = `⚪ Tidak ada crew yang berstatus aktif bekerja hari ini.`;
                        }
                    } else if (query.includes('istirahat') || query.includes('off') || query.includes('libur')) {
                        const offCrew = crew.filter(c => c.status !== 'ACTIVE');
                        if (offCrew.length > 0) {
                            let offText = `⚪ **Crew Istirahat / Off Hari Ini (${offCrew.length} orang)**:\n\n`;
                            offCrew.forEach((c, idx) => {
                                offText += `${idx + 1}. **${c.name}** — *${c.role}*\n`;
                            });
                            aiText = offText;
                        } else {
                            aiText = `🟢 Semua crew aktif bekerja hari ini, tidak ada yang off.`;
                        }
                    } else {
                        aiText = compileCrewReport();
                    }
                }

                // 8. STOCK AND CATALOG OVERVIEW
                else if (query.includes('stok') || query.includes('gudang') || query.includes('material') || query.includes('inventaris') || query.includes('semen') || query.includes('besi') || query.includes('alat') || query.includes('gudang')) {
                    aiText = compileResourcesReport();
                } else if (query.includes('saran') || query.includes('rekomendasi') || query.includes('solusi') || query.includes('tindakan')) {
                    aiText = compileSmartRecommendations();
                }

                // 9. DEFAULT SMART CONVERSATIONAL FALLBACK
                else {
                    if ((geminiKey || openaiKey) && !usedLLM) {
                        aiText = `Mohon maaf, layanan AI sedang mengalami kendala koneksi atau kuota API habis saat ini. Silakan mencoba kembali beberapa saat lagi.`;
                    } else {
                        let defaultResponse = `Saya mengerti pertanyaan Anda mengenai *"${text}"*.\n\nSebagai asisten pintar Adidaya, saya bisa memberikan informasi spesifik tentang:\n`;
                        defaultResponse += `• **Crew**: Tanyakan status crew aktif/off atau detail crew tertentu (misal: *"status Kukuh"* atau *"daftar crew"*).\n`;
                        defaultResponse += `• **Keuangan**: Tanyakan total dana pending, PO/Reimbursement pending, atau pengajuan terbesar (misal: *"reimburse terbesar"* atau *"po pending"*).\n`;
                        defaultResponse += `• **Proyek & Tugas**: Tanyakan kemajuan proyek, proyek progress rendah, atau daftar tugas pending (misal: *"progress proyek"* atau *"tugas ADY"*).\n`;
                        defaultResponse += `• **Stok**: Tanyakan logistik gudang atau stok material.\n\nKetik kata kunci di atas untuk analisis data real-time.`;
                        
                        if (hasNotice) { defaultResponse += '\n\nLayanan AI umum belum diaktifkan. Informasi operasional di atas tetap tersedia.'; }
                        aiText = defaultResponse;
                    }
                }
            }

            // ─── ACTION JSON BLOCK PARSER ───
            // Parse structured JSON action blocks from LLM responses to set up confirmation card
            let actionPendingData: any = undefined;
            const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
            const actionMatch = jsonBlockRegex.exec(aiText);

            if (actionMatch) {
                try {
                    const actionPayload = JSON.parse(actionMatch[1]);
                    const isTask = actionPayload.action === 'create_task';
                    const isPurchasing = actionPayload.action === 'create_purchasing';

                    if (isTask || isPurchasing) {
                        const projectCode = actionPayload.projectCode || '';
                        const matchedProject = projects.find(
                            p => p.code.toLowerCase() === projectCode.toLowerCase()
                        );

                        // Determine missing fields
                        const missingFields = [];
                        if (isTask) {
                            if (!actionPayload.assigneeIds || actionPayload.assigneeIds.length === 0) {
                                missingFields.push({ field: 'assignees', label: 'Assignee / Pelaksana', description: 'Pelaksana belum ditentukan' });
                            }
                            if (!actionPayload.wbsCode) {
                                missingFields.push({ field: 'wbsCode', label: 'WBS Code / Kategori', description: 'Kategori WBS pekerjaan belum dipilih' });
                            }
                            if (!actionPayload.dueDate) {
                                missingFields.push({ field: 'dueDate', label: 'Deadline / Due Date', description: 'Tenggat waktu belum ditentukan' });
                            }
                        } else {
                            if (!actionPayload.vendor || actionPayload.vendor.toLowerCase() === 'umum') {
                                missingFields.push({ field: 'vendor', label: 'Vendor', description: 'Vendor pembelian belum ditentukan' });
                            }
                            if (!actionPayload.amount || Number(actionPayload.amount) === 0) {
                                missingFields.push({ field: 'amount', label: 'Total Nominal', description: 'Nominal transaksi belum ditentukan' });
                            }
                            if (!actionPayload.description || actionPayload.description.toLowerCase().includes('generated')) {
                                missingFields.push({ field: 'description', label: 'Deskripsi / Detail Barang', description: 'Rincian barang/material belum lengkap' });
                            }
                            if (!actionPayload.beneficiaryBank || !actionPayload.beneficiaryNumber || !actionPayload.beneficiaryName) {
                                missingFields.push({ field: 'beneficiary', label: 'Rekening Transfer', description: 'Info rekening (bank, norek, nama pemilik) belum lengkap' });
                            }
                            if (!actionPayload.invoiceUrl) {
                                missingFields.push({ field: 'invoiceUrl', label: 'Invoice / Nota', description: 'Dokumen invoice/nota fisik belum diunggah' });
                            }
                        }

                        actionPendingData = {
                            id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            action: actionPayload.action,
                            payload: actionPayload,
                            status: 'pending',
                            missingFields,
                            projectCode,
                            projectName: matchedProject ? matchedProject.title : 'Unknown Project',
                            projectId: matchedProject ? matchedProject.id : null,
                        };
                    }
                } catch (parseErr) {
                    console.error('Error parsing action JSON block:', parseErr);
                }
            }

            // Strip raw JSON code blocks from display text
            const cleanAiText = aiText.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim();

            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                text: cleanAiText,
                timestamp: new Date(),
                isReport: true,
                actionPending: actionPendingData
            };

            setMessages(prev => {
                const finalMsgs = [...prev, aiMsg];
                saveCurrentSession(currentSessionIdRef.current, finalMsgs);
                return finalMsgs;
            });
            setIsTyping(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 1200);
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        
        let fileAttachment = undefined;
        if (attachedFile && attachedFile.url) {
            fileAttachment = {
                name: attachedFile.name,
                url: attachedFile.url,
                mimeType: attachedFile.mimeType
            };
        }
        
        handleSendText(inputText, fileAttachment);
        setInputText('');
        setAttachedFile(null);
        
        if (Platform.OS === 'ios' && textFieldRef.current) {
            textFieldRef.current.setText('');
        }
    };

    // Quick Chip Actions handler
    const handleChipPress = (chipType: 'projects' | 'finance' | 'crew' | 'resources' | 'recs') => {
        let userText = '';
        switch (chipType) {
            case 'projects':
                userText = 'Analyze Projects & Task Bottlenecks';
                break;
            case 'finance':
                userText = 'Audit Finance Health & Pending Requests';
                break;
            case 'crew':
                userText = 'Report Field Crew & Attendance';
                break;
            case 'resources':
                userText = 'Analyze Warehouse Stock & Logistics';
                break;
            case 'recs':
                userText = 'Operational Actions & AI Advice';
                break;
        }
    };

    const presentUploadSourceSelect = (onSelect: (uri: string, name: string, mimeType: string, base64?: string) => void) => {
        Alert.alert(
            'Upload File / Photo',
            'Select document source:',
            [
                {
                    text: 'Take Photo (Camera)',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Access Denied', 'Camera permission is required to take photos.');
                                return;
                            }
                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ['images'],
                                quality: 0.7,
                                base64: true,
                            });
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                const asset = result.assets[0];
                                onSelect(
                                    asset.uri,
                                    asset.fileName || asset.uri.split('/').pop() || `camera-${Date.now()}.jpg`,
                                    asset.mimeType || 'image/jpeg',
                                    asset.base64 || undefined
                                );
                            }
                        } catch (err) {
                            console.error("Camera Error:", err);
                        }
                    }
                },
                {
                    text: 'Choose from Photo Library',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Access Denied', 'Photo library permission is required to choose photos.');
                                return;
                            }
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ['images'],
                                quality: 0.7,
                                base64: true,
                            });
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                const asset = result.assets[0];
                                onSelect(
                                    asset.uri,
                                    asset.fileName || asset.uri.split('/').pop() || `gallery-${Date.now()}.jpg`,
                                    asset.mimeType || 'image/jpeg',
                                    asset.base64 || undefined
                                );
                            }
                        } catch (err) {
                            console.error("Library Error:", err);
                        }
                    }
                },
                {
                    text: 'Choose Document (PDF/Files)',
                    onPress: async () => {
                        try {
                            const result = await DocumentPicker.getDocumentAsync({
                                type: ['image/*', 'application/pdf'],
                                copyToCacheDirectory: true,
                            });
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                const asset = result.assets[0];
                                onSelect(
                                    asset.uri,
                                    asset.name || asset.uri.split('/').pop() || `doc-${Date.now()}`,
                                    asset.mimeType || 'application/pdf'
                                );
                            }
                        } catch (err) {
                            console.error("Document Picker Error:", err);
                        }
                    }
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    const handleUploadInvoice = async (msgId: string) => {
        presentUploadSourceSelect(async (uri, name, mimeType, base64) => {
            try {
                setUploadingInvoiceMap(prev => ({ ...prev, [msgId]: true }));
                
                let fileBase64 = base64;
                if (!fileBase64) {
                    fileBase64 = await FileSystem.readAsStringAsync(uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                }
                
                const ext = name.split('.').pop() || 'jpg';
                const filePath = await uploadFinanceFileBase64(fileBase64, ext, mimeType, 'purchasing');
                
                setMessages(prev => {
                    const updated = prev.map(m => {
                        if (m.id === msgId && m.actionPending) {
                            const payload = {
                                ...m.actionPending.payload,
                                invoiceUrl: filePath
                            };
                            const missingFields = (m.actionPending.missingFields || []).filter(f => f.field !== 'invoiceUrl');
                            
                            return {
                                ...m,
                                actionPending: {
                                    ...m.actionPending,
                                    payload,
                                    missingFields
                                }
                            };
                        }
                        return m;
                    });
                    saveCurrentSession(currentSessionIdRef.current, updated);
                    return updated;
                });
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
                console.error("Invoice Upload Error:", err);
                Alert.alert("Gagal", "Gagal mengunggah invoice: " + (err.message || err));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setUploadingInvoiceMap(prev => ({ ...prev, [msgId]: false }));
            }
        });
    };

    const handleChatAttach = async () => {
        presentUploadSourceSelect(async (uri, name, mimeType, base64) => {
            try {
                setAttaching(true);
                
                let fileBase64 = base64;
                if (!fileBase64) {
                    fileBase64 = await FileSystem.readAsStringAsync(uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                }
                
                const ext = name.split('.').pop() || 'jpg';
                const filePath = await uploadFinanceFileBase64(fileBase64, ext, mimeType, 'purchasing');
                
                setAttachedFile({
                    uri,
                    name,
                    mimeType,
                    url: filePath
                });
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
                console.error("Chat Attachment Error:", err);
                Alert.alert("Gagal", "Gagal mengunggah lampiran: " + (err.message || err));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setAttaching(false);
            }
        });
    };

    const handleConfirmAction = async (msgId: string, choice: 'submit' | 'draft' | 'cancel') => {
        // Find the message
        const msgIdx = messages.findIndex(m => m.id === msgId);
        if (msgIdx === -1 || !messages[msgIdx].actionPending) return;

        const msg = messages[msgIdx];
        const actionPending = msg.actionPending!;
        const { action, payload, projectId, projectCode, projectName } = actionPending;

        if (choice === 'cancel') {
            // Update message status to cancelled
            const updatedMessages = messages.map((m, idx) => {
                if (idx === msgIdx) {
                    return {
                        ...m,
                        actionPending: {
                            ...m.actionPending!,
                            status: 'cancelled' as const
                        }
                    };
                }
                return m;
            });
            setMessages(updatedMessages);
            saveCurrentSession(currentSessionIdRef.current, updatedMessages);
            
            // Build detailed prompt ensuring project, amount, and description are preserved
            let userPrompt = '';
            if (action === 'create_task') {
                const assignees = (payload.assigneeIds || []).map((id: string) => {
                    const p = profiles.find(p => p.id === id);
                    return p ? p.name : 'Unknown';
                }).join(', ');
                let wbsDisplay = payload.wbsCode || 'Belum dipilih';
                if (payload.wbsCode) {
                    const discCode = payload.wbsCode.split('.')[0];
                    const disc = WBS_TEMPLATES.find(d => d.code === discCode);
                    const sect = disc?.sections.find(s => s.code === payload.wbsCode);
                    if (sect) {
                        wbsDisplay = `${sect.name} (${payload.wbsCode})`;
                    }
                }

                userPrompt = `Saya ingin melengkapi detail tugas "${payload.title || 'tugas ini'}". Rincian saat ini:
• Proyek: ${projectCode} (${projectName})
• Judul: ${payload.title}
• Deskripsi: ${payload.description || 'Belum diatur'}
• Pelaksana (Assignee): ${assignees || 'Belum diatur'}
• Kategori WBS: ${wbsDisplay}
• Deadline: ${payload.dueDate || 'Belum diatur'}
• Prioritas: ${payload.priority ? payload.priority.toUpperCase() : 'MEDIUM'}

Mohon periksa data rincian saat ini di atas. Jangan tanyakan data yang sudah diatur/diisi. Tanyakan hanya SATU detail saja (satu per satu) dari daftar data yang masih kurang.`;
            } else {
                userPrompt = `Saya ingin melengkapi detail permintaan pembelian untuk "${payload.description || 'barang ini'}". Rincian saat ini:
• Proyek: ${projectCode} (${projectName})
• Rincian: ${payload.description}
• Nominal: Rp ${payload.amount}
• Vendor: ${payload.vendor || 'Belum diatur'}
• Bank/Norek: ${payload.beneficiaryBank || 'Belum diatur'} - ${payload.beneficiaryNumber || ''} (${payload.beneficiaryName || ''})
• Invoice: ${payload.invoiceUrl || 'Belum diunggah'}

Mohon periksa data rincian saat ini di atas. Jangan tanyakan data yang sudah diatur/diisi. Tanyakan hanya SATU detail saja (satu per satu) dari daftar data yang masih kurang.`;
            }

            handleSendText(userPrompt);
            return;
        }

        // Set status to submitting
        setMessages(prev => prev.map((m, idx) => {
            if (idx === msgIdx) {
                return {
                    ...m,
                    actionPending: {
                        ...m.actionPending!,
                        status: 'submitting' as const
                    }
                };
            }
            return m;
        }));

        try {
            if (action === 'create_task') {
                if (!projectId) {
                    throw new Error(`Project code "${actionPending.projectCode}" not found.`);
                }

                const taskPayload = {
                    title: payload.title || 'Untitled Task',
                    projectId: projectId,
                    wbsCode: payload.wbsCode || undefined,
                    dueDate: payload.dueDate || new Date().toISOString().split('T')[0],
                    priority: payload.priority || 'medium',
                    description: payload.description || undefined,
                    status: 'todo' as const,
                    taskType: 'generic' as const,
                    subtasks: [],
                    attachments: [],
                    assignees: [],
                    comments: [],
                    history: [],
                };

                const assigneeIds: string[] = payload.assigneeIds || [];

                // Prepend "[Draft] " to the title if choice is 'draft'
                if (choice === 'draft') {
                    taskPayload.title = `[Draft] ${taskPayload.title}`;
                    if (taskPayload.description) {
                        taskPayload.description = `[Saved as Draft]\n${taskPayload.description}`;
                    } else {
                        taskPayload.description = `[Saved as Draft]`;
                    }
                }

                const createdTask = await createTaskApi(taskPayload, assigneeIds);
                if (!createdTask) {
                    throw new Error('Failed to create task in database.');
                }

                // Success
                const updatedMessages = messages.map((m, idx) => {
                    if (idx === msgIdx) {
                        return {
                            ...m,
                            actionPending: {
                                ...m.actionPending!,
                                status: (choice === 'draft' ? 'draft' : 'submitted') as 'draft' | 'submitted'
                            }
                        };
                    }
                    return m;
                });
                setMessages(updatedMessages);
                saveCurrentSession(currentSessionIdRef.current, updatedMessages);
                loadWorkspaceData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            } else if (action === 'create_purchasing') {
                if (!projectId) {
                    throw new Error(`Project code "${actionPending.projectCode}" not found.`);
                }

                const poPayload = {
                    project_id: projectId,
                    date: new Date().toISOString().split('T')[0],
                    vendor: payload.vendor || 'Umum',
                    description: payload.description || 'AI-generated purchasing request',
                    type: 'MATERIAL',
                    amount: Number(payload.amount) || 0,
                    status: choice === 'draft' ? 'DRAFT' : 'SUBMITTED',
                    approval_status: choice === 'draft' ? 'DRAFT' : 'SUBMITTED',
                    beneficiary_bank: payload.beneficiaryBank || null,
                    beneficiary_number: payload.beneficiaryNumber || null,
                    beneficiary_name: payload.beneficiaryName || null,
                    invoice_url: payload.invoiceUrl || null,
                    items: payload.items || [],
                };

                const createdPO = await createPurchasingRequest(currentUserId, poPayload);
                if (!createdPO) {
                    throw new Error('Failed to create purchase request in database.');
                }

                // Success
                const updatedMessages = messages.map((m, idx) => {
                    if (idx === msgIdx) {
                        return {
                            ...m,
                            actionPending: {
                                ...m.actionPending!,
                                status: (choice === 'draft' ? 'draft' : 'submitted') as 'draft' | 'submitted'
                            }
                        };
                    }
                    return m;
                });
                setMessages(updatedMessages);
                saveCurrentSession(currentSessionIdRef.current, updatedMessages);
                loadWorkspaceData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err: any) {
            console.error('Error executing action choice:', err);
            // Mark as failed
            setMessages(prev => prev.map((m, idx) => {
                if (idx === msgIdx) {
                    return {
                        ...m,
                        actionPending: {
                            ...m.actionPending!,
                            status: 'failed' as const,
                            errorMsg: err.message || 'Database error occurred'
                        }
                    };
                }
                return m;
            }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const renderActionPendingCard = (msg: ChatMessage) => {
        if (!msg.actionPending) return null;
        
        const actionPending = msg.actionPending;
        const { action, payload, status, missingFields, projectCode, projectName } = actionPending;
        const isTask = action === 'create_task';
        
        const cardTitle = isTask ? 'Buat Tugas Baru (Task)' : 'Buat Permintaan Pembelian (PO)';
        const cardIcon = isTask ? 'checklist' : 'cart.fill';
        const cardAccent = isTask ? '#8B5CF6' : '#EC4899';
        
        // Colors & labels based on status
        let statusLabel = 'Menunggu Konfirmasi';
        let statusColor = '#E07A2F'; // Amber/Orange
        let statusIcon = 'clock.fill';
        
        if (status === 'submitting') {
            statusLabel = 'Menyimpan...';
            statusColor = '#8B5CF6';
            statusIcon = 'arrow.clockwise';
        } else if (status === 'submitted') {
            statusLabel = 'Berhasil Disimpan / Submitted';
            statusColor = '#34C759'; // Green
            statusIcon = 'checkmark.circle.fill';
        } else if (status === 'draft') {
            statusLabel = 'Tersimpan sebagai Draft';
            statusColor = '#FFB020'; // Gold/Yellow
            statusIcon = 'doc.text.fill';
        } else if (status === 'cancelled') {
            statusLabel = 'Dibatalkan';
            statusColor = '#8E8E93'; // Gray
            statusIcon = 'xmark.circle.fill';
        } else if (status === 'failed') {
            statusLabel = actionPending.errorMsg || 'Gagal Menyimpan';
            statusColor = '#FF3B30'; // Red
            statusIcon = 'exclamationmark.triangle.fill';
        }

        // Details fields to display
        const detailsList = [];
        if (isTask) {
            detailsList.push({ label: 'Proyek', value: projectName ? `${projectName} (${projectCode})` : projectCode, isMissing: !projectName });
            detailsList.push({ label: 'Judul Tugas', value: payload.title, isMissing: !payload.title });
            
            // Resolve assignee names
            const assignees = (payload.assigneeIds || []).map((id: string) => {
                const p = profiles.find(p => p.id === id);
                return p ? p.name : 'Unknown';
            }).join(', ');
            detailsList.push({ 
                label: 'Pelaksana (Assignee)', 
                value: assignees || 'Belum diatur', 
                isMissing: !payload.assigneeIds || payload.assigneeIds.length === 0,
                isWarning: true 
            });
            
            // Resolve WBS title
            let wbsDisplay = payload.wbsCode || 'Belum dipilih';
            if (payload.wbsCode) {
                const discCode = payload.wbsCode.split('.')[0];
                const disc = WBS_TEMPLATES.find(d => d.code === discCode);
                const sect = disc?.sections.find(s => s.code === payload.wbsCode);
                if (sect) {
                    wbsDisplay = `${sect.name} (${payload.wbsCode})`;
                }
            }
            detailsList.push({ 
                label: 'Kategori WBS', 
                value: wbsDisplay, 
                isMissing: !payload.wbsCode,
                isWarning: true 
            });
            
            detailsList.push({ 
                label: 'Tenggat Waktu', 
                value: payload.dueDate || 'Hari ini (Default)', 
                isMissing: !payload.dueDate,
                isWarning: true 
            });
            
            detailsList.push({ label: 'Prioritas', value: payload.priority ? payload.priority.toUpperCase() : 'MEDIUM', isMissing: false });
        } else {
            // Purchase request
            detailsList.push({ label: 'Proyek', value: projectName ? `${projectName} (${projectCode})` : projectCode, isMissing: !projectName });
            detailsList.push({ 
                label: 'Deskripsi Barang', 
                value: payload.description || 'Belum diisi', 
                isMissing: !payload.description || payload.description.toLowerCase().includes('generated'),
                isWarning: true
            });
            detailsList.push({ 
                label: 'Nominal Total', 
                value: payload.amount ? formatCurrency(payload.amount) : 'Belum ditentukan', 
                isMissing: !payload.amount || Number(payload.amount) === 0,
                isWarning: true
            });

            if (payload.items && payload.items.length > 0) {
                payload.items.forEach((item: any, idx: number) => {
                    detailsList.push({
                        label: `Item #${idx + 1}`,
                        value: `${item.name} (${item.qty} ${item.unit} @ ${formatCurrency(item.unit_price)})`,
                        isMissing: false
                    });
                });
            }

            detailsList.push({ 
                label: 'Vendor', 
                value: payload.vendor || 'Umum (Default)', 
                isMissing: !payload.vendor || payload.vendor.toLowerCase() === 'umum',
                isWarning: true
            });
            
            const beneficiary = payload.beneficiaryBank && payload.beneficiaryNumber
                ? `${payload.beneficiaryBank} - ${payload.beneficiaryNumber} (${payload.beneficiaryName || 'No Name'})`
                : 'Belum diatur';
            detailsList.push({
                label: 'Bank Penerima',
                value: beneficiary,
                isMissing: !payload.beneficiaryBank || !payload.beneficiaryNumber || !payload.beneficiaryName,
                isWarning: true
            });

            const invoiceDisplay = payload.invoiceUrl || 'Belum diunggah';
            detailsList.push({
                label: 'Invoice / Nota',
                value: invoiceDisplay,
                isMissing: !payload.invoiceUrl,
                isWarning: true
            });
        }

        const isIos = Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIText && swiftModifiers;

        const renderButtons = () => {
            if (isIos) {
                return (
                    <View style={styles.actionCardButtonsVertical}>
                        <View style={{ height: 34, width: '100%' }}>
                            <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                <SwiftUIButton
                                    onPress={() => handleConfirmAction(msg.id, 'submit')}
                                    color="#34C759"
                                    modifiers={[
                                        swiftModifiers.buttonStyle('glassProminent'),
                                        swiftModifiers.frame({ maxWidth: Infinity, height: 34 }),
                                        swiftModifiers.cornerRadius(8)
                                    ]}
                                >
                                    <SwiftUIText size={12} weight="bold" color="#FFFFFF">Confirm Submit</SwiftUIText>
                                </SwiftUIButton>
                            </SwiftUIHost>
                        </View>
                        <View style={styles.actionCardButtonsHorizontal}>
                            <View style={{ flex: 1, height: 34 }}>
                                <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIButton
                                        onPress={() => handleConfirmAction(msg.id, 'draft')}
                                        color="#FFB020"
                                        modifiers={[
                                            swiftModifiers.buttonStyle('glassProminent'),
                                            swiftModifiers.frame({ maxWidth: Infinity, height: 34 }),
                                            swiftModifiers.cornerRadius(8)
                                        ]}
                                    >
                                        <SwiftUIText size={12} weight="bold" color="#FFFFFF">Save as Draft</SwiftUIText>
                                    </SwiftUIButton>
                                </SwiftUIHost>
                            </View>
                            <View style={{ flex: 1, height: 34 }}>
                                <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIButton
                                        onPress={() => handleConfirmAction(msg.id, 'cancel')}
                                        color="#8B5CF6"
                                        modifiers={[
                                            swiftModifiers.buttonStyle('glass'),
                                            swiftModifiers.frame({ maxWidth: Infinity, height: 34 }),
                                            swiftModifiers.cornerRadius(8)
                                        ]}
                                    >
                                        <SwiftUIText size={12} weight="bold" color="#8B5CF6">Lengkapi data</SwiftUIText>
                                    </SwiftUIButton>
                                </SwiftUIHost>
                            </View>
                        </View>
                    </View>
                );
            }

            return (
                <View style={styles.actionCardButtonsVertical}>
                    <Pressable
                        onPress={() => handleConfirmAction(msg.id, 'submit')}
                        style={({ pressed }) => [
                            styles.actionCardBtnSubmitFull,
                            pressed && { opacity: 0.8 }
                        ]}
                    >
                        <Text style={styles.actionCardBtnTextSubmit}>Confirm Submit</Text>
                    </Pressable>
                    <View style={styles.actionCardButtonsHorizontal}>
                        <Pressable
                            onPress={() => handleConfirmAction(msg.id, 'draft')}
                            style={({ pressed }) => [
                                styles.actionCardBtnDraftHalf,
                                pressed && { opacity: 0.8 }
                            ]}
                        >
                            <Text style={styles.actionCardBtnTextDraft}>Save as Draft</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => handleConfirmAction(msg.id, 'cancel')}
                            style={({ pressed }) => [
                                styles.actionCardBtnCancelHalf,
                                pressed && { opacity: 0.8 }
                            ]}
                        >
                            <Text style={styles.actionCardBtnTextCancel}>Lengkapi data</Text>
                        </Pressable>
                    </View>
                </View>
            );
        };

        return (
            <View style={[
                styles.actionCardContainer,
                isDark ? styles.actionCardDark : styles.actionCardLight,
                { borderLeftColor: cardAccent }
            ]}>
                {/* Header */}
                <View style={styles.actionCardHeader}>
                    <View style={[styles.actionCardIconBg, { backgroundColor: cardAccent + '20' }]}>
                        <PlatformIcon name={cardIcon} size={16} tintColor={cardAccent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.actionCardTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>{cardTitle}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <PlatformIcon name={statusIcon} size={10} tintColor={statusColor} />
                            <Text style={[styles.actionCardStatus, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                    </View>
                </View>

                {/* Details List */}
                <View style={styles.actionCardDetailsList}>
                    {detailsList.map((item, idx) => (
                        <View key={idx} style={styles.actionCardDetailRow}>
                            <Text style={[styles.actionCardDetailLabel, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)' }]}>
                                {item.label}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                                {item.label === 'Invoice / Nota' && status === 'pending' ? (
                                    uploadingInvoiceMap[msg.id] ? (
                                        <ActivityIndicator size="small" color="#8B5CF6" />
                                    ) : (
                                        <>
                                            <Text 
                                                numberOfLines={1}
                                                style={[
                                                    styles.actionCardDetailValue, 
                                                    { color: isDark ? '#FFFFFF' : '#1C1C1E', marginRight: 2 },
                                                    item.isMissing && { color: '#FFB020', fontWeight: '600' }
                                                ]}
                                            >
                                                {payload.invoiceUrl ? payload.invoiceUrl.split('/').pop() : 'Belum diunggah'}
                                            </Text>
                                            <Pressable
                                                onPress={() => handleUploadInvoice(msg.id)}
                                                style={({ pressed }) => [
                                                    styles.actionCardRowBtn,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                                                    pressed && { opacity: 0.7 }
                                                ]}
                                            >
                                                <PlatformIcon name="paperclip" size={12} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                                            </Pressable>
                                        </>
                                    )
                                ) : (
                                    <>
                                        {item.isMissing && (
                                            <PlatformIcon 
                                                name={item.isWarning ? "exclamationmark.triangle.fill" : "xmark.circle.fill"} 
                                                size={12} 
                                                tintColor={item.isWarning ? '#FFB020' : '#FF3B30'} 
                                            />
                                        )}
                                        <Text 
                                            numberOfLines={1}
                                            style={[
                                                styles.actionCardDetailValue, 
                                                { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                                                item.isMissing && { color: item.isWarning ? '#FFB020' : '#FF3B30', fontWeight: '600' }
                                            ]}
                                        >
                                            {item.value}
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    ))}
                </View>

                {/* All fields complete confirmation banner */}
                {status === 'pending' && missingFields.length === 0 && (
                    <View style={[styles.completeFieldsContainer, { backgroundColor: isDark ? 'rgba(52,199,89,0.08)' : 'rgba(52,199,89,0.05)' }]}>
                        <Text style={styles.completeFieldsTitle}>🎉 Semua data sudah lengkap, lanjutkan submit??</Text>
                    </View>
                )}

                {/* Missing checklist details summary */}
                {status === 'pending' && missingFields.length > 0 && (
                    <View style={[styles.missingFieldsContainer, { backgroundColor: isDark ? 'rgba(255,176,32,0.08)' : 'rgba(255,176,32,0.05)' }]}>
                        <Text style={styles.missingFieldsTitle}>⚠️ Data Belum Lengkap:</Text>
                        {missingFields.map((f, idx) => (
                            <Text key={idx} style={styles.missingFieldsItem}>
                                • {f.label}: <Text style={{ fontStyle: 'italic' }}>{f.description}</Text>
                            </Text>
                        ))}
                    </View>
                )}

                {/* Confirm Buttons */}
                {status === 'pending' && renderButtons()}
            </View>
        );
    };

    // Message block renderer
    const renderMessage = (msg: ChatMessage) => {
        const isAi = msg.sender === 'ai';
        const formattedTime = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <Animated.View
                key={msg.id}
                entering={FadeInUp.duration(300)}
                style={[
                    styles.messageRow,
                    isAi ? styles.messageRowAi : styles.messageRowUser
                ]}
            >
                {isAi && (
                    <LinearGradient
                        colors={['#8B5CF6', '#EC4899']}
                        style={styles.aiAvatar}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <PlatformIcon name="sparkles" size={14} tintColor="#FFFFFF" />
                    </LinearGradient>
                )}

                <View style={styles.bubbleContainer}>
                    <Pressable
                        onLongPress={() => copyToClipboard(msg.text)}
                        delayLongPress={400}
                        style={({ pressed }) => [
                            styles.messageBubble,
                            isAi 
                                ? (isDark ? styles.bubbleAiDark : styles.bubbleAiLight)
                                : styles.bubbleUser,
                            pressed && { opacity: 0.82 }
                        ]}
                    >
                        {isAi && <View style={styles.bubbleAccentLine} />}
                        <Text
                            style={[
                                styles.messageText,
                                isAi 
                                    ? (isDark ? styles.textAiDark : styles.textAiLight)
                                    : styles.textUser
                            ]}
                        >
                            {/* Simple bold parser helper for markdown preview (**text** to Bold) */}
                            {msg.text.split('\n').map((line, lineIdx) => {
                                const segments = [];
                                const regex = /\*\*([^*]+)\*\*/g;
                                let match;
                                let lastIdx = 0;

                                while ((match = regex.exec(line)) !== null) {
                                    if (match.index > lastIdx) {
                                        segments.push(line.substring(lastIdx, match.index));
                                    }
                                    segments.push(
                                        <Text key={match.index} style={styles.boldText}>
                                            {match[1]}
                                        </Text>
                                    );
                                    lastIdx = regex.lastIndex;
                                }

                                if (lastIdx < line.length) {
                                    segments.push(line.substring(lastIdx));
                                }

                                return (
                                    <Text key={lineIdx} style={{ display: 'flex', flexDirection: 'row' }}>
                                        {segments}
                                        {'\n'}
                                    </Text>
                                );
                            })}
                        </Text>
                    </Pressable>

                    {/* Render attachment if exists */}
                    {msg.attachment && (
                        <View style={[
                            styles.messageAttachmentCard,
                            { 
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                            }
                        ]}>
                            <PlatformIcon name="doc.fill" size={14} tintColor="#8B5CF6" />
                            <Text numberOfLines={1} style={[styles.messageAttachmentText, { color: isDark ? '#E5E5EA' : '#1C1C1E' }]}>
                                {msg.attachment.name}
                            </Text>
                        </View>
                    )}

                    {/* Render action pending card */}
                    {renderActionPendingCard(msg)}

                    <Text style={[styles.timestamp, isAi ? styles.timestampAi : styles.timestampUser]}>
                        {formattedTime}
                    </Text>
                </View>
            </Animated.View>
        );
    };


    if (!isAuthenticated) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: isAdidayaTenant ? 'Adidaya Intelligence' : 'Forma AI',
                        headerLargeTitle: Platform.OS === 'ios',
                        headerTransparent: false,
                        headerTintColor: isDark ? '#FFFFFF' : '#000000',
                        headerStyle: { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    }}
                />
                <UnauthenticatedView
                    title={isAdidayaTenant ? 'Adidaya Intelligence' : 'Forma AI'}
                    description="Sign in to your organization workspace to query intelligent project forecasting, live financial audits, and workforce insights."
                    buttonText="Sign In"
                />
            </>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: isAdidayaTenant ? 'Adidaya Intelligence' : 'Forma AI',
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: false,
                    headerTintColor: isDark ? '#FFFFFF' : '#000000',
                    headerStyle: { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Pressable 
                                onPress={startNewChat}
                                style={({ pressed }) => [
                                    styles.headerIconButton,
                                    pressed && { opacity: 0.7 }
                                ]}
                            >
                                <PlatformIcon name="square.and.pencil" size={22} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                            </Pressable>
                            <Pressable 
                                onPress={() => router.push('/(tabs)/home/adidaya-ai-history')}
                                style={({ pressed }) => [
                                    styles.headerIconButton,
                                    pressed && { opacity: 0.7 }
                                ]}
                            >
                                <PlatformIcon name="clock.arrow.circlepath" size={22} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                            </Pressable>
                        </View>
                    ),
                }}
            />

            {/* Chat message thread */}
            <ScrollView
                ref={scrollViewRef}
                contentInsetAdjustmentBehavior="automatic"
                style={[styles.chatArea, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentContainerStyle={[
                    styles.chatContent,
                    {
                        paddingTop: 12,
                        paddingBottom: 220
                    }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {messages.map(renderMessage)}

                {/* Thinking bubble typing indicator */}
                {isTyping && (
                    <Animated.View entering={FadeInUp.duration(200)} style={[styles.messageRow, styles.messageRowAi]}>
                        <LinearGradient
                            colors={['#8B5CF6', '#EC4899']}
                            style={styles.aiAvatar}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <PlatformIcon name="sparkles" size={14} tintColor="#FFFFFF" />
                        </LinearGradient>
                        <View style={styles.bubbleContainer}>
                            <View style={[styles.messageBubble, styles.typingBubble, isDark ? styles.bubbleAiDark : styles.bubbleAiLight]}>
                                <View style={styles.bubbleAccentLine} />
                                <View style={styles.typingDotsRow}>
                                    <TypingDot delay={0} />
                                    <TypingDot delay={150} />
                                    <TypingDot delay={300} />
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Glowing background aura inside dark mode */}
            {isDark && (
                <View style={styles.glowOverlay} pointerEvents="none">
                    <View style={[styles.glowColor, { backgroundColor: '#7C3AED', top: -100, left: -100 }]} />
                    <View style={[styles.glowColor, { backgroundColor: '#EC4899', bottom: -100, right: -100 }]} />
                </View>
            )}

            {/* Workspace live parameter load indicator */}
            {loadingData && (
                <View style={[styles.dataSyncIndicator, { top: Platform.OS === 'ios' ? 175 : 30 }]}>
                    {Platform.OS === 'ios' && SwiftUIHost && SwiftUIGlassEffectContainer && SwiftUIHStack && SwiftUIText && SwiftUICircularProgress && swiftModifiers ? (
                        <View style={{ width: 280, height: 38 }}>
                            <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                <SwiftUIGlassEffectContainer modifiers={[
                                    swiftModifiers.frame({ width: 280, height: 38 }),
                                    swiftModifiers.cornerRadius(19)
                                ]}>
                                    <SwiftUIHStack alignment="center" spacing={8} modifiers={[
                                        swiftModifiers.padding({ vertical: 8, horizontal: 16 }),
                                        swiftModifiers.glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <SwiftUICircularProgress color="#8B5CF6" modifiers={[
                                            swiftModifiers.frame({ width: 14, height: 14 })
                                        ]} />
                                        <SwiftUIText size={12} weight="bold" color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                            Connecting to Adidaya database...
                                        </SwiftUIText>
                                    </SwiftUIHStack>
                                </SwiftUIGlassEffectContainer>
                            </SwiftUIHost>
                        </View>
                    ) : (
                        <GlassView intensity={20} style={styles.syncCard}>
                            <ActivityIndicator size="small" color="#8B5CF6" />
                            <Text style={[styles.syncText, { color: isDark ? '#FFF' : '#000' }]}>
                                Connecting to Adidaya database...
                            </Text>
                        </GlassView>
                    )}
                </View>
            )}

            {/* KeyboardAvoidingView wraps bottom controls and is absolutely positioned */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
                style={styles.absoluteBottomContainer}
            >
                <View 
                    style={[
                        styles.bottomControlWrap, 
                        { 
                            paddingBottom: insets.bottom > 0 && isKeyboardVisible ? 4 : 12,
                            marginBottom: isKeyboardVisible ? 0 : 80
                        }
                    ]}
                >
                {/* Horizontal Quick Actions */}
                {messages.length <= 1 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickChipsScroll}
                        style={styles.quickChipsWrapper}
                        keyboardShouldPersistTaps="handled"
                    >
                        {Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIText && SwiftUIImage && swiftModifiers ? (
                            <>
                                <View style={{ height: 36, width: 142 }}>
                                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIButton
                                            onPress={() => handleChipPress('projects')}
                                            color="#007AFF"
                                            modifiers={[
                                                swiftModifiers.buttonStyle('glass'),
                                                swiftModifiers.frame({ maxWidth: Infinity, height: 36 }),
                                                swiftModifiers.cornerRadius(18)
                                            ]}
                                        >
                                            <SwiftUIHStack alignment="center" spacing={6}>
                                                <SwiftUIImage systemName="chart.bar.fill" size={12} color="#007AFF" />
                                                <SwiftUIText size={12} weight="bold" color="#007AFF">Project Analysis</SwiftUIText>
                                            </SwiftUIHStack>
                                        </SwiftUIButton>
                                    </SwiftUIHost>
                                </View>

                                <View style={{ height: 36, width: 120 }}>
                                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIButton
                                            onPress={() => handleChipPress('finance')}
                                            color="#C73A40"
                                            modifiers={[
                                                swiftModifiers.buttonStyle('glass'),
                                                swiftModifiers.frame({ maxWidth: Infinity, height: 36 }),
                                                swiftModifiers.cornerRadius(18)
                                            ]}
                                        >
                                            <SwiftUIHStack alignment="center" spacing={6}>
                                                <SwiftUIImage systemName="creditcard.fill" size={12} color="#C73A40" />
                                                <SwiftUIText size={12} weight="bold" color="#C73A40">Finance Audit</SwiftUIText>
                                            </SwiftUIHStack>
                                        </SwiftUIButton>
                                    </SwiftUIHost>
                                </View>

                                <View style={{ height: 36, width: 110 }}>
                                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIButton
                                            onPress={() => handleChipPress('crew')}
                                            color="#38A45A"
                                            modifiers={[
                                                swiftModifiers.buttonStyle('glass'),
                                                swiftModifiers.frame({ maxWidth: Infinity, height: 36 }),
                                                swiftModifiers.cornerRadius(18)
                                            ]}
                                        >
                                            <SwiftUIHStack alignment="center" spacing={6}>
                                                <SwiftUIImage systemName="person.3.fill" size={12} color="#38A45A" />
                                                <SwiftUIText size={12} weight="bold" color="#38A45A">Crew Status</SwiftUIText>
                                            </SwiftUIHStack>
                                        </SwiftUIButton>
                                    </SwiftUIHost>
                                </View>

                                <View style={{ height: 36, width: 130 }}>
                                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIButton
                                            onPress={() => handleChipPress('resources')}
                                            color="#E07A2F"
                                            modifiers={[
                                                swiftModifiers.buttonStyle('glass'),
                                                swiftModifiers.frame({ maxWidth: Infinity, height: 36 }),
                                                swiftModifiers.cornerRadius(18)
                                            ]}
                                        >
                                            <SwiftUIHStack alignment="center" spacing={6}>
                                                <SwiftUIImage systemName="archivebox.fill" size={12} color="#E07A2F" />
                                                <SwiftUIText size={12} weight="bold" color="#E07A2F">Stock Inventory</SwiftUIText>
                                            </SwiftUIHStack>
                                        </SwiftUIButton>
                                    </SwiftUIHost>
                                </View>

                                <View style={{ height: 36, width: 95 }}>
                                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIButton
                                            onPress={() => handleChipPress('recs')}
                                            color="#8B5CF6"
                                            modifiers={[
                                                swiftModifiers.buttonStyle('glass'),
                                                swiftModifiers.frame({ maxWidth: Infinity, height: 36 }),
                                                swiftModifiers.cornerRadius(18)
                                            ]}
                                        >
                                            <SwiftUIHStack alignment="center" spacing={6}>
                                                <SwiftUIImage systemName="wand.and.stars" size={12} color="#8B5CF6" />
                                                <SwiftUIText size={12} weight="bold" color="#8B5CF6">AI Advice</SwiftUIText>
                                            </SwiftUIHStack>
                                        </SwiftUIButton>
                                    </SwiftUIHost>
                                </View>
                            </>
                        ) : (
                            <>
                                <Pressable onPress={() => handleChipPress('projects')} style={styles.chipButton}>
                                    <LinearGradient colors={['rgba(0,122,255,0.15)', 'rgba(0,122,255,0.05)']} style={styles.chipGrad}>
                                        <PlatformIcon name="chart.bar.fill" size={12} tintColor="#007AFF" />
                                        <Text style={[styles.chipText, { color: '#007AFF' }]}>Project Analysis</Text>
                                    </LinearGradient>
                                </Pressable>

                                <Pressable onPress={() => handleChipPress('finance')} style={styles.chipButton}>
                                    <LinearGradient colors={['rgba(199,58,64,0.15)', 'rgba(199,58,64,0.05)']} style={styles.chipGrad}>
                                        <PlatformIcon name="creditcard.fill" size={12} tintColor="#C73A40" />
                                        <Text style={[styles.chipText, { color: '#C73A40' }]}>Finance Audit</Text>
                                    </LinearGradient>
                                </Pressable>

                                <Pressable onPress={() => handleChipPress('crew')} style={styles.chipButton}>
                                    <LinearGradient colors={['rgba(96,210,132,0.15)', 'rgba(96,210,132,0.05)']} style={styles.chipGrad}>
                                        <PlatformIcon name="person.3.fill" size={12} tintColor="#38A45A" />
                                        <Text style={[styles.chipText, { color: '#38A45A' }]}>Crew Status</Text>
                                    </LinearGradient>
                                </Pressable>

                                <Pressable onPress={() => handleChipPress('resources')} style={styles.chipButton}>
                                    <LinearGradient colors={['rgba(240,140,69,0.15)', 'rgba(240,140,69,0.05)']} style={styles.chipGrad}>
                                        <PlatformIcon name="archivebox.fill" size={12} tintColor="#E07A2F" />
                                        <Text style={[styles.chipText, { color: '#E07A2F' }]}>Stock Inventory</Text>
                                    </LinearGradient>
                                </Pressable>

                                <Pressable onPress={() => handleChipPress('recs')} style={styles.chipButton}>
                                    <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']} style={styles.chipGrad}>
                                        <PlatformIcon name="wand.and.stars" size={12} tintColor="#8B5CF6" />
                                        <Text style={[styles.chipText, { color: '#8B5CF6' }]}>AI Advice</Text>
                                    </LinearGradient>
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                )}

                {/* Input Text Box */}
                <View style={styles.inputContainer}>
                    {/* Attached File Preview Tag */}
                    {attachedFile && (
                        <View style={[
                            styles.stagedAttachContainer,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }
                        ]}>
                            <PlatformIcon name="doc.fill" size={14} tintColor="#8B5CF6" />
                            <Text numberOfLines={1} style={[styles.stagedAttachText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                                {attachedFile.name}
                            </Text>
                            <Pressable onPress={() => setAttachedFile(null)} style={styles.stagedAttachRemoveBtn}>
                                <PlatformIcon name="xmark.circle.fill" size={14} tintColor="#8E8E93" />
                            </Pressable>
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Paperclip Button */}
                        <Pressable 
                            onPress={handleChatAttach}
                            disabled={attaching}
                            style={({ pressed }) => [
                                styles.chatAttachBtn,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                                pressed && { opacity: 0.7 }
                            ]}
                        >
                            {attaching ? (
                                <ActivityIndicator size="small" color="#8B5CF6" />
                            ) : (
                                <PlatformIcon name="paperclip" size={18} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                            )}
                        </Pressable>

                        {/* Text Field wrapper */}
                        <View style={{ flex: 1 }}>
                            {Platform.OS === 'ios' && SwiftUIHost && SwiftUIHStack && SwiftUIVStack && SwiftUIButton && SwiftUITextField && SwiftUIGlassEffectContainer && SwiftUIImage && SwiftUISpacer && swiftModifiers ? (
                                <View style={{ width: '100%', height: 56 }}>
                                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            swiftModifiers.frame({ maxWidth: Infinity, height: 56 }),
                                            swiftModifiers.cornerRadius(28)
                                        ]}>
                                            <SwiftUIHStack alignment="center" spacing={10} modifiers={[
                                                swiftModifiers.padding({ top: 6, bottom: 6, leading: 16, trailing: 8 }),
                                                swiftModifiers.glassEffect({ shape: 'capsule' })
                                            ]}>
                                                <SwiftUITextField
                                                    ref={textFieldRef}
                                                    placeholder="Ask operational assistant..."
                                                    onChangeText={setInputText}
                                                    modifiers={[
                                                        swiftModifiers.frame({ minWidth: 100, maxWidth: Infinity, height: 44 }),
                                                        swiftModifiers.foregroundStyle(isDark ? '#FFFFFF' : '#000000')
                                                    ]}
                                                />
                                                <SwiftUISpacer />
                                                <SwiftUIButton
                                                    onPress={handleSend}
                                                    disabled={!inputText.trim()}
                                                    color="#8B5CF6"
                                                    modifiers={[
                                                        swiftModifiers.buttonStyle('glassProminent'),
                                                        swiftModifiers.frame({ width: 40, height: 40 }),
                                                        swiftModifiers.cornerRadius(20)
                                                    ]}
                                                >
                                                    <SwiftUIImage systemName="paperplane.fill" size={14} color="#FFFFFF" />
                                                </SwiftUIButton>
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </SwiftUIHost>
                                </View>
                            ) : (
                                <GlassEffectContainer borderRadius={26}>
                                    <View style={styles.inputGlassInner}>
                                        <TextInput
                                            style={[styles.textInputField, { color: isDark ? '#FFFFFF' : '#000000' }]}
                                            placeholder="Ask operational assistant..."
                                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                                            value={inputText}
                                            onChangeText={setInputText}
                                            onSubmitEditing={handleSend}
                                            returnKeyType="send"
                                            multiline={false}
                                        />

                                        <Pressable
                                            onPress={handleSend}
                                            disabled={!inputText.trim()}
                                            style={({ pressed }) => [
                                                styles.sendButton,
                                                !inputText.trim() && { opacity: 0.35 },
                                                pressed && { scale: 0.92 }
                                            ]}
                                        >
                                            <LinearGradient
                                                colors={['#8B5CF6', '#EC4899']}
                                                style={styles.sendButtonGradient}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                            >
                                                <PlatformIcon name="paperplane.fill" size={14} tintColor="#FFFFFF" />
                                            </LinearGradient>
                                        </Pressable>
                                    </View>
                                </GlassEffectContainer>
                            )}
                        </View>
                    </View>
                </View>
            </View>
            </KeyboardAvoidingView>

            {!!toastMessage && (
                <Animated.View 
                    entering={FadeInDown.duration(250)} 
                    exiting={FadeOutDown.duration(200)} 
                    style={styles.toastContainer}
                >
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </Animated.View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    absoluteBottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 30,
    },
    glowOverlay: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    glowColor: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        opacity: 0.18,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 100,
        elevation: 8,
    },
    dataSyncIndicator: {
        position: 'absolute',
        top: 12,
        left: 20,
        right: 20,
        zIndex: 50,
        alignItems: 'center',
    },
    syncCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    syncText: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.75,
    },
    chatArea: {
        flex: 1,
    },
    chatContent: {
        paddingHorizontal: 16,
    },
    messageRow: {
        flexDirection: 'row',
        marginVertical: 10,
        alignItems: 'flex-start',
        gap: 10,
    },
    messageRowAi: {
        alignSelf: 'flex-start',
        paddingRight: 40,
    },
    messageRowUser: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
        paddingLeft: 40,
    },
    aiAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    bubbleContainer: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
        maxWidth: '100%',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    bubbleAiDark: {
        backgroundColor: 'rgba(28,28,30,0.72)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderTopLeftRadius: 4,
    },
    bubbleAiLight: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1,
        borderTopLeftRadius: 4,
    },
    bubbleAccentLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 3.5,
        backgroundColor: '#8B5CF6',
    },
    bubbleUser: {
        backgroundColor: '#007AFF',
        borderTopRightRadius: 4,
    },
    typingBubble: {
        width: 65,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageText: {
        fontSize: 14.5,
        lineHeight: 21,
    },
    textAiDark: {
        color: '#E5E5EA',
    },
    textAiLight: {
        color: '#1C1C1E',
    },
    textUser: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    boldText: {
        fontWeight: '800',
    },
    timestamp: {
        fontSize: 10,
        opacity: 0.45,
        marginTop: 4,
        marginHorizontal: 4,
    },
    timestampAi: {
        alignSelf: 'flex-start',
    },
    timestampUser: {
        alignSelf: 'flex-end',
    },
    typingDotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    typingDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#8B5CF6',
    },
    bottomControlWrap: {
        width: '100%',
        zIndex: 20,
    },
    quickChipsWrapper: {
        maxHeight: 45,
        marginBottom: 8,
    },
    quickChipsScroll: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
    },
    chipButton: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.04)',
    },
    chipGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 12,
        gap: 6,
    },
    chipText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    inputContainer: {
        paddingHorizontal: 16,
        marginBottom: 4,
    },
    inputGlassInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        height: 52,
        width: '100%',
    },
    textInputField: {
        flex: 1,
        paddingHorizontal: 12,
        fontSize: 14.5,
        height: '100%',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    sendButtonGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 150,
        alignSelf: 'center',
        backgroundColor: 'rgba(28,28,30,0.85)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    headerIconButton: {
        marginRight: Platform.OS === 'ios' ? 0 : 16,
        padding: 6,
        borderRadius: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    historySheet: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '65%',
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 20,
        borderWidth: 0.5,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    historyHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 16,
        gap: 8,
        borderWidth: 0.5,
        marginBottom: 16,
    },
    newChatText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    historyList: {
        flex: 1,
    },
    historyListContent: {
        paddingBottom: 20,
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    emptyHistoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    historyItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 0.5,
    },
    historyItemMain: {
        flex: 1,
        marginRight: 10,
    },
    historyItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    historyItemDate: {
        fontSize: 11,
        color: '#8E8E93',
    },
    deleteButton: {
        padding: 8,
    },
    actionCardContainer: {
        borderRadius: 16,
        padding: 14,
        marginVertical: 8,
        width: 300,
        borderWidth: 1,
        borderLeftWidth: 4,
        alignSelf: 'stretch',
    },
    actionCardDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    actionCardLight: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderColor: 'rgba(0, 0, 0, 0.08)',
    },
    actionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        paddingBottom: 8,
        marginBottom: 8,
    },
    actionCardIconBg: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCardTitle: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    actionCardStatus: {
        fontSize: 11,
        fontWeight: '600',
    },
    actionCardDetailsList: {
        gap: 6,
    },
    actionCardDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionCardDetailLabel: {
        fontSize: 11.5,
    },
    actionCardDetailValue: {
        fontSize: 12,
        fontWeight: '500',
    },
    missingFieldsContainer: {
        marginTop: 10,
        padding: 8,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 176, 32, 0.2)',
    },
    missingFieldsTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFB020',
        marginBottom: 4,
    },
    missingFieldsItem: {
        fontSize: 10.5,
        color: '#FFB020',
        lineHeight: 14,
    },
    actionCardButtonsVertical: {
        marginTop: 12,
        gap: 6,
    },
    actionCardButtonsHorizontal: {
        flexDirection: 'row',
        gap: 6,
    },
    actionCardBtnSubmitFull: {
        height: 34,
        backgroundColor: '#34C759',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    actionCardBtnDraftHalf: {
        flex: 1,
        height: 34,
        backgroundColor: '#FFB020',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCardBtnCancelHalf: {
        flex: 1,
        height: 34,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCardBtnTextSubmit: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    actionCardBtnTextDraft: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    actionCardBtnTextCancel: {
        color: '#8B5CF6',
        fontSize: 12,
        fontWeight: '700',
    },
    completeFieldsContainer: {
        marginTop: 10,
        padding: 10,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(52, 199, 89, 0.2)',
    },
    completeFieldsTitle: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#34C759',
        textAlign: 'center',
    },
    actionCardRowBtn: {
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageAttachmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 6,
        maxWidth: 260,
    },
    messageAttachmentText: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    chatAttachBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stagedAttachContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.15)',
        alignSelf: 'flex-start',
    },
    stagedAttachText: {
        fontSize: 12,
        fontWeight: '600',
        maxWidth: 180,
    },
    stagedAttachRemoveBtn: {
        padding: 2,
    },
});
