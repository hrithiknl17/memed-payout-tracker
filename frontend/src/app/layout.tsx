import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const sans = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: "Meme'd — Campaign Payouts",
  description: 'Brands run campaigns, creators post and get paid by view milestones.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
