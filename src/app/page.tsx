"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { quotes } from "@/data/quotes";

const AUTOPLAY_INTERVAL = 8000;
const FADE_DURATION = 400;

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

  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioning = useRef(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

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

      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setDisplayedQuote(quote);
        setIsFading(false);
        isTransitioning.current = false;
      }, fadeDuration);
    },
    []
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

  useEffect(() => {
    const startIndex = Math.floor(Math.random() * quotes.length);
    setCurrentIndex(startIndex);
    setDisplayedQuote(quotes[startIndex]);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted || isPaused) return;
    resetAutoplay();
    return () => {
      if (autoplayRef.current) clearTimeout(autoplayRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

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

  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
    if (autoplayRef.current) clearTimeout(autoplayRef.current);
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

  const quoteNumber = String(currentIndex + 1).padStart(2, "0");

  return (
    <main
      className="container"
      role="main"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top bar */}
      <div className="bar bar-top" aria-hidden="true" />

      {/* Vertical grid lines */}
      <div className="grid-line grid-line-left" aria-hidden="true" />
      <div className="grid-line grid-line-right" aria-hidden="true" />

      {/* Quote area */}
      <div className="quote-area" aria-live="polite" aria-atomic="true">
        <p className={`quote-text ${isFading ? "fade-out" : ""}`}>
          {displayedQuote.text.toUpperCase()}
        </p>
      </div>

      {/* Bottom section */}
      <div className="bottom-section">
        <div className="divider-line" aria-hidden="true" />
        <div className="bottom-content">
          <p className={`author-name ${isFading ? "fade-out" : ""}`}>
            {displayedQuote.author.toUpperCase()}
          </p>
          <span
            className={`quote-number ${isFading ? "fade-out" : ""}`}
            aria-hidden="true"
          >
            {quoteNumber}
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bar bar-bottom" aria-hidden="true" />

      {/* Controls */}
      <nav className="controls" aria-label="Quote navigation">
        <button className="nav-btn" onClick={prev} aria-label="Previous quote">
          <svg viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className="nav-btn" onClick={next} aria-label="Next quote">
          <svg viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button className="nav-btn" onClick={shuffle} aria-label="Random quote">
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
    </main>
  );
}
