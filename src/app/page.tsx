"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { quotes, type ColorPalette } from "@/data/quotes";

const AUTOPLAY_INTERVAL = 8000;
const FADE_DURATION = 500;

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedQuote, setDisplayedQuote] = useState(quotes[0]);
  const [mounted, setMounted] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progressState, setProgressState] = useState<
    "running" | "paused" | "reset"
  >("running");
  const [pausedWidth, setPausedWidth] = useState(0);

  const gradientRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioning = useRef(false);
  const reducedMotion = useRef(false);
  const animationFrameId = useRef<number>(0);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const smoothedPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  // Cursor spotlight effect
  useEffect(() => {
    if (reducedMotion.current) return;
    const spotlightEl = spotlightRef.current;
    if (!spotlightEl) return;

    const handleMove = (e: MouseEvent) => {
      mouseTarget.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      smoothedPos.current.x += (mouseTarget.current.x - smoothedPos.current.x) * 0.08;
      smoothedPos.current.y += (mouseTarget.current.y - smoothedPos.current.y) * 0.08;
      spotlightEl.style.setProperty("--spotlight-x", `${smoothedPos.current.x}px`);
      spotlightEl.style.setProperty("--spotlight-y", `${smoothedPos.current.y}px`);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", handleMove);
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const setPalette = useCallback(
    (palette: ColorPalette) => {
      const gradientEl = gradientRef.current;
      if (!gradientEl) return;
      gradientEl.style.setProperty("--gradient-1", palette[0]);
      gradientEl.style.setProperty("--gradient-2", palette[1]);
      gradientEl.style.setProperty("--gradient-3", palette[2]);
      gradientEl.style.setProperty("--gradient-4", palette[3]);
    },
    []
  );

  const startProgress = useCallback(() => {
    setProgressState("reset");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setProgressState("running");
      });
    });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning.current) return;
      isTransitioning.current = true;

      const nextIndex =
        ((index % quotes.length) + quotes.length) % quotes.length;
      const quote = quotes[nextIndex];
      const fadeDuration = reducedMotion.current ? 0 : FADE_DURATION;

      setIsFading(true);
      setPalette(quote.palette);

      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setDisplayedQuote(quote);
        setIsFading(false);
        isTransitioning.current = false;
      }, fadeDuration);
    },
    [setPalette]
  );

  const resetAutoplay = useCallback(
    (targetIndex?: number) => {
      if (autoplayRef.current) clearTimeout(autoplayRef.current);
      startProgress();
      const resolvedIndex = targetIndex ?? currentIndex;
      autoplayRef.current = setTimeout(() => {
        const nextIdx = ((resolvedIndex + 1) % quotes.length + quotes.length) % quotes.length;
        goTo(nextIdx);
      }, AUTOPLAY_INTERVAL);
    },
    [currentIndex, goTo, startProgress]
  );

  const next = useCallback(() => {
    const nextIdx = currentIndex + 1;
    goTo(nextIdx);
    if (autoplayRef.current) clearTimeout(autoplayRef.current);
    const resolved = ((nextIdx % quotes.length) + quotes.length) % quotes.length;
    const fadeDuration = reducedMotion.current ? 0 : FADE_DURATION;
    setTimeout(() => {
      resetAutoplay(resolved);
    }, fadeDuration);
  }, [currentIndex, goTo, resetAutoplay]);

  const prev = useCallback(() => {
    const prevIdx = currentIndex - 1;
    goTo(prevIdx);
    if (autoplayRef.current) clearTimeout(autoplayRef.current);
    const resolved = ((prevIdx % quotes.length) + quotes.length) % quotes.length;
    const fadeDuration = reducedMotion.current ? 0 : FADE_DURATION;
    setTimeout(() => {
      resetAutoplay(resolved);
    }, fadeDuration);
  }, [currentIndex, goTo, resetAutoplay]);

  const shuffle = useCallback(() => {
    let randomIdx: number;
    do {
      randomIdx = Math.floor(Math.random() * quotes.length);
    } while (randomIdx === currentIndex && quotes.length > 1);
    goTo(randomIdx);
    if (autoplayRef.current) clearTimeout(autoplayRef.current);
    const fadeDuration = reducedMotion.current ? 0 : FADE_DURATION;
    setTimeout(() => {
      resetAutoplay(randomIdx);
    }, fadeDuration);
  }, [currentIndex, goTo, resetAutoplay]);

  // Randomize starting quote after mount to avoid hydration mismatch
  useEffect(() => {
    const startIndex = Math.floor(Math.random() * quotes.length);
    setCurrentIndex(startIndex);
    setDisplayedQuote(quotes[startIndex]);
    setPalette(quotes[startIndex].palette);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoplay — start after mount so the randomized index is used
  useEffect(() => {
    if (!mounted || isPaused) return;
    resetAutoplay();
    return () => {
      if (autoplayRef.current) clearTimeout(autoplayRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prev();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  // Touch swipe
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 50) {
        dx < 0 ? next() : prev();
      }
    },
    [next, prev]
  );

  // Hover pause
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
    if (autoplayRef.current) clearTimeout(autoplayRef.current);
    // Capture current progress width
    const bar = progressBarRef.current;
    const track = progressTrackRef.current;
    if (bar && track) {
      const barWidth = parseFloat(getComputedStyle(bar).width);
      const trackWidth = parseFloat(getComputedStyle(track).width);
      const progressPercent = trackWidth > 0 ? (barWidth / trackWidth) * 100 : 0;
      setPausedWidth(progressPercent);
      setProgressState("paused");
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
    setProgressState("running");
    const remaining = AUTOPLAY_INTERVAL * (1 - pausedWidth / 100);
    autoplayRef.current = setTimeout(() => {
      next();
    }, remaining);
  }, [pausedWidth, next]);

  const progressClassName = [
    "progress-bar",
    progressState === "running" ? "running" : "",
    progressState === "paused" ? "paused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const progressStyle: React.CSSProperties =
    progressState === "paused"
      ? { width: `${pausedWidth}%` }
      : progressState === "reset"
        ? { width: "0%" }
        : {};

  return (
    <>
      <div className="gradient-layer" ref={gradientRef} aria-hidden="true" />
      <div className="spotlight" ref={spotlightRef} aria-hidden="true" />
      <main className="container" role="main">
        <div
          className="card"
          aria-live="polite"
          aria-atomic="true"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="card-left">
            <div className="quote-wrapper">
              <p className={`quote-text ${isFading ? "fade-out" : ""}`}>
                {displayedQuote.text}
              </p>
            </div>
            <nav className="nav" aria-label="Quote navigation">
              <button
                className="nav-btn"
                onClick={prev}
                aria-label="Previous quote"
              >
                <svg viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className="nav-btn"
                onClick={next}
                aria-label="Next quote"
              >
                <svg viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                className="nav-btn"
                onClick={shuffle}
                aria-label="Random quote"
              >
                <svg viewBox="0 0 24 24">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              </button>
              <div
                className="progress-track"
                ref={progressTrackRef}
                role="progressbar"
                aria-label="Auto-advance timer"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={0}
              >
                <div
                  className={progressClassName}
                  ref={progressBarRef}
                  style={progressStyle}
                />
              </div>
              <span className="counter" aria-hidden="true">
                {currentIndex + 1} / {quotes.length}
              </span>
            </nav>
          </div>
          <div className="card-right">
            <p className={`author-name ${isFading ? "fade-out" : ""}`}>
              {displayedQuote.author}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
