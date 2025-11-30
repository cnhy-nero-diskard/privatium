export interface PrivatiumCredentials {
  supabaseUrl: string;
  supabaseKey: string;
  encryptionKey: string;
  groqApiKey: string;
  version: string; // For future compatibility
  createdAt: string;
}

export interface EncryptedCredentialsFile {
  version: string;
  encryptedData: string; // Encrypted JSON of PrivatiumCredentials
  iv: string; // Initialization vector for AES
  salt: string; // Salt used for key derivation
}

export interface CredentialStorageState {
  hasCredentials: boolean;
  isConfigured: boolean;
  needsOnboarding: boolean;
}
