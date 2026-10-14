import type { Metadata } from 'next';
import { Outfit, Pixelify_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const sans = Outfit({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
// Pixel face for the MEMED wordmark (its "M" stays legible, unlike Silkscreen's).
const pixel = Pixelify_Sans({ subsets: ['latin'], weight: ['700'], variable: '--font-pixel-face', display: 'swap' });

export const metadata: Metadata = {
  title: "Meme'd — You slay. We'll pay.",
  description: 'Brands run campaigns, creators post and get paid by view milestones.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${pixel.variable}`}>
      {/* Extensions (e.g. ColorZilla) inject attributes on <body> before hydration. */}
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
