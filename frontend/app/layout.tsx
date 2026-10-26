import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduBridge — School Management Platform",
  description: "Multi-level education monitoring and decision-support platform for the Ethiopian education system.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="h-full min-h-full flex flex-col bg-[#f4f5f7] text-slate-900">{children}</body>
    </html>
  );
}
