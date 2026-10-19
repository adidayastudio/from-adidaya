export async function decodeFinanceImage(blob: Blob, name = ''): Promise<Blob> {
    if (!/hei[cf]/i.test(blob.type) && !/\.hei[cf](?:[?#]|$)/i.test(name)) return blob;
    const { default: heic2any } = await import('heic2any');
    const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.85 });
    return Array.isArray(result) ? result[0] : result;
}
