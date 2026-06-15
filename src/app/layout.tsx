import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { HabitProvider } from '@/context/HabitContext';
import ClientAccentLoader from '@/components/layout/ClientAccentLoader';

export const metadata: Metadata = {
  title: 'Hyperify — Build Habits, Track Streaks',
  description:
    'A powerful offline habit tracker PWA to build daily habits, track streaks, earn grace days, and visualize progress with beautiful heatmaps.',
  manifest: '/manifest.json',
  keywords: ['habit tracker', 'streak tracker', 'productivity', 'habits', 'daily routine', 'hyperify'],
  robots: 'index, follow',
};

export const viewport: Viewport = {
  themeColor: '#a3e635',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-dark-950 text-gray-100 font-sans antialiased">
        <AuthProvider>
          <HabitProvider>
            {/* Loads custom accent settings on mount to avoid FOUC */}
            <ClientAccentLoader />
            {children}
          </HabitProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
