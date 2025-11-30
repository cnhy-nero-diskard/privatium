'use client';

import { useState } from 'react';
import { useCredentials } from '@/utils/credentialContext';
import OnboardingFlow from '@/components/OnboardingFlow';
import CredentialExportModal from '@/components/CredentialExportModal';
import { Download } from 'lucide-react';
import type { PrivatiumCredentials } from '@/types/credentials';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const { needsOnboarding, isLoading, setCredentials } = useCredentials();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportReminder, setShowExportReminder] = useState(false);

  const handleOnboardingComplete = (credentials: PrivatiumCredentials) => {
    setCredentials(credentials);
    // Show reminder to export credentials after first-time setup
    if (credentials.createdAt) {
      const createdDate = new Date(credentials.createdAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdDate.getTime()) / (1000 * 60);
      
      // If credentials were just created (within last 5 minutes), show export reminder
      if (diffMinutes < 5) {
        setShowExportReminder(true);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading Privatium...</p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      {children}
      
      {/* Export Reminder Banner */}
      {showExportReminder && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-semibold">Don't forget to backup your credentials!</p>
                <p className="text-sm text-blue-100">Export an encrypted backup file to restore access if needed.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowExportModal(true);
                  setShowExportReminder(false);
                }}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium whitespace-nowrap"
              >
                Export Now
              </button>
              <button
                onClick={() => setShowExportReminder(false)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <CredentialExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </>
  );
}
