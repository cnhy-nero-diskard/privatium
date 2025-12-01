'use client';

import { useState, useEffect } from 'react';
import { Download, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { exportCredentialsFile, calculatePasswordStrength, getCredentialsFromMemory, getMasterPasswordFromMemory } from '@/utils/credentialManager';
import type { PrivatiumCredentials } from '@/types/credentials';
import PasswordGenerator from './PasswordGenerator';

interface CredentialExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CredentialExportModal({ isOpen, onClose }: CredentialExportModalProps) {
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [useStoredPassword, setUseStoredPassword] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const stored = getMasterPasswordFromMemory();
      setStoredPassword(stored);
      setUseStoredPassword(!!stored);
    }
  }, [isOpen]);

  const strength = masterPassword ? calculatePasswordStrength(masterPassword) : null;
  const passwordsMatch = masterPassword && confirmPassword && masterPassword === confirmPassword;

  const handlePasswordGenerated = (password: string) => {
    setMasterPassword(password);
    setConfirmPassword(password);
  };

  const handleExport = async () => {
    setError('');
    
    // Determine which password to use
    const passwordToUse = useStoredPassword && storedPassword ? storedPassword : masterPassword;
    
    // Validation only if not using stored password
    if (!useStoredPassword || !storedPassword) {
      if (!masterPassword) {
        setError('Please enter a master password');
        return;
      }

      if (masterPassword.length < 12) {
        setError('Master password must be at least 12 characters long');
        return;
      }

      if (masterPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (strength && strength.score < 50) {
        setError('Master password is too weak. Please use a stronger password.');
        return;
      }
    }

    setIsExporting(true);

    try {
      // Get current credentials from memory
      const memoryCreds = getCredentialsFromMemory();
      
      if (!memoryCreds) {
        setError('No credentials found to export. Please complete onboarding or import credentials first.');
        return;
      }
      
      const credentials: PrivatiumCredentials = memoryCreds;

      if (!credentials.supabaseUrl || !credentials.supabaseKey || !credentials.encryptionKey || !credentials.groqApiKey) {
        setError('Incomplete credentials found. Please reconfigure your credentials.');
        return;
      }

      // Export the file
      exportCredentialsFile(credentials, passwordToUse);
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setMasterPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export credentials');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
      setError('');
      setSuccess(false);
      setMasterPassword('');
      setConfirmPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Export Credentials</h2>
              <p className="text-sm text-gray-400">
                Download an encrypted backup of your Privatium credentials
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isExporting}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {storedPassword && useStoredPassword ? (
            /* Simplified view when using stored password */
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-green-200">Master Password Ready</p>
                  <p className="text-xs text-green-300/90">
                    Your credentials will be exported using the master password from your onboarding session.
                  </p>
                  <button
                    onClick={() => setUseStoredPassword(false)}
                    className="text-xs text-green-400 hover:text-green-300 underline"
                  >
                    Use a different password instead
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Warning Notice */}
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-yellow-200">Important Security Notice</p>
                    <ul className="text-xs text-yellow-300/90 space-y-1 list-disc list-inside">
                      <li>Your master password encrypts all credentials in the export file</li>
                      <li>This password is NOT stored anywhere - you must remember it</li>
                      <li>Without this password, the encrypted file cannot be decrypted</li>
                      <li>Use a strong, unique password that you can remember</li>
                    </ul>
                  </div>
                </div>
              </div>

              {storedPassword && (
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                  <button
                    onClick={() => setUseStoredPassword(true)}
                    className="text-sm text-blue-300 hover:text-blue-200 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Use the master password from onboarding instead
                  </button>
                </div>
              )}

              {/* Password Generator */}
              <PasswordGenerator
                onPasswordGenerated={handlePasswordGenerated}
                showUseButton={true}
                label="Generate Master Password (Recommended)"
              />

              {/* Manual Password Entry */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">
                    Master Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      placeholder="Enter a strong master password"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {strength && masterPassword && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`px-2 py-1 rounded ${
                        strength.level === 'weak' ? 'bg-red-900/50 text-red-300' :
                        strength.level === 'fair' ? 'bg-orange-900/50 text-orange-300' :
                        strength.level === 'good' ? 'bg-yellow-900/50 text-yellow-300' :
                        strength.level === 'strong' ? 'bg-blue-900/50 text-blue-300' :
                        'bg-green-900/50 text-green-300'
                      }`}>
                        {strength.feedback}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">
                    Confirm Master Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your master password"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className="flex items-center gap-2 text-xs">
                      {passwordsMatch ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Passwords match
                        </span>
                      ) : (
                        <span className="text-red-400">Passwords do not match</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-200">
                Credentials exported successfully! The file has been downloaded.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={
              isExporting || 
              (!(useStoredPassword && storedPassword) && (!passwordsMatch || !masterPassword))
            }
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Credentials
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
