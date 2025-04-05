// app/layout.tsx
import { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Face Recognition Attendance System',
  description: 'A system for tracking attendance using facial recognition',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-blue-600 p-4 text-white">
          <div className="container mx-auto flex justify-between items-center">
            <div className="text-xl font-bold">Face Recognition Attendance</div>
            <div className="space-x-4">
              <Link href="/" className="hover:underline">Home</Link>
              <Link href="/register" className="hover:underline">Register Student</Link>
              <Link href="/attendance" className="hover:underline">Take Attendance</Link>
              <Link href="/records" className="hover:underline">Records</Link>
            </div>
          </div>
        </nav>
        <div className="min-h-screen bg-gray-100 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}