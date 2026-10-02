import React, { useState } from 'react';
import {
  Plus,
  Video,
  FileText,
  ShoppingBag,
  Share2,
  Home,
  Info,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Sparkles,
  Upload,
  ExternalLink,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import {
  ArticleItem,
  ContentStatus,
  ProductItem,
  SiteSettings,
  SocialLinkItem,
  SocialPlatform,
  VideoItem,
} from '../types';
import { extractYouTubeId } from '../data/initialData';
import { ArticleView } from './ArticleView';
import { DwtLogo } from './DwtLogo';

interface AdminPanelProps {
  videos: VideoItem[];
  articles: ArticleItem[];
  products: ProductItem[];
  socialLinks: SocialLinkItem[];
  settings: SiteSettings;
  onSaveVideo: (video: Omit<VideoItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
  onDeleteVideo: (id: string) => Promise<void>;
  onSaveArticle: (article: Omit<ArticleItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
  onDeleteArticle: (id: string) => Promise<void>;
  onSaveProduct: (product: Omit<ProductItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onSaveSocial: (social: Omit<SocialLinkItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
  onDeleteSocial: (id: string) => Promise<void>;
  onSaveSettings: (settings: Omit<SiteSettings, 'createdAt' | 'updatedAt'>) => Promise<void>;
  onExitAdmin: () => void;
  adminUid: string;
}

type ModalMode =
  | { type: 'none' }
  | { type: 'video'; item?: VideoItem }
  | { type: 'article'; item?: ArticleItem }
  | { type: 'product'; item?: ProductItem }
  | { type: 'social'; item?: SocialLinkItem }
  | { type: 'home' }
  | { type: 'about' };

interface DeleteConfirmState {
  kind: 'video' | 'article' | 'product' | 'social';
  id: string;
  title: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  videos,
  articles,
  products,
  socialLinks,
  settings,
  onSaveVideo,
  onDeleteVideo,
  onSaveArticle,
  onDeleteArticle,
  onSaveProduct,
  onDeleteProduct,
  onSaveSocial,
  onDeleteSocial,
  onSaveSettings,
  onExitAdmin,
  adminUid,
}) => {
  const [modal, setModal] = useState<ModalMode>({ type: 'none' });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fetchingYt, setFetchingYt] = useState(false);

  // Video Form State
  const [vTitle, setVTitle] = useState('');
  const [vUrl, setVUrl] = useState('');
  const [vThumb, setVThumb] = useState('');
  const [vDesc, setVDesc] = useState('');
  const [vCat, setVCat] = useState('');
  const [vOrder, setVOrder] = useState(1);
  const [vStatus, setVStatus] = useState<ContentStatus>('published');

  // Article Form State
  const [aTitle, setATitle] = useState('');
  const [aThumb, setAThumb] = useState('');
  const [aShortDesc, setAShortDesc] = useState('');
  const [aIntro, setAIntro] = useState('');
  const [aHistory, setAHistory] = useState('');
  const [aMain, setAMain] = useState('');
  const [aHow, setAHow] = useState('');
  const [aDetails, setADetails] = useState('');
  const [aConclusion, setAConclusion] = useState('');
  const [aContent, setAContent] = useState('');
  const [aAudio, setAAudio] = useState('');
  const [aOrder, setAOrder] = useState(1);
  const [aStatus, setAStatus] = useState<ContentStatus>('published');

  // Product Form State
  const [pName, setPName] = useState('');
  const [pImage, setPImage] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pUrl, setPUrl] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pBadge, setPBadge] = useState('');
  const [pBtnText, setPBtnText] = useState('View Product →');
  const [pOrder, setPOrder] = useState(1);
  const [pStatus, setPStatus] = useState<ContentStatus>('published');

  // Social Form State
  const [sPlatform, setSPlatform] = useState<SocialPlatform>('YouTube');
  const [sUrl, setSUrl] = useState('');
  const [sImage, setSImage] = useState('');
  const [sName, setSName] = useState('DecodeWithTech');
  const [sHandle, setSHandle] = useState('');
  const [sCount, setSCount] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sOrder, setSOrder] = useState(1);
  const [sStatus, setSStatus] = useState<ContentStatus>('published');

  // Site Settings State
  const [stLogoSvg, setStLogoSvg] = useState(settings.logo_svg);
  const [stBrandName, setStBrandName] = useState(settings.brand_name);
  const [stTagline, setStTagline] = useState(settings.tagline);
  const [stHeroTitle, setStHeroTitle] = useState(settings.hero_title);
  const [stHeroSubtitle, setStHeroSubtitle] = useState(settings.hero_subtitle);
  const [stYtChannel, setStYtChannel] = useState(settings.youtube_channel_url);
  const [stAbout, setStAbout] = useState(settings.about_text);
  const [stDisclaimer, setStDisclaimer] = useState(settings.disclaimer_text);
  const [stShopDisclaimer, setStShopDisclaimer] = useState(settings.shopping_disclaimer);
  const [stFooter, setStFooter] = useState(settings.footer_text);
  const [stShowVideos, setStShowVideos] = useState(settings.show_videos);
  const [stShowSocial, setStShowSocial] = useState(settings.show_social);
  const [stShowShopping, setStShowShopping] = useState(settings.show_shopping);
  const [stShowExplain, setStShowExplain] = useState(settings.show_explain);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    window.setTimeout(() => setStatusBanner(null), 3500);
  };

  // Open Video Modal
  const openVideoModal = (item?: VideoItem) => {
    setFormError(null);
    setIsPreviewing(false);
    setVTitle(item?.title || '');
    setVUrl(item?.youtube_url || '');
    setVThumb(item?.thumbnail || '');
    setVDesc(item?.description || '');
    setVCat(item?.category || '');
    setVOrder(item?.display_order ?? videos.length + 1);
    setVStatus(item?.status || 'published');
    setModal({ type: 'video', item });
  };

  // Open Article Modal
  const openArticleModal = (item?: ArticleItem) => {
    setFormError(null);
    setIsPreviewing(false);
    setATitle(item?.title || '');
    setAThumb(item?.thumbnail || '');
    setAShortDesc(item?.short_description || '');
    setAIntro(item?.introduction || '');
    setAHistory(item?.history || '');
    setAMain(item?.main_story || '');
    setAHow(item?.how_it_works || '');
    setADetails(item?.important_details || '');
    setAConclusion(item?.conclusion || '');
    setAContent(item?.content || '');
    setAAudio(item?.audio_url || '');
    setAOrder(item?.display_order ?? articles.length + 1);
    setAStatus(item?.status || 'published');
    setModal({ type: 'article', item });
  };

  // Open Product Modal
  const openProductModal = (item?: ProductItem) => {
    setFormError(null);
    setIsPreviewing(false);
    setPName(item?.name || '');
    setPImage(item?.image || '');
    setPDesc(item?.description || '');
    setPUrl(item?.product_url || '');
    setPPrice(item?.price_text || '');
    setPBadge(item?.badge || '');
    setPBtnText(item?.button_text || 'View Product →');
    setPOrder(item?.display_order ?? products.length + 1);
    setPStatus(item?.status || 'published');
    setModal({ type: 'product', item });
  };

  // Open Social Modal
  const openSocialModal = (item?: SocialLinkItem) => {
    setFormError(null);
    setIsPreviewing(false);
    setSPlatform(item?.platform || 'Instagram');
    setSUrl(item?.profile_url || '');
    setSImage(item?.custom_image || '');
    setSName(item?.display_name || 'DecodeWithTech');
    setSHandle(item?.handle || '');
    setSCount(item?.follower_count || '');
    setSDesc(item?.description || '');
    setSOrder(item?.display_order ?? socialLinks.length + 1);
    setSStatus(item?.status || 'published');
    setModal({ type: 'social', item });
  };

  // Open Home / About Settings Modal
  const openSettingsModal = (mode: 'home' | 'about') => {
    setFormError(null);
    setIsPreviewing(false);
    setStLogoSvg(settings.logo_svg);
    setStBrandName(settings.brand_name);
    setStTagline(settings.tagline);
    setStHeroTitle(settings.hero_title);
    setStHeroSubtitle(settings.hero_subtitle);
    setStYtChannel(settings.youtube_channel_url);
    setStAbout(settings.about_text);
    setStDisclaimer(settings.disclaimer_text);
    setStShopDisclaimer(settings.shopping_disclaimer);
    setStFooter(settings.footer_text);
    setStShowVideos(settings.show_videos);
    setStShowSocial(settings.show_social);
    setStShowShopping(settings.show_shopping);
    setStShowExplain(settings.show_explain);
    setModal({ type: mode });
  };

  // Auto-fetch YouTube metadata via server oEmbed proxy (PRD Section 15)
  const handleAutoFetchYouTube = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    const ytId = extractYouTubeId(trimmed);
    if (!ytId) {
      setFormError('Please enter a valid YouTube URL (e.g., https://youtu.be/...).');
      return;
    }
    setFormError(null);
    setFetchingYt(true);
    try {
      const res = await fetch(`/api/youtube-meta?url=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && !vTitle) {
          setVTitle(data.title);
        }
        if (data.thumbnail_url && !vThumb) {
          setVThumb(data.thumbnail_url);
        }
      } else if (!vThumb) {
        setVThumb(`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`);
      }
    } catch {
      if (!vThumb) {
        setVThumb(`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`);
      }
    } finally {
      setFetchingYt(false);
    }
  };

  // Helper to read uploaded files (SVG, Image, or Audio) into data URI / text
  const handleFileUpload = (
    file: File | undefined,
    mode: 'text' | 'dataUrl',
    maxBytes: number,
    onResult: (result: string) => void
  ) => {
    if (!file) return;
    if (file.size > maxBytes) {
      setFormError(`File size is too large. Please keep uploads under ${Math.round(maxBytes / 1024)} KB.`);
      return;
    }
    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onResult(reader.result);
      }
    };
    if (mode === 'text') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  // Save Handlers
  const submitVideo = async (overrideStatus?: ContentStatus) => {
    const finalStatus = overrideStatus || vStatus;
    const ytId = extractYouTubeId(vUrl);
    if (!vUrl.trim() || !ytId) {
      setFormError('Actual YouTube URL is required.');
      return;
    }
    if (!vTitle.trim()) {
      setFormError('Video Title is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSaveVideo(
        {
          title: vTitle.trim(),
          youtube_url: vUrl.trim(),
          youtube_id: ytId,
          thumbnail: vThumb.trim() || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
          description: vDesc.trim(),
          category: vCat.trim(),
          display_order: Number(vOrder) || 1,
          status: finalStatus,
          authorId: adminUid,
        },
        modal.type === 'video' ? modal.item?.id : undefined
      );
      setModal({ type: 'none' });
      showToast('Video saved and synced with website.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save video.');
    } finally {
      setSaving(false);
    }
  };

  const submitArticle = async (overrideStatus?: ContentStatus) => {
    const finalStatus = overrideStatus || aStatus;
    if (!aTitle.trim()) {
      setFormError('Article Title is required.');
      return;
    }
    if (!aShortDesc.trim()) {
      setFormError('Short Description is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSaveArticle(
        {
          title: aTitle.trim(),
          thumbnail: aThumb.trim(),
          short_description: aShortDesc.trim(),
          introduction: aIntro.trim(),
          history: aHistory.trim(),
          main_story: aMain.trim(),
          how_it_works: aHow.trim(),
          important_details: aDetails.trim(),
          conclusion: aConclusion.trim(),
          content: aContent.trim(),
          audio_url: aAudio.trim(),
          display_order: Number(aOrder) || 1,
          status: finalStatus,
          authorId: adminUid,
        },
        modal.type === 'article' ? modal.item?.id : undefined
      );
      setModal({ type: 'none' });
      showToast('Article saved and synced with website.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  const submitProduct = async (overrideStatus?: ContentStatus) => {
    const finalStatus = overrideStatus || pStatus;
    if (!pName.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!pUrl.trim() || !/^https?:\/\//i.test(pUrl.trim())) {
      setFormError('Actual Product URL (starting with https://) is required before saving.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSaveProduct(
        {
          name: pName.trim(),
          image: pImage.trim(),
          description: pDesc.trim() || 'DecodeWithTech Curated Product',
          product_url: pUrl.trim(),
          price_text: pPrice.trim(),
          badge: pBadge.trim(),
          button_text: pBtnText.trim() || 'View Product →',
          display_order: Number(pOrder) || 1,
          status: finalStatus,
          authorId: adminUid,
        },
        modal.type === 'product' ? modal.item?.id : undefined
      );
      setModal({ type: 'none' });
      showToast('Product saved and synced with website.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const submitSocial = async (overrideStatus?: ContentStatus) => {
    const finalStatus = overrideStatus || sStatus;
    if (!sUrl.trim() || !/^https?:\/\//i.test(sUrl.trim())) {
      setFormError('Actual Profile URL (starting with https://) is required.');
      return;
    }
    if (!sName.trim()) {
      setFormError('Display Name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSaveSocial(
        {
          platform: sPlatform,
          profile_url: sUrl.trim(),
          custom_image: sImage.trim(),
          display_name: sName.trim(),
          handle: sHandle.trim(),
          follower_count: sCount.trim(),
          description: sDesc.trim(),
          display_order: Number(sOrder) || 1,
          status: finalStatus,
          authorId: adminUid,
        },
        modal.type === 'social' ? modal.item?.id : undefined
      );
      setModal({ type: 'none' });
      showToast('Social link saved and synced with website.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save social link.');
    } finally {
      setSaving(false);
    }
  };

  const submitSettings = async () => {
    setSaving(true);
    setFormError(null);
    try {
      await onSaveSettings({
        logo_svg: stLogoSvg.trim() || settings.logo_svg,
        brand_name: stBrandName.trim() || 'DecodeWithTech',
        tagline: stTagline.trim(),
        hero_title: stHeroTitle.trim(),
        hero_subtitle: stHeroSubtitle.trim(),
        youtube_channel_url: stYtChannel.trim() || settings.youtube_channel_url,
        about_text: stAbout.trim() || settings.about_text,
        disclaimer_text: stDisclaimer.trim() || settings.disclaimer_text,
        shopping_disclaimer: stShopDisclaimer.trim() || settings.shopping_disclaimer,
        footer_text: stFooter.trim() || '© DecodeWithTech',
        show_videos: stShowVideos,
        show_social: stShowSocial,
        show_shopping: stShowShopping,
        show_explain: stShowExplain,
        authorId: adminUid,
      });
      setModal({ type: 'none' });
      showToast('Website settings updated.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // Quick Toggle Published / Hidden Status
  const toggleVisibility = async (
    kind: 'video' | 'article' | 'product' | 'social',
    item: VideoItem | ArticleItem | ProductItem | SocialLinkItem
  ) => {
    const nextStatus: ContentStatus = item.status === 'published' ? 'hidden' : 'published';
    setSaving(true);
    try {
      if (kind === 'video') {
        const v = item as VideoItem;
        await onSaveVideo({ ...v, status: nextStatus, authorId: adminUid }, v.id);
      } else if (kind === 'article') {
        const a = item as ArticleItem;
        await onSaveArticle({ ...a, status: nextStatus, authorId: adminUid }, a.id);
      } else if (kind === 'product') {
        const p = item as ProductItem;
        await onSaveProduct({ ...p, status: nextStatus, authorId: adminUid }, p.id);
      } else if (kind === 'social') {
        const s = item as SocialLinkItem;
        await onSaveSocial({ ...s, status: nextStatus, authorId: adminUid }, s.id);
      }
      showToast(`Item visibility set to ${nextStatus}.`);
    } finally {
      setSaving(false);
    }
  };

  // Execute Confirmed Delete
  const handleConfirmedDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      if (deleteConfirm.kind === 'video') {
        await onDeleteVideo(deleteConfirm.id);
      } else if (deleteConfirm.kind === 'article') {
        await onDeleteArticle(deleteConfirm.id);
      } else if (deleteConfirm.kind === 'product') {
        await onDeleteProduct(deleteConfirm.id);
      } else if (deleteConfirm.kind === 'social') {
        await onDeleteSocial(deleteConfirm.id);
      }
      setDeleteConfirm(null);
      setModal({ type: 'none' });
      showToast('Item deleted.');
    } finally {
      setSaving(false);
    }
  };

  // Append rich formatting snippet into Article Additional Content
  const appendRichFormat = (snippet: string) => {
    setAContent((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8">
      {/* Top Admin Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-orange-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#EA580C]">
            <span>DecodeWithTech CMS</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time Website Control</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-neutral-950 font-display">
            Admin Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={onExitAdmin}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 text-[#FF6B00]" />
          <span>View Public Website</span>
        </button>
      </div>

      {/* Status Toast Banner */}
      {statusBanner && (
        <div className="mt-4 px-4 py-3 rounded-2xl bg-orange-50 border border-[#FF6B00]/40 text-neutral-900 text-xs sm:text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#EA580C]" />
            <span>{statusBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-neutral-500 hover:text-neutral-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6 Large [ + ] Action Cards (PRD Sections 32 & 33) */}
      <section className="mt-8" aria-label="Quick Actions">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <button
            type="button"
            onClick={() => openVideoModal()}
            className="group p-5 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-orange-500/25 hover:border-[#FF6B00] shadow-2xs flex flex-col items-center justify-center text-center transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="mt-3 text-sm font-bold text-neutral-950 font-display">
              Add Video
            </span>
            <span className="mt-0.5 text-[11px] text-neutral-500">YouTube Link</span>
          </button>

          <button
            type="button"
            onClick={() => openArticleModal()}
            className="group p-5 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-orange-500/25 hover:border-[#FF6B00] shadow-2xs flex flex-col items-center justify-center text-center transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="mt-3 text-sm font-bold text-neutral-950 font-display">
              Add Article
            </span>
            <span className="mt-0.5 text-[11px] text-neutral-500">Explain Story</span>
          </button>

          <button
            type="button"
            onClick={() => openProductModal()}
            className="group p-5 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-orange-500/25 hover:border-[#FF6B00] shadow-2xs flex flex-col items-center justify-center text-center transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="mt-3 text-sm font-bold text-neutral-950 font-display">
              Add Product
            </span>
            <span className="mt-0.5 text-[11px] text-neutral-500">Shopping Link</span>
          </button>

          <button
            type="button"
            onClick={() => openSocialModal()}
            className="group p-5 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-orange-500/25 hover:border-[#FF6B00] shadow-2xs flex flex-col items-center justify-center text-center transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="mt-3 text-sm font-bold text-neutral-950 font-display">
              Add Social
            </span>
            <span className="mt-0.5 text-[11px] text-neutral-500">Profile Card</span>
          </button>

          <button
            type="button"
            onClick={() => openSettingsModal('home')}
            className="group p-5 rounded-2xl bg-white hover:bg-orange-50/60 border border-neutral-200 hover:border-[#FF6B00] shadow-2xs flex flex-col items-center justify-center text-center transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#EA580C] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Home className="w-6 h-6" />
            </div>
            <span className="mt-3 text-sm font-bold text-neutral-950 font-display">
              Edit Home
            </span>
            <span className="mt-0.5 text-[11px] text-neutral-500">Logo & Sections</span>
          </button>

          <button
            type="button"
            onClick={() => openSettingsModal('about')}
            className="group p-5 rounded-2xl bg-white hover:bg-orange-50/60 border border-neutral-200 hover:border-[#FF6B00] shadow-2xs flex flex-col items-center justify-center text-center transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#EA580C] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Info className="w-6 h-6" />
            </div>
            <span className="mt-3 text-sm font-bold text-neutral-950 font-display">
              Edit About
            </span>
            <span className="mt-0.5 text-[11px] text-neutral-500">About & Legal</span>
          </button>
        </div>
      </section>

      {/* Existing Content Sections (PRD Section 32) */}
      <div className="mt-12 space-y-10">
        {/* 1. Videos List */}
        <section className="bg-white rounded-3xl border border-neutral-200/90 p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <Video className="w-5 h-5 text-[#FF6B00]" />
              <h2 className="text-lg font-bold text-neutral-950 font-display">
                YouTube Videos ({videos.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => openVideoModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Video</span>
            </button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {videos.map((v) => (
              <div
                key={v.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={v.thumbnail || `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`}
                    alt={v.title}
                    referrerPolicy="no-referrer"
                    className="w-20 aspect-video rounded-xl object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="font-mono-num">Order #{v.display_order}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          v.status === 'published'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {v.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-neutral-950 truncate">{v.title}</p>
                    <p className="text-xs text-neutral-500 truncate">{v.youtube_url}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleVisibility('video', v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-orange-300 text-xs font-semibold text-neutral-700 cursor-pointer"
                  >
                    {v.status === 'published' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#EA580C]" />
                        <span>Publish</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openVideoModal(v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({ kind: 'video', id: v.id, title: v.title })
                    }
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                    aria-label={`Delete ${v.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Explain Articles List */}
        <section className="bg-white rounded-3xl border border-neutral-200/90 p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#FF6B00]" />
              <h2 className="text-lg font-bold text-neutral-950 font-display">
                Explain Articles ({articles.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => openArticleModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Article</span>
            </button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {articles.map((a) => (
              <div
                key={a.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={a.thumbnail}
                    alt={a.title}
                    referrerPolicy="no-referrer"
                    className="w-20 aspect-video rounded-xl object-cover bg-orange-50 shrink-0 border border-neutral-200"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="font-mono-num">Order #{a.display_order}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          a.status === 'published'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {a.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-neutral-950 truncate">{a.title}</p>
                    <p className="text-xs text-neutral-500 truncate">{a.short_description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleVisibility('article', a)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-orange-300 text-xs font-semibold text-neutral-700 cursor-pointer"
                  >
                    {a.status === 'published' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#EA580C]" />
                        <span>Publish</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openArticleModal(a)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({ kind: 'article', id: a.id, title: a.title })
                    }
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                    aria-label={`Delete ${a.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Shopping Products List */}
        <section className="bg-white rounded-3xl border border-neutral-200/90 p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#FF6B00]" />
              <h2 className="text-lg font-bold text-neutral-950 font-display">
                Shopping Products ({products.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => openProductModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {products.map((p) => (
              <div
                key={p.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={p.image}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover bg-orange-50 shrink-0 border border-neutral-200"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="font-mono-num">Order #{p.display_order}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          p.status === 'published'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-neutral-950 truncate">{p.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{p.product_url}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleVisibility('product', p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-orange-300 text-xs font-semibold text-neutral-700 cursor-pointer"
                  >
                    {p.status === 'published' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#EA580C]" />
                        <span>Publish</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openProductModal(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({ kind: 'product', id: p.id, title: p.name })
                    }
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Social Links List */}
        <section className="bg-white rounded-3xl border border-neutral-200/90 p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-[#FF6B00]" />
              <h2 className="text-lg font-bold text-neutral-950 font-display">
                Social Media Profiles ({socialLinks.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => openSocialModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Social</span>
            </button>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {socialLinks.map((s) => (
              <div
                key={s.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="font-semibold text-[#EA580C]">{s.platform}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        s.status === 'published'
                          ? 'text-emerald-700 font-semibold'
                          : 'text-amber-700 font-semibold'
                      }
                    >
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-neutral-950">
                    {s.display_name} {s.handle ? `(${s.handle})` : ''}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">{s.profile_url}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleVisibility('social', s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-orange-300 text-xs font-semibold text-neutral-700 cursor-pointer"
                  >
                    {s.status === 'published' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#EA580C]" />
                        <span>Publish</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openSocialModal(s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        kind: 'social',
                        id: s.id,
                        title: `${s.platform} (${s.display_name})`,
                      })
                    }
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                    aria-label={`Delete ${s.platform}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ================================================================= */}
      {/* DELETE CONFIRMATION MODAL (PRD Section 40)                        */}
      {/* ================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-orange-200 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-950 font-display">
              Are you sure you want to delete this?
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              Item: <span className="font-semibold text-neutral-900">{deleteConfirm.title}</span>
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmedDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* EDITOR & PREVIEW MODALS (PRD Sections 34 - 38 & 60)               */}
      {/* ================================================================= */}
      {modal.type !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-orange-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Top Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#FF6B00] to-[#EA580C] text-white flex items-center justify-between shrink-0">
              <h3 className="text-base sm:text-lg font-bold font-display">
                {modal.type === 'video' && (modal.item ? 'Edit Video' : '+ Add Video')}
                {modal.type === 'article' && (modal.item ? 'Edit Article' : '+ Add Article')}
                {modal.type === 'product' && (modal.item ? 'Edit Product' : '+ Add Product')}
                {modal.type === 'social' && (modal.item ? 'Edit Social Profile' : '+ Add Social')}
                {modal.type === 'home' && 'Edit Home Page & SVG Logo'}
                {modal.type === 'about' && 'Edit About & Disclaimers'}
              </h3>
              <div className="flex items-center gap-2">
                {(modal.type === 'video' ||
                  modal.type === 'article' ||
                  modal.type === 'product' ||
                  modal.type === 'social') && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewing((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-neutral-950 text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>{isPreviewing ? 'Back to Edit' : 'Preview'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModal({ type: 'none' })}
                  className="w-8 h-8 rounded-lg bg-black/15 hover:bg-black/25 flex items-center justify-center text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {formError}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* VIDEO FORM / PREVIEW                                      */}
              {/* --------------------------------------------------------- */}
              {modal.type === 'video' &&
                (isPreviewing ? (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-[#EA580C]">
                      Public Website Card Preview:
                    </p>
                    <div className="rounded-2xl border border-orange-200 overflow-hidden bg-white max-w-md">
                      <img
                        src={
                          vThumb ||
                          `https://i.ytimg.com/vi/${extractYouTubeId(vUrl) || 'JCUa0NcmRQE'}/hqdefault.jpg`
                        }
                        alt={vTitle || 'Preview'}
                        className="w-full aspect-video object-cover bg-neutral-900"
                      />
                      <div className="p-4">
                        <h4 className="font-bold text-base text-neutral-950 font-display">
                          {vTitle || 'Untitled Video'}
                        </h4>
                        <p className="mt-1 text-xs text-neutral-600">{vDesc}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Actual YouTube URL *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={vUrl}
                          onChange={(e) => setVUrl(e.target.value)}
                          placeholder="https://youtu.be/..."
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#FF6B00]"
                        />
                        <button
                          type="button"
                          disabled={fetchingYt}
                          onClick={() => handleAutoFetchYouTube(vUrl)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{fetchingYt ? 'Fetching...' : 'Fetch Meta'}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Video Title *
                      </label>
                      <input
                        type="text"
                        value={vTitle}
                        onChange={(e) => setVTitle(e.target.value)}
                        placeholder="Enter actual video title"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#FF6B00]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Thumbnail URL (or Upload Override)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={vThumb}
                          onChange={(e) => setVThumb(e.target.value)}
                          placeholder="Auto-filled from YouTube or custom URL"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#FF6B00]"
                        />
                        <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold cursor-pointer whitespace-nowrap">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e.target.files?.[0], 'dataUrl', 140_000, setVThumb)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Short Description
                      </label>
                      <textarea
                        rows={3}
                        value={vDesc}
                        onChange={(e) => setVDesc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#FF6B00]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Category (Optional)
                        </label>
                        <input
                          type="text"
                          value={vCat}
                          onChange={(e) => setVCat(e.target.value)}
                          placeholder="e.g. Technology"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={vOrder}
                          onChange={(e) => setVOrder(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Publication State
                        </label>
                        <select
                          value={vStatus}
                          onChange={(e) => setVStatus(e.target.value as ContentStatus)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm bg-white"
                        >
                          <option value="published">Published (Visible)</option>
                          <option value="draft">Draft</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

              {/* --------------------------------------------------------- */}
              {/* ARTICLE FORM / PREVIEW                                    */}
              {/* --------------------------------------------------------- */}
              {modal.type === 'article' &&
                (isPreviewing ? (
                  <div className="border border-orange-200 rounded-2xl bg-white">
                    <ArticleView
                      article={{
                        id: modal.item?.id || 'preview',
                        title: aTitle || 'Untitled Article',
                        thumbnail: aThumb,
                        short_description: aShortDesc,
                        introduction: aIntro,
                        history: aHistory,
                        main_story: aMain,
                        how_it_works: aHow,
                        important_details: aDetails,
                        conclusion: aConclusion,
                        content: aContent,
                        audio_url: aAudio,
                        display_order: aOrder,
                        status: aStatus,
                        authorId: adminUid,
                      }}
                      onBack={() => setIsPreviewing(false)}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Article Title *
                      </label>
                      <input
                        type="text"
                        value={aTitle}
                        onChange={(e) => setATitle(e.target.value)}
                        placeholder="How Does a Mobile Tower Work?"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Thumbnail URL or Upload Image
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={aThumb}
                          onChange={(e) => setAThumb(e.target.value)}
                          placeholder="Image URL or upload file"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                        <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold cursor-pointer whitespace-nowrap">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Thumbnail</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e.target.files?.[0], 'dataUrl', 140_000, setAThumb)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Short Description (Card Preview) *
                      </label>
                      <textarea
                        rows={2}
                        value={aShortDesc}
                        onChange={(e) => setAShortDesc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          01. Introduction
                        </label>
                        <textarea
                          rows={3}
                          value={aIntro}
                          onChange={(e) => setAIntro(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          02. History & Origin
                        </label>
                        <textarea
                          rows={3}
                          value={aHistory}
                          onChange={(e) => setAHistory(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        03. Main Story
                      </label>
                      <textarea
                        rows={4}
                        value={aMain}
                        onChange={(e) => setAMain(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        04. How It Works
                      </label>
                      <textarea
                        rows={4}
                        value={aHow}
                        onChange={(e) => setAHow(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          05. Important Details (Highlight Box)
                        </label>
                        <textarea
                          rows={3}
                          value={aDetails}
                          onChange={(e) => setADetails(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          06. Conclusion
                        </label>
                        <textarea
                          rows={3}
                          value={aConclusion}
                          onChange={(e) => setAConclusion(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                    </div>

                    {/* Rich Text Editor Section (PRD Section 35) */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <label className="block text-xs font-bold text-neutral-800">
                          Additional Story / Rich Editor
                        </label>
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => appendRichFormat('### Section Heading')}
                            className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-100 text-[11px] font-semibold cursor-pointer"
                          >
                            Heading
                          </button>
                          <button
                            type="button"
                            onClick={() => appendRichFormat('Write a new paragraph here...')}
                            className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-100 text-[11px] font-semibold cursor-pointer"
                          >
                            Paragraph
                          </button>
                          <button
                            type="button"
                            onClick={() => appendRichFormat('**Key Term (Bold)**')}
                            className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-100 text-[11px] font-semibold cursor-pointer"
                          >
                            Bold
                          </button>
                          <button
                            type="button"
                            onClick={() => appendRichFormat('*Emphasized Note (Italic)*')}
                            className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-100 text-[11px] font-semibold cursor-pointer"
                          >
                            Italic
                          </button>
                          <button
                            type="button"
                            onClick={() => appendRichFormat('❝ Featured Quote ❞')}
                            className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-100 text-[11px] font-semibold cursor-pointer"
                          >
                            Quote
                          </button>
                          <button
                            type="button"
                            onClick={() => appendRichFormat('⚡ HIGHLIGHT: Key Technical Insight')}
                            className="px-2 py-1 rounded bg-orange-50 text-[#EA580C] text-[11px] font-semibold cursor-pointer"
                          >
                            Highlight
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={aContent}
                        onChange={(e) => setAContent(e.target.value)}
                        placeholder="Optional extra notes, quotes, or paragraphs..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    {/* Optional Story Audio Upload / URL (PRD Section 21 & 35) */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Optional Story Audio File / URL (Overrides Local TTS when provided)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={aAudio}
                          onChange={(e) => setAAudio(e.target.value)}
                          placeholder="Leave empty to use built-in offline story reader, or paste audio URL"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                        <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold cursor-pointer whitespace-nowrap">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Audio</span>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e.target.files?.[0], 'dataUrl', 450_000, setAAudio)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={aOrder}
                          onChange={(e) => setAOrder(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Publication State
                        </label>
                        <select
                          value={aStatus}
                          onChange={(e) => setAStatus(e.target.value as ContentStatus)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm bg-white"
                        >
                          <option value="published">Published (Visible)</option>
                          <option value="draft">Draft</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

              {/* --------------------------------------------------------- */}
              {/* PRODUCT FORM / PREVIEW                                    */}
              {/* --------------------------------------------------------- */}
              {modal.type === 'product' &&
                (isPreviewing ? (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-[#EA580C]">
                      Public Shopping Card Preview:
                    </p>
                    <div className="max-w-sm rounded-3xl border border-orange-200 bg-white overflow-hidden shadow-xs">
                      <div className="aspect-[4/3] bg-neutral-50 overflow-hidden">
                        {pImage && (
                          <img
                            src={pImage}
                            alt={pName}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-5">
                        <h4 className="font-bold text-lg text-neutral-950 font-display">
                          {pName || 'Product Name'}
                        </h4>
                        {pPrice && (
                          <p className="mt-1 text-sm font-bold text-[#EA580C] font-mono-num">
                            {pPrice}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-neutral-600">{pDesc}</p>
                        <a
                          href={pUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold"
                        >
                          <span>{pBtnText || 'View Product →'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        placeholder="Enter product name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Actual Product Link (Required before publishing) *
                      </label>
                      <input
                        type="url"
                        value={pUrl}
                        onChange={(e) => setPUrl(e.target.value)}
                        placeholder="https://link.amazon/..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Product Image URL or Upload
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={pImage}
                          onChange={(e) => setPImage(e.target.value)}
                          placeholder="Image URL or upload"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                        <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold cursor-pointer whitespace-nowrap">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e.target.files?.[0], 'dataUrl', 140_000, setPImage)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Short Description *
                      </label>
                      <textarea
                        rows={3}
                        value={pDesc}
                        onChange={(e) => setPDesc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Optional Price Text
                        </label>
                        <input
                          type="text"
                          value={pPrice}
                          onChange={(e) => setPPrice(e.target.value)}
                          placeholder="Leave blank if dynamic"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Optional Badge
                        </label>
                        <input
                          type="text"
                          value={pBadge}
                          onChange={(e) => setPBadge(e.target.value)}
                          placeholder="e.g. DWT Pick"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={pBtnText}
                          onChange={(e) => setPBtnText(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={pOrder}
                          onChange={(e) => setPOrder(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Publication State
                        </label>
                        <select
                          value={pStatus}
                          onChange={(e) => setPStatus(e.target.value as ContentStatus)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm bg-white"
                        >
                          <option value="published">Published (Visible)</option>
                          <option value="draft">Draft</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

              {/* --------------------------------------------------------- */}
              {/* SOCIAL FORM / PREVIEW                                     */}
              {/* --------------------------------------------------------- */}
              {modal.type === 'social' &&
                (isPreviewing ? (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-[#EA580C]">
                      Public Social Card Preview:
                    </p>
                    <div className="p-6 rounded-3xl border border-orange-200 bg-white max-w-md flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#EA580C]">{sPlatform}</p>
                        <h4 className="text-lg font-bold text-neutral-950 font-display">
                          {sName}
                        </h4>
                        {sCount && (
                          <p className="text-xs font-mono-num text-neutral-600 mt-0.5">
                            {sCount}
                          </p>
                        )}
                      </div>
                      <span className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold">
                        Visit {sPlatform}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Platform *
                        </label>
                        <select
                          value={sPlatform}
                          onChange={(e) => setSPlatform(e.target.value as SocialPlatform)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm bg-white"
                        >
                          <option value="YouTube">YouTube</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="X">X</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Display Name *
                        </label>
                        <input
                          type="text"
                          value={sName}
                          onChange={(e) => setSName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Actual Profile URL *
                      </label>
                      <input
                        type="url"
                        value={sUrl}
                        onChange={(e) => setSUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Handle / Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={sHandle}
                          onChange={(e) => setSHandle(e.target.value)}
                          placeholder="@decodewith_tech"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Subscriber / Follower Count (Optional)
                        </label>
                        <input
                          type="text"
                          value={sCount}
                          onChange={(e) => setSCount(e.target.value)}
                          placeholder="e.g. 100K Subscribers (Leave empty if not shown)"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Custom DP / Avatar Image (Optional)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={sImage}
                          onChange={(e) => setSImage(e.target.value)}
                          placeholder="Custom DP URL or upload"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                        <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold cursor-pointer whitespace-nowrap">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload DP</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e.target.files?.[0], 'dataUrl', 140_000, setSImage)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Short Description
                      </label>
                      <input
                        type="text"
                        value={sDesc}
                        onChange={(e) => setSDesc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={sOrder}
                          onChange={(e) => setSOrder(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                          Publication State
                        </label>
                        <select
                          value={sStatus}
                          onChange={(e) => setSStatus(e.target.value as ContentStatus)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm bg-white"
                        >
                          <option value="published">Published (Visible)</option>
                          <option value="draft">Draft</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

              {/* --------------------------------------------------------- */}
              {/* HOME SETTINGS FORM (PRD Section 3 & 38)                   */}
              {/* --------------------------------------------------------- */}
              {modal.type === 'home' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <DwtLogo svgMarkup={stLogoSvg} className="w-12 h-12" />
                      <div>
                        <p className="text-xs font-bold text-neutral-900">
                          Current SVG Logo Preview
                        </p>
                        <p className="text-[11px] text-neutral-600">
                          Used in Intro Screen, Sticky Header, and Footer as pure responsive SVG.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold cursor-pointer whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload .SVG File</span>
                      <input
                        type="file"
                        accept=".svg,image/svg+xml"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e.target.files?.[0], 'text', 120_000, setStLogoSvg)
                        }
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      DecodeWithTech SVG Logo Code (Paste `<svg>...</svg>`)
                    </label>
                    <textarea
                      rows={4}
                      value={stLogoSvg}
                      onChange={(e) => setStLogoSvg(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Hero Title
                      </label>
                      <input
                        type="text"
                        value={stHeroTitle}
                        onChange={(e) => setStHeroTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                        Tagline
                      </label>
                      <input
                        type="text"
                        value={stTagline}
                        onChange={(e) => setStTagline(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Hero Subtitle
                    </label>
                    <textarea
                      rows={2}
                      value={stHeroSubtitle}
                      onChange={(e) => setStHeroSubtitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-neutral-800 mb-2">
                      Home Page Section Visibility (Show / Hide)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-neutral-200 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stShowVideos}
                          onChange={(e) => setStShowVideos(e.target.checked)}
                          className="accent-[#FF6B00]"
                        />
                        <span>Videos Section</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-neutral-200 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stShowSocial}
                          onChange={(e) => setStShowSocial(e.target.checked)}
                          className="accent-[#FF6B00]"
                        />
                        <span>Social Section</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-neutral-200 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stShowShopping}
                          onChange={(e) => setStShowShopping(e.target.checked)}
                          className="accent-[#FF6B00]"
                        />
                        <span>Shopping Section</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-neutral-200 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stShowExplain}
                          onChange={(e) => setStShowExplain(e.target.checked)}
                          className="accent-[#FF6B00]"
                        />
                        <span>Explain Section</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* ABOUT & DISCLAIMER SETTINGS FORM                          */}
              {/* --------------------------------------------------------- */}
              {modal.type === 'about' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      About DecodeWithTech Text
                    </label>
                    <textarea
                      rows={5}
                      value={stAbout}
                      onChange={(e) => setStAbout(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Shopping Affiliate Disclaimer
                    </label>
                    <textarea
                      rows={2}
                      value={stShopDisclaimer}
                      onChange={(e) => setStShopDisclaimer(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Full Website Disclaimer
                    </label>
                    <textarea
                      rows={5}
                      value={stDisclaimer}
                      onChange={(e) => setStDisclaimer(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Footer Copyright Text
                    </label>
                    <input
                      type="text"
                      value={stFooter}
                      onChange={(e) => setStFooter(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Action Bar */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                {modal.type !== 'home' && modal.type !== 'about' && modal.item && (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        kind: modal.type as 'video' | 'article' | 'product' | 'social',
                        id: modal.item!.id,
                        title:
                          'title' in modal.item!
                            ? modal.item!.title
                            : 'name' in modal.item!
                            ? modal.item!.name
                            : modal.item!.display_name,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setModal({ type: 'none' })}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>

                {(modal.type === 'video' ||
                  modal.type === 'article' ||
                  modal.type === 'product' ||
                  modal.type === 'social') && (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (modal.type === 'video') submitVideo('draft');
                        if (modal.type === 'article') submitArticle('draft');
                        if (modal.type === 'product') submitProduct('draft');
                        if (modal.type === 'social') submitSocial('draft');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-900 text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (modal.type === 'video') submitVideo('published');
                        if (modal.type === 'article') submitArticle('published');
                        if (modal.type === 'product') submitProduct('published');
                        if (modal.type === 'social') submitSocial('published');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Publish'}
                    </button>
                  </>
                )}

                {(modal.type === 'home' || modal.type === 'about') && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submitSettings}
                    className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
