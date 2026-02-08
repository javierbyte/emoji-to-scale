import { useEffect, useState } from 'react';
import { getData } from './getData.js';

const emojiSpace = 300;

function parseSize(size) {
  if (size < 2) {
    return `${size * 10}mm`;
  }
  if (size < 100) {
    return `${size}cm`;
  }
  if (size < 100 * 1000) {
    return `${Math.round(size * 100) / 100 / 100}m`;
  }
  return `${Math.round(size / 100 / 10) / 100}km`;
}

function App() {
  const [data, dataSet] = useState([]);
  const [scroll, scrollSet] = useState(0);
  const [windowWidth, windowWidthSet] = useState(window.innerWidth);

  useEffect(() => {
    getData().then((res) => {
      const totalScrollRange =
        emojiSpace * res.length + window.innerHeight - emojiSpace;
      document.body.style.height = `${totalScrollRange}px`;
      dataSet(res);
    });

    let rafId;
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        scrollSet(Math.round(window.scrollY));
        rafId = null;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    function onResize() {
      windowWidthSet(window.innerWidth);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  let floatScale = 1;
  if (data.length > 0) {
    const floorIdx = Math.max(
      0,
      Math.min(Math.floor(scroll / emojiSpace), data.length - 1)
    );
    const ceilIdx = Math.max(
      0,
      Math.min(Math.ceil(scroll / emojiSpace), data.length - 1)
    );
    const floorCeilProgress = (scroll / emojiSpace) % 1;
    floatScale =
      floorCeilProgress * data[ceilIdx][1] +
      (1 - floorCeilProgress) * data[floorIdx][1];
  }

  return (
    <div
      className="emoji-display"
      role="region"
      aria-label="Emoji size comparison"
    >
      {data.map(([emoji, size, label], idx) => {
        const compoundDistance = windowWidth / 2 + idx * emojiSpace;

        let relativeDistance = compoundDistance - scroll - emojiSpace / 2;

        // Slow the scrolling at the beginning of the screen
        if (relativeDistance < windowWidth / 2) {
          relativeDistance =
            relativeDistance * 0.1 +
            (0.9 * (relativeDistance + windowWidth * 0.5)) / 2;
        }

        // Don't render the emoji if out of window
        if (
          relativeDistance < -emojiSpace * 0.75 ||
          relativeDistance > windowWidth - emojiSpace * 0.1
        ) {
          return null;
        }

        const calculatedScaleR = Math.min(size / floatScale, 9);
        const calculatedScale = Math.round(calculatedScaleR * 1000) / 1000;

        // Render at higher font-size when upscaling to avoid pixelation.
        // CSS scale() is only used for downscaling (<=1), which is lossless.
        // Render at a higher font-size to avoid pixelation on upscale.
        // The element stays at 256×256 for layout; the glyph overflows harmlessly.
        // CSS scale() is only used for values ≤1 (downscaling), which is lossless.
        const renderMultiplier = Math.max(1, calculatedScale);
        const cssScale =
          Math.round((calculatedScale / renderMultiplier) * 1000) / 1000;
        const fontSize = 200 * renderMultiplier;
        const lineHeight = 256 * renderMultiplier;

        let opacity = 1;
        if (calculatedScale > 3) {
          const diff = (calculatedScale - 3) / 6;
          opacity = Math.max(1 - diff, 0);
        }

        return (
          <div
            className="emoji-container"
            aria-label={`${label}, ${parseSize(size)}`}
            style={{
              transform: `translateX(${relativeDistance}px)`,
            }}
            key={emoji}
          >
            <div
              className="emoji"
              style={{
                opacity,
                fontSize: `${fontSize}px`,
                lineHeight: `${lineHeight}px`,
                transform: `scale(${cssScale}) translateY(10%)`,
              }}
            >
              {emoji}
            </div>
            <div>{parseSize(size)}</div>
            <div>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default App;
