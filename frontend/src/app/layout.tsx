import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: "Meme'd — Campaign Payouts",
  description: 'Brands run campaigns, creators post and get paid by view milestones.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="shell">
            <Header />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
