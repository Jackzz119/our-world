import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/utils';

// Single shared Supabase client. Every data module imports this one instance so
// auth state and Realtime channels are not duplicated.
export const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

// Resolve the signed-in user's id or throw; data-layer writes call this first so
// an expired session fails with one consistent message instead of an RLS error.
export const currentUserId = async (message = '未登录。'): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) throw new Error(message);
    return id;
};
