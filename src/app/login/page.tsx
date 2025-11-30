"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { importCredentialsFile, storeCredentialsInMemory } from "@/utils/credentialManager";
import type { EncryptedCredentialsFile } from "@/types/credentials";

const LOCAL_STORAGE_KEY = "privatium_credentials_path";

export default function LoginPage() {
  const router = useRouter();
  const [masterPassword, setMasterPassword] = useState("");
  const [filePath, setFilePath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      // Store a pseudo path (browser doesn't expose real paths) just so user sees a label
      const pseudoPath = file.name;
      setFilePath(pseudoPath);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, pseudoPath);
      }
      // Optionally try to parse structure early (without password) just to validate JSON shape
      const text = await file.text();
      const parsed = JSON.parse(text) as EncryptedCredentialsFile;
      if (!parsed.version || !parsed.encryptedData || !parsed.iv || !parsed.salt) {
        throw new Error("Invalid Privatium credentials file.");
      }
    } catch (err) {
      console.error(err);
      setError("That file does not look like a Privatium .priv file.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!masterPassword) {
      setError("Please enter your master password.");
      return;
    }

    const input = document.getElementById("privatium-file-input") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError("Please select your encrypted .priv file.");
      return;
    }

    setLoading(true);
    try {
      // Reuse existing import logic to read+decrypt
      const credentials = await importCredentialsFile(file, masterPassword);
      storeCredentialsInMemory(credentials, masterPassword);
      router.replace("/home");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to unlock Privatium. Check password/file.");
    } finally {
      setLoading(false);
    }
  };

  const goToOnboarding = () => {
    router.push("/home");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-900 to-black text-gray-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-black/40 border border-white/10 rounded-3xl px-8 py-10 shadow-2xl backdrop-blur-xl">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-1 text-xs font-semibold tracking-wide uppercase text-white shadow-lg">
            Privatium
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Unlock your private journal</h1>
          <p className="text-sm text-gray-400">
            Enter your master password and select your <code>.priv</code> file to continue.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200" htmlFor="masterPassword">
              Master password
            </label>
            <input
              id="masterPassword"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder:text-gray-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200" htmlFor="privatium-file-input">
              Encrypted Privatium file (.priv)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10 transition-colors" htmlFor="privatium-file-input">
                Choose file
              </label>
              <span className="text-xs text-gray-400 truncate max-w-[180px]">
                {filePath || "No file selected"}
              </span>
            </div>
            <input
              id="privatium-file-input"
              type="file"
              accept=".priv,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full inline-flex justify-center items-center rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-sky-500/30 hover:shadow-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Decrypting…" : "Unlock Privatium"}
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>First time here?</span>
          <button
            type="button"
            onClick={goToOnboarding}
            className="text-sky-400 hover:text-sky-300 font-medium underline-offset-2 hover:underline"
          >
            Go to onboarding
          </button>
        </div>
      </div>
    </main>
  );
}
