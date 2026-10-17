/**
 * Forma Universal File Preview Strategy & Registry
 * Multi-tenant, industry-agnostic file preview resolution and type registry.
 */

export type FilePreviewStrategy =
    | 'image'
    | 'video'
    | 'audio'
    | 'pdf'
    | 'text'
    | 'markdown'
    | 'table'
    | 'structured-data'
    | 'converted-pdf'
    | 'external'
    | 'unsupported';

export type OfficeConversionStatus =
    | 'not_generated'
    | 'queued'
    | 'processing'
    | 'ready'
    | 'failed';

export interface FilePreviewItem {
    id?: string;
    name?: string;
    title?: string;
    fileName?: string;
    size?: string;
    mimeType?: string;
    url?: string;
    uri?: string;
    thumbnails?: string[];
    activeIndex?: number;
    uploadedBy?: string;
    sender?: string;
    time?: string;
    date?: string;
    dateLabel?: string;
    isSheetDrawing?: boolean;
    previewUrl?: string;
    conversionStatus?: OfficeConversionStatus;
    subtitle?: string;
    type?: string;
    duration?: string;
    gallery?: Array<{
        id?: string;
        title?: string;
        name?: string;
        type?: 'image' | 'video' | string;
        uri?: string;
        url?: string;
        duration?: string;
        uploadedBy?: string;
        time?: string;
        size?: string;
    }>;
}

export interface FilePreviewResolution {
    strategy: FilePreviewStrategy;
    fileFamily: string;
    extension: string;
    mimeType: string;
    badgeCode: string;
    badgeColor: string;
    canPreview: boolean;
    canDownload: boolean;
    canShare: boolean;
    canOpenExternally: boolean;
    canBookmark: boolean;
    previewUrl?: string;
    originalUrl?: string;
    conversionStatus: OfficeConversionStatus;
    isDrawingSheet: boolean;
    displayName: string;
    displaySize: string;
    displayUploadedBy: string;
    displayTime: string;
}

interface RegistryEntry {
    strategy: FilePreviewStrategy;
    tag: string;
    color: string;
    family: string;
    defaultMime: string;
}

export const GLOBAL_FILE_REGISTRY: Record<string, RegistryEntry> = {
    // PDF Document
    'pdf': { strategy: 'pdf', tag: 'PDF', color: '#EF4444', family: 'Document', defaultMime: 'application/pdf' },

    // Office Documents (Converted to PDF preview derivative)
    'doc': { strategy: 'converted-pdf', tag: 'DOC', color: '#2563EB', family: 'Document', defaultMime: 'application/msword' },
    'docx': { strategy: 'converted-pdf', tag: 'DOC', color: '#2563EB', family: 'Document', defaultMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    'pages': { strategy: 'converted-pdf', tag: 'PAGE', color: '#3B82F6', family: 'Document', defaultMime: 'application/x-iwork-pages-sffpages' },

    // Office Spreadsheets & Tabular Data
    'xls': { strategy: 'table', tag: 'XLS', color: '#16A34A', family: 'Spreadsheet', defaultMime: 'application/vnd.ms-excel' },
    'xlsx': { strategy: 'table', tag: 'XLS', color: '#16A34A', family: 'Spreadsheet', defaultMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    'xlsm': { strategy: 'table', tag: 'XLS', color: '#16A34A', family: 'Spreadsheet', defaultMime: 'application/vnd.ms-excel.sheet.macroEnabled.12' },
    'numbers': { strategy: 'table', tag: 'NUM', color: '#10B981', family: 'Spreadsheet', defaultMime: 'application/x-iwork-numbers-sffnumbers' },

    // Office Presentations
    'ppt': { strategy: 'converted-pdf', tag: 'PPT', color: '#EA580C', family: 'Presentation', defaultMime: 'application/vnd.ms-powerpoint' },
    'pptx': { strategy: 'converted-pdf', tag: 'PPT', color: '#EA580C', family: 'Presentation', defaultMime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    'key': { strategy: 'converted-pdf', tag: 'KEY', color: '#F59E0B', family: 'Presentation', defaultMime: 'application/x-iwork-keynote-sffkey' },

    // Plain & Lightweight Text
    'txt': { strategy: 'text', tag: 'TXT', color: '#64748B', family: 'Text', defaultMime: 'text/plain' },
    'log': { strategy: 'text', tag: 'TXT', color: '#64748B', family: 'Text', defaultMime: 'text/plain' },
    'rtf': { strategy: 'text', tag: 'TXT', color: '#64748B', family: 'Text', defaultMime: 'application/rtf' },

    // Markdown
    'md': { strategy: 'markdown', tag: 'MD', color: '#475569', family: 'Markdown', defaultMime: 'text/markdown' },
    'markdown': { strategy: 'markdown', tag: 'MD', color: '#475569', family: 'Markdown', defaultMime: 'text/markdown' },

    // Table / Delimited
    'csv': { strategy: 'table', tag: 'CSV', color: '#22A06B', family: 'Spreadsheet / Data', defaultMime: 'text/csv' },
    'tsv': { strategy: 'table', tag: 'CSV', color: '#22A06B', family: 'Spreadsheet / Data', defaultMime: 'text/tab-separated-values' },

    // Structured Text / Data
    'json': { strategy: 'structured-data', tag: 'JSON', color: '#6366F1', family: 'Data / Code', defaultMime: 'application/json' },
    'xml': { strategy: 'structured-data', tag: 'XML', color: '#6366F1', family: 'Data / Code', defaultMime: 'application/xml' },
    'yaml': { strategy: 'structured-data', tag: 'YML', color: '#6366F1', family: 'Data / Code', defaultMime: 'application/x-yaml' },
    'yml': { strategy: 'structured-data', tag: 'YML', color: '#6366F1', family: 'Data / Code', defaultMime: 'application/x-yaml' },

    // Images
    'jpg': { strategy: 'image', tag: 'JPG', color: '#9333EA', family: 'Image', defaultMime: 'image/jpeg' },
    'jpeg': { strategy: 'image', tag: 'JPG', color: '#9333EA', family: 'Image', defaultMime: 'image/jpeg' },
    'png': { strategy: 'image', tag: 'PNG', color: '#A855F7', family: 'Image', defaultMime: 'image/png' },
    'webp': { strategy: 'image', tag: 'IMG', color: '#A855F7', family: 'Image', defaultMime: 'image/webp' },
    'gif': { strategy: 'image', tag: 'GIF', color: '#9333EA', family: 'Image', defaultMime: 'image/gif' },
    'heic': { strategy: 'image', tag: 'IMG', color: '#A855F7', family: 'Image', defaultMime: 'image/heic' },
    'heif': { strategy: 'image', tag: 'IMG', color: '#A855F7', family: 'Image', defaultMime: 'image/heif' },
    'tif': { strategy: 'image', tag: 'TIF', color: '#7E22CE', family: 'Image', defaultMime: 'image/tiff' },
    'tiff': { strategy: 'image', tag: 'TIF', color: '#7E22CE', family: 'Image', defaultMime: 'image/tiff' },
    'svg': { strategy: 'image', tag: 'SVG', color: '#8B5CF6', family: 'Vector', defaultMime: 'image/svg+xml' },

    // Video
    'mp4': { strategy: 'video', tag: 'VID', color: '#C026D3', family: 'Video', defaultMime: 'video/mp4' },
    'mov': { strategy: 'video', tag: 'VID', color: '#C026D3', family: 'Video', defaultMime: 'video/quicktime' },
    'm4v': { strategy: 'video', tag: 'VID', color: '#C026D3', family: 'Video', defaultMime: 'video/x-m4v' },
    'webm': { strategy: 'video', tag: 'VID', color: '#C026D3', family: 'Video', defaultMime: 'video/webm' },
    'mkv': { strategy: 'video', tag: 'VID', color: '#C026D3', family: 'Video', defaultMime: 'video/x-matroska' },
    'avi': { strategy: 'video', tag: 'VID', color: '#C026D3', family: 'Video', defaultMime: 'video/x-msvideo' },

    // Audio
    'mp3': { strategy: 'audio', tag: 'AUD', color: '#EC4899', family: 'Audio', defaultMime: 'audio/mpeg' },
    'm4a': { strategy: 'audio', tag: 'AUD', color: '#EC4899', family: 'Audio', defaultMime: 'audio/mp4' },
    'wav': { strategy: 'audio', tag: 'AUD', color: '#EC4899', family: 'Audio', defaultMime: 'audio/wav' },
    'aac': { strategy: 'audio', tag: 'AUD', color: '#EC4899', family: 'Audio', defaultMime: 'audio/aac' },
    'ogg': { strategy: 'audio', tag: 'AUD', color: '#EC4899', family: 'Audio', defaultMime: 'audio/ogg' },
    'flac': { strategy: 'audio', tag: 'AUD', color: '#EC4899', family: 'Audio', defaultMime: 'audio/flac' },

    // Specialized Professional Formats (CAD / BIM / 3D) -> Opens in external app
    'dwg': { strategy: 'external', tag: 'DWG', color: '#DC2626', family: 'CAD', defaultMime: 'image/vnd.dwg' },
    'dxf': { strategy: 'external', tag: 'DXF', color: '#E11D48', family: 'CAD', defaultMime: 'application/dxf' },
    'dgn': { strategy: 'external', tag: 'DGN', color: '#E05A3F', family: 'CAD', defaultMime: 'application/octet-stream' },
    'rvt': { strategy: 'external', tag: 'RVT', color: '#1683D8', family: 'BIM', defaultMime: 'application/octet-stream' },
    'rfa': { strategy: 'external', tag: 'RFA', color: '#1683D8', family: 'BIM', defaultMime: 'application/octet-stream' },
    'rte': { strategy: 'external', tag: 'RTE', color: '#1683D8', family: 'BIM', defaultMime: 'application/octet-stream' },
    'pln': { strategy: 'external', tag: 'PLN', color: '#008C95', family: 'BIM', defaultMime: 'application/octet-stream' },
    'pla': { strategy: 'external', tag: 'PLA', color: '#008C95', family: 'BIM', defaultMime: 'application/octet-stream' },
    'mod': { strategy: 'external', tag: 'MOD', color: '#008C95', family: 'BIM', defaultMime: 'application/octet-stream' },
    'ifc': { strategy: 'external', tag: 'IFC', color: '#0891B2', family: 'Open BIM', defaultMime: 'application/x-step' },
    'bcf': { strategy: 'external', tag: 'BCF', color: '#0E7490', family: 'BIM Coordination', defaultMime: 'application/octet-stream' },
    'bcfzip': { strategy: 'external', tag: 'BCF', color: '#0E7490', family: 'BIM Coordination', defaultMime: 'application/octet-stream' },
    'nwd': { strategy: 'external', tag: 'NWD', color: '#4F46E5', family: 'BIM Coordination', defaultMime: 'application/octet-stream' },
    'nwc': { strategy: 'external', tag: 'NWD', color: '#4F46E5', family: 'BIM Coordination', defaultMime: 'application/octet-stream' },
    'skp': { strategy: 'external', tag: 'SKP', color: '#1D4ED8', family: '3D / CAD', defaultMime: 'application/octet-stream' },
    'layout': { strategy: 'external', tag: 'LAY', color: '#1E40AF', family: '3D / CAD', defaultMime: 'application/octet-stream' },
    'lay': { strategy: 'external', tag: 'LAY', color: '#1E40AF', family: '3D / CAD', defaultMime: 'application/octet-stream' },
    '3dm': { strategy: 'external', tag: '3DM', color: '#7C3AED', family: '3D', defaultMime: 'application/octet-stream' },
    'obj': { strategy: 'external', tag: '3D', color: '#8B5CF6', family: '3D', defaultMime: 'application/octet-stream' },
    'fbx': { strategy: 'external', tag: '3D', color: '#8B5CF6', family: '3D', defaultMime: 'application/octet-stream' },
    'glb': { strategy: 'external', tag: 'GLB', color: '#8B5CF6', family: '3D', defaultMime: 'model/gltf-binary' },
    'gltf': { strategy: 'external', tag: 'GLB', color: '#8B5CF6', family: '3D', defaultMime: 'model/gltf+json' },
    'stl': { strategy: 'external', tag: '3D', color: '#7C3AED', family: '3D / Manufacturing', defaultMime: 'application/octet-stream' },
    'step': { strategy: 'external', tag: '3D', color: '#7C3AED', family: '3D / Manufacturing', defaultMime: 'application/octet-stream' },
    'stp': { strategy: 'external', tag: '3D', color: '#7C3AED', family: '3D / Manufacturing', defaultMime: 'application/octet-stream' },

    // Archives -> File landing with Download primary action
    'zip': { strategy: 'unsupported', tag: 'ZIP', color: '#6B7280', family: 'Archive', defaultMime: 'application/zip' },
    'rar': { strategy: 'unsupported', tag: 'RAR', color: '#6B7280', family: 'Archive', defaultMime: 'application/vnd.rar' },
    '7z': { strategy: 'unsupported', tag: '7Z', color: '#6B7280', family: 'Archive', defaultMime: 'application/x-7z-compressed' },
    'tar': { strategy: 'unsupported', tag: 'TAR', color: '#6B7280', family: 'Archive', defaultMime: 'application/x-tar' },
    'gz': { strategy: 'unsupported', tag: 'GZ', color: '#6B7280', family: 'Archive', defaultMime: 'application/gzip' },
    'bz2': { strategy: 'unsupported', tag: 'BZ2', color: '#6B7280', family: 'Archive', defaultMime: 'application/x-bzip2' },
};

export const MIME_MAP: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/csv': 'csv',
    'text/tab-separated-values': 'tsv',
    'application/json': 'json',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'application/x-yaml': 'yaml',
    'text/yaml': 'yaml',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/zip': 'zip',
};

/**
 * Universal File Preview Resolver
 */
export function resolveFilePreview(file: FilePreviewItem): FilePreviewResolution {
    const rawName = file.name || file.title || file.fileName || 'document.pdf';
    const cleanName = rawName.trim();
    const dotIdx = cleanName.lastIndexOf('.');
    let ext = dotIdx !== -1 ? cleanName.substring(dotIdx + 1).toLowerCase() : '';

    // If extension is missing, check MIME type
    if (!ext && file.mimeType && MIME_MAP[file.mimeType.toLowerCase()]) {
        ext = MIME_MAP[file.mimeType.toLowerCase()];
    }

    // If still missing, check file.type
    if (!ext && file.type) {
        const t = file.type.toLowerCase();
        if (t === 'image' || t === 'photos' || t === 'photo') ext = 'jpg';
        else if (t === 'video' || t === 'videos') ext = 'mp4';
        else if (t === 'audio' || t === 'voice') ext = 'mp3';
        else if (t === 'pdf') ext = 'pdf';
        else if (t === 'table' || t === 'spreadsheet' || t === 'sheet' || t === 'csv' || t === 'excel') ext = 'xlsx';
        else if (t === 'document' || t === 'doc' || t === 'word') ext = 'docx';
    }

    // If still missing, extract extension from uri / url
    if (!ext && (file.uri || file.url)) {
        const uriPath = (file.uri || file.url || '').split('?')[0];
        const uriDotIdx = uriPath.lastIndexOf('.');
        if (uriDotIdx !== -1) {
            const potentialExt = uriPath.substring(uriDotIdx + 1).toLowerCase();
            if (GLOBAL_FILE_REGISTRY[potentialExt]) {
                ext = potentialExt;
            }
        }
    }

    // If thumbnails exist or uri exists and looks like an image
    if (!ext && ((file.thumbnails && file.thumbnails.length > 0) || (file.uri && (file.uri.includes('image') || file.uri.includes('photo') || file.uri.startsWith('blob:') || file.uri.startsWith('data:image'))))) {
        ext = 'jpg';
    }

    const reg = GLOBAL_FILE_REGISTRY[ext];

    // Determine drawing / sheet status
    const lowerName = cleanName.toLowerCase();
    const isDrawingSheet =
        file.isSheetDrawing === true ||
        lowerName.includes('dwg') ||
        lowerName.includes('grid_c4') ||
        lowerName.includes('drawing') ||
        lowerName.includes('structural_plan') ||
        lowerName.includes('blueprint') ||
        lowerName.includes('elevation');

    const conversionStatus = file.conversionStatus || 'ready';

    if (reg) {
        const canPreview =
            reg.strategy === 'image' ||
            reg.strategy === 'video' ||
            reg.strategy === 'audio' ||
            reg.strategy === 'pdf' ||
            reg.strategy === 'text' ||
            reg.strategy === 'markdown' ||
            reg.strategy === 'table' ||
            reg.strategy === 'structured-data' ||
            (reg.strategy === 'converted-pdf' && conversionStatus === 'ready');

        return {
            strategy: reg.strategy,
            fileFamily: reg.family,
            extension: ext.toUpperCase(),
            mimeType: file.mimeType || reg.defaultMime,
            badgeCode: reg.tag,
            badgeColor: reg.color,
            canPreview,
            canDownload: true,
            canShare: true,
            canOpenExternally: reg.strategy === 'external',
            canBookmark: true,
            previewUrl: file.previewUrl || file.uri || file.url,
            originalUrl: file.url || file.uri,
            conversionStatus,
            isDrawingSheet,
            displayName: cleanName,
            displaySize: file.size || '1.2 MB',
            displayUploadedBy: file.uploadedBy || file.sender || 'You',
            displayTime: file.time || file.date || '09:15 AM',
        };
    }

    // Fallback for unknown / unsupported files
    const fallbackExt = ext ? ext.toUpperCase() : 'FILE';
    return {
        strategy: 'unsupported',
        fileFamily: 'Unknown File',
        extension: fallbackExt,
        mimeType: file.mimeType || 'application/octet-stream',
        badgeCode: fallbackExt.slice(0, 4),
        badgeColor: '#6B7280',
        canPreview: false,
        canDownload: true,
        canShare: true,
        canOpenExternally: false,
        canBookmark: true,
        previewUrl: undefined,
        originalUrl: file.url || file.uri,
        conversionStatus: 'failed',
        isDrawingSheet: false,
        displayName: cleanName,
        displaySize: file.size || 'Unknown size',
        displayUploadedBy: file.uploadedBy || file.sender || 'You',
        displayTime: file.time || file.date || '09:00 AM',
    };
}
