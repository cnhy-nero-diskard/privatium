export interface EncryptedData {
  encrypted: string;  // Base64 encoded encrypted data
  iv: string;        // Base64 encoded initialization vector
  salt: string;      // Base64 encoded salt
}

// Convert string to Uint8Array
function str2buf(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert ArrayBuffer to string
function buf2str(buf: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buf);
}

// Convert ArrayBuffer to base64 string
function buf2base64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to Uint8Array
function base64ToBuf(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const bytes = new Uint8Array(binary_string.length);
  for (let i = 0; i < binary_string.length; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

async function getKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  const passwordBuffer = str2buf(password);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as Uint8Array,
      iterations: 100000,
      hash: 'SHA-256'
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(text: string, password: string): Promise<EncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(password, salt as BufferSource);
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource
    },
    key,
    str2buf(text) as BufferSource
  );

  return {
    encrypted: buf2base64(encrypted),
    iv: buf2base64(iv.buffer),
    salt: buf2base64(salt.buffer)
  };
}

export async function decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
  const iv = base64ToBuf(encryptedData.iv);
  const salt = base64ToBuf(encryptedData.salt);
  const encrypted = base64ToBuf(encryptedData.encrypted);
  
  const key = await getKey(password, salt as BufferSource);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource
    },
    key,
    encrypted as BufferSource
  );

  return buf2str(decrypted);
}

export function isEncryptedData(obj: unknown): obj is EncryptedData {
  return obj !== null
    && typeof obj === 'object'
    && 'encrypted' in obj
    && 'iv' in obj
    && 'salt' in obj
    && typeof (obj as EncryptedData).encrypted === 'string'
    && typeof (obj as EncryptedData).iv === 'string'
    && typeof (obj as EncryptedData).salt === 'string';
}
