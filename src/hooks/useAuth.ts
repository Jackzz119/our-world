// useAuth.ts — tracks the current Supabase session. Reads the initial session
// once, then stays in sync via onAuthStateChange (login, logout, OAuth redirect,
// token refresh). Restored from the pre-pivot auth stack (1f9b4a8).
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase.ts';

type AuthState = {
    user: User | null;
    loading: boolean;
};

export const useAuth = (): AuthState => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    return { user, loading };
};