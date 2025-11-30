/**
 * API Helper utilities for credential management
 */

import { getCredentialsFromMemory } from './credentialManager';

/**
 * Get headers with Supabase credentials for API calls
 * This ensures API routes can access credentials when environment variables are not set
 */
export function getCredentialHeaders(): HeadersInit {
  const credentials = getCredentialsFromMemory();
  
  if (credentials) {
    return {
      'x-supabase-url': credentials.supabaseUrl,
      'x-supabase-key': credentials.supabaseKey,
    };
  }
  
  return {};
}

/**
 * Create headers for API calls with credentials
 * Merges credential headers with any additional headers provided
 */
export function createApiHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  return {
    ...getCredentialHeaders(),
    ...additionalHeaders,
  };
}
