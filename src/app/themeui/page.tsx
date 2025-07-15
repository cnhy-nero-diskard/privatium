"use client";

import Link from "next/link";
import { ThemeSwitcher } from "../components/theme/theme-switcher";

export default function ThemeSettings() {
  return (
    <main className="min-h-screen flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center mb-8">
          <Link href="/">
            <button className="flex items-center text-accent-color hover:underline mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 mr-1"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Back to Home
            </button>
          </Link>
          <h1 className="text-3xl font-bold">Theme Settings</h1>
        </div>

        <div className="bg-card-background rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Choose Theme</h2>
          
          <div className="mb-8">
            <ThemeSwitcher />
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Theme Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card-background border border-border-color rounded-lg p-4 shadow">
                <div className="mb-4 font-medium">Card Example</div>
                <div className="h-20 rounded bg-accent-color text-accent-foreground flex items-center justify-center">
                  Accent Color
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-background border border-border-color"></div>
                  <span>Background</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-foreground border border-border-color"></div>
                  <span>Foreground</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-accent-color border border-border-color"></div>
                  <span>Accent</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card-background rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About Themes</h2>
          <p className="mb-3">
            Choose from three theme options:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li><strong>Light:</strong> Clean, bright interface ideal for daytime use</li>
            <li><strong>Dark:</strong> Reduced eye strain in low-light conditions</li>
            <li><strong>Blue:</strong> A calming blue color scheme</li>
            <li><strong>System:</strong> Automatically matches your device settings</li>
          </ul>
          <p>
            Your theme preference is saved to your browser and will be remembered when you return.
          </p>
        </div>
      </div>
    </main>
  );
}
