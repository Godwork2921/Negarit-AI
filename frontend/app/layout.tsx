import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";
import ChatBot from "../components/ChatBot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NegaritAI - AI-Powered Threat Detection & Analysis",
  description:
    "Protect yourself from AI scams, phishing, deepfakes, and cyber threats. Advanced threat detection powered by enterprise-grade AI analysis.",
  keywords: [
    "cybersecurity",
    "threat detection",
    "phishing",
    "deepfake",
    "AI security",
    "malware detection",
  ],
  authors: [{ name: "NegaritAI Team" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://negarit-ai.com",
    title: "NegaritAI - Enterprise Threat Detection",
    description:
      "Advanced AI-powered cybersecurity threat detection and analysis platform",
    images: [
      {
        url: "https://negarit-ai.com/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07080f" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
  ],
};

/**
 * Runs before first paint so the stored theme is applied immediately and the
 * page never flashes the wrong background while React hydrates.
 */
const themeInitScript = `(function(){try{var s=localStorage.getItem("theme");var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <Providers>
          {children}
          <ChatBot />
        </Providers>
      </body>
    </html>
  );
}
