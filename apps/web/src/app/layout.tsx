import type { Metadata } from 'next';
import { Fraunces, Geist, Geist_Mono, IBM_Plex_Mono } from 'next/font/google';
import {
  STARTER_META_DESCRIPTION,
  STARTER_NAME,
  STARTER_TAGLINE
} from '@repo/consts/starter';
import './globals.css';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

const fraunces = Fraunces({
  variable: '--font-serif',
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  style: ['normal', 'italic']
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600']
});

export const metadata: Metadata = {
  title: `${STARTER_NAME} — ${STARTER_TAGLINE}`,
  description: STARTER_META_DESCRIPTION
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${plexMono.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
