import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { 
    Host,
    Form, 
    Section, 
    Button, 
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Picker, 
    DateTimePicker,
    Switch,
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, disabled } from '@expo/ui/swift-ui/modifiers';
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

interface SwiftUICrewAssignmentSheetProps {
    isOpened: boolean;
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
}

export const SwiftUICrewAssignmentSheet: React.FC<SwiftUICrewAssignmentSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    onDelete,
    assignment,
    preselectedCrewId,
    crewMembers,
    projects,
    assignments,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#0A84FF' : '#1C1C1E')];

    const [isEditing, setIsEditing] = useState(false);
    const [crewIndex, setCrewIndex] = useState(0);
    const [projectIndex, setProjectIndex] = useState(0);
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [hasEndDate, setHasEndDate] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0); // 0 = ACTIVE

    const [projectTransferConfirmed, setProjectTransferConfirmed] = useState(false);
    const [earlyTerminationConfirmed, setEarlyTerminationConfirmed] = useState(false);
    const [extensionConfirmed, setExtensionConfirmed] = useState(false);

    const statusOptions = ['ACTIVE', 'COMPLETED', 'INACTIVE'];

    const formatDate = (dateInput: string | Date | undefined) => {
        if (!dateInput) return '';
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const getDurationInMonths = (startInput: string | Date, endInput: string | Date | undefined) => {
        if (!endInput) return '';
        const start = typeof startInput === 'string' ? new Date(startInput) : startInput;
        const end = typeof endInput === 'string' ? new Date(endInput) : endInput;
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

    const contractNumber = assignment ? generateContractNumber(assignment, assignments) : '';

    const handleViewContractPDF = async () => {
        if (!assignment) return;
        if (!Print || !Sharing) {
            Alert.alert('Error', 'PDF export is not supported on this build.');
            return;
        }
        try {
            const crew = crewMembers.find(c => c.id === assignment.crewId);
            const project = projects.find(p => p.code === assignment.projectCode);

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
                            <div class="doc-number">Nomor: ${contractNumber}</div>
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
                                Nama Lengkap: ${assignment.crewName}<br />
                                Jabatan/Role: ${CREW_ROLE_LABELS[assignment.crewRole] || assignment.crewRole}<br />
                                ID Anggota: ${assignment.crewId}
                            </div>
                        </div>
                        <div class="intro">
                            Kedua belah pihak sepakat untuk melakukan kerja sama penugasan dengan ketentuan sebagai berikut:
                        </div>
                        <div class="articles">
                            <div class="article-title">Pasal 1: Lingkup Pekerjaan & Penempatan</div>
                            <div>Pihak Kedua ditugaskan untuk menjalankan pekerjaan sebagai <strong>${CREW_ROLE_LABELS[assignment.crewRole] || assignment.crewRole}</strong> pada proyek <strong>${project ? project.name : assignment.projectCode}</strong> (Kode Proyek: ${assignment.projectCode}).</div>
                            
                            <div class="article-title">Pasal 2: Jangka Waktu Perjanjian</div>
                            <div>Penugasan ini dimulai pada tanggal <strong>${formatDate(assignment.startDate)}</strong> dan berlangsung sampai dengan ${assignment.endDate ? `tanggal <strong>${formatDate(assignment.endDate)}</strong>` : '<strong>Selesai (Ongoing)</strong>'}.</div>
                            
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
                                <div class="sig-name">( ${assignment.crewName} )</div>
                            </div>
                        </div>
                    </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Contract_${assignment.crewName.replace(/\s+/g, '_')}_PDF` });
        } catch (error) {
            console.error('Error generating Contract PDF:', error);
            Alert.alert('Error', 'Failed to generate assignment contract PDF.');
        }
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

    useEffect(() => {
        if (isOpened) {
            setProjectTransferConfirmed(false);
            setEarlyTerminationConfirmed(false);
            setExtensionConfirmed(false);
            if (assignment) {
                const cIdx = crewMembers.findIndex(c => c.id === assignment.crewId);
                setCrewIndex(cIdx >= 0 ? cIdx : 0);

                const pIdx = projects.findIndex(p => p.code === assignment.projectCode);
                setProjectIndex(pIdx >= 0 ? pIdx : 0);

                setStartDate(assignment.startDate ? new Date(assignment.startDate) : new Date());
                if (assignment.endDate) {
                    setEndDate(new Date(assignment.endDate));
                    setHasEndDate(true);
                } else {
                    setEndDate(new Date());
                    setHasEndDate(false);
                }

                const sIdx = statusOptions.indexOf(assignment.status);
                setStatusIndex(sIdx >= 0 ? sIdx : 0);
                setIsEditing(false);
            } else if (preselectedCrewId) {
                const cIdx = crewMembers.findIndex(c => c.id === preselectedCrewId);
                setCrewIndex(cIdx >= 0 ? cIdx : 0);
                setProjectIndex(0);
                setStartDate(new Date());
                setEndDate(new Date());
                setHasEndDate(false);
                setStatusIndex(0);
                setIsEditing(true);
            } else {
                setCrewIndex(0);
                setProjectIndex(0);
                setStartDate(new Date());
                setEndDate(new Date());
                setHasEndDate(false);
                setStatusIndex(0);
                setIsEditing(true);
            }
        }
    }, [assignment, isOpened, crewMembers, projects, preselectedCrewId]);

    const handleSave = () => {
        const crew = crewMembers[crewIndex];
        const proj = projects[projectIndex];

        if (!crew) {
            Alert.alert('Error', 'Please select a crew member.');
            return;
        }
        if (!proj) {
            Alert.alert('Pilih Proyek', 'Silakan pilih proyek terlebih dahulu sebelum melanjutkan.');
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

        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = hasEndDate ? endDate.toISOString().split('T')[0] : undefined;

        const newAssignment: Assignment = {
            id: assignment && assignment.projectCode === proj.code ? assignment.id : `a_${Date.now()}`,
            crewId: crew.id,
            crewName: crew.name,
            crewRole: crew.role,
            projectCode: proj.code,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            status: statusOptions[statusIndex] as 'ACTIVE' | 'COMPLETED' | 'INACTIVE',
        };

        let newDoc: CrewDocument | undefined = undefined;
        let updatedPrevAssign: Assignment | undefined = undefined;

        if (showProjectTransferWarning && targetTransferAssignment) {
            const newStart = new Date(formattedStartDate);
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
            const formattedOldEnd = assignment.endDate || 'Ongoing';
            const terminationHtml = generateEarlyTerminationHtml(assignment, formattedOldEnd, formattedEndDate || '');
            newDoc = {
                id: `doc_term_${Date.now()}`,
                type: 'OTHER',
                label: `Early Termination Notice — ${assignment.projectCode}`,
                fileName: `EDY_Early_Termination_Notice_${crew.name.replace(/\s+/g, '_')}.pdf`,
                fileUrl: terminationHtml
            };
        } else if (showExtensionWarning && assignment) {
            const formattedOldEnd = assignment.endDate || 'Ongoing';
            const extensionHtml = generateExtensionHtml(assignment, formattedOldEnd, formattedEndDate || '');
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

    const crewOptions = crewMembers.map(c => c.name);
    const projectOptions = projects.map(p => `${p.code} - ${p.name}`);

    const selectedCrew = crewMembers[crewIndex];
    const activeAssignment = selectedCrew
        ? assignments.find(a => a.crewId === selectedCrew.id && a.status === 'ACTIVE' && a.id !== (assignment?.id || ''))
        : null;
    const activeProject = activeAssignment
        ? projects.find(p => p.code === activeAssignment.projectCode)
        : null;

    const selectedProject = projects[projectIndex];

    const originalProject = useMemo(() => {
        const code = assignment ? assignment.projectCode : (activeAssignment ? activeAssignment.projectCode : '');
        return projects.find(p => p.code === code);
    }, [assignment, activeAssignment, projects]);

    const targetTransferAssignment = useMemo(() => {
        if (assignment && assignment.id && assignment.projectCode !== selectedProject?.code) {
            return assignment;
        }
        return activeAssignment;
    }, [assignment, selectedProject, activeAssignment]);

    const showProjectTransferWarning = useMemo(() => {
        if (assignment && assignment.id) {
            return assignment.projectCode !== selectedProject?.code;
        }
        return !!activeAssignment;
    }, [assignment, selectedProject, activeAssignment]);

    const showEarlyTerminationWarning = useMemo(() => {
        if (!assignment || !assignment.id) return false;
        if (assignment.projectCode !== selectedProject?.code) return false;
        const formattedEndDate = hasEndDate ? endDate.toISOString().split('T')[0] : '';
        if (!assignment.endDate && formattedEndDate.trim()) return true;
        if (assignment.endDate && formattedEndDate.trim() && formattedEndDate.trim() < assignment.endDate) return true;
        return false;
    }, [assignment, selectedProject, endDate, hasEndDate]);

    const showExtensionWarning = useMemo(() => {
        if (!assignment || !assignment.id) return false;
        if (assignment.projectCode !== selectedProject?.code) return false;
        const formattedEndDate = hasEndDate ? endDate.toISOString().split('T')[0] : '';
        if (assignment.endDate && !formattedEndDate.trim()) return true;
        if (assignment.endDate && formattedEndDate.trim() && formattedEndDate.trim() > assignment.endDate) return true;
        return false;
    }, [assignment, selectedProject, endDate, hasEndDate]);

    const getStatusColor = (idx: number) => {
        if (idx === 0) return '#34C759'; // ACTIVE - Green
        if (idx === 1) return '#8E8E93'; // COMPLETED - Grey
        return '#FF3B30'; // INACTIVE - Red
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet 
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) {
                        onClose();
                    }
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {!isEditing 
                                ? (selectedCrew?.name || assignment?.crewName || 'Assignment Details')
                                : (assignment ? 'Edit Assignment' : 'New Assignment')
                            }
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form */}
                    <Form modifiers={[background(sheetBg)]}>
                        {!isEditing ? (
                            // --- DETAIL MODE ---
                            <>
                                <Section title="Current Project">
                                    <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>Project</SwiftUIText>
                                        <SwiftUIText size={16} weight="semibold" color={textColor}>
                                            {selectedProject ? `${selectedProject.code} - ${selectedProject.name}` : (assignment?.projectCode || '')}
                                        </SwiftUIText>
                                    </VStack>
                                </Section>

                                <Section title="Contract Number">
                                    <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText size={16} weight="semibold" color={textColor}>
                                            {contractNumber}
                                        </SwiftUIText>
                                    </VStack>
                                </Section>

                                <Section title="Duration & Timeline">
                                    <HStack modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText color={subtextColor}>Start Date</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>
                                            {assignment?.startDate ? formatDate(assignment.startDate) : ''}
                                        </SwiftUIText>
                                    </HStack>
                                    <HStack modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText color={subtextColor}>End Date</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>
                                            {assignment?.endDate ? formatDate(assignment.endDate) : 'Present'}
                                        </SwiftUIText>
                                    </HStack>
                                    {assignment?.endDate && (
                                        <HStack modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText color={subtextColor}>Duration</SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText color={textColor}>
                                                {getDurationInMonths(assignment.startDate, assignment.endDate)}
                                            </SwiftUIText>
                                        </HStack>
                                    )}
                                </Section>

                                <Section title="Assignment Status">
                                    <HStack modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={getStatusColor(statusIndex)} weight="bold">
                                            {statusOptions[statusIndex]}
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                {/* Crew Assignment Document – hidden on iOS (WebView not supported yet) */}
                                {/* <Section title="Crew Assignment Document">
                                    <Button
                                        variant="glass"
                                        color="gray"
                                        onPress={handleViewContractPDF}
                                        modifiers={[frame({ maxWidth: Infinity })]}
                                    >
                                        <HStack>
                                            <PlatformIcon name="doc.text.fill" size={18} tintColor={Colors[resolvedTheme].tint} />
                                            <SwiftUIText color={textColor} modifiers={[padding({ leading: 8 })]}>View Assignment Contract.pdf</SwiftUIText>
                                            <Spacer />
                                            <PlatformIcon name="arrow.up.right" size={14} tintColor={subtextColor} />
                                        </HStack>
                                    </Button>
                                </Section> */}

                            </>
                        ) : (
                            // --- EDIT/NEW MODE ---
                            <>
                                <Section title="Crew Member Selection">
                                    {assignment || preselectedCrewId ? (
                                        <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText size={13} color={subtextColor}>Crew Member</SwiftUIText>
                                            <SwiftUIText size={16} weight="semibold" color={textColor}>
                                                {selectedCrew?.name || (assignment ? assignment.crewName : '')}
                                            </SwiftUIText>
                                        </VStack>
                                    ) : (
                                        <Picker
                                            label="Crew Member"
                                            options={crewOptions}
                                            selectedIndex={crewIndex}
                                            onOptionSelected={(e) => setCrewIndex(e.nativeEvent.index)}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={menuControlModifiers}
                                        />
                                    )}

                                    {assignment && (
                                        <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText size={13} color={subtextColor}>Current Project</SwiftUIText>
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText size={15} color={textColor}>
                                                    {assignment.projectCode}
                                                </SwiftUIText>
                                                <SwiftUIText size={15} color={textColor}>
                                                    {originalProject ? originalProject.name : ''}
                                                </SwiftUIText>
                                                <SwiftUIText size={13} color={subtextColor}>
                                                    {`Duration: ${assignment.endDate ? getDurationInMonths(assignment.startDate, assignment.endDate) : 'Ongoing'}`}
                                                </SwiftUIText>
                                            </VStack>
                                        </VStack>
                                    )}

                                    {!assignment && activeAssignment && (
                                        <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText size={13} color={subtextColor}>Current Project</SwiftUIText>
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText size={15} color={textColor}>
                                                    {activeAssignment.projectCode}
                                                </SwiftUIText>
                                                <SwiftUIText size={15} color={textColor}>
                                                    {activeProject ? activeProject.name : ''}
                                                </SwiftUIText>
                                                <SwiftUIText size={13} color={subtextColor}>
                                                    {`${activeAssignment.startDate} to ${activeAssignment.endDate || 'Ongoing'}`}
                                                </SwiftUIText>
                                            </VStack>
                                        </VStack>
                                    )}
                                    {!assignment && !activeAssignment && (
                                        <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText size={13} color={subtextColor}>Current Project</SwiftUIText>
                                            <SwiftUIText size={16} color={textColor}>None</SwiftUIText>
                                        </VStack>
                                    )}
                                </Section>

                                <Section title="Project Assignment">
                                    <Picker
                                        label="Project"
                                        options={projectOptions}
                                        selectedIndex={projectIndex}
                                        onOptionSelected={(e) => setProjectIndex(e.nativeEvent.index)}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                </Section>

                                <Section title="Duration & Timeline">
                                    <DateTimePicker
                                        title="Start Date"
                                        initialDate={startDate.toISOString()}
                                        onDateSelected={(date) => setStartDate(date)}
                                        variant="compact"
                                        displayedComponents="date"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                    <Switch
                                        label="Set End Date"
                                        value={hasEndDate}
                                        onValueChange={setHasEndDate}
                                        color="#AF52DE"
                                    />
                                    {hasEndDate && (
                                        <>
                                            <DateTimePicker
                                                title="End Date"
                                                initialDate={endDate.toISOString()}
                                                onDateSelected={(date) => setEndDate(date)}
                                                variant="compact"
                                                displayedComponents="date"
                                                color={nativeControlTextColor}
                                                modifiers={menuControlModifiers}
                                            />
                                            <HStack modifiers={[padding({ vertical: 6 })]}>
                                                <SwiftUIText color={subtextColor}>Duration</SwiftUIText>
                                                <Spacer />
                                                <SwiftUIText color={textColor}>
                                                    {getDurationInMonths(startDate, endDate)}
                                                </SwiftUIText>
                                            </HStack>
                                        </>
                                    )}
                                </Section>

                                <Section title="Assignment Status">
                                    <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>Status</SwiftUIText>
                                        <Picker
                                            options={statusOptions}
                                            selectedIndex={statusIndex}
                                            onOptionSelected={(e) => setStatusIndex(e.nativeEvent.index)}
                                            variant="segmented"
                                            modifiers={[
                                                tint(getStatusColor(statusIndex))
                                            ]}
                                        />
                                    </VStack>
                                </Section>

                                {/* Warnings Section */}
                                {showProjectTransferWarning && targetTransferAssignment && (
                                    <Section title="Project Transfer Required">
                                        <VStack spacing={8} alignment="leading" modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText size={14} color="#FF9500" weight="semibold">
                                                {`Active assignment on project ${targetTransferAssignment.projectCode} will be completed early.`}
                                            </SwiftUIText>
                                            <Switch
                                                label="Proceed with project transfer"
                                                value={projectTransferConfirmed}
                                                onValueChange={setProjectTransferConfirmed}
                                                color="#FF9500"
                                            />
                                        </VStack>
                                    </Section>
                                )}

                                {showEarlyTerminationWarning && (
                                    <Section title="Early Termination Notice">
                                        <VStack spacing={8} alignment="leading" modifiers={[padding({ vertical: 6 })]}>
                                            <SwiftUIText size={14} color="#FF3B30" weight="semibold">
                                                The selected end date is earlier than the established contract duration.
                                            </SwiftUIText>
                                            <Switch
                                                label="Proceed to early termination"
                                                value={earlyTerminationConfirmed}
                                                onValueChange={setEarlyTerminationConfirmed}
                                                color="#FF3B30"
                                            />
                                        </VStack>
                                    </Section>
                                )}
                            </>
                        )}
                    </Form>

                    {/* Footer buttons */}
                    <VStack spacing={12} modifiers={[
                        background(sheetBg),
                        padding({ top: 12, leading: 20, trailing: 20, bottom: Platform.OS === 'ios' ? 36 : 24 }),
                        frame({ maxWidth: Infinity })
                    ]}>
                        <HStack spacing={12}>
                            {!isEditing ? (
                                <>
                                    <Button
                                        variant="glass"
                                        color="gray"
                                        onPress={onClose}
                                        modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            cornerRadius(999)
                                        ]}
                                    >
                                        <HStack modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            frame({ height: 44 })
                                        ]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={17}>Close</SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                    <Button
                                        variant="borderedProminent"
                                        color="#007AFF"
                                        onPress={() => setIsEditing(true)}
                                        modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            cornerRadius(999)
                                        ]}
                                    >
                                        <HStack modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            frame({ height: 44 })
                                        ]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                                Edit Assignment
                                            </SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {assignment && onDelete && (
                                        <Button
                                            variant="glass"
                                            color="red"
                                            systemImage="trash"
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
                                            modifiers={[
                                                frame({ width: 44, height: 44 }),
                                                cornerRadius(22)
                                            ]}
                                        />
                                    )}
                                    <Button
                                        variant="glass"
                                        color="gray"
                                        onPress={() => {
                                            if (assignment) {
                                                // Reset to original values
                                                const cIdx = crewMembers.findIndex(c => c.id === assignment.crewId);
                                                setCrewIndex(cIdx >= 0 ? cIdx : 0);

                                                const pIdx = projects.findIndex(p => p.code === assignment.projectCode);
                                                setProjectIndex(pIdx >= 0 ? pIdx : 0);

                                                setStartDate(assignment.startDate ? new Date(assignment.startDate) : new Date());
                                                if (assignment.endDate) {
                                                    setEndDate(new Date(assignment.endDate));
                                                    setHasEndDate(true);
                                                } else {
                                                    setEndDate(new Date());
                                                    setHasEndDate(false);
                                                }

                                                const sIdx = statusOptions.indexOf(assignment.status);
                                                setStatusIndex(sIdx >= 0 ? sIdx : 0);
                                                setIsEditing(false);
                                            } else {
                                                onClose();
                                            }
                                        }}
                                        modifiers={[
                                            frame({ width: 100 }),
                                            cornerRadius(999)
                                        ]}
                                    >
                                        <HStack modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            frame({ height: 44 })
                                        ]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={17}>Cancel</SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                    <Button
                                        variant="borderedProminent"
                                        color="#007AFF"
                                        onPress={handleSave}
                                        modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            cornerRadius(999)
                                        ]}
                                    >
                                        <HStack modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            frame({ height: 44 })
                                        ]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                                Save Assignment
                                            </SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                </>
                            )}
                        </HStack>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
