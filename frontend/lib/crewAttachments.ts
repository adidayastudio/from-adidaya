import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { encode } from 'base64-arraybuffer';
import { uploadCrewFileBase64 } from '@/lib/api/attendance';

export interface CrewProofFile { name: string; uri: string; mimeType?: string; }

export async function uploadCrewProofFile(file: CrewProofFile): Promise<string> {
    if (/^https?:\/\//i.test(file.uri)) return file.uri;
    const extension = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    const types: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };
    let mimeType = file.mimeType || (extension && types[extension]) || 'image/jpeg';
    let base64: string;
    if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        if (!response.ok) throw new Error('The attachment could not be read. Please select it again.');
        const bytes = await response.arrayBuffer();
        if (!bytes.byteLength) throw new Error('The selected attachment is empty.');
        if (!file.mimeType) mimeType = response.headers.get('content-type')?.split(';')[0] || mimeType;
        base64 = encode(bytes);
    } else {
        base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
    }
    const mimeExtensions: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };
    return uploadCrewFileBase64(base64, mimeExtensions[mimeType] || extension || 'jpg', mimeType);
}
