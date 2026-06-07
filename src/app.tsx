'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, type EmojiData } from './db';

const emojiSpace = 300;

function parseSize(size: number): string {
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

function getMaxScroll(itemCount: number): number {
  return emojiSpace * itemCount + window.innerHeight - emojiSpace;
}

function EmojiToScale({
  data,
  category,
}: {
  data: EmojiData[];
  category: string;
}) {
  const [scroll, scrollSet] = useState(0);
  const [windowWidth, windowWidthSet] = useState(0);
  const prevMaxScrollRef = useRef(0);

  useEffect(() => {
    let rafId: number | null = null;
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
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const filteredData = useMemo(() => {
    if (!category) return data;
    return data.filter((item) => item.tags.includes(category));
  }, [data, category]);

  useEffect(() => {
    if (filteredData.length === 0) return;
    const prevMax = prevMaxScrollRef.current;
    const pct = prevMax > 0 ? window.scrollY / prevMax : 0;

    const newMax = getMaxScroll(filteredData.length);
    document.body.style.height = `${newMax}px`;
    prevMaxScrollRef.current = newMax;

    if (prevMax > 0) {
      window.scrollTo(0, pct * newMax);
    }
  }, [filteredData]);

  let floatScale = 1;
  if (filteredData.length > 0) {
    const floorIdx = Math.max(
      0,
      Math.min(Math.floor(scroll / emojiSpace), filteredData.length - 1)
    );
    const ceilIdx = Math.max(
      0,
      Math.min(Math.ceil(scroll / emojiSpace), filteredData.length - 1)
    );
    const floorCeilProgress = (scroll / emojiSpace) % 1;
    floatScale =
      floorCeilProgress * filteredData[ceilIdx].height +
      (1 - floorCeilProgress) * filteredData[floorIdx].height;
  }

  return (
    <div
      className="emoji-display"
      role="region"
      aria-label="Emoji size comparison"
    >
      {filteredData.map(({ emoji, height, label }, idx) => {
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

        const calculatedScaleR = Math.min(height / floatScale, 9);
        const calculatedScale = Math.round(calculatedScaleR * 1000) / 1000;

        let opacity = 1;
        if (calculatedScale > 3) {
          const diff = (calculatedScale - 3) / 6;
          opacity = Math.max(1 - diff, 0);
        }

        return (
          <div
            className="emoji-container"
            aria-label={`${label}, ${parseSize(height)}`}
            style={{
              transform: `translateX(${relativeDistance}px)`,
            }}
            key={emoji}
          >
            <div
              className="emoji"
              style={{
                opacity,
                transform: `scale(${calculatedScale}) translateY(10%)`,
              }}
            >
              <span className="emoji-glyph">{emoji}</span>
            </div>
            <div>{parseSize(height)}</div>
            <div>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function EmojiToScaleApp({ data }: { data: EmojiData[] }) {
  const [category, categorySet] = useState('');

  return (
    <>
      <EmojiToScale data={data} category={category} />
      <select
        className="category-select"
        value={category}
        onChange={(e) => categorySet(e.target.value)}
      >
        <option value="">All</option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat[0].toUpperCase() + cat.slice(1)}
          </option>
        ))}
      </select>
    </>
  );
}

export default EmojiToScaleApp;
