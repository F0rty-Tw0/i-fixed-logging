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
  title: 'Obsidian Command Center',
  description: 'Next-gen observability platform demo',
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

