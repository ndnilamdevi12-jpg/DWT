import React, { useEffect, useMemo, useState } from 'react';
import { DwtLogo } from './DwtLogo';

interface IntroScreenProps {
  logoSvg: string;
  onComplete: () => void;
}

interface ParticleConfig {
  id: number;
  angleDeg: number;
  orbitRadius: number;
  entryRadius: number;
  exitRadius: number;
  size: number;
  blurPx: number;
  shape: 'circle' | 'diamond' | 'ring' | 'node';
  speedDeg: number;
  opacity: number;
}

/**
 * Exact 5.0-second DecodeWithTech Intro Screen (PRD Sections 5, 6, 7, 8):
 * 0.0 - 1.0s: Orange background; particles enter from outside screen with depth/blur; logo starts small/blurred & zooms in.
 * 1.0 - 2.5s: Logo centered with subtle breathing scale; particles orbit smoothly around logo.
 * 2.0 - 3.5s: "Welcome to" smooth reveal + "DecodeWithTech" typewriter animation.
 * 3.5 - 4.2s: Balanced centered hold with gentle orbital drift & subtle logo breathing.
 * 4.0 - 5.0s: Entire composition zooms out, blur increases, particles disperse outward, logo/text fade out -> automatic transition to Home Page.
 */
export const IntroScreen: React.FC<IntroScreenProps> = ({ logoSvg, onComplete }) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  const particles = useMemo<ParticleConfig[]>(() => {
    const shapes: ParticleConfig['shape'][] = ['circle', 'diamond', 'ring', 'node'];
    return Array.from({ length: 22 }, (_, i) => {
      const baseAngle = (i * 360) / 22;
      const layer = i % 3;
      return {
        id: i,
        angleDeg: baseAngle,
        orbitRadius: 95 + layer * 48 + (i % 4) * 12,
        entryRadius: 520 + (i % 5) * 70,
        exitRadius: 560 + (i % 4) * 80,
        size: 6 + (i % 4) * 4,
        blurPx: layer === 0 ? 0 : layer === 1 ? 1.5 : 3,
        shape: shapes[i % shapes.length],
        speedDeg: (i % 2 === 0 ? 1 : -1) * (18 + (i % 3) * 6),
        opacity: layer === 0 ? 0.85 : layer === 1 ? 0.55 : 0.35,
      };
    });
  }, []);

  useEffect(() => {
    const start = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const diff = now - start;
      if (diff >= 5000) {
        setElapsedMs(5000);
        onComplete();
        return;
      }
      setElapsedMs(diff);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onComplete]);

  const sec = elapsedMs / 1000;

  // Stage calculations
  // 0.0 - 1.0s: entry
  const entryProgress = Math.min(1, Math.max(0, sec / 1.0));
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInCubic = (t: number) => t * t * t;

  // 4.0 - 5.0s: exit
  const isExiting = sec >= 4.0;
  const exitProgress = isExiting ? easeInCubic(Math.min(1, (sec - 4.0) / 1.0)) : 0;

  // Logo scale & blur
  let logoScale = 1;
  let logoBlur = 0;
  let logoOpacity = 1;

  if (sec < 1.0) {
    const p = easeOutCubic(entryProgress);
    logoScale = 0.25 + p * 0.75;
    logoBlur = (1 - p) * 14;
    logoOpacity = Math.min(1, p * 1.25);
  } else if (sec < 4.0) {
    // 1.0 - 4.0s subtle breathing effect
    const breathe = Math.sin((sec - 1.0) * Math.PI * 1.4) * 0.035;
    logoScale = 1 + breathe;
    logoBlur = 0;
    logoOpacity = 1;
  } else {
    logoScale = 1 - exitProgress * 0.32;
    logoBlur = exitProgress * 16;
    logoOpacity = 1 - exitProgress;
  }

  // "Welcome to" smooth reveal (starts at 2.0s, settles by 2.45s)
  const welcomeProgress = Math.min(1, Math.max(0, (sec - 2.0) / 0.45));
  const welcomeOpacity = isExiting ? Math.max(0, 1 - exitProgress * 1.2) : easeOutCubic(welcomeProgress);
  const welcomeTranslateY = (1 - easeOutCubic(welcomeProgress)) * 12;

  // "DecodeWithTech" typewriter animation (starts at 2.35s, completes by 3.45s)
  const brandFullText = 'DecodeWithTech';
  const typingProgress = Math.min(1, Math.max(0, (sec - 2.35) / 1.1));
  const visibleCharCount = Math.floor(typingProgress * brandFullText.length);
  const typedBrandText = sec >= 2.35 ? brandFullText.slice(0, visibleCharCount) : '';
  const showCursor = sec >= 2.35 && sec < 4.1;

  // Overall container exit transform
  const containerScale = isExiting ? 1 - exitProgress * 0.14 : 1;
  const containerBlur = isExiting ? exitProgress * 12 : 0;
  const containerOpacity = isExiting ? 1 - exitProgress : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 45%, #FF8A00 0%, #FF6B00 52%, #EA580C 100%)',
        opacity: sec >= 4.85 ? Math.max(0, (5.0 - sec) / 0.15) : 1,
      }}
      aria-live="polite"
    >
      {/* Abstract 3D Tech/Signal Particles */}
      <div
        className="relative flex flex-col items-center justify-center w-full h-full"
        style={{
          transform: `scale(${containerScale})`,
          filter: containerBlur > 0.1 ? `blur(${containerBlur.toFixed(1)}px)` : 'none',
          opacity: containerOpacity,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {particles.map((pt) => {
            const eP = easeOutCubic(entryProgress);
            let currentRadius = pt.orbitRadius;
            if (sec < 1.0) {
              currentRadius = pt.entryRadius - (pt.entryRadius - pt.orbitRadius) * eP;
            } else if (isExiting) {
              currentRadius = pt.orbitRadius + (pt.exitRadius - pt.orbitRadius) * exitProgress;
            }

            const currentAngleRad = ((pt.angleDeg + sec * pt.speedDeg) * Math.PI) / 180;
            const x = Math.cos(currentAngleRad) * currentRadius;
            const y = Math.sin(currentAngleRad) * currentRadius * 0.78; // Slight 3D perspective tilt
            const ptBlur = pt.blurPx + (sec < 1.0 ? (1 - eP) * 6 : 0) + (isExiting ? exitProgress * 10 : 0);
            const ptOpacity =
              pt.opacity *
              (sec < 0.3 ? sec / 0.3 : 1) *
              (isExiting ? Math.max(0, 1 - exitProgress * 1.15) : 1);

            return (
              <div
                key={pt.id}
                className="absolute"
                style={{
                  width: `${pt.size}px`,
                  height: `${pt.size}px`,
                  transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(sec * 35).toFixed(0)}deg)`,
                  opacity: ptOpacity,
                  filter: ptBlur > 0.2 ? `blur(${ptBlur.toFixed(1)}px)` : 'none',
                }}
              >
                {pt.shape === 'circle' && (
                  <div className="w-full h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                )}
                {pt.shape === 'diamond' && (
                  <div className="w-full h-full rotate-45 bg-yellow-200/90 shadow-[0_0_10px_rgba(254,240,138,0.75)]" />
                )}
                {pt.shape === 'ring' && (
                  <div className="w-full h-full rounded-full border-2 border-white/85" />
                )}
                {pt.shape === 'node' && (
                  <div className="w-full h-full rounded-xs bg-white/90 border border-yellow-300" />
                )}
              </div>
            );
          })}
        </div>

        {/* Center Logo & Typography Composition */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <div
            style={{
              transform: `scale(${logoScale.toFixed(3)})`,
              filter: logoBlur > 0.2 ? `blur(${logoBlur.toFixed(1)}px)` : 'none',
              opacity: logoOpacity,
            }}
            className="p-3 rounded-3xl bg-white/15 backdrop-blur-xs shadow-[0_24px_60px_rgba(0,0,0,0.22)] border border-white/30"
          >
            <DwtLogo svgMarkup={logoSvg} className="w-24 h-24 sm:w-28 sm:h-28" />
          </div>

          <div className="mt-7 min-h-[5.5rem] flex flex-col items-center justify-start">
            <span
              style={{
                opacity: welcomeOpacity,
                transform: `translate3d(0, ${welcomeTranslateY.toFixed(1)}px, 0)`,
              }}
              className="text-sm sm:text-base font-medium tracking-widest text-yellow-100/95"
            >
              Welcome to
            </span>

            <h1 className="mt-1.5 text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-display min-h-[3.2rem] flex items-center">
              <span>{typedBrandText}</span>
              {showCursor && (
                <span
                  className="inline-block w-0.5 h-7 sm:h-10 ml-1 bg-yellow-200 animate-pulse"
                  aria-hidden="true"
                />
              )}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
};
