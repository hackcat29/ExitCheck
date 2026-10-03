import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ExitCheck — Is your treasury ready to pay?',
  description:
    'Liquidity-aware treasury coverage on Hedera. Inspect real routes, stress liquidity and verify report commitments.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
