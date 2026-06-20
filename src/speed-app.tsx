'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { EmojiSpeedData } from './db';

// Vertical px between lanes — controls scroll-to-lane mapping and lane height.
const laneSpace = 120;
// Height of a single lane (matches `.speed-lane` in style.css).
const laneHeight = 140;
// On-screen px/s of the *reference* (centered) emoji — the visual baseline.
const BASE_PX_PER_SEC = 150;
// Clamp how much faster/slower than the reference anything can visually move,
// so extreme real-world ratios (sloth vs shark) don't visually teleport.
const MAX_SPEED_RATIO = 12;
const MIN_SPEED_RATIO = 1 / MAX_SPEED_RATIO;

// Per-emoji extra CSS transforms, applied *only* in the speed renderer. The
// value is appended after the glyph's base transform (which centers and flips
// it to face its direction of travel), so use relative ops like rotate/scale.
const EMOJI_TRANSFORMS: Record<string, string> = {
  '🚀': 'rotate(135deg) scaleY(-100%)',
  '🌎': 'scaleX(-100%)',
  '☄️': 'rotate(-45deg)',
  '🛩️': 'scaleX(-100%)',
  '🐌': 'scaleX(-100%)',
  '🛫': 'scaleX(-100%)',
};

// Base transform every lane glyph already gets from CSS: centered and flipped
// to face its travel direction. Rebuilt here so per-emoji transforms can be
// appended on top of it inline.
const GLYPH_BASE_TRANSFORM = 'translate(-50%, -50%) scaleX(-1)';

// useLayoutEffect warns when run on the server; fall back to useEffect there so
// the initial positioning pass stays pre-paint in the browser without noise.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
  // Current horizontal offset (0..loopWidth) for each lane.
  const positionsRef = useRef<number[]>([]);
  // Whether each lane was on-screen on the previous frame.
  const visibleRef = useRef<boolean[]>([]);

  // The whole lane tree is rendered once (per `data`) and stays mounted. Vertical
  // position is native scroll (CSS flow); the animation loop only writes each
  // on-screen lane's horizontal transform directly, so neither scroll nor the
  // horizontal motion ever triggers a React re-render. Off-screen lanes are skipped
  // by CSS `content-visibility: auto`, so they cost no paint or compositor layers.
  // Per lane: the two `.emoji` wrapper copies (primary + wrap copy).
  const emojiNodesRef = useRef<(HTMLDivElement | null)[][]>([]);
  // The speedometer readout, updated imperatively to avoid re-renders.
  const speedometerRef = useRef<HTMLDivElement | null>(null);
  const lastSpeedTextRef = useRef('');

  // Cached viewport geometry and scroll position. The per-frame loop reads these
  // plain numbers instead of `window.*`, so it never forces a synchronous reflow.
  // They're refreshed only by the passive scroll/resize listeners below — which
  // matters on iOS, where the toolbar collapse keeps `vh`-based layout dirty and
  // any in-loop `window.scrollY`/`innerHeight` read would thrash layout 60×/sec.
  const scrollYRef = useRef(0);
  const viewportWidthRef = useRef(0);
  const viewportHeightRef = useRef(0);

  // Single source of motion: positions every lane for the given timestep and
  // flushes the result straight to the DOM. Called once for first paint and
  // then every animation frame — never schedules a React render.
  const positionAll = useCallback(
    (dt: number) => {
      if (data.length === 0) return;

      const loopWidth = viewportWidthRef.current || 1280;
      const scrollY = scrollYRef.current;
      const viewportHeight = viewportHeightRef.current;
      const referenceSpeed = getReferenceSpeed(scrollY, data);

      const positions = positionsRef.current;
      const wasVisible = visibleRef.current;
      const emojiNodes = emojiNodesRef.current;

      for (let i = 0; i < data.length; i++) {
        // Vertical position is native scroll, so this offset is used only to
        // decide which lanes are on-screen and therefore worth animating. It's
        // pure math from cached scroll/viewport values — no DOM read.
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

        // Clamped on-screen speed ratio relative to the reference lane, so the
        // glyph tracks its visual speed rather than its raw real speed.
        const ratio = Math.max(
          MIN_SPEED_RATIO,
          Math.min(data[i].speed / referenceSpeed, MAX_SPEED_RATIO)
        );
        const pxPerSec = BASE_PX_PER_SEC * ratio;
        const x = ((positions[i] ?? 0) + pxPerSec * dt) % loopWidth;
        positions[i] = x;

        // Primary copy at x, wrap copy one loop-width behind, for seamless loop.
        const copies = emojiNodes[i];
        if (copies) {
          if (copies[0]) copies[0].style.transform = `translateX(${x}px)`;
          if (copies[1]) {
            copies[1].style.transform = `translateX(${x - loopWidth}px)`;
          }
        }
      }

      // Speedometer readout — write only when the formatted value changes, both
      // to skip needless DOM work and to avoid spamming the aria-live region.
      const speedText = parseSpeed(referenceSpeed);
      const speedometer = speedometerRef.current;
      if (speedometer && lastSpeedTextRef.current !== speedText) {
        speedometer.textContent = speedText;
        lastSpeedTextRef.current = speedText;
      }
    },
    [data]
  );

  // Keep the cached geometry fresh from passive listeners, so the animation loop
  // never reads `window.*` (and never forces a reflow) on its own. `scroll` and
  // `resize` cover desktop; `visualViewport` covers the iOS toolbar collapse,
  // which fires `visualViewport` events but not always `window.resize`. The
  // scrollable height is defined by CSS flow (the `.speed-display` spacers), so
  // nothing here touches layout.
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    const onResize = () => {
      viewportWidthRef.current = window.innerWidth;
      viewportHeightRef.current = window.innerHeight;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      vv?.removeEventListener('resize', onResize);
    };
  }, []);

  // Seed positions/visibility and lay everything out once before first paint,
  // so initially-visible lanes show in place rather than flashing in.
  useIsomorphicLayoutEffect(() => {
    positionsRef.current = data.map(() => 0);
    visibleRef.current = data.map(() => false);
    lastSpeedTextRef.current = '';
    // Seed cached geometry so the first paint has real values to position with.
    scrollYRef.current = window.scrollY;
    viewportWidthRef.current = window.innerWidth;
    viewportHeightRef.current = window.innerHeight;
    positionAll(0);
  }, [data, positionAll]);

  // Continuous motion: integrate per-lane velocity over real time and loop.
  useEffect(() => {
    if (data.length === 0) return;
    let rafId: number;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1); // clamp big gaps
      last = now;
      positionAll(dt);
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [data, positionAll]);

  return (
    <>
      <div
        className="speed-display"
        role="region"
        aria-label="Emoji speed comparison"
      >
        {data.map(({ emoji, speed, label }, idx) => {
          // Extra speed-renderer-only transform for this emoji, if configured.
          const extraTransform = EMOJI_TRANSFORMS[emoji] ?? '';

          return (
            <div
              className="speed-lane"
              aria-label={`${label}, ${parseSpeed(speed)}`}
              key={emoji}
            >
              <div className="speed-meta">
                <span>{label}</span>
                <span>{parseSpeed(speed)}</span>
              </div>
              {[0, 1].map((copy) => (
                <div
                  className="emoji"
                  key={copy}
                  ref={(node) => {
                    (emojiNodesRef.current[idx] ||= [])[copy] = node;
                  }}
                  aria-hidden={copy !== 0}
                >
                  <span
                    className="emoji-glyph"
                    style={
                      extraTransform
                        ? {
                            transform: `${GLYPH_BASE_TRANSFORM} ${extraTransform}`,
                          }
                        : undefined
                    }
                  >
                    {emoji}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="speedometer" ref={speedometerRef} aria-live="polite" />
    </>
  );
}

export default EmojiToSpeedApp;
