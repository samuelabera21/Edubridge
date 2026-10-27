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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body className="h-full min-h-full flex flex-col bg-[#f4f5f7] text-slate-900">{children}</body>
    </html>
  );
}
