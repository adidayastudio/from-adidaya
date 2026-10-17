import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReportsGeneralSettings {
    timezone: string;
    language: 'English' | 'Bahasa Indonesia' | 'System Default';
    dateFormat: '13 Sep 2026' | '13/09/2026' | '09/13/2026' | '2026-09-13';
    timeFormat: '24-hour' | '12-hour';
    firstDayOfWeek: 'Monday' | 'Sunday' | 'Saturday';
    defaultExportFormat: 'PDF' | 'Excel (.xlsx)' | 'Word (.docx)';
    defaultPaperSize: 'A4' | 'Letter' | 'Legal' | 'A3';
    pageOrientation: 'Auto' | 'Portrait' | 'Landscape';
    recordRetention: '1 Year' | '3 Years' | '5 Years' | '7 Years' | '10 Years' | 'Never Delete';
}

export const DEFAULT_REPORTS_GENERAL_SETTINGS: ReportsGeneralSettings = {
    timezone: 'Asia/Jakarta (WIB)',
    language: 'English',
    dateFormat: '13 Sep 2026',
    timeFormat: '24-hour',
    firstDayOfWeek: 'Monday',
    defaultExportFormat: 'PDF',
    defaultPaperSize: 'A4',
    pageOrientation: 'Auto',
    recordRetention: '3 Years',
};

export type NumberingScope = 'per_report_type' | 'workspace_wide';
export type SequenceReset = 'never' | 'annually' | 'monthly' | 'daily';
export type RevisionNumbering = 'off' | 'numeric' | 'alphabetic' | 'version';

export interface ReportsDocumentRulesSettings {
    numberingScope: NumberingScope;
    codeTemplate: string;
    sequenceLength: number; // 3, 4, 5, 6
    startingNumber: number;
    sequenceReset: SequenceReset;
    filenameTemplate: string;
    revisionNumbering: RevisionNumbering;
    revisionSequence: number;
}

export const DEFAULT_REPORTS_DOCUMENT_RULES: ReportsDocumentRulesSettings = {
    numberingScope: 'per_report_type',
    codeTemplate: '[REPORT]-[TENANT]-[YY]-[SEQ]',
    sequenceLength: 4,
    startingNumber: 1,
    sequenceReset: 'annually',
    filenameTemplate: '[REPORT_NAME]_[PERIOD]_[DOC_NO]',
    revisionNumbering: 'off',
    revisionSequence: 0,
};

// Available token chips for Code Template
export const CODE_TEMPLATE_TOKENS = [
    { token: '[REPORT]', label: 'Report Code (e.g. MNT)', example: 'MNT' },
    { token: '[TENANT]', label: 'Tenant/Workspace Code', example: 'JCL' },
    { token: '[PROJECT]', label: 'Project Code', example: 'PRJ' },
    { token: '[DEPT]', label: 'Department Code', example: 'ENG' },
    { token: '[YYYY]', label: '4-Digit Year (2026)', example: '2026' },
    { token: '[YY]', label: '2-Digit Year (26)', example: '26' },
    { token: '[MM]', label: '2-Digit Month (09)', example: '09' },
    { token: '[DD]', label: '2-Digit Day (13)', example: '13' },
    { token: '[SEQ]', label: 'Sequential Number', example: '0003' },
    { token: '[REV]', label: 'Revision Number', example: 'R1' },
];

// Available token chips for Filename Template
export const FILENAME_TEMPLATE_TOKENS = [
    { token: '[REPORT_NAME]', label: 'Report Name', example: 'Maintenance' },
    { token: '[PERIOD]', label: 'Period (e.g. Sep-2026)', example: 'Sep-2026' },
    { token: '[DOC_NO]', label: 'Document Code Number', example: 'MNT-JCL-26-0003' },
    { token: '[DATE]', label: 'Generation Date', example: '20260913' },
    { token: '[TENANT]', label: 'Tenant Code', example: 'JCL' },
    { token: '[PROJECT]', label: 'Project Code', example: 'Precision' },
];

// Helper to generate live code preview
export function generateReportDocCodePreview(
    rules: ReportsDocumentRulesSettings,
    reportCode = 'MNT',
    tenantCode = 'JCL',
    projectCode = 'PRJ',
    deptCode = 'ENG'
): string {
    const seqNum = rules.startingNumber > 1 ? rules.startingNumber + 2 : 3;
    const seqStr = String(seqNum).padStart(rules.sequenceLength || 4, '0');
    
    let result = rules.codeTemplate || '[REPORT]-[TENANT]-[YY]-[SEQ]';
    result = result.replace(/\[REPORT\]/g, reportCode);
    result = result.replace(/\[TENANT\]/g, tenantCode);
    result = result.replace(/\[PROJECT\]/g, projectCode);
    result = result.replace(/\[DEPT\]/g, deptCode);
    result = result.replace(/\[YYYY\]/g, '2026');
    result = result.replace(/\[YY\]/g, '26');
    result = result.replace(/\[MM\]/g, '09');
    result = result.replace(/\[DD\]/g, '13');
    result = result.replace(/\[SEQ\]/g, seqStr);

    let revSuffix = '';
    if (rules.revisionNumbering === 'numeric') {
        revSuffix = '-R1';
    } else if (rules.revisionNumbering === 'alphabetic') {
        revSuffix = '-Rev A';
    } else if (rules.revisionNumbering === 'version') {
        revSuffix = '-v1.0';
    }

    if (result.includes('[REV]')) {
        result = result.replace(/\[REV\]/g, revSuffix.replace(/^-/, ''));
    } else if (rules.revisionNumbering !== 'off') {
        result = result + revSuffix;
    }

    return result;
}

// Helper to generate live filename preview
export function generateReportFilenamePreview(
    rules: ReportsDocumentRulesSettings,
    generalSettings?: ReportsGeneralSettings,
    reportName = 'Maintenance',
    period = 'Sep-2026',
    docCode?: string
): string {
    const activeDocCode = docCode || generateReportDocCodePreview(rules);
    let result = rules.filenameTemplate || '[REPORT_NAME]_[PERIOD]_[DOC_NO]';
    result = result.replace(/\[REPORT_NAME\]/g, reportName);
    result = result.replace(/\[PERIOD\]/g, period);
    result = result.replace(/\[DOC_NO\]/g, activeDocCode);
    result = result.replace(/\[DATE\]/g, '20260913');
    result = result.replace(/\[TENANT\]/g, 'JCL');
    result = result.replace(/\[PROJECT\]/g, 'Precision');

    const ext = generalSettings?.defaultExportFormat === 'Excel (.xlsx)' 
        ? '.xlsx' 
        : generalSettings?.defaultExportFormat === 'Word (.docx)'
        ? '.docx'
        : '.pdf';

    return result + ext;
}

const GENERAL_STORAGE_KEY = '@forma_reports_general_settings';
const DOC_RULES_STORAGE_KEY = '@forma_reports_doc_rules_settings';

export async function getReportsGeneralSettings(): Promise<ReportsGeneralSettings> {
    try {
        const raw = await AsyncStorage.getItem(GENERAL_STORAGE_KEY);
        if (raw) return { ...DEFAULT_REPORTS_GENERAL_SETTINGS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_REPORTS_GENERAL_SETTINGS;
}

export async function saveReportsGeneralSettings(settings: ReportsGeneralSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(GENERAL_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
}

export async function getReportsDocumentRules(): Promise<ReportsDocumentRulesSettings> {
    try {
        const raw = await AsyncStorage.getItem(DOC_RULES_STORAGE_KEY);
        if (raw) return { ...DEFAULT_REPORTS_DOCUMENT_RULES, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_REPORTS_DOCUMENT_RULES;
}

export async function saveReportsDocumentRules(rules: ReportsDocumentRulesSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(DOC_RULES_STORAGE_KEY, JSON.stringify(rules));
    } catch {}
}
