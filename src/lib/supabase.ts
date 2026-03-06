import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/utils';

export const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));
