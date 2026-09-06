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
  // `default` covers pages with no title of their own (`/`); `template` suffixes
  // the ones that do (`/speed`) so sibling pages read as one site in SERPs.
  // Note this applies to <title> only — both pages set `openGraph.title`
  // explicitly, so social previews are unaffected.
  title: { default: TITLE, template: `%s · ${TITLE}` },
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

        {/* Global site tag (gtag.js) - Google Analytics.
            `lazyOnload`: gtag.js is by far the largest script on these pages,
            whose own bundles are tiny, so deferring it to idle keeps it off the
            critical path. Load order doesn't matter — the inline config below
            queues into `dataLayer`, which gtag.js drains whenever it arrives. */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-M2FT27FXS2"
          strategy="lazyOnload"
        />
        <Script id="ga" strategy="lazyOnload">
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
