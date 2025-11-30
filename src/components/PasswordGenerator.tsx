'use client';

import { useState } from 'react';
import { Copy, RefreshCw, Check } from 'lucide-react';
import { generateSecurePassword, calculatePasswordStrength } from '@/utils/credentialManager';

interface PasswordGeneratorProps {
  onPasswordGenerated?: (password: string) => void;
  showUseButton?: boolean;
  label?: string;
}

export default function PasswordGenerator({
  onPasswordGenerated,
  showUseButton = false,
  label = 'Password Generator'
}: PasswordGeneratorProps) {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(32);
  const [copied, setCopied] = useState(false);
  const [used, setUsed] = useState(false);

  const strength = password ? calculatePasswordStrength(password) : null;

  const handleGenerate = () => {
    const newPassword = generateSecurePassword(length);
    setPassword(newPassword);
    setCopied(false);
    setUsed(false);
  };

  const handleCopy = async () => {
    if (!password) return;
    
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleUse = () => {
    if (!password || !onPasswordGenerated) return;
    onPasswordGenerated(password);
    setUsed(true);
  };

  const getStrengthColor = (level?: string) => {
    switch (level) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-orange-500';
      case 'good': return 'bg-yellow-500';
      case 'strong': return 'bg-blue-500';
      case 'very-strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-800/50">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Length:</label>
          <input
            type="number"
            min="12"
            max="64"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-16 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={password}
          readOnly
          placeholder="Click generate to create a password"
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
        />
        <button
          onClick={handleGenerate}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          title="Generate Password"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={handleCopy}
          disabled={!password}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Copy to Clipboard"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        {showUseButton && (
          <button
            onClick={handleUse}
            disabled={!password || used}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {used ? 'Used ✓' : 'Use'}
          </button>
        )}
      </div>

      {strength && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Strength:</span>
            <span className={`font-medium ${
              strength.level === 'weak' ? 'text-red-400' :
              strength.level === 'fair' ? 'text-orange-400' :
              strength.level === 'good' ? 'text-yellow-400' :
              strength.level === 'strong' ? 'text-blue-400' :
              'text-green-400'
            }`}>
              {strength.feedback}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getStrengthColor(strength.level)}`}
              style={{ width: `${strength.score}%` }}
            />
          </div>
        </div>
      )}

      {password && (
        <p className="text-xs text-gray-400 italic">
          🔒 This password is cryptographically secure. Store it safely!
        </p>
      )}
    </div>
  );
}
