import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/utils';

// Single shared Supabase client. Every data module imports this one instance so
// auth state and Realtime channels are not duplicated.
export const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

// Resolve the signed-in user's id or throw; data-layer writes call this first so
// an expired session fails with one consistent message instead of an RLS error.
// Reads the locally stored session (refreshing it when expired) instead of
// `auth.getUser()`, which is a network round-trip to the Auth server on every
// call: offline it returned `{ user: null, error }` and every write reported
// "not signed in" when the real problem was the network. A refresh that fails
// for network reasons is reported as such; only a genuinely missing session
// gets the caller's "not signed in" message.
export const currentUserId = async (message = '未登录。'): Promise<string> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        throw new Error(error.name === 'AuthRetryableFetchError' ? '网络好像断了，稍后再试。' : error.message);
    }
    const id = data.session?.user.id;
    if (!id) throw new Error(message);
    return id;
};
