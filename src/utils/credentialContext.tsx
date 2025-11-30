'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCredentialsFromMemory, hasStoredCredentials } from '@/utils/credentialManager';
import type { PrivatiumCredentials } from '@/types/credentials';

interface CredentialContextType {
  credentials: PrivatiumCredentials | null;
  hasCredentials: boolean;
  needsOnboarding: boolean;
  isLoading: boolean;
  setCredentials: (credentials: PrivatiumCredentials) => void;
  clearCredentials: () => void;
}

const CredentialContext = createContext<CredentialContextType | undefined>(undefined);

export function CredentialProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentialsState] = useState<PrivatiumCredentials | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for credentials on mount
    const checkCredentials = () => {
      try {
        // First check if env variables are set
        const hasEnvVars = !!(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_KEY &&
          process.env.NEXT_PUBLIC_ENCRYPTION_KEY &&
          (process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY)
        );

        if (hasEnvVars) {
          // Environment variables are set, no onboarding needed
          const envCreds: PrivatiumCredentials = {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
            encryptionKey: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '',
            groqApiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
            version: '1.0.0',
            createdAt: new Date().toISOString()
          };
          setCredentialsState(envCreds);
          setHasCredentials(true);
          setNeedsOnboarding(false);
        } else {
          // Check memory storage
          const memoryCreds = getCredentialsFromMemory();
          if (memoryCreds) {
            setCredentialsState(memoryCreds);
            setHasCredentials(true);
            setNeedsOnboarding(false);
          } else {
            // No credentials found, needs onboarding
            setCredentialsState(null);
            setHasCredentials(false);
            setNeedsOnboarding(true);
          }
        }
      } catch (error) {
        console.error('Error checking credentials:', error);
        setNeedsOnboarding(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkCredentials();
  }, []);

  const setCredentials = (newCredentials: PrivatiumCredentials) => {
    setCredentialsState(newCredentials);
    setHasCredentials(true);
    setNeedsOnboarding(false);
  };

  const clearCredentials = () => {
    setCredentialsState(null);
    setHasCredentials(false);
    setNeedsOnboarding(true);
  };

  return (
    <CredentialContext.Provider
      value={{
        credentials,
        hasCredentials,
        needsOnboarding,
        isLoading,
        setCredentials,
        clearCredentials
      }}
    >
      {children}
    </CredentialContext.Provider>
  );
}

export function useCredentials() {
  const context = useContext(CredentialContext);
  if (context === undefined) {
    throw new Error('useCredentials must be used within a CredentialProvider');
  }
  return context;
}
