import { supabase } from '@/lib/supabase';
export async function fetchAdidayaApi(path: string, init: RequestInit = {}): Promise<Response> {
    if (!path.startsWith('/api/') || path.startsWith('//') || path.includes('\\')) throw new Error('Invalid Adidaya API path.');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in to use Adidaya services.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${session.access_token}`);
    return fetch(path, { ...init, headers });
}
