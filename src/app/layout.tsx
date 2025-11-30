import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { CredentialProvider } from "@/utils/credentialContext";
import ClientWrapper from "./components/ClientWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Privatium - Your Private Journal",
  description: "End-to-end encrypted journaling application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${lora.variable} antialiased`}
      >
        <CredentialProvider>
          <ClientWrapper>
            {children}
          </ClientWrapper>
        </CredentialProvider>
      </body>
    </html>
  );
}
