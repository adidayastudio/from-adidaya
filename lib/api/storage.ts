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

export async function uploadProjectFile(file: File, path: string): Promise<string | null> {
    const { error: uploadError } = await supabase.storage
        .from('project_documents')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        console.error("Error uploading project file:", uploadError);
        // Fallback to finance_attachments if project_documents isn't created in Supabase yet
        const { error: fallbackError } = await supabase.storage
            .from('finance_attachments')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });
        if (fallbackError) {
            console.error("Fallback upload error:", fallbackError);
            return null;
        }
    }

    return path;
}

export async function getProjectFileSignedUrl(path: string): Promise<string | null> {
    // Try project_documents first
    const { data, error } = await supabase.storage
        .from('project_documents')
        .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
        // Fallback to finance_attachments
        const { data: fbData, error: fbError } = await supabase.storage
            .from('finance_attachments')
            .createSignedUrl(path, 3600);
        if (fbError) {
            console.error("Error getting signed url from fallback:", fbError);
            return null;
        }
        return fbData?.signedUrl || null;
    }

    return data.signedUrl;
}
