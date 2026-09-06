import EmojiToScaleApp from '../src/app';
import { getEmojiData } from '../src/db';

export default function Page() {
  const data = getEmojiData();

  return (
    <>
      <div className="bg" />

      <header className="header header-left">
        <h1>Emoji to Scale</h1>
        <a href="https://github.com/javierbyte/emoji-to-scale">Source Code</a>
        <a href="https://www.youtube.com/watch?v=RiLBR6roAsM">YouTube Video</a>
        <a href="https://javier.xyz/pokemon-to-scale">Pokémon Version</a>
        <a href="https://javier.xyz/emoji-to-scale/speed">
          Speed Version (New ✨)
        </a>
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
          <h1>Emoji to Scale</h1>
          <p>Your favorite emojis. To scale (more or less).</p>
        </noscript>
        <EmojiToScaleApp data={data} />
      </main>
    </>
  );
}
