export async function loadFinanceAttachmentPreview(url: string, signal?: AbortSignal) {
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(response.status === 404
            ? 'File tidak ditemukan di server.'
            : 'File belum bisa diakses. Coba muat ulang.');
    }
    const blob = await response.blob();
    if (!blob.size) throw new Error('File yang diterima kosong.');
    const mime = (blob.type || response.headers.get('content-type') || '').toLowerCase();
    const path = url.split(/[?#]/)[0].toLowerCase();
    const kind = mime.includes('application/pdf') || path.endsWith('.pdf') ? 'pdf'
        : mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|heif|avif)$/.test(path) ? 'image' : 'file';
    return { blob, kind };
}
