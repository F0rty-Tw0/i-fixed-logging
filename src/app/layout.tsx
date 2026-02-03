import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import { SimulationProvider } from '../core/context/SimulationContext';
import { ThemeProvider } from '../core/context/ThemeContext';
import '../styles/main.css';
import { AppShell } from '../components/AppShell';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'I FIxed Logging',
  description: 'Next-gen observability platform demo',
  metadataBase: new URL('https://i-fixed-logging.vercel.app/'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    'observability',
    'logging',
    'distributed tracing',
    'telemetry',
    'incident response',
    'operations',
  ],
  openGraph: {
    title: 'I FIxed Logging',
    description: 'Next-gen observability platform demo',
    url: '/',
    siteName: 'I FIxed Logging',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'I FIxed Logging preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'I FIxed Logging',
    description: 'Next-gen observability platform demo',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeProvider>
          <SimulationProvider>
            <AppShell>{children}</AppShell>
          </SimulationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

