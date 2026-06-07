import type { Metadata } from 'next';
import EmojiToSpeedApp from '../../src/speed-app';
import { getEmojiSpeedData } from '../../src/db';

export const metadata: Metadata = {
  title: 'Emoji to Speed',
  description: 'Your favorite emojis. Racing at relative speeds. More or less.',
};

export default function Page() {
  const data = getEmojiSpeedData();

  return (
    <>
      <div className="bg" />

      <header className="header header-left">
        <h1>Emoji to Speed</h1>
        <a href="https://github.com/javierbyte/emoji-to-scale">Source Code</a>
      </header>

      <footer className="footer">
        <div>
          Scroll <span className="footer-arrow">↕</span>
        </div>
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
