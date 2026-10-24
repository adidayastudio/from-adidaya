import { decodeFinanceImage } from './decodeFinanceImage';
export async function loadFinanceAttachmentPreview(url: string, signal?: AbortSignal) {
    let response = await fetch(url, { signal });
    // Private Supabase buckets cannot be read through /object/public URLs.
    // Sign the original bucket/path using the current user's storage permissions.
    if (!response.ok && /\/storage\/v1\/object\/(public|sign)\//.test(url)) {
        try {
            const { supabase, ADIDAYA_SUPABASE_URL } = await import('./supabase');
            const parsed = new URL(url);
            if (parsed.origin === new URL(ADIDAYA_SUPABASE_URL).origin) {
                const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
                if (match) {
                    const { data, error } = await supabase.storage.from(decodeURIComponent(match[1]))
                        .createSignedUrl(decodeURIComponent(match[2]), 3600);
                    if (!error && data?.signedUrl) response = await fetch(data.signedUrl, { signal });
                }
            }
        } catch (error) {
            if (signal?.aborted) throw error;
        }
    }
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
