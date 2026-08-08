'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { EmojiSpeedData } from './db';

// Vertical px between lanes — controls scroll-to-lane mapping and lane height.
const laneSpace = 120;
// Height of a single lane (matches `.speed-lane` in style.css).
const laneHeight = 140;
// Extra lanes kept "active" beyond the visible edge, on each side. These are
// already racing (and so already in their correct position) before they scroll
// into view, so a lane never pops in at a stale spot at the screen edge.
const BUFFER_LANES = 1;
// Vertical px over which a lane fades between transparent (at the edge) and fully
// visible, so emojis appear from opacity rather than popping in.
const FADE_DISTANCE = laneSpace * 1.5;
// On-screen px/s of the *reference* (centered) emoji — the visual baseline.
const BASE_PX_PER_SEC = 150;
// Clamp how much faster/slower than the reference anything can visually move,
// so extreme real-world ratios (sloth vs shark) don't visually teleport.
const MAX_SPEED_RATIO = 12;
const MIN_SPEED_RATIO = 1 / MAX_SPEED_RATIO;

// Per-emoji extra CSS transforms, applied *only* in the speed renderer. Fed to
// the `--emoji-extra-transform` custom property, which `.speed-lane .emoji span`
// appends after the glyph's base transform (centered, and flipped to face its
// direction of travel) — so use relative ops like rotate/scale. Going through a
// custom property means the base transform lives in exactly one place, the CSS.
const EMOJI_TRANSFORMS: Record<string, string> = {
  '🚀': 'rotate(135deg) scaleY(-100%)',
  '🌎': 'scaleX(-100%)',
  '☄️': 'rotate(-45deg)',
  '🛩️': 'scaleX(-100%)',
  '🐌': 'scaleX(-100%)',
  '🛫': 'scaleX(-100%)',
};

// Lane geometry is authored here and pushed to CSS as custom properties on the
// `.speed-display` root (see the render below), so the JS math and the
// stylesheet can't drift apart.
const LANE_GEOMETRY_VARS = {
  '--lane-space': `${laneSpace}px`,
  '--lane-height': `${laneHeight}px`,
} as CSSProperties;

// useLayoutEffect warns when run on the server; fall back to useEffect there so
// the initial positioning pass stays pre-paint in the browser without noise.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// A lane is "active" (worth animating) while on screen or within the buffer just
// beyond either edge, so buffered lanes are already in position when revealed.
function isLaneVisible(offsetY: number, viewportHeight: number): boolean {
  return (
    Math.abs(offsetY) <=
    viewportHeight / 2 + laneHeight / 2 + BUFFER_LANES * laneSpace
  );
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
  // horizontal motion ever triggers a React re-render. The component holds no
  // state at all — source disclosure is a native <details> — so after mount it
  // never re-renders and these refs are stable for the lifetime of the page.
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
        const wasVisibleLane = wasVisible[i];
        const copies = emojiNodes[i];

        // When a lane scrolls into view it adopts the current position of the
        // neighbour it's appearing next to (the one toward the center), so the
        // two start aligned and the speed difference reads clearly as one pulls
        // ahead of the other. It's also promoted to its own compositor layer
        // here — only while on screen — so off-screen lanes don't each keep a
        // layer alive (the cost `content-visibility` used to absorb).
        if (visible && !wasVisibleLane) {
          const neighbor = offsetY < 0 ? i + 1 : i - 1;
          positions[i] =
            neighbor >= 0 && neighbor < data.length
              ? (positions[neighbor] ?? 0)
              : 0;
          if (copies?.[0]) copies[0].style.willChange = 'transform';
          if (copies?.[1]) copies[1].style.willChange = 'transform';
        }

        wasVisible[i] = visible;

        if (!visible) {
          // Drop the layer again as the lane leaves the screen.
          if (wasVisibleLane && copies) {
            if (copies[0]) copies[0].style.willChange = '';
            if (copies[1]) copies[1].style.willChange = '';
          }
          continue;
        }

        // Clamped on-screen speed ratio relative to the reference lane, so the
        // glyph tracks its visual speed rather than its raw real speed.
        const ratio = Math.max(
          MIN_SPEED_RATIO,
          Math.min(data[i].speed / referenceSpeed, MAX_SPEED_RATIO)
        );
        const pxPerSec = BASE_PX_PER_SEC * ratio;
        const x = ((positions[i] ?? 0) + pxPerSec * dt) % loopWidth;
        positions[i] = x;

        // Fade in/out near the top and bottom edges, so emojis appear from
        // transparent rather than popping in. Fully opaque toward the center,
        // ramping to 0 over FADE_DISTANCE as the lane reaches the edge.
        const opacity = Math.max(
          0,
          Math.min(
            (viewportHeight / 2 + laneHeight / 2 - Math.abs(offsetY)) /
              FADE_DISTANCE,
            1
          )
        ).toFixed(3);

        // Primary copy at x, wrap copy one loop-width behind, for seamless loop.
        if (copies) {
          if (copies[0]) {
            copies[0].style.transform = `translateX(${x}px)`;
            copies[0].style.opacity = opacity;
          }
          if (copies[1]) {
            copies[1].style.transform = `translateX(${x - loopWidth}px)`;
            copies[1].style.opacity = opacity;
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
    // Lazily set on the first frame so its dt is 0. The gap between mount and the
    // first frame (hydration) would otherwise clamp to 0.1s and make fast lanes
    // leap ~180px on load instead of starting aligned with their neighbour.
    let last = 0;

    function frame(now: number) {
      const dt = last === 0 ? 0 : Math.min((now - last) / 1000, 0.1); // clamp big gaps
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
        style={LANE_GEOMETRY_VARS}
        role="region"
        aria-label="Emoji speed comparison"
      >
        {data.map(({ emoji, speed, label, source }, idx) => {
          // Extra speed-renderer-only transform for this emoji, if configured.
          const extraTransform = EMOJI_TRANSFORMS[emoji];
          const speedText = parseSpeed(speed);

          return (
            <div className="speed-lane" key={emoji}>
              <div className="speed-meta">
                <span>{label}</span>
                {/* Native <details> rather than a React-state toggle: it keeps
                    this component stateless (so it never re-renders after mount)
                    and puts every source citation in the server-rendered HTML.
                    The whole speed line is the <summary> — an inline-block
                    <details> takes its baseline from its last line box, which
                    would visibly shift `[?]` upward when the panel opens. */}
                {source ? (
                  <details className="speed-source-details">
                    <summary>
                      {speedText} <span className="speed-source-toggle">[?]</span>
                    </summary>
                    <span className="speed-source">
                      {source.description}
                      {source.url && (
                        <>
                          {' '}
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            source
                          </a>
                        </>
                      )}
                    </span>
                  </details>
                ) : (
                  <span>{speedText}</span>
                )}
              </div>
              {/* Both copies are aria-hidden: the lane's name and speed are
                  already real text in `.speed-meta`, so exposing the glyphs
                  would just announce "snail" on top of "Snail, 0.05 km/h". */}
              {[0, 1].map((copy) => (
                <div
                  className="emoji"
                  key={copy}
                  ref={(node) => {
                    (emojiNodesRef.current[idx] ||= [])[copy] = node;
                  }}
                  aria-hidden
                >
                  <span
                    className="emoji-glyph"
                    style={
                      extraTransform
                        ? ({
                            '--emoji-extra-transform': extraTransform,
                          } as CSSProperties)
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

      {/* No `aria-live`: this updates many times per second while scrolling, and
          polite announcements queue rather than replace — a screen reader would
          fall ever further behind reading a backlog of intermediate speeds. The
          per-lane speeds are static text in `.speed-meta` instead. */}
      <div className="speedometer" ref={speedometerRef} />
    </>
  );
}

export default EmojiToSpeedApp;
