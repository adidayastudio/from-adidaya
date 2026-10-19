import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { encode } from 'base64-arraybuffer';
import { uploadFinanceFileBase64 } from './api/finance';

export interface UploadFile {
    uri: string;
    path?: string;
    name?: string | null;
    fileName?: string | null;
    mimeType?: string;
    base64?: string | null;
}

export function isLocalFinanceAttachment(file: UploadFile): boolean {
    return /^(blob:|data:|file:|content:|ph:)/i.test(file.uri);
}

export async function uploadFinanceAttachment(file: UploadFile, folder: string, onUploaded?: () => void): Promise<string> {
    // Existing storage paths and remote attachments are already persisted.
    if (!isLocalFinanceAttachment(file)) return file.path || file.uri;
    const mimeByExtension: Record<string, string> = {
        pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        heic: 'image/heic', heif: 'image/heif', webp: 'image/webp', gif: 'image/gif',
        doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const dataMime = file.uri.match(/^data:([^;,]+)/i)?.[1];
    const name = file.fileName || file.name || file.uri.split(/[?#]/)[0];
    const extension = name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    const mime = (file.mimeType && file.mimeType !== 'application/octet-stream' ? file.mimeType : undefined)
        || dataMime || mimeByExtension[extension || ''] || 'application/octet-stream';
    const ext = extension && mimeByExtension[extension] ? extension
        : Object.keys(mimeByExtension).find(key => mimeByExtension[key] === mime) || 'bin';
    try {
        let base64 = file.base64;
        if (!base64) {
            if (file.uri.startsWith('data:') && file.uri.includes(';base64,')) {
                base64 = file.uri.slice(file.uri.indexOf(',') + 1);
            } else if (Platform.OS === 'web') {
                const response = await fetch(file.uri);
                if (!response.ok) throw new Error(`Unable to read ${file.fileName || file.name || 'attachment'}.`);
                base64 = encode(await response.arrayBuffer());
            } else {
                base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
            }
        }
        if (!base64) throw new Error('Attachment is empty. Please select the file again.');
        const path = await uploadFinanceFileBase64(base64, ext, mime, folder);
        onUploaded?.();
        return path;
    } catch (error: any) {
        throw new Error(`Failed to upload ${file.fileName || file.name || 'attachment'}: ${error?.message || 'Please try again.'}`);
    }
}
