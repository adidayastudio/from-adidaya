import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    Alert,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassView } from '../ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Assignment, CrewMember, Project, CREW_ROLE_LABELS, generateContractNumber, CrewDocument } from './mockData';
import * as FileSystem from 'expo-file-system/legacy';
import { PlatformIcon } from '../ui/PlatformIcon';

// Safe lazy loading of expo-print and expo-sharing
let Print: any = null;
let Sharing: any = null;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    // handled
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CrewAssignmentModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (
        assignment: Assignment,
        updatedPreviousAssignment?: Assignment,
        newDocument?: CrewDocument
    ) => void;
    onDelete?: (id: string) => void;
    assignment: Assignment | null;
    preselectedCrewId?: string;
    crewMembers: CrewMember[];
    projects: Project[];
    assignments: Assignment[];
    onViewDocument?: (html: string, title: string) => void;
    isEmbedded?: boolean;
}

export function CrewAssignmentModal({
    visible,
    onClose,
    onSave,
    onDelete,
    assignment,
    preselectedCrewId,
    crewMembers,
    projects,
    assignments,
    onViewDocument,
    isEmbedded = false,
}: CrewAssignmentModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [isEditing, setIsEditing] = useState(false);
    const [selectedCrewId, setSelectedCrewId] = useState('');
    const [selectedProjectCode, setSelectedProjectCode] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'COMPLETED' | 'INACTIVE'>('ACTIVE');

    const [isCrewDropdownOpen, setIsCrewDropdownOpen] = useState(false);
    const [crewSearchQuery, setCrewSearchQuery] = useState('');
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

    const filteredCrewMembersForSelect = useMemo(() => {
        if (!crewSearchQuery.trim()) return crewMembers;
        const q = crewSearchQuery.toLowerCase();
        return crewMembers.filter(c => c.name.toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q));
    }, [crewMembers, crewSearchQuery]);

    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const [projectTransferConfirmed, setProjectTransferConfirmed] = useState(false);
    const [earlyTerminationConfirmed, setEarlyTerminationConfirmed] = useState(false);
    const [extensionConfirmed, setExtensionConfirmed] = useState(false);

    useEffect(() => {
        setProjectTransferConfirmed(false);
        setEarlyTerminationConfirmed(false);
        setExtensionConfirmed(false);
    }, [assignment, visible]);

    const selectedCrew = crewMembers.find(c => c.id === selectedCrewId);
    const selectedProject = projects.find(p => p.code === selectedProjectCode);

    const activeAssignment = assignments.find(
        a => a.crewId === selectedCrewId && a.status === 'ACTIVE' && a.id !== (assignment?.id || '')
    );
    const activeProject = activeAssignment
        ? projects.find(p => p.code === activeAssignment.projectCode)
        : null;

    const originalProject = useMemo(() => {
        const code = assignment ? assignment.projectCode : (activeAssignment ? activeAssignment.projectCode : '');
        return projects.find(p => p.code === code);
    }, [assignment, activeAssignment, projects]);

    const targetTransferAssignment = useMemo(() => {
        if (assignment && assignment.id && assignment.projectCode !== selectedProjectCode) {
            return assignment;
        }
        return activeAssignment;
    }, [assignment, selectedProjectCode, activeAssignment]);

    const showProjectTransferWarning = useMemo(() => {
        if (assignment && assignment.id) {
            return assignment.projectCode !== selectedProjectCode;
        }
        return !!activeAssignment;
    }, [assignment, selectedProjectCode, activeAssignment]);

    const showEarlyTerminationWarning = useMemo(() => {
        if (!assignment || !assignment.id) return false;
        if (assignment.projectCode !== selectedProjectCode) return false;
        if (!assignment.endDate && endDate.trim()) return true;
        if (assignment.endDate && endDate.trim() && endDate.trim() < assignment.endDate) return true;
        return false;
    }, [assignment, selectedProjectCode, endDate]);

    const showExtensionWarning = useMemo(() => {
        if (!assignment || !assignment.id) return false;
        if (assignment.projectCode !== selectedProjectCode) return false;
        if (assignment.endDate && !endDate.trim()) return true;
        if (assignment.endDate && endDate.trim() && endDate.trim() > assignment.endDate) return true;
        return false;
    }, [assignment, selectedProjectCode, endDate]);

    const crewAssignments = useMemo(() => {
        if (!selectedCrewId) return [];
        return [...assignments]
            .filter(a => a.crewId === selectedCrewId)
            .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    }, [selectedCrewId, assignments]);

    const contractNumber = assignment ? generateContractNumber(assignment, assignments) : '';

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const year = parseInt(match[1], 10);
            const monthIdx = parseInt(match[2], 10) - 1;
            const day = parseInt(match[3], 10);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (monthIdx >= 0 && monthIdx < 12) {
                return `${day} ${months[monthIdx]} ${year}`;
            }
        }
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const getDurationInMonths = (startStr: string, endStr: string | undefined) => {
        if (!endStr) return '';
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        let totalMonths = (yearsDiff * 12) + monthsDiff;

        if (end.getDate() < start.getDate()) {
            totalMonths--;
        }

        const finalMonths = Math.max(0, totalMonths);
        return `${finalMonths} Month${finalMonths !== 1 ? 's' : ''}`;
    };

    const generateEarlyTerminationHtml = (assign: Assignment, oldEndDateStr: string, newEndDateStr: string) => {
        const crew = crewMembers.find(c => c.id === assign.crewId);
        const project = projects.find(p => p.code === assign.projectCode);
        const docRef = `ADY/TERM/${assign.projectCode}/${Date.now().toString().slice(-4)}/2026`;

        return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            padding: 40px;
                            color: #1C1C1E;
                            line-height: 1.5;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px double #1C1C1E;
                            padding-bottom: 15px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 18px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            font-weight: 800;
                        }
                        .header h2 {
                            margin: 5px 0 0 0;
                            font-size: 14px;
                            font-weight: 600;
                            text-transform: uppercase;
                        }
                        .doc-number {
                            font-size: 11px;
                            color: #8E8E93;
                            margin-top: 5px;
                        }
                        .intro {
                            margin-bottom: 20px;
                            font-size: 13px;
                        }
                        .parties {
                            margin-bottom: 20px;
                            font-size: 13px;
                        }
                        .party-title {
                            font-weight: 700;
                            margin-top: 10px;
                        }
                        .party-details {
                            margin-left: 15px;
                            margin-bottom: 10px;
                        }
                        .articles {
                            margin-top: 25px;
                            font-size: 13px;
                        }
                        .article-title {
                            font-weight: 700;
                            text-transform: uppercase;
                            margin-top: 15px;
                            margin-bottom: 5px;
                        }
                        .signatures {
                            margin-top: 50px;
                            display: flex;
                            justify-content: space-between;
                            font-size: 13px;
                        }
                        .sig-block {
                            text-align: center;
                            width: 200px;
                        }
                        .sig-space {
                            height: 70px;
                        }
                        .sig-name {
                            font-weight: 700;
                            text-decoration: underline;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>PEMBERITAHUAN PENGHENTIAN PERJANJIAN PENUGASAN LEBIH AWAL</h1>
                        <h2>PT MAHARDIKA ADIDAYA</h2>
                        <div class="doc-number">Nomor Ref: ${docRef}</div>
                    </div>
                    <div class="intro">
                        Merujuk pada Surat Perjanjian Kerja Penugasan sebelumnya, kedua belah pihak yang bertanda tangan di bawah ini sepakat untuk melakukan pengakhiran hubungan penugasan lebih awal:
                    </div>
                    <div class="parties">
                        <div class="party-title">PIHAK PERTAMA (Pemberi Kerja):</div>
                        <div class="party-details">
                            Nama Perusahaan: PT Mahardika Adidaya<br />
                            Perwakilan: HRD Departemen
                        </div>
                        <div class="party-title">PIHAK KEDUA (Pekerja):</div>
                        <div class="party-details">
                            Nama Lengkap: ${assign.crewName}<br />
                            Jabatan/Role: ${CREW_ROLE_LABELS[assign.crewRole] || assign.crewRole}<br />
                            ID Anggota: ${assign.crewId}
                        </div>
                    </div>
                    <div class="articles">
                        <div class="article-title">Pasal 1: Ketentuan Pengakhiran Lebih Awal</div>
                        <div>
                            Bahwa hubungan kerja penugasan Pihak Kedua pada proyek <strong>${project ? project.name : assign.projectCode}</strong> yang sedianya dijadwalkan selesai pada tanggal <strong>${formatDate(oldEndDateStr || 'Ongoing')}</strong>, kini dinyatakan berakhir lebih awal efektif terhitung sejak tanggal <strong>${formatDate(newEndDateStr)}</strong> atas dasar kesepakatan bersama dan/atau penyesuaian operasional proyek.
                        </div>
                        
                        <div class="article-title">Pasal 2: Hak & Kewajiban</div>
                        <div>
                            Seluruh hak dan kewajiban Pihak Kedua sampai dengan tanggal pengakhiran efektif akan diselesaikan oleh Pihak Pertama sesuai ketentuan yang berlaku. Terhitung sejak tanggal efektif pengakhiran, masing-masing pihak dibebaskan dari kewajiban selanjutnya yang tertuang dalam surat perjanjian sebelumnya.
                        </div>
                    </div>
                    <div class="signatures">
                        <div class="sig-block">
                            <div>Pihak Pertama,</div>
                            <div>PT Mahardika Adidaya</div>
                            <div class="sig-space"></div>
                            <div class="sig-name">( HRD Manager )</div>
                        </div>
                        <div class="sig-block">
                            <div>Pihak Kedua,</div>
                            <div>Pekerja</div>
                            <div class="sig-space"></div>
                            <div class="sig-name">( ${assign.crewName} )</div>
                        </div>
                    </div>
                </body>
            </html>
        `;
    };

    const generateExtensionHtml = (assign: Assignment, oldEndDateStr: string, newEndDateStr: string) => {
        const crew = crewMembers.find(c => c.id === assign.crewId);
        const project = projects.find(p => p.code === assign.projectCode);
        const docRef = `ADY/EXT/${assign.projectCode}/${Date.now().toString().slice(-4)}/2026`;

        return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            padding: 40px;
                            color: #1C1C1E;
                            line-height: 1.5;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px double #1C1C1E;
                            padding-bottom: 15px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 18px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            font-weight: 800;
                        }
                        .header h2 {
                            margin: 5px 0 0 0;
                            font-size: 14px;
                            font-weight: 600;
                            text-transform: uppercase;
                        }
                        .doc-number {
                            font-size: 11px;
                            color: #8E8E93;
                            margin-top: 5px;
                        }
                        .intro {
                            margin-bottom: 20px;
                            font-size: 13px;
                        }
                        .parties {
                            margin-bottom: 20px;
                            font-size: 13px;
                        }
                        .party-title {
                            font-weight: 700;
                            margin-top: 10px;
                        }
                        .party-details {
                            margin-left: 15px;
                            margin-bottom: 10px;
                        }
                        .articles {
                            margin-top: 25px;
                            font-size: 13px;
                        }
                        .article-title {
                            font-weight: 700;
                            text-transform: uppercase;
                            margin-top: 15px;
                            margin-bottom: 5px;
                        }
                        .signatures {
                            margin-top: 50px;
                            display: flex;
                            justify-content: space-between;
                            font-size: 13px;
                        }
                        .sig-block {
                            text-align: center;
                            width: 200px;
                        }
                        .sig-space {
                            height: 70px;
                        }
                        .sig-name {
                            font-weight: 700;
                            text-decoration: underline;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>SURAT ADENDUM PERPANJANGAN PERJANJIAN PENUGASAN</h1>
                        <h2>PT MAHARDIKA ADIDAYA</h2>
                        <div class="doc-number">Nomor Ref: ${docRef}</div>
                    </div>
                    <div class="intro">
                        Kedua belah pihak sepakat untuk melakukan perpanjangan jangka waktu penugasan atas surat perjanjian sebelumnya sebagai berikut:
                    </div>
                    <div class="parties">
                        <div class="party-title">PIHAK PERTAMA (Pemberi Kerja):</div>
                        <div class="party-details">
                            Nama Perusahaan: PT Mahardika Adidaya<br />
                            Perwakilan: HRD Departemen
                        </div>
                        <div class="party-title">PIHAK KEDUA (Pekerja):</div>
                        <div class="party-details">
                            Nama Lengkap: ${assign.crewName}<br />
                            Jabatan/Role: ${CREW_ROLE_LABELS[assign.crewRole] || assign.crewRole}<br />
                            ID Anggota: ${assign.crewId}
                        </div>
                    </div>
                    <div class="articles">
                        <div class="article-title">Pasal 1: Perpanjangan Jangka Waktu</div>
                        <div>
                            Bahwa jangka waktu penugasan Pihak Kedua pada proyek <strong>${project ? project.name : assign.projectCode}</strong> yang sedianya berakhir pada tanggal <strong>${formatDate(oldEndDateStr || 'Ongoing')}</strong>, kini diperpanjang sampai dengan tanggal <strong>${newEndDateStr ? formatDate(newEndDateStr) : 'Ongoing (Selesai Proyek)'}</strong>.
                        </div>
                        
                        <div class="article-title">Pasal 2: Ketentuan Lainnya</div>
                        <div>
                            Ketentuan kompensasi, upah harian, rincian pekerjaan, dan pasal-pasal lain yang diatur dalam perjanjian utama sebelumnya tetap berlaku penuh tanpa perubahan, terkecuali klausul mengenai jangka waktu sebagaimana diatur dalam Pasal 1 adendum ini.
                        </div>
                    </div>
                    <div class="signatures">
                        <div class="sig-block">
                            <div>Pihak Pertama,</div>
                            <div>PT Mahardika Adidaya</div>
                            <div class="sig-space"></div>
                            <div class="sig-name">( HRD Manager )</div>
                        </div>
                        <div class="sig-block">
                            <div>Pihak Kedua,</div>
                            <div>Pekerja</div>
                            <div class="sig-space"></div>
                            <div class="sig-name">( ${assign.crewName} )</div>
                        </div>
                    </div>
                </body>
            </html>
        `;
    };

    const handleViewContractPDF = async (targetAssign?: Assignment) => {
        const activeAssign = targetAssign || assignment;
        if (!activeAssign) return;
        if (!Print || !Sharing) {
            Alert.alert('Error', 'PDF export is not supported on this build.');
            return;
        }
        try {
            const crew = crewMembers.find(c => c.id === activeAssign.crewId);
            const project = projects.find(p => p.code === activeAssign.projectCode);
            const contractNumVal = generateContractNumber(activeAssign, assignments);

            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body {
                                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                                padding: 40px;
                                color: #1C1C1E;
                                line-height: 1.5;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 30px;
                                border-bottom: 2px double #1C1C1E;
                                padding-bottom: 15px;
                            }
                            .header h1 {
                                margin: 0;
                                font-size: 20px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                                font-weight: 800;
                            }
                            .header h2 {
                                margin: 5px 0 0 0;
                                font-size: 14px;
                                font-weight: 600;
                                text-transform: uppercase;
                            }
                            .doc-number {
                                font-size: 11px;
                                color: #8E8E93;
                                margin-top: 5px;
                            }
                            .intro {
                                margin-bottom: 20px;
                                font-size: 13px;
                            }
                            .parties {
                                margin-bottom: 20px;
                                font-size: 13px;
                            }
                            .party-title {
                                font-weight: 700;
                                margin-top: 10px;
                            }
                            .party-details {
                                margin-left: 15px;
                                margin-bottom: 10px;
                            }
                            .articles {
                                margin-top: 25px;
                                font-size: 13px;
                            }
                            .article-title {
                                font-weight: 700;
                                text-transform: uppercase;
                                margin-top: 15px;
                                margin-bottom: 5px;
                            }
                            .signatures {
                                margin-top: 50px;
                                display: flex;
                                justify-content: space-between;
                                font-size: 13px;
                            }
                            .sig-block {
                                text-align: center;
                                width: 200px;
                            }
                            .sig-space {
                                height: 70px;
                            }
                            .sig-name {
                                font-weight: 700;
                                text-decoration: underline;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>SURAT PERJANJIAN KERJA PENUGASAN</h1>
                            <h2>PT MAHARDIKA ADIDAYA</h2>
                             <div class="doc-number">Nomor: ${contractNumVal}</div>
                        </div>
                        <div class="intro">
                            Pada hari ini, telah disepakati perjanjian kerja penugasan antara pihak-pihak di bawah ini:
                        </div>
                        <div class="parties">
                            <div class="party-title">PIHAK PERTAMA (Pemberi Kerja):</div>
                            <div class="party-details">
                                Nama Perusahaan: PT Mahardika Adidaya<br />
                                Perwakilan: HRD Departemen
                            </div>
                            <div class="party-title">PIHAK KEDUA (Pekerja):</div>
                            <div class="party-details">
                                Nama Lengkap: ${activeAssign.crewName}<br />
                                Jabatan/Role: ${CREW_ROLE_LABELS[activeAssign.crewRole] || activeAssign.crewRole}<br />
                                ID Anggota: ${activeAssign.crewId}
                            </div>
                        </div>
                        <div class="intro">
                            Kedua belah pihak sepakat untuk melakukan kerja sama penugasan dengan ketentuan sebagai berikut:
                        </div>
                        <div class="articles">
                            <div class="article-title">Pasal 1: Lingkup Pekerjaan & Penempatan</div>
                            <div>Pihak Kedua ditugaskan untuk menjalankan pekerjaan sebagai <strong>${CREW_ROLE_LABELS[activeAssign.crewRole] || activeAssign.crewRole}</strong> pada proyek <strong>${project ? project.name : activeAssign.projectCode}</strong> (Kode Proyek: ${activeAssign.projectCode}).</div>
                            
                            <div class="article-title">Pasal 2: Jangka Waktu Perjanjian</div>
                            <div>Penugasan ini dimulai pada tanggal <strong>${formatDate(activeAssign.startDate)}</strong> dan berlangsung sampai dengan ${activeAssign.endDate ? `tanggal <strong>${formatDate(activeAssign.endDate)}</strong>` : '<strong>Selesai (Ongoing)</strong>'}.</div>
                            
                            <div class="article-title">Pasal 3: Kompensasi & Upah</div>
                            <div>Pihak Kedua berhak mendapatkan upah harian dengan rincian sebagai berikut:</div>
                            <ul>
                                <li>Gaji Pokok Harian: Rp ${crew ? crew.baseDailyRate.toLocaleString('id-ID') : '-'}</li>
                                <li>Gaji Lembur Hari Libur: Rp ${crew ? crew.overtimeDailyRate.toLocaleString('id-ID') : '-'}</li>
                            </ul>
                        </div>
                        <div class="signatures">
                            <div class="sig-block">
                                <div>Pihak Pertama,</div>
                                <div>PT Mahardika Adidaya</div>
                                <div class="sig-space"></div>
                                <div class="sig-name">( HRD Manager )</div>
                            </div>
                            <div class="sig-block">
                                <div>Pihak Kedua,</div>
                                <div>Pekerja</div>
                                <div class="sig-space"></div>
                                <div class="sig-name">( ${activeAssign.crewName} )</div>
                            </div>
                        </div>
                    </body>
                </html>
            `;
            const projectCodePart = (activeAssign.projectCode || 'ALL') === 'ALL' ? 'ALL' : ((activeAssign.projectCode || 'ALL').split('-')[1] || activeAssign.projectCode || 'ALL');
            const cleanName = activeAssign.crewName.replace(/\s+/g, '_');
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const filename = `${projectCodePart}_Crew_Assignment_${cleanName}_${dateStr}.pdf`;

            if (onViewDocument) {
                onViewDocument(htmlContent, filename.replace('.pdf', ''));
                return;
            }

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const customUri = `${FileSystem.cacheDirectory}${filename}`;
            
            await FileSystem.copyAsync({ from: uri, to: customUri });
            await Sharing.shareAsync(customUri, { mimeType: 'application/pdf', dialogTitle: `Contract_${cleanName}` });
        } catch (error) {
            console.error('Error generating Contract PDF:', error);
            Alert.alert('Error', 'Failed to generate assignment contract PDF.');
        }
    };

    useEffect(() => {
        if (assignment && assignment.id) {
            setSelectedCrewId(assignment.crewId);
            setSelectedProjectCode(assignment.projectCode);
            setStartDate(assignment.startDate);
            setEndDate(assignment.endDate || '');
            setStatus(assignment.status);
            setIsEditing(false);
        } else if (assignment && assignment.crewId) {
            setSelectedCrewId(assignment.crewId);
            setSelectedProjectCode(projects[0]?.code || '');
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate('');
            setStatus('ACTIVE');
            setIsEditing(true);
        } else if (preselectedCrewId) {
            setSelectedCrewId(preselectedCrewId);
            setSelectedProjectCode(projects[0]?.code || '');
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate('');
            setStatus('ACTIVE');
            setIsEditing(true);
        } else {
            setSelectedCrewId(crewMembers[0]?.id || '');
            setSelectedProjectCode(projects[0]?.code || '');
            // Default to today's date YYYY-MM-DD
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate('');
            setStatus('ACTIVE');
            setIsEditing(true);
        }
        setIsCrewDropdownOpen(false);
        setIsProjectDropdownOpen(false);
    }, [assignment, visible, crewMembers, projects, preselectedCrewId]);

    const handleSave = () => {
        if (!selectedCrewId) {
            alert('Please select a crew member.');
            return;
        }
        if (!selectedProjectCode) {
            Alert.alert('Pilih Proyek', 'Silakan pilih proyek terlebih dahulu sebelum melanjutkan.');
            return;
        }
        if (!startDate.trim()) {
            alert('Please enter a start date.');
            return;
        }

        const crew = crewMembers.find(c => c.id === selectedCrewId);
        if (!crew) {
            alert('Invalid crew member selected.');
            return;
        }

        if (showProjectTransferWarning && !projectTransferConfirmed) {
            Alert.alert('Confirmation Required', 'Please confirm the project transfer before saving.');
            return;
        }
        if (showEarlyTerminationWarning && !earlyTerminationConfirmed) {
            Alert.alert('Confirmation Required', 'Please confirm the early contract termination before saving.');
            return;
        }
        if (showExtensionWarning && !extensionConfirmed) {
            Alert.alert('Confirmation Required', 'Please confirm the contract extension before saving.');
            return;
        }

        const newAssignment: Assignment = {
            id: assignment && assignment.projectCode === selectedProjectCode ? assignment.id : `a_${Date.now()}`,
            crewId: selectedCrewId,
            crewName: crew.name,
            crewRole: crew.role,
            projectCode: selectedProjectCode,
            startDate: startDate.trim(),
            endDate: endDate.trim() ? endDate.trim() : undefined,
            status,
        };

        let newDoc: CrewDocument | undefined = undefined;
        let updatedPrevAssign: Assignment | undefined = undefined;

        if (showProjectTransferWarning && targetTransferAssignment) {
            const newStart = new Date(startDate.trim());
            const prevEnd = new Date(newStart.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            updatedPrevAssign = {
                ...targetTransferAssignment,
                endDate: prevEnd,
                status: 'COMPLETED'
            };
            const terminationHtml = generateEarlyTerminationHtml(targetTransferAssignment, targetTransferAssignment.endDate || 'Ongoing', prevEnd);
            newDoc = {
                id: `doc_term_${Date.now()}`,
                type: 'OTHER',
                label: `Early Termination Notice — ${targetTransferAssignment.projectCode}`,
                fileName: `EDY_Early_Termination_Notice_${crew.name.replace(/\s+/g, '_')}.pdf`,
                fileUrl: terminationHtml
            };
        } else if (showEarlyTerminationWarning && assignment) {
            const terminationHtml = generateEarlyTerminationHtml(assignment, assignment.endDate || 'Ongoing', endDate.trim());
            newDoc = {
                id: `doc_term_${Date.now()}`,
                type: 'OTHER',
                label: `Early Termination Notice — ${assignment.projectCode}`,
                fileName: `EDY_Early_Termination_Notice_${crew.name.replace(/\s+/g, '_')}.pdf`,
                fileUrl: terminationHtml
            };
        } else if (showExtensionWarning && assignment) {
            const extensionHtml = generateExtensionHtml(assignment, assignment.endDate || 'Ongoing', endDate.trim());
            newDoc = {
                id: `doc_ext_${Date.now()}`,
                type: 'OTHER',
                label: `Contract Extension Notice — ${assignment.projectCode}`,
                fileName: `EDY_Contract_Extension_Notice_${crew.name.replace(/\s+/g, '_')}.pdf`,
                fileUrl: extensionHtml
            };
        }

        onSave(newAssignment, updatedPrevAssign, newDoc);
    };

    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    const cardBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#FFF';

    const containerStyle = isEmbedded
        ? [s.embeddedSheet, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]
        : [s.sheet, { backgroundColor: isDark ? '#121212' : '#F2F2F7' }];

    const content = (
        <View style={containerStyle}>
            {/* Header */}
            <View style={[s.header, isEmbedded && { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[s.headerTitle, { color: textColor }]}>
                    {!isEditing 
                        ? (selectedCrew?.name || assignment?.crewName || 'Assignment Details')
                        : (assignment ? 'Edit Assignment' : 'New Assignment')
                    }
                </Text>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[s.content, isEmbedded && { paddingHorizontal: 24, paddingBottom: 60, maxWidth: 840, width: '100%', alignSelf: 'center' }]} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                            {!isEditing ? (
                                // --- DETAIL MODE ---
                                <>
                                    <Text style={[s.sectionTitle, { color: subtextColor }]}>PROJECT DETAILS</Text>
                                    <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>Current Project</Text>
                                        <View style={[s.detailDisplay, { backgroundColor: inputBg }]}>
                                            <Text style={[s.detailText, { color: textColor, fontWeight: '700' }]}>
                                                {originalProject ? `${originalProject.code} — ${originalProject.name}` : (assignment?.projectCode || '')}
                                            </Text>
                                        </View>

                                        <Text style={[s.label, { color: subtextColor, marginTop: 12 }]}>Contract Number</Text>
                                        <View style={[s.detailDisplay, { backgroundColor: inputBg }]}>
                                            <Text style={[s.detailText, { color: textColor, fontWeight: '700' }]}>
                                                {contractNumber}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>DURATION & STATUS</Text>
                                    <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
                                            <Text style={{ color: subtextColor, fontWeight: '600', fontSize: 14 }}>Start Date</Text>
                                            <Text style={{ color: textColor, fontWeight: '700', fontSize: 14 }}>{assignment?.startDate ? formatDate(assignment.startDate) : ''}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
                                            <Text style={{ color: subtextColor, fontWeight: '600', fontSize: 14 }}>End Date</Text>
                                            <Text style={{ color: textColor, fontWeight: '700', fontSize: 14 }}>{assignment?.endDate ? formatDate(assignment.endDate) : 'Present'}</Text>
                                        </View>
                                        {assignment?.endDate && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
                                                <Text style={{ color: subtextColor, fontWeight: '600', fontSize: 14 }}>Duration</Text>
                                                <Text style={{ color: textColor, fontWeight: '700', fontSize: 14 }}>{getDurationInMonths(assignment.startDate, assignment.endDate)}</Text>
                                            </View>
                                        )}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
                                            <Text style={{ color: subtextColor, fontWeight: '600', fontSize: 14 }}>Status</Text>
                                            <Text style={{ 
                                                color: status === 'ACTIVE' ? '#34C759' : status === 'COMPLETED' ? '#8E8E93' : '#FF3B30', 
                                                fontWeight: '800',
                                                fontSize: 14
                                            }}>{status}</Text>
                                        </View>
                                    </View>

                                    {/* Attachment Section */}
                                    <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>ASSIGNMENT DOCUMENT</Text>
                                    <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <TouchableOpacity
                                            style={[s.outlineBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', backgroundColor: inputBg, justifyContent: 'center' }]}
                                            onPress={() => handleViewContractPDF()}
                                            activeOpacity={0.7}
                                        >
                                            <PlatformIcon name="doc.plaintext.fill" size={14} tintColor={textColor} style={{ marginRight: 6 }} />
                                            <Text style={[s.outlineBtnText, { color: textColor, fontSize: 14, fontWeight: '700' }]}>View Document</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Project History Section */}
                                    {crewAssignments.length > 0 && (
                                        <>
                                            <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>PROJECT HISTORY & CONTRACTS</Text>
                                            <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', gap: 12 }]}>
                                                {crewAssignments.map((assign: Assignment, idx: number) => {
                                                    const proj = projects.find(p => p.code === assign.projectCode);
                                                    let statusColor = '#34C759'; // Active
                                                    if (assign.status === 'COMPLETED') statusColor = '#8E8E93';
                                                    if (assign.status === 'INACTIVE') statusColor = '#FF3B30';

                                                    return (
                                                        <View key={assign.id}>
                                                            {idx > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', marginVertical: 8 }} />}
                                                            <View style={{ gap: 2 }}>
                                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>
                                                                        {assign.projectCode}
                                                                    </Text>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                        <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: statusColor + '15' }}>
                                                                            <Text style={{ fontSize: 9, fontWeight: '800', color: statusColor }}>
                                                                                {assign.status}
                                                                            </Text>
                                                                        </View>
                                                                        <TouchableOpacity 
                                                                            style={{ padding: 4 }}
                                                                            onPress={() => handleViewContractPDF(assign)}
                                                                        >
                                                                            <PlatformIcon name="eye.fill" size={14} tintColor={subtextColor} />
                                                                        </TouchableOpacity>
                                                                    </View>
                                                                </View>
                                                                <Text style={{ fontSize: 12, color: subtextColor }}>
                                                                    {proj ? proj.name : assign.projectCode}
                                                                </Text>
                                                                <Text style={{ fontSize: 11, color: subtextColor }}>
                                                                    {`${assign.startDate} → ${assign.endDate || 'Ongoing'}`}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </>
                                    )}
                                </>
                            ) : (
                                // --- EDIT/NEW MODE ---
                                <>
                                    {/* Crew Member Selection */}
                                    <Text style={[s.sectionTitle, { color: subtextColor }]}>CREW PROFILE</Text>
                                    <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>Select Crew Member</Text>
                                        <View style={s.dropdownContainer}>
                                            {assignment || preselectedCrewId ? (
                                                <View style={[
                                                    s.dropdownTrigger,
                                                    { backgroundColor: inputBg, borderColor: inputBorder, opacity: 0.7 }
                                                ]}>
                                                    <View style={s.dropdownTriggerLeft}>
                                                        {selectedCrew && (
                                                            <>
                                                                <View style={[s.avatarSmall, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                                                    <Text style={[s.avatarSmallText, { color: textColor }]}>{selectedCrew.initials}</Text>
                                                                </View>
                                                                <Text style={[s.dropdownTriggerText, { color: textColor }]}>
                                                                    {selectedCrew.name}
                                                                </Text>
                                                            </>
                                                        )}
                                                    </View>
                                                </View>
                                            ) : (
                                                <>
                                                    <TouchableOpacity
                                                        style={[s.dropdownTrigger, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                                        onPress={() => setIsCrewDropdownOpen(!isCrewDropdownOpen)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={s.dropdownTriggerLeft}>
                                                            {selectedCrew ? (
                                                                <>
                                                                    <View style={[s.avatarSmall, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                                                        <Text style={[s.avatarSmallText, { color: textColor }]}>{selectedCrew.initials}</Text>
                                                                    </View>
                                                                    <Text style={[s.dropdownTriggerText, { color: textColor }]}>
                                                                        {selectedCrew.name}
                                                                    </Text>
                                                                </>
                                                            ) : (
                                                                <Text style={[s.dropdownTriggerText, { color: subtextColor }]}>
                                                                    Select Crew Member
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <Ionicons
                                                            name={isCrewDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                                            size={18}
                                                            color={subtextColor}
                                                        />
                                                    </TouchableOpacity>

                                                    {isCrewDropdownOpen && (
                                                        <View style={[s.dropdownList, { backgroundColor: isDark ? '#121212' : '#F2F2F7', borderColor: inputBorder }]}>
                                                            <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: 20, paddingHorizontal: 14, height: 38 }}>
                                                                    <Ionicons name="search" size={15} color={subtextColor} style={{ marginRight: 8 }} />
                                                                    <TextInput
                                                                        style={{ flex: 1, fontSize: 13, color: textColor, paddingVertical: 0 }}
                                                                        placeholder="Search crew member..."
                                                                        placeholderTextColor={subtextColor}
                                                                        value={crewSearchQuery}
                                                                        onChangeText={setCrewSearchQuery}
                                                                        autoCapitalize="none"
                                                                    />
                                                                    {crewSearchQuery ? (
                                                                        <TouchableOpacity onPress={() => setCrewSearchQuery('')}>
                                                                            <Ionicons name="close-circle" size={15} color={subtextColor} />
                                                                        </TouchableOpacity>
                                                                    ) : null}
                                                                </View>
                                                            </View>
                                                            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                                                {filteredCrewMembersForSelect.length === 0 ? (
                                                                    <Text style={{ padding: 16, textAlign: 'center', color: subtextColor, fontSize: 13 }}>No crew found</Text>
                                                                ) : (
                                                                    filteredCrewMembersForSelect.map(crew => {
                                                                        const isSelected = selectedCrewId === crew.id;
                                                                        return (
                                                                            <TouchableOpacity
                                                                                key={crew.id}
                                                                                style={[
                                                                                    s.dropdownItem,
                                                                                    isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                                                                ]}
                                                                                onPress={() => {
                                                                                    setSelectedCrewId(crew.id);
                                                                                    setIsCrewDropdownOpen(false);
                                                                                }}
                                                                            >
                                                                                <View style={s.dropdownItemLeft}>
                                                                                    <View style={[s.avatarSmall, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                                                        <Text style={[s.avatarSmallText, { color: textColor }]}>{crew.initials}</Text>
                                                                                    </View>
                                                                                    <Text style={[s.dropdownItemText, { color: textColor }, isSelected && { fontWeight: '700' }]}>
                                                                                        {crew.name}
                                                                                    </Text>
                                                                                </View>
                                                                                {isSelected && (
                                                                                    <Ionicons name="checkmark" size={18} color={textColor} />
                                                                                )}
                                                                            </TouchableOpacity>
                                                                        );
                                                                    })
                                                                )}
                                                            </ScrollView>
                                                        </View>
                                                    )}
                                                </>
                                            )}
                                        </View>

                                        {/* Current Project Info */}
                                        <Text style={[s.label, { color: subtextColor, marginTop: 12 }]}>Current Project & Assignment</Text>
                                        <View style={[s.detailDisplay, { backgroundColor: inputBg, height: 'auto', paddingVertical: 12 }]}>
                                            {assignment ? (
                                                <View style={{ gap: 2 }}>
                                                    <Text style={[s.dropdownTriggerText, { color: textColor, fontWeight: '700' }]}>
                                                        {assignment.projectCode}
                                                    </Text>
                                                    <Text style={[s.dropdownTriggerText, { color: textColor }]}>
                                                        {originalProject ? originalProject.name : ''}
                                                    </Text>
                                                    <Text style={{ color: subtextColor, fontSize: 13, fontWeight: '500' }}>
                                                        {`Duration: ${assignment.endDate ? getDurationInMonths(assignment.startDate, assignment.endDate) : 'Ongoing'}`}
                                                    </Text>
                                                </View>
                                            ) : activeAssignment ? (
                                                <View style={{ gap: 2 }}>
                                                    <Text style={[s.dropdownTriggerText, { color: textColor, fontWeight: '700' }]}>
                                                        {activeAssignment.projectCode}
                                                    </Text>
                                                    <Text style={[s.dropdownTriggerText, { color: textColor }]}>
                                                        {activeProject ? activeProject.name : ''}
                                                    </Text>
                                                    <Text style={{ color: subtextColor, fontSize: 13, fontWeight: '500' }}>
                                                        {`${activeAssignment.startDate} to ${activeAssignment.endDate || 'Ongoing'}`}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={[s.dropdownTriggerText, { color: textColor, fontWeight: '500' }]}>
                                                    None
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Project Selection & Duration */}
                                    <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>ASSIGNMENT DETAILS</Text>
                                    <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>Select Target Project</Text>
                                        <View style={s.dropdownContainer}>
                                            <TouchableOpacity
                                                style={[s.dropdownTrigger, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                                onPress={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={s.dropdownTriggerLeft}>
                                                    {selectedProject ? (
                                                        <>
                                                            <View style={[s.projectCodeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                                                <Text style={[s.projectCodeBadgeText, { color: textColor }]}>
                                                                    {selectedProject.code.split('-')[1] || selectedProject.code}
                                                                </Text>
                                                            </View>
                                                            <Text style={[s.dropdownTriggerText, { color: textColor }]} numberOfLines={1}>
                                                                {selectedProject.name}
                                                            </Text>
                                                        </>
                                                    ) : (
                                                        <Text style={[s.dropdownTriggerText, { color: subtextColor }]}>
                                                            Select Project
                                                        </Text>
                                                    )}
                                                </View>
                                                <Ionicons
                                                    name={isProjectDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                                    size={18}
                                                    color={subtextColor}
                                                />
                                            </TouchableOpacity>

                                            {isProjectDropdownOpen && (
                                                <View style={[s.dropdownList, { backgroundColor: isDark ? '#121212' : '#F2F2F7', borderColor: inputBorder }]}>
                                                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                                        {projects.map(proj => {
                                                            const isSelected = selectedProjectCode === proj.code;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={proj.code}
                                                                    style={[
                                                                        s.dropdownItem,
                                                                        isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                                                    ]}
                                                                    onPress={() => {
                                                                        setSelectedProjectCode(proj.code);
                                                                        setIsProjectDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <View style={s.dropdownItemLeft}>
                                                                        <View style={[s.projectCodeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                                            <Text style={[s.projectCodeBadgeText, { color: textColor }]}>
                                                                                {proj.code}
                                                                            </Text>
                                                                        </View>
                                                                        <Text style={[s.dropdownItemText, { color: textColor }, isSelected && { fontWeight: '700' }]} numberOfLines={1}>
                                                                            {proj.name}
                                                                        </Text>
                                                                    </View>
                                                                    {isSelected && (
                                                                        <Ionicons name="checkmark" size={18} color={textColor} />
                                                                    )}
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>

                                        <View style={[s.inputRow, { marginTop: 12 }]}>
                                            <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                                <Text style={[s.label, { color: subtextColor }]}>Start Date *</Text>
                                                <TouchableOpacity
                                                    style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, justifyContent: 'center' }]}
                                                    onPress={() => setShowStartDatePicker(true)}
                                                >
                                                    <Text style={{ color: startDate ? textColor : subtextColor, fontWeight: '500' }}>
                                                        {startDate ? formatDate(startDate) : 'Select Date'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                                <Text style={[s.label, { color: subtextColor }]}>End Date (Optional)</Text>
                                                <View style={{ position: 'relative' }}>
                                                    <TouchableOpacity
                                                        style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, justifyContent: 'center', paddingRight: endDate ? 36 : 16 }]}
                                                        onPress={() => setShowEndDatePicker(true)}
                                                    >
                                                        <Text style={{ color: endDate ? textColor : subtextColor, fontWeight: '500' }} numberOfLines={1}>
                                                            {endDate ? formatDate(endDate) : 'Ongoing'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    {endDate !== '' && (
                                                        <TouchableOpacity 
                                                            style={{ position: 'absolute', right: 12, top: 12, padding: 4 }}
                                                            onPress={() => setEndDate('')}
                                                        >
                                                            <Ionicons name="close-circle" size={16} color={subtextColor} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                        </View>

                                        {showStartDatePicker && (
                                            Platform.OS === 'ios' ? (
                                                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 8, marginTop: 12 }}>
                                                    <DateTimePicker
                                                        value={startDate && !isNaN(new Date(startDate).getTime()) ? new Date(startDate) : new Date()}
                                                        mode="date"
                                                        display="inline"
                                                        themeVariant={isDark ? 'dark' : 'light'}
                                                        onChange={(event, selectedDate) => {
                                                            if (selectedDate) {
                                                                const formatted = selectedDate.toISOString().split('T')[0];
                                                                setStartDate(formatted);
                                                            }
                                                        }}
                                                        style={{ alignSelf: 'center' }}
                                                    />
                                                    <TouchableOpacity
                                                        style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, marginTop: 4, backgroundColor: '#007AFF', borderRadius: 12 }}
                                                        onPress={() => setShowStartDatePicker(false)}
                                                    >
                                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Done</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <DateTimePicker
                                                    value={startDate && !isNaN(new Date(startDate).getTime()) ? new Date(startDate) : new Date()}
                                                    mode="date"
                                                    display="default"
                                                    onChange={(event, selectedDate) => {
                                                        setShowStartDatePicker(false);
                                                        if (selectedDate) {
                                                            const formatted = selectedDate.toISOString().split('T')[0];
                                                            setStartDate(formatted);
                                                        }
                                                    }}
                                                />
                                            )
                                        )}

                                        {showEndDatePicker && (
                                            Platform.OS === 'ios' ? (
                                                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 8, marginTop: 12 }}>
                                                    <DateTimePicker
                                                        value={endDate && !isNaN(new Date(endDate).getTime()) ? new Date(endDate) : new Date()}
                                                        mode="date"
                                                        display="inline"
                                                        themeVariant={isDark ? 'dark' : 'light'}
                                                        onChange={(event, selectedDate) => {
                                                            if (selectedDate) {
                                                                const formatted = selectedDate.toISOString().split('T')[0];
                                                                setEndDate(formatted);
                                                            }
                                                        }}
                                                        style={{ alignSelf: 'center' }}
                                                    />
                                                    <TouchableOpacity
                                                        style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, marginTop: 4, backgroundColor: '#007AFF', borderRadius: 12 }}
                                                        onPress={() => setShowEndDatePicker(false)}
                                                    >
                                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Done</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <DateTimePicker
                                                    value={endDate && !isNaN(new Date(endDate).getTime()) ? new Date(endDate) : new Date()}
                                                    mode="date"
                                                    display="default"
                                                    onChange={(event, selectedDate) => {
                                                        setShowEndDatePicker(false);
                                                        if (selectedDate) {
                                                            const formatted = selectedDate.toISOString().split('T')[0];
                                                            setEndDate(formatted);
                                                        }
                                                    }}
                                                />
                                            )
                                        )}
                                        {endDate.trim() !== '' && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: inputBorder, marginTop: 12 }}>
                                                <Text style={{ color: subtextColor, fontWeight: '600' }}>Duration</Text>
                                                <Text style={{ color: textColor, fontWeight: '700' }}>{getDurationInMonths(startDate, endDate)}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Status Selection */}
                                    <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>STATUS</Text>
                                    <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <View style={s.segmentedContainer}>
                                            {(['ACTIVE', 'COMPLETED', 'INACTIVE'] as const).map(sStatus => {
                                                const isActive = status === sStatus;
                                                let activeBgColor = '#34C759';
                                                if (sStatus === 'COMPLETED') activeBgColor = '#8E8E93';
                                                if (sStatus === 'INACTIVE') activeBgColor = '#FF3B30';

                                                return (
                                                    <TouchableOpacity
                                                        key={sStatus}
                                                        style={[
                                                            s.segmentButton,
                                                            isActive && { backgroundColor: activeBgColor }
                                                        ]}
                                                        onPress={() => setStatus(sStatus)}
                                                    >
                                                        <Text style={[s.segmentText, { color: isActive ? '#FFF' : textColor, fontWeight: isActive ? '700' : '400' }]}>
                                                            {sStatus}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Warnings Section */}
                                    {showProjectTransferWarning && targetTransferAssignment && (
                                        <View style={[s.warningBanner, { backgroundColor: isDark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.08)', borderColor: '#FF9500' }]}>
                                            <Ionicons name="warning" size={18} color="#FF9500" />
                                            <View style={{ flex: 1, marginLeft: 8 }}>
                                                <Text style={{ color: textColor, fontSize: 13, fontWeight: '700' }}>Project Transfer Required</Text>
                                                <Text style={{ color: subtextColor, fontSize: 12, marginTop: 2 }}>
                                                    This crew member has an active assignment on project {targetTransferAssignment.projectCode}. Saving will complete the previous assignment and transfer them to {selectedProjectCode}.
                                                </Text>
                                                <TouchableOpacity 
                                                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }} 
                                                    onPress={() => setProjectTransferConfirmed(!projectTransferConfirmed)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[s.checkbox, { borderColor: '#FF9500', backgroundColor: projectTransferConfirmed ? '#FF9500' : 'transparent' }]}>
                                                        {projectTransferConfirmed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                                    </View>
                                                    <Text style={{ color: textColor, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                                                        Proceed with project transfer
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {showEarlyTerminationWarning && (
                                        <View style={[s.warningBanner, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.08)', borderColor: '#FF3B30' }]}>
                                            <Ionicons name="alert-circle" size={18} color="#FF3B30" />
                                            <View style={{ flex: 1, marginLeft: 8 }}>
                                                <Text style={{ color: textColor, fontSize: 13, fontWeight: '700' }}>Early Termination Notice</Text>
                                                <Text style={{ color: subtextColor, fontSize: 12, marginTop: 2 }}>
                                                    The selected end date is earlier than the established contract duration. Proceed to early termination of contract?
                                                </Text>
                                                <TouchableOpacity 
                                                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }} 
                                                    onPress={() => setEarlyTerminationConfirmed(!earlyTerminationConfirmed)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[s.checkbox, { borderColor: '#FF3B30', backgroundColor: earlyTerminationConfirmed ? '#FF3B30' : 'transparent' }]}>
                                                        {earlyTerminationConfirmed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                                    </View>
                                                    <Text style={{ color: textColor, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                                                        Proceed to early termination of contract
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {showExtensionWarning && (
                                        <View style={[s.warningBanner, { backgroundColor: isDark ? 'rgba(175,82,222,0.15)' : 'rgba(175,82,222,0.08)', borderColor: '#007AFF' }]}>
                                            <Ionicons name="information-circle" size={18} color="#007AFF" />
                                            <View style={{ flex: 1, marginLeft: 8 }}>
                                                <Text style={{ color: textColor, fontSize: 13, fontWeight: '700' }}>Contract Extension Notice</Text>
                                                <Text style={{ color: subtextColor, fontSize: 12, marginTop: 2 }}>
                                                    Proceed to contract extension? This will update the duration of the current contract.
                                                </Text>
                                                <TouchableOpacity 
                                                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }} 
                                                    onPress={() => setExtensionConfirmed(!extensionConfirmed)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[s.checkbox, { borderColor: '#007AFF', backgroundColor: extensionConfirmed ? '#007AFF' : 'transparent' }]}>
                                                        {extensionConfirmed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                                    </View>
                                                    <Text style={{ color: textColor, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                                                        Proceed to contract extension
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>

                        {/* Footer Actions */}
                        <View style={s.footer}>
                            {!isEditing ? (
                                <>
                                    <TouchableOpacity
                                        style={[s.footerButton, s.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                        onPress={onClose}
                                    >
                                        <Text style={[s.footerBtnText, { color: isDark ? '#FFF' : '#333' }]}>Close</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.footerButton, s.confirmButton]}
                                        onPress={() => setIsEditing(true)}
                                    >
                                        <Text style={[s.footerBtnText, { color: '#FFF' }]}>Edit Assignment</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    {assignment && onDelete && (
                                        <TouchableOpacity
                                            style={[s.footerButton, s.deleteButton, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.06)', borderColor: 'rgba(255,59,48,0.2)', borderWidth: 1 }]}
                                            onPress={() => {
                                                Alert.alert(
                                                    'Delete Assignment',
                                                    `Are you sure you want to delete the assignment for ${selectedCrew?.name || assignment.crewName}? This action cannot be undone.`,
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Delete',
                                                            style: 'destructive',
                                                            onPress: () => onDelete(assignment.id)
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[s.footerButton, s.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                        onPress={() => {
                                            if (assignment) {
                                                setSelectedCrewId(assignment.crewId);
                                                setSelectedProjectCode(assignment.projectCode);
                                                setStartDate(assignment.startDate);
                                                setEndDate(assignment.endDate || '');
                                                setStatus(assignment.status);
                                                setIsEditing(false);
                                            } else {
                                                onClose();
                                            }
                                        }}
                                    >
                                        <Text style={[s.footerBtnText, { color: isDark ? '#FFF' : '#333' }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.footerButton, s.confirmButton]}
                                        onPress={handleSave}
                                    >
                                        <Text style={[s.footerBtnText, { color: '#FFF' }]}>Save</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
        </View>
    );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                {content}
            </View>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose} statusBarTranslucent={true}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={s.overlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                    {content}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    embeddedSheet: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.90,
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    avatarSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSmallText: {
        fontSize: 10,
        fontWeight: '800',
    },
    dropdownContainer: {
        marginBottom: 8,
    },
    dropdownTrigger: {
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    dropdownTriggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dropdownTriggerText: {
        fontSize: 15,
        fontWeight: '600',
    },
    dropdownList: {
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 8,
        overflow: 'hidden',
    },
    dropdownItem: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    dropdownItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dropdownItemText: {
        fontSize: 15,
        fontWeight: '500',
    },
    projectCodeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    projectCodeBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        fontSize: 15,
        fontWeight: '500',
        borderWidth: 1,
        justifyContent: 'center',
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(120, 120, 128, 0.12)',
        borderRadius: 24,
        padding: 2,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    segmentText: {
        fontSize: 13,
    },
    warningBanner: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 16,
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    outlineBtn: {
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    outlineBtnText: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 10,
    },
    detailDisplay: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    detailText: {
        fontSize: 15,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        gap: 12,
    },
    footerButton: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    cancelButton: {
        flex: 1,
    },
    confirmButton: {
        flex: 1.5,
        backgroundColor: '#8B5CF6',
    },
    deleteButton: {
        width: 48,
        marginRight: 4,
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});

