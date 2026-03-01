// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CBZ Converter',
  description:
    'Convert image files and PDF documents into CBZ comic book archives. ' +
    'Supports PNG, JPG, WebP, GIF, BMP, TIFF, AVIF, and PDF input. ' +
    'Produces reader-compatible CBZ output with optional ComicInfo.xml metadata.',
  keywords: ['CBZ', 'comic book', 'converter', 'comic archive', 'ComicInfo', 'webcomic'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
