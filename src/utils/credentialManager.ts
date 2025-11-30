import CryptoJS from 'crypto-js';
import type { PrivatiumCredentials, EncryptedCredentialsFile } from '@/types/credentials';

const CREDENTIAL_VERSION = '1.0.0';
const PBKDF2_ITERATIONS = 10000;
const KEY_SIZE = 256;

/**
 * Derives a cryptographic key from a master password using PBKDF2
 * Returns a WordArray suitable for direct use as an AES key
 */
function deriveKey(masterPassword: string, salt: string): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(masterPassword, salt, {
    keySize: KEY_SIZE / 32,
    iterations: PBKDF2_ITERATIONS
  });
}

/**
 * Generates a random salt for key derivation
 */
function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
}

/**
 * Encrypts credentials with a master password
 */
export function encryptCredentials(
  credentials: PrivatiumCredentials,
  masterPassword: string
): EncryptedCredentialsFile {
  const salt = generateSalt();
  const key = deriveKey(masterPassword, salt);
  
  const credentialsJson = JSON.stringify({
    ...credentials,
    version: CREDENTIAL_VERSION,
    createdAt: new Date().toISOString()
  });

  // Generate a random IV for this encryption operation
  const iv = CryptoJS.lib.WordArray.random(128 / 8);

  // Encrypt using the derived key and explicit IV
  const encrypted = CryptoJS.AES.encrypt(credentialsJson, key, { iv });

  return {
    version: CREDENTIAL_VERSION,
    encryptedData: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
    iv: iv.toString(CryptoJS.enc.Hex),
    salt: salt
  };
}

/**
 * Decrypts credentials using a master password
 */
export function decryptCredentials(
  encryptedFile: EncryptedCredentialsFile,
  masterPassword: string
): PrivatiumCredentials {
  try {
    const key = deriveKey(masterPassword, encryptedFile.salt);

    // Reconstruct ciphertext and IV from stored hex strings
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedFile.encryptedData);
    const iv = CryptoJS.enc.Hex.parse(encryptedFile.iv);

    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });

    // Decrypt using the same derived key and IV
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, { iv });
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedStr) {
      throw new Error('Invalid master password');
    }
    
    const credentials = JSON.parse(decryptedStr) as PrivatiumCredentials;
    
    // Validate required fields
    if (!credentials.supabaseUrl || !credentials.supabaseKey || !credentials.encryptionKey || !credentials.groqApiKey) {
      throw new Error('Invalid credentials format');
    }
    
    return credentials;
  } catch (error) {
    if (error instanceof Error) {
      // Preserve explicit invalid password error
      if (error.message === 'Invalid master password') {
        throw error;
      }

      // Differentiate between bad file format and decryption problems
      if (error.message.includes('Malformed UTF-8') || error.message.includes('malformed')) {
        throw new Error('Invalid credentials file contents. The file may be corrupted or from an incompatible version.');
      }

      if (error.message.toLowerCase().includes('json')) {
        throw new Error('Invalid credentials file format. Please export a new credentials file and try again.');
      }
    }

    throw new Error('Failed to decrypt credentials. Please check your master password.');
  }
}

/**
 * Exports credentials to a downloadable encrypted file
 */
export function exportCredentialsFile(
  credentials: PrivatiumCredentials,
  masterPassword: string,
  filename: string = 'privatium-credentials.priv'
): void {
  const encryptedFile = encryptCredentials(credentials, masterPassword);
  const dataStr = JSON.stringify(encryptedFile, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Imports credentials from an encrypted file
 */
export async function importCredentialsFile(
  file: File,
  masterPassword: string
): Promise<PrivatiumCredentials> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const encryptedFile = JSON.parse(content) as EncryptedCredentialsFile;
        
        // Validate file structure
        if (!encryptedFile.version || !encryptedFile.encryptedData || 
            !encryptedFile.iv || !encryptedFile.salt) {
          throw new Error('Invalid credentials file format');
        }
        
        const credentials = decryptCredentials(encryptedFile, masterPassword);
        resolve(credentials);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse credentials file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Generates a secure random password
 */
export function generateSecurePassword(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  
  return password;
}

/**
 * Calculates password strength (0-100)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  feedback: string;
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
} {
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  
  // Determine level and feedback
  let level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  let feedback: string;
  
  if (score < 30) {
    level = 'weak';
    feedback = 'Too weak. Add more characters and variety.';
  } else if (score < 50) {
    level = 'fair';
    feedback = 'Fair. Consider adding more special characters.';
  } else if (score < 70) {
    level = 'good';
    feedback = 'Good password strength.';
  } else if (score < 90) {
    level = 'strong';
    feedback = 'Strong password!';
  } else {
    level = 'very-strong';
    feedback = 'Very strong password!';
  }
  
  return { score, feedback, level };
}

/**
 * Stores credentials in localStorage (temporary, session-based)
 */
export function storeCredentialsInMemory(credentials: PrivatiumCredentials, masterPassword?: string): void {
  // Store in sessionStorage (cleared when tab closes)
  sessionStorage.setItem('privatium_temp_credentials', JSON.stringify(credentials));
  
  // Store master password temporarily if provided (for export convenience)
  if (masterPassword) {
    sessionStorage.setItem('privatium_temp_master_password', masterPassword);
  }
  
  // Also set environment variables for the session
  if (typeof window !== 'undefined') {
    (window as any).__PRIVATIUM_CREDENTIALS__ = credentials;
    if (masterPassword) {
      (window as any).__PRIVATIUM_MASTER_PASSWORD__ = masterPassword;
    }
  }
}

/**
 * Retrieves credentials from memory
 */
export function getCredentialsFromMemory(): PrivatiumCredentials | null {
  if (typeof window === 'undefined') return null;
  
  // Check runtime
  const runtimeCreds = (window as any).__PRIVATIUM_CREDENTIALS__;
  if (runtimeCreds) return runtimeCreds;
  
  // Check sessionStorage
  const stored = sessionStorage.getItem('privatium_temp_credentials');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Checks if credentials are configured
 */
export function hasStoredCredentials(): boolean {
  // Check if environment variables exist
  if (typeof window !== 'undefined') {
    const hasEnv = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
                      process.env.NEXT_PUBLIC_SUPABASE_KEY &&
                      process.env.NEXT_PUBLIC_ENCRYPTION_KEY);
    
    if (hasEnv) return true;
  }
  
  // Check memory storage
  return getCredentialsFromMemory() !== null;
}

/**
 * Retrieves stored master password from memory
 */
export function getMasterPasswordFromMemory(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check runtime
  const runtimePassword = (window as any).__PRIVATIUM_MASTER_PASSWORD__;
  if (runtimePassword) return runtimePassword;
  
  // Check sessionStorage
  const stored = sessionStorage.getItem('privatium_temp_master_password');
  return stored || null;
}

/**
 * Clears all stored credentials
 */
export function clearStoredCredentials(): void {
  sessionStorage.removeItem('privatium_temp_credentials');
  sessionStorage.removeItem('privatium_temp_master_password');
  if (typeof window !== 'undefined') {
    delete (window as any).__PRIVATIUM_CREDENTIALS__;
    delete (window as any).__PRIVATIUM_MASTER_PASSWORD__;
  }
}
