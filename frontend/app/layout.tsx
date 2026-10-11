import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduBridge — School Management Platform",
  description: "Multi-level education monitoring and decision-support platform for the Ethiopian education system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
