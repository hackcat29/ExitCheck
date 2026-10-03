import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ExitCheck — Hedera balance checks',
  description:
    'Read Hedera balances, estimate direct SaucerSwap conversions and verify saved reports.',
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
