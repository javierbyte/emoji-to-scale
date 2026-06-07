import type { Metadata } from 'next';
import Script from 'next/script';
import localFont from 'next/font/local';
import '../src/style.css';

const brutalita = localFont({
  src: '../src/Brutalita-400.woff2',
  variable: '--font-brutalita',
  weight: '400',
  display: 'swap',
  fallback: ['monospace'],
});

const TITLE = 'Emoji to Scale';
const DESCRIPTION = 'Your favorite emojis. To scale (more or less).';
const PAGE_URL = 'https://javier.xyz/emoji-to-scale';
const IMAGE = 'https://javier.xyz/emoji-to-scale/emoji-to-scale.jpg';

export const metadata: Metadata = {
  metadataBase: new URL('https://javier.xyz/emoji-to-scale'),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    images: [{ url: IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGE],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x1F4D0;</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={brutalita.variable}>
      <body>
        {children}

        {/* Global site tag (gtag.js) - Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-M2FT27FXS2"
          strategy="afterInteractive"
        />
        <Script id="ga" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', 'G-M2FT27FXS2');`}
        </Script>
      </body>
    </html>
  );
}
