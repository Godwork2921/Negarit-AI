import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";
import ChatBot from "../components/ChatBot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NegaritAI - AI-Powered Threat Detection & Analysis",
  description: "Protect yourself from AI scams, phishing, deepfakes, and cyber threats. Advanced threat detection powered by enterprise-grade AI analysis.",
  keywords: ["cybersecurity", "threat detection", "phishing", "deepfake", "AI security", "malware detection"],
  authors: [{ name: "NegaritAI Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://negarit-ai.com",
    title: "NegaritAI - Enterprise Threat Detection",
    description: "Advanced AI-powered cybersecurity threat detection and analysis platform",
    images: [
      {
        url: "https://negarit-ai.com/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" id="theme-color" content="#0a0a1a" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          {children}
          <ChatBot />
        </Providers>
      </body>
    </html>
  );
}
