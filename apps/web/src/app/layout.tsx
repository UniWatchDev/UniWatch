import type { Metadata } from 'next';
import {
  STARTER_META_DESCRIPTION,
  STARTER_NAME,
  STARTER_TAGLINE
} from '@repo/consts/starter';
import './globals.css';

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
    <html lang="en" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
