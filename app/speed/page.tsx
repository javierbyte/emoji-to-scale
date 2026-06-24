import type { Metadata } from 'next';
import EmojiToSpeedApp from '../../src/speed-app';
import { getEmojiSpeedData } from '../../src/db';

const TITLE = 'Emoji to Speed';
const DESCRIPTION =
  'Your favorite emojis. Racing at relative speeds. More or less.';
const PAGE_URL = 'https://javier.xyz/emoji-to-scale/speed';
const IMAGE = 'https://javier.xyz/emoji-to-scale/emoji-to-speed.jpg';

export const metadata: Metadata = {
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
};

export default function Page() {
  const data = getEmojiSpeedData();

  return (
    <>
      <div className="bg" />

      <header className="header header-left">
        <h1>Emoji to Speed</h1>
        <a href="https://github.com/javierbyte/emoji-to-scale/tree/master/app/speed">
          Source Code
        </a>
      </header>

      <footer className="footer">
        <div className="footer-credit">
          by <a href="https://x.com/javierbyte">@javierbyte</a>, more in{' '}
          <a href="https://javier.xyz">my website</a>. 2021-2026
        </div>
      </footer>

      <main>
        <noscript>
          <h1>Emoji to Speed</h1>
          <p>Your favorite emojis. Racing at relative speeds.</p>
        </noscript>
        <EmojiToSpeedApp data={data} />
      </main>
    </>
  );
}
