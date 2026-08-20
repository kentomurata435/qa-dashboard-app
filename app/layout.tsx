import './globals.css';
import React from 'react';

export const metadata = {
  title: 'QA Dashboard App',
  description: 'Test execution and management dashboard connected with GitHub',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <nav className="bg-slate-900 text-white p-4 shadow-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <a href="/" className="font-bold text-xl tracking-tight text-blue-400">
              QA Test Dashboard
            </a>
            <div className="text-sm text-slate-400">GitHub Sync Integrated</div>
          </div>
        </nav>
        <main className="max-w-[2100px] mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}