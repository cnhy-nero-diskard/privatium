'use client';

import { useState } from 'react';
import { Download, Key, Shield, AlertCircle, LogOut } from 'lucide-react';
import { useCredentials } from '@/utils/credentialContext';
import CredentialExportModal from '@/components/CredentialExportModal';
import HelpTooltip from '@/components/HelpTooltip';
import { clearStoredCredentials } from '@/utils/credentialManager';

export default function SettingsPage() {
  const { hasCredentials, clearCredentials } = useCredentials();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    clearStoredCredentials();
    clearCredentials();
    setShowResetConfirm(false);
    // This will trigger the onboarding flow again
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage your Privatium credentials and security</p>
        </div>

        {/* Security Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold">Security & Credentials</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Export Credentials */}
            <div className="flex items-start justify-between gap-4 p-4 bg-gray-750 rounded-lg border border-gray-700">
              <div className="flex gap-3">
                <Download className="w-5 h-5 text-green-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white">Export Credentials</h3>
                    <HelpTooltip
                      title="Why Export?"
                      content={[
                        "Exporting creates an encrypted backup of your credentials that you can use to restore access from any device.",
                        "The export is protected by a master password that only you know.",
                        "Store the .priv file safely - it's your key to accessing your data if you switch devices or lose session data."
                      ]}
                      position="bottom"
                    />
                  </div>
                  <p className="text-sm text-gray-400">
                    Download an encrypted backup of your Supabase and encryption credentials. 
                    You'll need to create a master password to protect the export file.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={!hasCredentials}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Export
              </button>
            </div>

            {/* Credential Status */}
            <div className="flex items-start gap-4 p-4 bg-gray-750 rounded-lg border border-gray-700">
              <Key className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-white mb-1">Credential Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Supabase Connection:</span>
                    <span className={hasCredentials ? 'text-green-400' : 'text-red-400'}>
                      {hasCredentials ? '✓ Configured' : '✗ Not Configured'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Encryption:</span>
                    <span className={hasCredentials ? 'text-green-400' : 'text-red-400'}>
                      {hasCredentials ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Credentials */}
            <div className="border-t border-gray-700 pt-6">
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-red-300 mb-1">Danger Zone</h3>
                    <p className="text-sm text-red-200/80 mb-3">
                      Reset your credentials to go through the onboarding process again. 
                      This will clear all stored credentials from this session.
                    </p>
                    {!showResetConfirm ? (
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Reset Credentials
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-yellow-300 font-medium">
                          Are you sure? This will log you out and restart the setup process.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Yes, Reset
                          </button>
                          <button
                            onClick={() => setShowResetConfirm(false)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="text-blue-200 font-medium">Security Best Practices</p>
              <ul className="text-blue-300/90 space-y-1 list-disc list-inside">
                <li>Export your credentials regularly and store them in a secure location</li>
                <li>Use a strong, unique master password for credential exports</li>
                <li>Never share your master password or credential files with anyone</li>
                <li>Keep your encryption key safe - it cannot be recovered if lost</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <CredentialExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}
