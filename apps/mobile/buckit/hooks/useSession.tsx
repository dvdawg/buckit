import React, { useEffect, useState, createContext, useContext, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Global state to prevent loops
let globalHasRedirected = false;
let globalHasShownAlert = false;

type SessionCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isSessionValid: boolean;
  sessionError: string | null;
  hasRedirected: boolean;
  hasShownAlert: boolean;
  resetRedirectState: () => void;
  markRedirected: () => void;
  markAlertShown: () => void;
  isSigningOut: boolean;
};

const Ctx = createContext<SessionCtx>({ 
  session: null, 
  user: null, 
  loading: false, 
  signOut: async () => {},
  isSessionValid: false,
  sessionError: null,
  hasRedirected: false,
  hasShownAlert: false,
  resetRedirectState: () => {},
  markRedirected: () => {},
  markAlertShown: () => {},
  isSigningOut: false
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const validateSession = (session: Session | null) => {
    // If no session, this is normal for new users - don't treat as error
    if (!session || !session.user) {
      setIsSessionValid(false);
      setSessionError(null); // No error for missing session
      // Clear any cached user data
      setSession(null);
      return false;
    }

    // Session is valid
    setIsSessionValid(true);
    setSessionError(null);
    return true;
  };

  const markRedirected = () => {
    globalHasRedirected = true;
  };

  const markAlertShown = () => {
    globalHasShownAlert = true;
  };

  useEffect(() => {
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      console.log('Session user:', session?.user);
      console.log('Session access token:', session?.access_token ? 'present' : 'missing');
      setSession(session);
      validateSession(session);
      setLoading(false);
    });
    
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);
      console.log('Session user:', session?.user);
      console.log('Is signing out:', isSigningOut);
      
      // If we're signing out, only ignore SIGNED_IN events, allow SIGNED_OUT
      if (isSigningOut && event === 'SIGNED_IN') {
        console.log('Ignoring SIGNED_IN during sign out');
        return;
      }
      
      // Reset signing out flag when we get a SIGNED_OUT event
      if (isSigningOut && event === 'SIGNED_OUT') {
        console.log('Sign out complete, resetting flag');
        setIsSigningOut(false);
      }
      
      setSession(session);
      validateSession(session);
      setLoading(false);
    });
    return () => sub.data.subscription.unsubscribe();
  }, [isSigningOut]);

  async function signOut() {
    console.log('Signing out...');
    setIsSigningOut(true);
    
    // Clear local session state immediately
    setSession(null);
    
    // Clear session from secure storage
    try {
      await SecureStore.deleteItemAsync('sb-hjgrjdlvbuiodwmognjo-auth-token');
      console.log('Cleared session from storage');
    } catch (error) {
      console.log('Failed to clear storage:', error);
    }
    
    // Attempt Supabase sign out
    try {
      await supabase.auth.signOut();
      console.log('Supabase sign out successful');
    } catch (error) {
      console.log('Supabase sign out failed, but continuing with local sign out:', error);
    }
    
    // Set a timeout to reset the flag in case SIGNED_OUT event doesn't fire
    setTimeout(() => {
      console.log('Timeout: Resetting sign out flag');
      setIsSigningOut(false);
    }, 2000);
  }

  const resetRedirectState = () => {
    globalHasRedirected = false;
    globalHasShownAlert = false;
  };

  const user = session?.user ?? null;
  console.log('SessionProvider - session:', session, 'user:', user, 'loading:', loading, 'isSessionValid:', isSessionValid, 'sessionError:', sessionError, 'hasRedirected:', globalHasRedirected, 'hasShownAlert:', globalHasShownAlert);
  return (
    <Ctx.Provider value={{ 
      session, 
      user, 
      loading, 
      signOut, 
      isSessionValid, 
      sessionError,
      hasRedirected: globalHasRedirected,
      hasShownAlert: globalHasShownAlert,
      resetRedirectState,
      markRedirected,
      markAlertShown,
      isSigningOut
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  return useContext(Ctx);
}
