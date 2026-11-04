import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GameProvider } from '../providers/GameProvider';
import type { ReactNode, ReactElement } from 'react';

export const metadata: Metadata = {
  title: 'Inversion: Echoes of Two Worlds',
  description: 'A 2D retro pixel-art puzzle-platformer across two intertwined dimensions',
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Inversion',
  },
};

export const viewport: Viewport = {
  themeColor: '#101A32',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body suppressHydrationWarning>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
