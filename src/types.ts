export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type ContentStatus = 'published' | 'draft' | 'hidden';

export type SocialPlatform = 'YouTube' | 'Instagram' | 'Facebook' | 'X' | 'Other';

export interface VideoItem {
  id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  thumbnail: string;
  description: string;
  category: string;
  display_order: number;
  status: ContentStatus;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ArticleItem {
  id: string;
  title: string;
  thumbnail: string;
  short_description: string;
  introduction: string;
  history: string;
  main_story: string;
  how_it_works: string;
  important_details: string;
  conclusion: string;
  content: string;
  audio_url: string;
  display_order: number;
  status: ContentStatus;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProductItem {
  id: string;
  name: string;
  image: string;
  description: string;
  product_url: string;
  price_text: string;
  badge: string;
  button_text: string;
  display_order: number;
  status: ContentStatus;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SocialLinkItem {
  id: string;
  platform: SocialPlatform;
  profile_url: string;
  custom_image: string;
  display_name: string;
  handle: string;
  follower_count: string;
  description: string;
  display_order: number;
  status: ContentStatus;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SiteSettings {
  logo_svg: string;
  brand_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  youtube_channel_url: string;
  about_text: string;
  disclaimer_text: string;
  shopping_disclaimer: string;
  footer_text: string;
  show_videos: boolean;
  show_social: boolean;
  show_shopping: boolean;
  show_explain: boolean;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type PageRoute =
  | { page: 'home' }
  | { page: 'videos' }
  | { page: 'explain' }
  | { page: 'article'; articleId: string }
  | { page: 'shopping' }
  | { page: 'about' }
  | { page: 'disclaimer' }
  | { page: 'admin' };

// Schema validation limits synchronized with firebase-blueprint.json
export const SCHEMA_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  VIDEO: {
    TITLE_MAX: 200,
    URL_MAX: 500,
    YT_ID_MAX: 64,
    THUMB_MAX: 200000,
    DESC_MAX: 1000,
    CAT_MAX: 100,
  },
  ARTICLE: {
    TITLE_MAX: 250,
    THUMB_MAX: 200000,
    SHORT_DESC_MAX: 600,
    INTRO_MAX: 5000,
    HISTORY_MAX: 8000,
    MAIN_MAX: 15000,
    HOW_MAX: 10000,
    DETAILS_MAX: 8000,
    CONCLUSION_MAX: 5000,
    CONTENT_MAX: 30000,
    AUDIO_MAX: 600000,
  },
  PRODUCT: {
    NAME_MAX: 200,
    IMAGE_MAX: 200000,
    DESC_MAX: 1000,
    URL_MAX: 1000,
    PRICE_MAX: 100,
    BADGE_MAX: 60,
    BTN_MAX: 80,
  },
  SOCIAL: {
    URL_MAX: 500,
    IMAGE_MAX: 200000,
    NAME_MAX: 120,
    HANDLE_MAX: 120,
    FOLLOWERS_MAX: 80,
    DESC_MAX: 500,
  },
  SETTINGS: {
    LOGO_MAX: 150000,
    BRAND_MAX: 100,
    TAGLINE_MAX: 250,
    HERO_TITLE_MAX: 250,
    HERO_SUB_MAX: 600,
    YT_URL_MAX: 500,
    ABOUT_MAX: 8000,
    DISCLAIMER_MAX: 5000,
    SHOP_DISCLAIMER_MAX: 1500,
    FOOTER_MAX: 500,
  },
};
