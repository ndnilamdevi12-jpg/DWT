import {
  ArticleItem,
  ProductItem,
  SiteSettings,
  SocialLinkItem,
  VideoItem,
  SCHEMA_LIMITS,
} from '../types';
import mobileTowerImg from '../assets/images/article_mobile_tower_1790870841979.jpg';
import qrOpticalImg from '../assets/images/article_qr_optical_1790870856385.jpg';
import creatorMicImg from '../assets/images/product_creator_mic_1790870869320.jpg';
import techAdapterImg from '../assets/images/product_tech_adapter_1790870880056.jpg';
import dwtMascotLogoImg from '../assets/images/dwt_official_logo_1790895204064.jpg';

export const DWT_MASCOT_LOGO_URL = dwtMascotLogoImg;

export const DEFAULT_DWT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <clipPath id="dwtLogoClip">
      <rect x="4" y="4" width="112" height="112" rx="26" />
    </clipPath>
  </defs>
  <rect x="2" y="2" width="116" height="116" rx="28" fill="#0A0A0A" stroke="#FF6B00" stroke-width="3"/>
  <image href="${dwtMascotLogoImg}" x="4" y="4" width="112" height="112" preserveAspectRatio="xMidYMid slice" clip-path="url(#dwtLogoClip)" />
</svg>`;

export function extractYouTubeId(url: string): string {
  try {
    const trimmed = url.trim();
    const parsed = new URL(trimmed);
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id || 'JCUa0NcmRQE';
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return parts[1];
      }
    }
  } catch {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,20})/);
    if (match?.[1]) return match[1];
  }
  return '';
}

export function clampStr(val: string, max: number, fallback = ''): string {
  const clean = (val ?? fallback).trim();
  return clean.slice(0, max);
}

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  logo_svg: DEFAULT_DWT_LOGO_SVG,
  brand_name: 'DecodeWithTech',
  tagline: 'The story behind everything, explained simply.',
  hero_title: 'The Story Behind Technology, Explained Simply.',
  hero_subtitle:
    'Explore the real engineering, science, and fascinating stories behind the technology and innovations we use every day — clear, visual, and jargon-free.',
  youtube_channel_url: 'https://youtube.com/@decodewith_tech?si=06nYdf9oSZqPLJsh',
  about_text: `DecodeWithTech is a technology-focused content platform where we break down the stories behind everyday technology, science, engineering, and innovation in clear, simple language.

Our mission is to make complex technology easy and fascinating to understand — how it was invented, why it was needed, and how it actually works today.

The core DecodeWithTech content journey is presented through our official YouTube channel and this companion website.`,
  disclaimer_text: `The purpose of the DecodeWithTech website is to provide educational and informational content. All information presented here is intended for general informational purposes.

External links available on this website may lead to third-party websites. DecodeWithTech does not have direct control over the content, availability, pricing, or policies of those external websites.

Some links in the Shopping section may be affiliate links. When you make an eligible purchase through these links, DecodeWithTech may earn a commission at no additional cost to you.`,
  shopping_disclaimer:
    'Some product links may be affiliate links. If you make an eligible purchase through these links, DecodeWithTech may earn a small commission at no additional cost to you.',
  footer_text: '© DecodeWithTech. All rights reserved.',
  show_videos: true,
  show_social: true,
  show_shopping: true,
  show_explain: true,
  authorId: 'system_seed',
};

export const INITIAL_VIDEOS: VideoItem[] = [
  {
    id: 'video_1',
    title: 'DecodeWithTech Featured Video — Episode 01',
    youtube_url: 'https://youtu.be/JCUa0NcmRQE?si=cJJie7QUBEKZmSo7',
    youtube_id: 'JCUa0NcmRQE',
    thumbnail: 'https://i.ytimg.com/vi/JCUa0NcmRQE/hqdefault.jpg',
    description:
      'Discover the real engineering, hidden systems, and complete story behind everyday technology in this featured DecodeWithTech episode.',
    category: 'Technology Explainer',
    display_order: 1,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'video_2',
    title: 'DecodeWithTech Featured Video — Episode 02',
    youtube_url: 'https://youtu.be/s4Ff7ITNNmw?si=i5IZuIoCG_l6Vyc-',
    youtube_id: 's4Ff7ITNNmw',
    thumbnail: 'https://i.ytimg.com/vi/s4Ff7ITNNmw/hqdefault.jpg',
    description:
      'Understand the science and modern innovation behind the systems that power our world, explained clearly from first principles.',
    category: 'Engineering Story',
    display_order: 2,
    status: 'published',
    authorId: 'system_seed',
  },
];

export const INITIAL_ARTICLES: ArticleItem[] = [
  {
    id: 'article_mobile_tower',
    title: 'How Does a Mobile Tower Work?',
    thumbnail: mobileTowerImg,
    short_description:
      'A mobile tower is much more than a steel structure — discover how your voice travels thousands of kilometers in milliseconds through radio waves and underground fiber.',
    introduction: `When you place a phone call or stream a video on your smartphone, have you ever wondered how an invisible signal leaves your hand, travels through the air, and reaches the exact person you are calling hundreds or thousands of kilometers away in a fraction of a second?

Most people assume smartphones talk directly to satellites in space, or that one cell tower simply beams your call through the air to the next tower all the way across the country. The actual engineering is far more surprising — and much faster.`,
    history: `The foundation of wireless communication began in the late 19th century with electromagnetic wave experiments by Heinrich Hertz and Jagadish Chandra Bose. In 1947, engineers at Bell Labs proposed the 'Cellular Network' concept — dividing a geographic area into smaller hexagonal 'cells', each served by its own low-power transmitter so frequencies could be reused across a city.

Following Martin Cooper's first handheld mobile call in 1973, cellular networks evolved from analog 1G voice systems to modern 4G LTE and 5G networks capable of carrying gigabits of data per second.`,
    main_story: `A mobile tower — technically called a Base Transceiver Station (BTS) or Cell Site — acts as a high-speed bridge between the wireless radio waves in the air and a massive underground optical fiber network.

When you speak into your phone, its microphone and digital signal processor convert your voice into binary data (0s and 1s). Your phone's internal antenna transmits that data as modulated Radio Frequency (RF) waves. Those waves travel only a few kilometers through the air until they are captured by the rectangular Sector Antennas mounted at the top of the nearest mobile tower.`,
    how_it_works: `Every mobile tower relies on four primary engineering subsystems working together:

1. Sector Antennas (Rectangular Panels): Mounted in 120-degree arrangements around the top of the mast, these antennas capture incoming radio signals from nearby phones and broadcast outgoing signals across their assigned coverage sector.
2. Microwave Dish (Circular Drum Antenna): In locations where direct underground fiber cables cannot easily reach, high-frequency line-of-sight microwave dishes beam data directly to a neighboring hub tower.
3. Baseband Unit (BBU) & Radios: Inside the weatherproof cabinet at the base of the tower, digital processors decode the radio signals, manage error correction, and convert electrical signals into high-speed laser light pulses.
4. Optical Fiber Backhaul: Once your signal reaches the base of the tower, it does not stay in the air — it travels underground through hair-thin glass optical fiber cables at nearly the speed of light to reach the destination city's core network and local tower.`,
    important_details: `• Most cell towers mount 3 to 6 sector antenna arrays to ensure full 360-degree coverage without dead zones.
• When you travel in a car or train during a call, the network seamlessly transfers your connection from one cell tower to the next in milliseconds — a process known as 'Handover'.
• Every cell site includes heavy-duty battery banks and backup power generators at its base so emergency communications stay online even during power grid outages.`,
    conclusion: `The next time you spot a mobile tower on a rooftop or highway, remember that it is only the visible tip of the network. Its true magic lies in catching faint radio waves from your pocket and launching them into a planet-spanning web of underground laser light.`,
    content: '',
    audio_url: '',
    display_order: 1,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'article_qr_code',
    title: 'The Hidden Engineering Inside Every QR Code',
    thumbnail: qrOpticalImg,
    short_description:
      'From factory assembly lines to instant digital payments — how a tiny grid of black and white squares stores data and recovers from damage in a fraction of a second.',
    introduction: `Whether you are paying for morning coffee, boarding a flight, or opening a website link, you simply point your phone camera at a small square pattern of black and white modules — and within milliseconds, the action is complete.

Have you ever wondered why every QR code has three large squares in three corners, while the fourth corner stays open? Or how a QR code still scans accurately even when part of the sticker is scratched, smudged, or covered by a brand logo?`,
    history: `In 1994, engineer Masahiro Hara at Denso Wave — a Japanese automotive components manufacturer — faced a bottleneck on the factory floor. Traditional 1D barcodes could only hold about 20 alphanumeric characters and had to be scanned from a single precise angle, forcing assembly workers to scan up to ten separate barcodes on a single parts box.

Inspired by the black and white stone grid of the classic board game 'Go', Masahiro Hara and his team designed a two-dimensional matrix code that could be read instantly from any angle: the Quick Response (QR) Code.`,
    main_story: `While a standard barcode stores information in only one horizontal direction, a QR code encodes data both horizontally and vertically across a 2D matrix. That architectural leap allows a single QR symbol to store over 7,000 numeric digits or more than 4,000 alphanumeric characters.

Even more remarkably, Denso Wave chose to make the QR Code specification an open public standard without enforcing patent royalties, enabling universal adoption across smartphones, logistics, healthcare, and instant digital payment systems worldwide.`,
    how_it_works: `Every visual region inside a QR code serves a specific mathematical purpose:

1. Three Position Detection Patterns (Finder Squares): Located in the top-left, top-right, and bottom-left corners, these concentric squares have a strict 1:1:3:1:1 black-to-white thickness ratio. They allow your camera to detect the code's exact boundary and orientation even if your phone is tilted or upside down.
2. Alignment & Timing Patterns: Alternating black and white dotted lines act as a coordinate ruler, helping the scanner correct optical distortion when a QR code is printed on a curved bottle or wrinkled paper.
3. Format & Binary Data Modules: Inside the main grid, dark squares represent binary '1's and light squares represent binary '0's, combined with a visual mask pattern that prevents large blank or solid areas from confusing the camera sensor.
4. Reed-Solomon Error Correction: Using polynomial math — the same error-correction technique used on deep-space probes — a QR code stores redundant backup data so it can reconstruct up to 30% of missing or damaged squares automatically.`,
    important_details: `• The blank white margin around the outside of a QR code is mandatory — engineers call it the 'Quiet Zone', and without it, a scanner cannot separate the code from surrounding text or graphics.
• A QR code does not actively transmit anything; it is purely a high-density optical storage pattern decoded locally by your camera's image processor.`,
    conclusion: `What started as a clever way to track automobile parts in a Japanese factory has become one of the most reliable bridges between the physical world and digital information — proving that great engineering makes complex mathematics feel effortless.`,
    content: '',
    audio_url: '',
    display_order: 2,
    status: 'published',
    authorId: 'system_seed',
  },
];

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'product_1',
    name: 'DecodeWithTech Curated Pick #01',
    image: creatorMicImg,
    description:
      'Curated tech gear selected by DecodeWithTech. Click the official product link below to view full specifications, current pricing, and availability.',
    product_url: 'https://link.amazon/B00G8r8cx',
    price_text: '',
    badge: 'DWT Pick',
    button_text: 'View Product →',
    display_order: 1,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'product_2',
    name: 'DecodeWithTech Curated Pick #02',
    image: techAdapterImg,
    description:
      'Recommended everyday tech and creator hardware selected by DecodeWithTech. Visit the official product page for complete details.',
    product_url: 'https://link.amazon/B0bVXPQaz',
    price_text: '',
    badge: 'DWT Pick',
    button_text: 'View Product →',
    display_order: 2,
    status: 'published',
    authorId: 'system_seed',
  },
];

export const INITIAL_SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: 'social_youtube',
    platform: 'YouTube',
    profile_url: 'https://youtube.com/@decodewith_tech?si=06nYdf9oSZqPLJsh',
    custom_image: dwtMascotLogoImg,
    display_name: 'DecodeWithTech',
    handle: '@decodewith_tech',
    follower_count: '',
    description: 'The story behind everything, explained simply. Official DecodeWithTech YouTube Channel.',
    display_order: 1,
    status: 'published',
    authorId: 'system_seed',
  },
];

export function sanitizeVideoPayload(item: Omit<VideoItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const ytId = extractYouTubeId(item.youtube_url) || clampStr(item.youtube_id, SCHEMA_LIMITS.VIDEO.YT_ID_MAX, 'JCUa0NcmRQE');
  const defaultThumb = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  return {
    title: clampStr(item.title, SCHEMA_LIMITS.VIDEO.TITLE_MAX, 'DecodeWithTech Video'),
    youtube_url: clampStr(item.youtube_url, SCHEMA_LIMITS.VIDEO.URL_MAX),
    youtube_id: clampStr(ytId, SCHEMA_LIMITS.VIDEO.YT_ID_MAX, 'JCUa0NcmRQE'),
    thumbnail: clampStr(item.thumbnail || defaultThumb, SCHEMA_LIMITS.VIDEO.THUMB_MAX, defaultThumb),
    description: clampStr(item.description, SCHEMA_LIMITS.VIDEO.DESC_MAX),
    category: clampStr(item.category, SCHEMA_LIMITS.VIDEO.CAT_MAX),
    display_order: Number.isFinite(Number(item.display_order)) ? Number(item.display_order) : 1,
    status: item.status,
    authorId: item.authorId,
  };
}

export function sanitizeArticlePayload(item: Omit<ArticleItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    title: clampStr(item.title, SCHEMA_LIMITS.ARTICLE.TITLE_MAX, 'Untitled Story'),
    thumbnail: clampStr(item.thumbnail || mobileTowerImg, SCHEMA_LIMITS.ARTICLE.THUMB_MAX, mobileTowerImg),
    short_description: clampStr(item.short_description, SCHEMA_LIMITS.ARTICLE.SHORT_DESC_MAX, 'DecodeWithTech Explain Story'),
    introduction: clampStr(item.introduction, SCHEMA_LIMITS.ARTICLE.INTRO_MAX),
    history: clampStr(item.history, SCHEMA_LIMITS.ARTICLE.HISTORY_MAX),
    main_story: clampStr(item.main_story, SCHEMA_LIMITS.ARTICLE.MAIN_MAX),
    how_it_works: clampStr(item.how_it_works, SCHEMA_LIMITS.ARTICLE.HOW_MAX),
    important_details: clampStr(item.important_details, SCHEMA_LIMITS.ARTICLE.DETAILS_MAX),
    conclusion: clampStr(item.conclusion, SCHEMA_LIMITS.ARTICLE.CONCLUSION_MAX),
    content: clampStr(item.content, SCHEMA_LIMITS.ARTICLE.CONTENT_MAX),
    audio_url: clampStr(item.audio_url, SCHEMA_LIMITS.ARTICLE.AUDIO_MAX),
    display_order: Number.isFinite(Number(item.display_order)) ? Number(item.display_order) : 1,
    status: item.status,
    authorId: item.authorId,
  };
}

export function sanitizeProductPayload(item: Omit<ProductItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: clampStr(item.name, SCHEMA_LIMITS.PRODUCT.NAME_MAX, 'Product'),
    image: clampStr(item.image || creatorMicImg, SCHEMA_LIMITS.PRODUCT.IMAGE_MAX, creatorMicImg),
    description: clampStr(item.description, SCHEMA_LIMITS.PRODUCT.DESC_MAX, 'DecodeWithTech Product'),
    product_url: clampStr(item.product_url, SCHEMA_LIMITS.PRODUCT.URL_MAX),
    price_text: clampStr(item.price_text, SCHEMA_LIMITS.PRODUCT.PRICE_MAX),
    badge: clampStr(item.badge, SCHEMA_LIMITS.PRODUCT.BADGE_MAX),
    button_text: clampStr(item.button_text || 'View Product →', SCHEMA_LIMITS.PRODUCT.BTN_MAX, 'View Product →'),
    display_order: Number.isFinite(Number(item.display_order)) ? Number(item.display_order) : 1,
    status: item.status,
    authorId: item.authorId,
  };
}

export function sanitizeSocialPayload(item: Omit<SocialLinkItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    platform: item.platform,
    profile_url: clampStr(item.profile_url, SCHEMA_LIMITS.SOCIAL.URL_MAX),
    custom_image: clampStr(item.custom_image || dwtMascotLogoImg, SCHEMA_LIMITS.SOCIAL.IMAGE_MAX),
    display_name: clampStr(item.display_name, SCHEMA_LIMITS.SOCIAL.NAME_MAX, 'DecodeWithTech'),
    handle: clampStr(item.handle, SCHEMA_LIMITS.SOCIAL.HANDLE_MAX),
    follower_count: clampStr(item.follower_count, SCHEMA_LIMITS.SOCIAL.FOLLOWERS_MAX),
    description: clampStr(item.description, SCHEMA_LIMITS.SOCIAL.DESC_MAX),
    display_order: Number.isFinite(Number(item.display_order)) ? Number(item.display_order) : 1,
    status: item.status,
    authorId: item.authorId,
  };
}
