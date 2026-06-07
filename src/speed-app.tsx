'use client';

import { useEffect, useRef, useState } from 'react';
import type { EmojiSpeedData } from './db';

// Vertical px between lanes — controls scroll-to-lane mapping and lane height.
const laneSpace = 120;
// Height of a single lane (matches `.speed-lane` in style.css).
const laneHeight = 140;
// On-screen px/s of the *reference* (centered) emoji — the visual baseline.
const BASE_PX_PER_SEC = 150;
// Clamp how much faster/slower than the reference anything can visually move,
// so extreme real-world ratios (sloth vs shark) don't blur into teleporting.
const MAX_SPEED_RATIO = 12;
const MIN_SPEED_RATIO = 1 / MAX_SPEED_RATIO;

// Motion blur: trail copies of the main emoji behind it, spaced by relative
// speed so faster lanes streak more. Opacity is the nearest copy's value and
// fades linearly to ~0 at the tail. Shadow count, spacing, and opacity tunable.
const MOTION_BLUR_SHADOWS = 8;
const MOTION_BLUR_SPACING = 3;
const MOTION_BLUR_OPACITY = 0.1;
// Only lanes moving at least this much faster than the reference get a trail.
const MOTION_BLUR_MIN_RATIO = 1.1;

// A lane is visible only while any part of it is on screen.
function isLaneVisible(offsetY: number, viewportHeight: number): boolean {
  return Math.abs(offsetY) <= viewportHeight / 2 + laneHeight / 2;
}

function parseSpeed(kmh: number): string {
  if (kmh < 1) {
    return `${Math.round(kmh * 100) / 100} km/h`;
  }
  if (kmh < 10) {
    return `${Math.round(kmh * 10) / 10} km/h`;
  }
  return `${Math.round(kmh)} km/h`;
}

function getMaxScroll(itemCount: number): number {
  return laneSpace * itemCount + window.innerHeight - laneSpace;
}

// Linear blend of the floor/ceil emoji speeds at the current scroll position —
// mirrors the `floatScale` interpolation in the scale app.
function getReferenceSpeed(scrollY: number, data: EmojiSpeedData[]): number {
  if (data.length === 0) return 1;
  const pos = scrollY / laneSpace;
  const floorIdx = Math.max(0, Math.min(Math.floor(pos), data.length - 1));
  const ceilIdx = Math.max(0, Math.min(Math.ceil(pos), data.length - 1));
  const progress = pos % 1;
  return progress * data[ceilIdx].speed + (1 - progress) * data[floorIdx].speed;
}

function EmojiToSpeedApp({ data }: { data: EmojiSpeedData[] }) {
  const [scroll, scrollSet] = useState(0);
  const [windowSize, windowSizeSet] = useState({ width: 0, height: 0 });
  // Bumped every animation frame to flush the new horizontal positions.
  const [, tickSet] = useState(0);

  // Current horizontal offset (0..loopWidth) for each lane.
  const positionsRef = useRef<number[]>([]);
  // Whether each lane was on-screen on the previous frame.
  const visibleRef = useRef<boolean[]>([]);

  // Vertical scroll (rAF-throttled) — drives which lane is centered.
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

  // Track viewport size.
  useEffect(() => {
    function onResize() {
      windowSizeSet({ width: window.innerWidth, height: window.innerHeight });
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Set scrollable height so every lane can be brought to center.
  useEffect(() => {
    if (data.length === 0) return;
    document.body.style.height = `${getMaxScroll(data.length)}px`;
    return () => {
      document.body.style.height = '';
    };
  }, [data]);

  // Every lane starts at the beginning of the track and hidden.
  useEffect(() => {
    positionsRef.current = data.map(() => 0);
    visibleRef.current = data.map(() => false);
  }, [data]);

  // Horizontal motion: integrate per-lane velocity over real time and loop.
  useEffect(() => {
    if (data.length === 0) return;
    let rafId: number;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1); // clamp big gaps
      last = now;

      const loopWidth = window.innerWidth || 1280;
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const referenceSpeed = getReferenceSpeed(scrollY, data);

      const positions = positionsRef.current;
      const wasVisible = visibleRef.current;
      for (let i = 0; i < data.length; i++) {
        const offsetY = (i - scrollY / laneSpace) * laneSpace;
        const visible = isLaneVisible(offsetY, viewportHeight);

        // When a lane scrolls into view it adopts the current position of the
        // neighbour it's appearing next to (the one toward the center), so the
        // two start aligned and the speed difference reads clearly as one pulls
        // ahead of the other.
        if (visible && !wasVisible[i]) {
          const neighbor = offsetY < 0 ? i + 1 : i - 1;
          positions[i] =
            neighbor >= 0 && neighbor < data.length
              ? (positions[neighbor] ?? 0)
              : 0;
        }
        wasVisible[i] = visible;

        if (!visible) continue;

        const ratio = Math.max(
          MIN_SPEED_RATIO,
          Math.min(data[i].speed / referenceSpeed, MAX_SPEED_RATIO)
        );
        const pxPerSec = BASE_PX_PER_SEC * ratio;
        positions[i] = ((positions[i] ?? 0) + pxPerSec * dt) % loopWidth;
      }

      tickSet((t) => (t + 1) % 1000000);
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [data]);

  const referenceSpeed = getReferenceSpeed(scroll, data);
  const loopWidth = windowSize.width || 1280;

  return (
    <>
      <div
        className="speed-display"
        role="region"
        aria-label="Emoji speed comparison"
      >
        {data.map(({ emoji, speed, label }, idx) => {
          const offsetY = (idx - scroll / laneSpace) * laneSpace;

          // Don't render lanes once they're completely off-screen.
          if (!isLaneVisible(offsetY, windowSize.height)) {
            return null;
          }

          const x = positionsRef.current[idx] ?? 0;

          // Same clamped ratio the animation uses, so blur spacing tracks the
          // emoji's on-screen speed rather than its raw real-world speed.
          const ratio = Math.max(
            MIN_SPEED_RATIO,
            Math.min(speed / referenceSpeed, MAX_SPEED_RATIO)
          );
          const shadowSpacing = ratio * MOTION_BLUR_SPACING;

          return (
            <div
              className="speed-lane"
              aria-label={`${label}, ${parseSpeed(speed)}`}
              style={{ transform: `translateY(${offsetY}px)` }}
              key={emoji}
            >
              <div className="speed-meta">
                <span>{label}</span>
                <span>{parseSpeed(speed)}</span>
              </div>
              {[0, -loopWidth].map((dx) => (
                <div
                  className="emoji"
                  key={dx}
                  style={{ transform: `translateX(${x + dx}px)` }}
                  aria-hidden={dx !== 0}
                >
                  {/* Motion blur: trailing copies behind the main emoji only.
                      The glyph is flipped (scaleX(-1)) to face its travel
                      direction, so a positive local translateX trails behind it
                      on screen. */}
                  {/* Only blur lanes moving sufficiently faster than the
                      reference; slower ones get no trail. */}
                  {dx === 0 &&
                    ratio > MOTION_BLUR_MIN_RATIO &&
                    Array.from({ length: MOTION_BLUR_SHADOWS }, (_, s) => (
                      <span
                        className="emoji-glyph emoji-blur"
                        key={s}
                        aria-hidden
                        style={{
                          transform: `translate(-50%, -50%) scaleX(-1) translateX(${
                            (s + 1) * shadowSpacing
                          }px)`,
                          // Fade each copy out the further it trails, so the
                          // blur reads as a streak instead of a flat haze.
                          opacity:
                            MOTION_BLUR_OPACITY * (1 - s / MOTION_BLUR_SHADOWS),
                        }}
                      >
                        {emoji}
                      </span>
                    ))}
                  <span className="emoji-glyph">{emoji}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="speedometer" aria-live="polite">
        {parseSpeed(referenceSpeed)}
      </div>
    </>
  );
}

export default EmojiToSpeedApp;
