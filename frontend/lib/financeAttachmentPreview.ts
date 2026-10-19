import { decodeFinanceImage } from './decodeFinanceImage';
export async function loadFinanceAttachmentPreview(url: string, signal?: AbortSignal) {
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(response.status === 404
            ? 'File not found on the server.'
            : 'File is unavailable. Please try again.');
    }
    const blob = await response.blob();
    if (!blob.size) throw new Error('The downloaded file is empty.');
    const mime = (blob.type || response.headers.get('content-type') || '').toLowerCase();
    const path = url.split(/[?#]/)[0].toLowerCase();
    const kind = mime.includes('application/pdf') || path.endsWith('.pdf') ? 'pdf'
        : mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|heif|avif)$/.test(path) ? 'image' : 'file';
    return { blob: kind === 'image' ? await decodeFinanceImage(blob, url) : blob, kind };
}
