import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Citizen Bank — Internet Banking", template: "%s · Citizen Bank" },
  description: "AI-first internet banking from Citizen Bank.",
  icons: { icon: "/favicon.png", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07051a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
