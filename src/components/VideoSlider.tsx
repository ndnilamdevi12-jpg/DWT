import React, { useState, useEffect } from 'react';
import { Play, ChevronLeft, ChevronRight, ExternalLink, Youtube } from 'lucide-react';
import { VideoItem } from '../types';

interface VideoSliderProps {
  videos: VideoItem[];
  onViewMore?: () => void;
}

export const VideoSlider: React.FC<VideoSliderProps> = ({ videos, onViewMore }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlayingEmbed, setIsPlayingEmbed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  // Keep activeIndex in bounds when video list changes
  useEffect(() => {
    if (activeIndex >= videos.length) {
      setActiveIndex(0);
    }
    setIsPlayingEmbed(false);
  }, [videos.length, activeIndex]);

  if (videos.length === 0) {
    return null;
  }

  const activeVideo = videos[activeIndex] || videos[0];

  const handlePrev = () => {
    setIsPlayingEmbed(false);
    setActiveIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsPlayingEmbed(false);
    setActiveIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
  };

  const getThumbnailSrc = (video: VideoItem) => {
    if (imgErrorMap[video.id]) {
      return `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`;
    }
    return video.thumbnail || `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`;
  };

  return (
    <section className="w-full" aria-label="Featured YouTube Videos">
      {/* Main Featured Video Card */}
      <div
        className="relative bg-white rounded-3xl border border-orange-500/20 shadow-[0_12px_40px_rgba(249,115,22,0.08)] overflow-hidden transition-all"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Video Stage (16:9) */}
          <div className="lg:col-span-8 relative aspect-video bg-neutral-950 overflow-hidden">
            {isPlayingEmbed && activeVideo.youtube_id ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtube_id}?autoplay=1&rel=0`}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="relative w-full h-full group">
                <img
                  src={getThumbnailSrc(activeVideo)}
                  alt={activeVideo.title}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setImgErrorMap((prev) => ({
                      ...prev,
                      [activeVideo.id]: true,
                    }))
                  }
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {/* Measured contrast scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Center Play Button */}
                <button
                  type="button"
                  onClick={() => setIsPlayingEmbed(true)}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer focus:outline-none"
                  aria-label={`Play ${activeVideo.title}`}
                >
                  <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FF6B00] hover:bg-[#EA580C] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(255,107,0,0.55)] transition-transform duration-150 group-hover:scale-110 border-2 border-white/90">
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white ml-1" />
                  </span>
                </button>

                {/* Bottom Overlay Title on Mobile / Tablet */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/90">
                    <Youtube className="w-4 h-4 text-[#FF6B00]" />
                    <span>DecodeWithTech Official Video</span>
                    {activeVideo.category && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{activeVideo.category}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Featured Video Details & Actions */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between bg-white">
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
                <span>
                  Featured Video <span aria-hidden="true">·</span>{' '}
                  <span className="font-mono-num text-[#EA580C] font-semibold">
                    {String(activeIndex + 1).padStart(2, '0')} / {String(videos.length).padStart(2, '0')}
                  </span>
                </span>

                {videos.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="w-8 h-8 rounded-lg border border-neutral-200 hover:border-orange-400 hover:bg-orange-50 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Previous video"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-8 h-8 rounded-lg border border-neutral-200 hover:border-orange-400 hover:bg-orange-50 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Next video"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-neutral-950 font-display leading-snug">
                {activeVideo.title}
              </h2>

              {activeVideo.description && (
                <p className="mt-3 text-sm text-neutral-600 leading-relaxed line-clamp-4">
                  {activeVideo.description}
                </p>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row lg:flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setIsPlayingEmbed(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Here</span>
              </button>

              <a
                href={activeVideo.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-50 hover:bg-orange-50 text-neutral-900 hover:text-[#EA580C] border border-neutral-200/90 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <span>Open on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Video Selection Cards / Indicators Below (PRD Section 14) */}
      {videos.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
            {videos.slice(0, 3).map((video, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => {
                    setIsPlayingEmbed(false);
                    setActiveIndex(idx);
                  }}
                  className={`group flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50/70 border-[#FF6B00] shadow-xs'
                      : 'bg-white border-neutral-200/80 hover:border-orange-300'
                  }`}
                >
                  <div className="relative w-20 sm:w-24 aspect-video rounded-xl overflow-hidden bg-neutral-900 shrink-0">
                    <img
                      src={getThumbnailSrc(video)}
                      alt={video.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${
                        isSelected ? 'bg-black/20' : 'bg-black/40 group-hover:bg-black/20'
                      }`}
                    >
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono-num text-[#EA580C] font-semibold">
                      Video {String(idx + 1).padStart(2, '0')}
                    </p>
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isSelected ? 'text-neutral-950' : 'text-neutral-700'
                      }`}
                    >
                      {video.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {onViewMore && videos.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onViewMore}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#EA580C] hover:text-[#C2410C] transition-colors cursor-pointer"
          >
            <span>More Videos →</span>
          </button>
        </div>
      )}
    </section>
  );
};
