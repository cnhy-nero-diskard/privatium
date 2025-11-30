'use client';

import { useState, useRef } from 'react';
import { Upload, Key, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { 
  importCredentialsFile, 
  calculatePasswordStrength,
  storeCredentialsInMemory 
} from '@/utils/credentialManager';
import type { PrivatiumCredentials } from '@/types/credentials';
import PasswordGenerator from './PasswordGenerator';

type OnboardingStep = 'welcome' | 'import' | 'manual-setup';

interface OnboardingFlowProps {
  onComplete: (credentials: PrivatiumCredentials) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Import flow state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual setup flow state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);
  const [showGroqApiKey, setShowGroqApiKey] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);

  const masterPasswordStrength = masterPassword ? calculatePasswordStrength(masterPassword) : null;

  // Welcome Screen
  const WelcomeScreen = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Key className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Welcome to Privatium</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Your private journal with end-to-end encryption. To get started, choose how you'd like to set up your credentials.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        {/* Option 1: Import Credentials */}
        <button
          onClick={() => setStep('import')}
          className="p-6 bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 hover:border-blue-500 rounded-xl transition-all group"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Import Credentials</h3>
            <p className="text-sm text-gray-400">
              Already have an encrypted credentials file? Import it to restore your access.
            </p>
            <span className="text-xs text-blue-400 font-medium">Recommended for existing users</span>
          </div>
        </button>

        {/* Option 2: Manual Setup */}
        <button
          onClick={() => setStep('manual-setup')}
          className="p-6 bg-gray-800 hover:bg-gray-750 border-2 border-gray-700 hover:border-green-500 rounded-xl transition-all group"
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
              <Key className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">First-Time Setup</h3>
            <p className="text-sm text-gray-400">
              New to Privatium? Enter your credentials manually to get started.
            </p>
            <span className="text-xs text-green-400 font-medium">For new users</span>
          </div>
        </button>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mt-6">
        <p className="text-xs text-gray-400 text-center">
          🔒 All credentials are encrypted and stored securely. Your master password never leaves your device.
        </p>
      </div>
    </div>
  );

  // Import Credentials Screen
  const ImportScreen = () => {
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.name.endsWith('.priv') && !file.name.endsWith('.json')) {
          setError('Please select a valid credentials file (.priv or .json)');
          return;
        }
        setSelectedFile(file);
        setError('');
      }
    };

    const handleImport = async () => {
      if (!selectedFile || !importPassword) {
        setError('Please select a file and enter the master password');
        return;
      }

      setIsProcessing(true);
      setError('');

      try {
        const credentials = await importCredentialsFile(selectedFile, importPassword);
        storeCredentialsInMemory(credentials, importPassword);
        onComplete(credentials);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import credentials');
      } finally {
        setIsProcessing(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setStep('welcome')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-white">Import Credentials</h2>
          <p className="text-gray-400 mt-2">
            Upload your encrypted credentials file and enter your master password
          </p>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Credentials File <span className="text-red-400">*</span>
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-8 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".priv,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">Click to choose a different file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-300">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">Supports .priv or .json files</p>
              </div>
            )}
          </div>
        </div>

        {/* Master Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Master Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showImportPassword ? 'text' : 'password'}
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              placeholder="Enter the master password used to encrypt this file"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            />
            <button
              type="button"
              onClick={() => setShowImportPassword(!showImportPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showImportPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <button
          onClick={handleImport}
          disabled={!selectedFile || !importPassword || isProcessing}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Importing...
            </>
          ) : (
            <>
              Import & Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    );
  };

  // Manual Setup Screen
  const ManualSetupScreen = () => {
    const handleManualSetup = () => {
      setError('');

      // Validation
      if (!supabaseUrl || !supabaseKey || !encryptionKey || !groqApiKey || !masterPassword) {
        setError('All fields are required');
        return;
      }

      if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
        setError('Invalid Supabase URL format');
        return;
      }

      if (supabaseKey.length < 100) {
        setError('Supabase key appears to be invalid (too short)');
        return;
      }

      if (encryptionKey.length < 32) {
        setError('Encryption key must be at least 32 characters');
        return;
      }

      if (masterPassword.length < 12) {
        setError('Master password must be at least 12 characters');
        return;
      }

      if (masterPasswordStrength && masterPasswordStrength.score < 50) {
        setError('Master password is too weak. Please use a stronger password.');
        return;
      }

      const credentials: PrivatiumCredentials = {
        supabaseUrl,
        supabaseKey,
        encryptionKey,
        groqApiKey,
        version: '1.0.0',
        createdAt: new Date().toISOString()
      };

      storeCredentialsInMemory(credentials, masterPassword);
      onComplete(credentials);
    };

    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setStep('welcome')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-white">First-Time Setup</h2>
          <p className="text-gray-400 mt-2">
            Enter your Supabase, encryption, and AI API credentials
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-200">Important</p>
              <p className="text-xs text-blue-300/90">
                These credentials will be encrypted and stored securely. Make sure to export them after setup for backup purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Supabase URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Supabase URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xxxxx.supabase.co"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Supabase Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Supabase Anon Key <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showSupabaseKey ? 'text' : 'password'}
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showSupabaseKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Encryption Key Generator */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Encryption Key <span className="text-red-400">*</span>
            </label>
            <PasswordGenerator
              onPasswordGenerated={setEncryptionKey}
              showUseButton={true}
              label="Generate Encryption Key"
            />
            <div className="relative mt-2">
              <input
                type={showEncryptionKey ? 'text' : 'password'}
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="Or enter your own encryption key (min 32 chars)"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowEncryptionKey(!showEncryptionKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showEncryptionKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Groq API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Groq API Key <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Required for AI Therapist features. Get your free API key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">console.groq.com</a>
            </p>
            <div className="relative">
              <input
                type={showGroqApiKey ? 'text' : 'password'}
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowGroqApiKey(!showGroqApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showGroqApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Master Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Master Password <span className="text-red-400">*</span>
            </label>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-2">
              <p className="text-xs text-yellow-300">
                ⚠️ <strong>CRITICAL:</strong> This password protects your exported credentials. Choose a strong password and remember it!
              </p>
            </div>
            <PasswordGenerator
              onPasswordGenerated={setMasterPassword}
              showUseButton={true}
              label="Generate Master Password (Highly Recommended)"
            />
            <div className="relative mt-2">
              <input
                type={showMasterPassword ? 'text' : 'password'}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Or create your own master password (min 12 chars)"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword(!showMasterPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showMasterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {masterPasswordStrength && masterPassword && (
              <div className="flex items-center gap-2 text-xs">
                <div className={`px-2 py-1 rounded ${
                  masterPasswordStrength.level === 'weak' ? 'bg-red-900/50 text-red-300' :
                  masterPasswordStrength.level === 'fair' ? 'bg-orange-900/50 text-orange-300' :
                  masterPasswordStrength.level === 'good' ? 'bg-yellow-900/50 text-yellow-300' :
                  masterPasswordStrength.level === 'strong' ? 'bg-blue-900/50 text-blue-300' :
                  'bg-green-900/50 text-green-300'
                }`}>
                  {masterPasswordStrength.feedback}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleManualSetup}
          disabled={!supabaseUrl || !supabaseKey || !encryptionKey || !groqApiKey || !masterPassword}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          Complete Setup
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-8">
          {step === 'welcome' && <WelcomeScreen />}
          {step === 'import' && <ImportScreen />}
          {step === 'manual-setup' && <ManualSetupScreen />}
        </div>
      </div>
    </div>
  );
}
