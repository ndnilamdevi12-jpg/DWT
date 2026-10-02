import React, { useState } from 'react';
import { DEFAULT_DWT_LOGO_SVG, DWT_MASCOT_LOGO_URL } from '../data/initialData';

interface DwtLogoProps {
  svgMarkup?: string;
  className?: string;
}

/**
 * Renders the DecodeWithTech brand logo everywhere needed (Intro Screen, Header, About, Footer, Admin).
 * Supports both the official DWT mascot logo image and custom SVG/image assets provided by the admin.
 */
export const DwtLogo: React.FC<DwtLogoProps> = ({ svgMarkup, className = 'w-10 h-10' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const trimmed = (svgMarkup || '').trim();

  // Check if admin provided a direct image URL or data:image URI
  const isDirectImage =
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/');

  // Check if it's the legacy geometric default SVG (without <image>) — if so, upgrade to the official DWT mascot logo
  const isCustomSvgWithoutMascot =
    trimmed.startsWith('<svg') &&
    !trimmed.includes('dwtLogoClip') &&
    trimmed.includes('M36 40H56');

  if (isDirectImage && !imgFailed) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-2xl border border-orange-500/40 bg-neutral-950 ${className}`}
      >
        <img
          src={trimmed}
          alt="DecodeWithTech Logo"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  if (!trimmed || isCustomSvgWithoutMascot || imgFailed) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-2xl border border-orange-500/40 bg-neutral-950 ${className}`}
      >
        <img
          src={DWT_MASCOT_LOGO_URL}
          alt="DecodeWithTech Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  const raw = trimmed.startsWith('<svg') ? trimmed : DEFAULT_DWT_LOGO_SVG;
  const safeSvg = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
      const cleanedAttrs = attrs
        .replace(/\bwidth="[^"]*"/gi, '')
        .replace(/\bheight="[^"]*"/gi, '');
      return `<svg ${cleanedAttrs} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
    });

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-2xl ${className}`}
      aria-label="DecodeWithTech Logo"
      role="img"
      dangerouslySetInnerHTML={{ __html: safeSvg }}
    />
  );
};
