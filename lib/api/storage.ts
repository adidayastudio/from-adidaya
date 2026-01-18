import { supabase } from "@/lib/supabaseClient";

export async function uploadFinanceFile(file: File, folder: string = "general"): Promise<string | null> {
    // Sanitize file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('finance_attachments')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return null; // Handle error in UI
    }

    return fileName;
}

export async function uploadFinanceFileExact(file: File, path: string): Promise<string | null> {
    const { error: uploadError } = await supabase.storage
        .from('finance_attachments')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        console.error("Error uploading file exactly:", uploadError);
        return null;
    }

    return path;
}

export async function getFinanceFileUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from('finance_attachments')
        .createSignedUrl(path, 3600); // 1 hour validity

    if (error) {
        console.error("Error getting signed url:", error);
        return null;
    }

    return data?.signedUrl || null;
}
