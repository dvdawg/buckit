import React, { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type SessionCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionCtx>({ session: null, user: null, loading: false, signOut: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Start with no session and not loading
    setSession(null);
    setLoading(false);
    
    // Force sign out to clear any cached sessions
    supabase.auth.signOut().then(() => {
      console.log('Forced sign out on app start');
    });
    
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);
      setSession(session);
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const user = session?.user ?? null;
  return (
    <Ctx.Provider value={{ session, user, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  return useContext(Ctx);
}
