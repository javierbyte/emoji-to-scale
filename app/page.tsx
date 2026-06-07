import App from '../src/app.jsx';

export default function Page() {
  return (
    <>
      <div className="bg" />

      <header className="header header-left">
        <h1>Emoji to Scale</h1>
        <a href="https://github.com/javierbyte/emoji-to-scale">Source Code</a>
        <a href="https://www.youtube.com/watch?v=RiLBR6roAsM">YouTube Video</a>
        <a href="https://javier.xyz/pokemon-to-scale/">Pokémon Version</a>
      </header>

      <nav className="header header-right" aria-label="Social links">
        <a href="https://javier.xyz">by javier.xyz</a>
        <a href="https://x.com/javierbyte">x.com/javierbyte</a>
      </nav>

      <footer className="footer">
        Scroll <span className="footer-arrow">↓</span>
      </footer>

      <main>
        <noscript>
          <h1>Emoji to Scale</h1>
          <p>Your favorite emojis. To scale (more or less).</p>
        </noscript>
        <App />
      </main>
    </>
  );
}
