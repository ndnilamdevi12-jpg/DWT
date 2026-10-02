import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Volume2,
  Play,
  Pause,
  Square,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { ArticleItem } from '../types';

interface ArticleViewProps {
  article: ArticleItem;
  onBack: () => void;
}

interface StorySection {
  id: string;
  number: string;
  label: string;
  subtitle: string;
  body: string;
  isHighlight?: boolean;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ article, onBack }) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Audio / TTS state (PRD Sections 21 & 55)
  const [playState, setPlayState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [progressPct, setProgressPct] = useState(0);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);

  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Construct the structured story sections in clean English (PRD Section 19):
  // TITLE -> INTRODUCTION -> HISTORY -> MAIN STORY -> HOW IT WORKS -> IMPORTANT DETAILS -> CONCLUSION
  const sections = useMemo<StorySection[]>(() => {
    const list: StorySection[] = [
      {
        id: 'introduction',
        number: '01',
        label: 'Introduction',
        subtitle: 'Overview & Context',
        body: article.introduction,
      },
      {
        id: 'history',
        number: '02',
        label: 'History & Origin',
        subtitle: 'How It All Started',
        body: article.history,
      },
      {
        id: 'main_story',
        number: '03',
        label: 'Main Story',
        subtitle: 'Core Concept',
        body: article.main_story,
      },
      {
        id: 'how_it_works',
        number: '04',
        label: 'How It Works',
        subtitle: 'System Architecture',
        body: article.how_it_works,
      },
      {
        id: 'important_details',
        number: '05',
        label: 'Important Details',
        subtitle: 'Key Engineering Takeaways',
        body: article.important_details,
        isHighlight: true,
      },
      {
        id: 'conclusion',
        number: '06',
        label: 'Conclusion',
        subtitle: 'Final Summary',
        body: article.conclusion,
      },
    ].filter((s) => Boolean(s.body && s.body.trim()));

    if (article.content && article.content.trim()) {
      list.push({
        id: 'additional_content',
        number: String(list.length + 1).padStart(2, '0'),
        label: 'Complete Notes',
        subtitle: 'Extended Breakdown',
        body: article.content,
      });
    }

    return list;
  }, [article]);

  // Split full narrative into sentence chunks for synchronized local TTS reading
  const speechChunks = useMemo<string[]>(() => {
    const pieces: string[] = [article.title, article.short_description];
    sections.forEach((sec) => {
      pieces.push(`${sec.label}.`);
      const sentences = sec.body
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      pieces.push(...sentences);
    });
    return pieces.filter(Boolean);
  }, [article.title, article.short_description, sections]);

  const hasUploadedAudio = Boolean(article.audio_url && article.audio_url.trim());

  // Clean up audio/TTS on unmount
  useEffect(() => {
    return () => {
      if (synthTimerRef.current) {
        window.clearInterval(synthTimerRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (htmlAudioRef.current) {
        htmlAudioRef.current.pause();
      }
    };
  }, [article.id]);

  // Speak a specific chunk index via browser-local SpeechSynthesis (with fallback cadence timer if voice unavailable)
  const speakChunkAt = (index: number) => {
    if (index >= speechChunks.length) {
      setPlayState('idle');
      setProgressPct(100);
      setActiveChunkIndex(0);
      return;
    }

    setActiveChunkIndex(index);
    const pct = Math.round((index / Math.max(1, speechChunks.length)) * 100);
    setProgressPct(pct);

    const text = speechChunks[index];

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const englishVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
          utterance.lang = englishVoice.lang;
        } else {
          utterance.lang = 'en-US';
        }
        utterance.rate = 0.98;

        utterance.onend = () => {
          speakChunkAt(index + 1);
        };
        utterance.onerror = () => {
          setPlayState('idle');
        };

        activeUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        // Fallback timer below
      }
    }

    // Fallback offline cadence reader if speechSynthesis is restricted
    const durationMs = Math.max(1500, Math.min(5000, text.length * 55));
    synthTimerRef.current = window.setTimeout(() => {
      speakChunkAt(index + 1);
    }, durationMs);
  };

  const handlePlayOrResume = () => {
    if (hasUploadedAudio && htmlAudioRef.current) {
      htmlAudioRef.current.play();
      setPlayState('playing');
      return;
    }

    if (playState === 'paused') {
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setPlayState('playing');
        return;
      }
      setPlayState('playing');
      speakChunkAt(activeChunkIndex);
      return;
    }

    setPlayState('playing');
    const startIdx = progressPct >= 100 ? 0 : activeChunkIndex;
    speakChunkAt(startIdx);
  };

  const handlePause = () => {
    if (hasUploadedAudio && htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      setPlayState('paused');
      return;
    }

    if (synthTimerRef.current) {
      window.clearTimeout(synthTimerRef.current);
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    setPlayState('paused');
  };

  const handleStop = () => {
    if (hasUploadedAudio && htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
    }
    if (synthTimerRef.current) {
      window.clearTimeout(synthTimerRef.current);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayState('idle');
    setProgressPct(0);
    setActiveChunkIndex(0);
  };

  const handleProgressSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPct = Number(e.target.value);
    setProgressPct(newPct);

    if (hasUploadedAudio && htmlAudioRef.current && htmlAudioRef.current.duration) {
      htmlAudioRef.current.currentTime = (newPct / 100) * htmlAudioRef.current.duration;
      return;
    }

    const targetIdx = Math.min(
      speechChunks.length - 1,
      Math.floor((newPct / 100) * speechChunks.length)
    );
    setActiveChunkIndex(targetIdx);
    if (playState === 'playing') {
      speakChunkAt(targetIdx);
    }
  };

  // JSON-LD Article structured data (PRD Section 63)
  const articleSchemaJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.title,
    description: article.short_description,
    author: {
      '@type': 'Organization',
      name: 'DecodeWithTech',
    },
    publisher: {
      '@type': 'Organization',
      name: 'DecodeWithTech',
    },
  });

  return (
    <article className="max-w-[820px] mx-auto px-4 sm:px-6 pt-6 pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: articleSchemaJson }}
      />

      {/* Top Back Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-[#EA580C] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explain</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <BookOpen className="w-3.5 h-3.5 text-[#FF6B00]" />
          <span>DecodeWithTech Explain</span>
          <span aria-hidden="true">·</span>
          <span>Story #{String(article.display_order).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Large Hero Thumbnail */}
      <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-orange-50 border border-orange-500/20 shadow-[0_12px_36px_rgba(249,115,22,0.08)] mb-8">
        {!imgFailed && article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt={article.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-orange-50 to-amber-50">
            <BookOpen className="w-12 h-12 text-[#FF6B00] mb-3" />
            <p className="text-base font-bold text-neutral-900 font-display">{article.title}</p>
          </div>
        )}
      </div>

      {/* Article Header: TITLE + SHORT INTRODUCTION */}
      <header className="pb-8 border-b border-neutral-200">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-950 font-display leading-tight">
          {article.title}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-neutral-700 font-medium leading-relaxed">
          {article.short_description}
        </p>
      </header>

      {/* Structured Story Body (PRD Section 19 & 20) */}
      <div className="mt-8 space-y-10">
        {sections.map((sec) => {
          if (sec.isHighlight) {
            return (
              <section
                key={sec.id}
                className="p-6 sm:p-8 rounded-3xl bg-orange-50/70 border-l-4 border-[#FF6B00] shadow-2xs"
              >
                <div className="flex items-center gap-2 text-xs font-mono-num text-[#EA580C] font-semibold mb-2">
                  <span>{sec.number}.</span>
                  <span>{sec.label}</span>
                  <span aria-hidden="true">·</span>
                  <span>{sec.subtitle}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-950 font-display mb-3">
                  {sec.label}
                </h2>
                <div className="text-base sm:text-[17px] text-neutral-900 leading-[1.8] whitespace-pre-line font-editorial">
                  {sec.body}
                </div>
              </section>
            );
          }

          return (
            <section key={sec.id} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono-num text-[#EA580C] font-semibold">
                <span>{sec.number}.</span>
                <span>{sec.label}</span>
                <span aria-hidden="true">·</span>
                <span>{sec.subtitle}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-950 font-display">
                {sec.label}
              </h2>
              <div className="text-base sm:text-[17px] text-neutral-800 leading-[1.85] whitespace-pre-line font-editorial max-w-[70ch]">
                {sec.body}
              </div>
            </section>
          );
        })}
      </div>

      {/* Optional Hidden HTML5 Audio Element when Admin Uploaded Audio exists */}
      {hasUploadedAudio && (
        <audio
          ref={htmlAudioRef}
          src={article.audio_url}
          onTimeUpdate={() => {
            const el = htmlAudioRef.current;
            if (el && el.duration) {
              setProgressPct(Math.round((el.currentTime / el.duration) * 100));
            }
          }}
          onEnded={() => {
            setPlayState('idle');
            setProgressPct(100);
          }}
        />
      )}

      {/* Floating Audio / Read Story Player (PRD Sections 20, 21, 55) */}
      <div className="fixed bottom-4 left-4 right-4 z-30 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full max-w-xl bg-white/95 backdrop-blur-md border border-orange-500/30 rounded-2xl shadow-[0_12px_36px_rgba(10,10,10,0.14)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-950 whitespace-nowrap">
                  Listen to Story
                </span>
                <span className="text-[11px] text-[#EA580C] font-mono-num font-semibold">
                  {progressPct}%
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 truncate">
                {playState === 'playing'
                  ? speechChunks[activeChunkIndex] || article.title
                  : playState === 'paused'
                  ? 'Paused — Click Resume to continue'
                  : 'Listen to the full story aloud (Offline Ready)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Seek / Progress Slider */}
            <input
              type="range"
              min={0}
              max={100}
              value={progressPct}
              onChange={handleProgressSeek}
              aria-label="Story audio progress"
              className="w-24 sm:w-28 accent-[#FF6B00] cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
            />

            {playState === 'playing' ? (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Pause className="w-3.5 h-3.5 fill-white" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlayOrResume}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{playState === 'paused' ? 'Resume' : 'Listen'}</span>
              </button>
            )}

            {(playState !== 'idle' || progressPct > 0) && (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                aria-label="Stop reading"
                title="Stop"
              >
                {progressPct >= 100 ? (
                  <RotateCcw className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5 fill-neutral-700" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
