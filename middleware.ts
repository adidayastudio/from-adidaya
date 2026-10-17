import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
export async function middleware(request: NextRequest) { return updateSession(request); }
// The Forma UI restores its Supabase session in the browser. API handlers enforce caller identity.
export const config = { matcher: ['/api/:path*'] };
