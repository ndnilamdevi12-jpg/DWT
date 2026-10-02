import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Play,
  ExternalLink,
  BookOpen,
  ShoppingBag,
  Youtube,
  Instagram,
  Globe,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError } from './firebase';
import {
  ArticleItem,
  OperationType,
  PageRoute,
  ProductItem,
  SCHEMA_LIMITS,
  SiteSettings,
  SocialLinkItem,
  VideoItem,
} from './types';
import {
  clampStr,
  INITIAL_ARTICLES,
  INITIAL_PRODUCTS,
  INITIAL_SITE_SETTINGS,
  INITIAL_SOCIAL_LINKS,
  INITIAL_VIDEOS,
  resolveAssetUrl,
  sanitizeArticlePayload,
  sanitizeProductPayload,
  sanitizeSocialPayload,
  sanitizeVideoPayload,
} from './data/initialData';
import { IntroScreen } from './components/IntroScreen';
import { Header } from './components/Header';
import { VideoSlider } from './components/VideoSlider';
import { ArticleView } from './components/ArticleView';
import { AdminPanel } from './components/AdminPanel';
import { DwtLogo } from './components/DwtLogo';

function parsePathnameToRoute(pathname: string): PageRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/videos' || clean === '/more-videos') return { page: 'videos' };
  if (clean === '/explain') return { page: 'explain' };
  if (clean.startsWith('/explain/')) {
    const articleId = decodeURIComponent(clean.replace('/explain/', ''));
    return articleId ? { page: 'article', articleId } : { page: 'explain' };
  }
  if (clean === '/shopping') return { page: 'shopping' };
  if (clean === '/about') return { page: 'about' };
  if (clean === '/disclaimer') return { page: 'disclaimer' };
  if (clean === '/admin') return { page: 'admin' };
  return { page: 'home' };
}

function routeToPathname(route: PageRoute): string {
  switch (route.page) {
    case 'home':
      return '/';
    case 'videos':
      return '/videos';
    case 'explain':
      return '/explain';
    case 'article':
      return `/explain/${encodeURIComponent(route.articleId)}`;
    case 'shopping':
      return '/shopping';
    case 'about':
      return '/about';
    case 'disclaimer':
      return '/disclaimer';
    case 'admin':
      return '/admin';
  }
}

export default function App() {
  // 5-second intro screen state (PRD Sections 5, 6, 7, 8)
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // Navigation Route
  const [route, setRoute] = useState<PageRoute>(() =>
    parsePathnameToRoute(window.location.pathname)
  );

  // Auth & Admin Authorization State (Verified via Firebase Auth + Server-Side Firebase Admin SDK)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const activeUid = currentUser?.uid || '';
  const activeEmail = currentUser?.email || null;
  const activePhotoUrl = currentUser?.photoURL || null;

  // Content State (Initialized with owner-provided data, synced live with Firestore)
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [videos, setVideos] = useState<VideoItem[]>(INITIAL_VIDEOS);
  const [articles, setArticles] = useState<ArticleItem[]>(INITIAL_ARTICLES);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(INITIAL_SOCIAL_LINKS);
  const [hasFirestoreSeeded, setHasFirestoreSeeded] = useState<boolean>(false);

  // Modal player for More Videos page
  const [activeModalVideo, setActiveModalVideo] = useState<VideoItem | null>(null);

  const navigate = useCallback((nextRoute: PageRoute) => {
    setRoute(nextRoute);
    const nextPath = routeToPathname(nextRoute);
    try {
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Ignore navigation history restrictions
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parsePathnameToRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Enrich initial owner-provided YouTube videos with real YouTube oEmbed titles & load persistent server store
  useEffect(() => {
    let cancelled = false;
    async function loadInitialAndServerStore() {
      try {
        const storeRes = await fetch('/api/content');
        if (storeRes.ok) {
          const storeData = (await storeRes.json()) as {
            settings?: SiteSettings | null;
            videos?: VideoItem[] | null;
            articles?: ArticleItem[] | null;
            products?: ProductItem[] | null;
            socialLinks?: SocialLinkItem[] | null;
          };
          if (!cancelled) {
            if (storeData.settings) setSettings(storeData.settings);
            if (Array.isArray(storeData.videos) && storeData.videos.length > 0) {
              setVideos(storeData.videos);
            }
            if (Array.isArray(storeData.articles) && storeData.articles.length > 0) {
              setArticles(
                storeData.articles.map((a) => ({
                  ...a,
                  thumbnail: resolveAssetUrl(a.thumbnail, a.thumbnail),
                }))
              );
            }
            if (Array.isArray(storeData.products) && storeData.products.length > 0) {
              setProducts(
                storeData.products.map((p) => ({
                  ...p,
                  image: resolveAssetUrl(p.image, p.image),
                }))
              );
            }
            if (Array.isArray(storeData.socialLinks) && storeData.socialLinks.length > 0) {
              setSocialLinks(
                storeData.socialLinks.map((s) => ({
                  ...s,
                  custom_image: resolveAssetUrl(s.custom_image, s.custom_image),
                }))
              );
            }
          }
        }
      } catch {
        // Keep initial defaults
      }

      for (const vid of INITIAL_VIDEOS) {
        try {
          const res = await fetch(`/api/youtube-meta?url=${encodeURIComponent(vid.youtube_url)}`);
          if (!res.ok) continue;
          const meta = (await res.json()) as { title?: string; thumbnail_url?: string };
          if (!cancelled && meta.title) {
            setVideos((prev) =>
              prev.map((item) =>
                item.id === vid.id && item.title.startsWith('DecodeWithTech Featured Video')
                  ? {
                      ...item,
                      title: meta.title || item.title,
                      thumbnail: meta.thumbnail_url || item.thumbnail,
                    }
                  : item
              )
            );
          }
        } catch {
          // Keep default fallback
        }
      }
    }
    loadInitialAndServerStore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dynamic SEO Title & Canonical URL Updater (PRD Section 63)
  useEffect(() => {
    let pageTitle = `${settings.brand_name || 'DecodeWithTech'} – Official Technology & Science Companion`;
    if (route.page === 'videos') {
      pageTitle = `More Videos – ${settings.brand_name}`;
    } else if (route.page === 'explain') {
      pageTitle = `Explain Stories – ${settings.brand_name}`;
    } else if (route.page === 'article') {
      const found = articles.find((a) => a.id === route.articleId);
      if (found) pageTitle = `${found.title} – ${settings.brand_name}`;
    } else if (route.page === 'shopping') {
      pageTitle = `Shopping with DWT – ${settings.brand_name}`;
    } else if (route.page === 'about' || route.page === 'disclaimer') {
      pageTitle = `About & Disclaimer – ${settings.brand_name}`;
    } else if (route.page === 'admin') {
      pageTitle = `Admin Dashboard – ${settings.brand_name}`;
    }
    document.title = pageTitle;

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname;
  }, [route, settings.brand_name, articles]);

  // Helper to sync content to persistent backend store using verified Firebase ID Token only
  const syncContentToServer = useCallback(
    async (partial: {
      settings?: SiteSettings;
      videos?: VideoItem[];
      articles?: ArticleItem[];
      products?: ProductItem[];
      socialLinks?: SocialLinkItem[];
    }) => {
      if (!currentUser || !isAdmin) return;

      try {
        const token = await currentUser.getIdToken();
        await fetch('/api/content/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(partial),
        });
      } catch {
        // Ignore network errors
      }
    },
    [currentUser, isAdmin]
  );

  // Verify Admin Status via Server-Side Firebase Admin SDK & Bootstrap Firestore if needed
  useEffect(() => {
    try {
      // Clean up any legacy client-side session storage key
      localStorage.removeItem('dwt_google_session_v1');
    } catch {
      // Ignore storage restrictions
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsAdmin(false);
        setUserDisplayName('');
        return;
      }

      const fallbackName = clampStr(
        user.displayName || user.email?.split('@')[0] || 'Google User',
        80,
        'Google User'
      );
      setUserDisplayName(fallbackName);

      // Sync editable display name from /user_profiles/{uid}
      const userProfileRef = doc(db, 'user_profiles', user.uid);
      try {
        const profileSnap = await getDoc(userProfileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data() as { displayName?: string };
          if (data.displayName) {
            setUserDisplayName(clampStr(data.displayName, 80, fallbackName));
          }
        } else if (user.emailVerified) {
          await setDoc(userProfileRef, {
            uid: user.uid,
            displayName: fallbackName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.GET, `user_profiles/${user.uid}`);
        } catch {
          // Handled
        }
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/auth/verify-admin', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        let verifiedAdmin = false;
        if (res.ok) {
          const data = (await res.json()) as { isAdmin?: boolean; displayName?: string | null };
          verifiedAdmin = data.isAdmin === true;
          if (data.displayName) {
            setUserDisplayName(clampStr(data.displayName, 80, fallbackName));
          }
        }

        setIsAdmin(verifiedAdmin);

        if (verifiedAdmin) {
          // Ensure server store is seeded if empty
          try {
            const storeRes = await fetch('/api/content');
            if (storeRes.ok) {
              const store = await storeRes.json();
              if (!store.settings) {
                await fetch('/api/content/sync', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    settings: INITIAL_SITE_SETTINGS,
                    videos: INITIAL_VIDEOS,
                    articles: INITIAL_ARTICLES,
                    products: INITIAL_PRODUCTS,
                    socialLinks: INITIAL_SOCIAL_LINKS,
                  }),
                });
              }
            }
          } catch {
            // Ignore
          }

          // Ensure /admins/{uid} exists
          const adminDocRef = doc(db, 'admins', user.uid);
          try {
            const existingAdmin = await getDoc(adminDocRef);
            if (!existingAdmin.exists()) {
              await setDoc(adminDocRef, {
                uid: user.uid,
                role: 'admin',
                status: 'active',
                createdAt: serverTimestamp(),
              });
            }
          } catch (err) {
            try {
              handleFirestoreError(err, OperationType.WRITE, `admins/${user.uid}`);
            } catch {
              // Handled
            }
          }

          // Seed initial owner data into Firestore if site_settings/main does not exist yet
          const settingsRef = doc(db, 'site_settings', 'main');
          try {
            const settingsSnap = await getDoc(settingsRef);
            if (!settingsSnap.exists()) {
              await setDoc(settingsRef, {
                logo_svg: clampStr(INITIAL_SITE_SETTINGS.logo_svg, SCHEMA_LIMITS.SETTINGS.LOGO_MAX),
                brand_name: clampStr(INITIAL_SITE_SETTINGS.brand_name, SCHEMA_LIMITS.SETTINGS.BRAND_MAX),
                tagline: clampStr(INITIAL_SITE_SETTINGS.tagline, SCHEMA_LIMITS.SETTINGS.TAGLINE_MAX),
                hero_title: clampStr(INITIAL_SITE_SETTINGS.hero_title, SCHEMA_LIMITS.SETTINGS.HERO_TITLE_MAX),
                hero_subtitle: clampStr(INITIAL_SITE_SETTINGS.hero_subtitle, SCHEMA_LIMITS.SETTINGS.HERO_SUB_MAX),
                youtube_channel_url: clampStr(INITIAL_SITE_SETTINGS.youtube_channel_url, SCHEMA_LIMITS.SETTINGS.YT_URL_MAX),
                about_text: clampStr(INITIAL_SITE_SETTINGS.about_text, SCHEMA_LIMITS.SETTINGS.ABOUT_MAX),
                disclaimer_text: clampStr(INITIAL_SITE_SETTINGS.disclaimer_text, SCHEMA_LIMITS.SETTINGS.DISCLAIMER_MAX),
                shopping_disclaimer: clampStr(INITIAL_SITE_SETTINGS.shopping_disclaimer, SCHEMA_LIMITS.SETTINGS.SHOP_DISCLAIMER_MAX),
                footer_text: clampStr(INITIAL_SITE_SETTINGS.footer_text, SCHEMA_LIMITS.SETTINGS.FOOTER_MAX),
                show_videos: true,
                show_social: true,
                show_shopping: true,
                show_explain: true,
                authorId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              for (const v of INITIAL_VIDEOS) {
                const vRef = doc(db, 'videos', v.id);
                const vSnap = await getDoc(vRef);
                if (!vSnap.exists()) {
                  let realTitle = v.title;
                  let realThumb = v.thumbnail;
                  try {
                    const metaRes = await fetch(`/api/youtube-meta?url=${encodeURIComponent(v.youtube_url)}`);
                    if (metaRes.ok) {
                      const meta = await metaRes.json();
                      if (meta.title) realTitle = meta.title;
                      if (meta.thumbnail_url) realThumb = meta.thumbnail_url;
                    }
                  } catch {
                    // Ignore
                  }
                  const payload = sanitizeVideoPayload({
                    ...v,
                    title: realTitle,
                    thumbnail: realThumb,
                    authorId: user.uid,
                  });
                  await setDoc(vRef, {
                    ...payload,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                }
              }

              for (const a of INITIAL_ARTICLES) {
                const aRef = doc(db, 'articles', a.id);
                const aSnap = await getDoc(aRef);
                if (!aSnap.exists()) {
                  const payload = sanitizeArticlePayload({ ...a, authorId: user.uid });
                  await setDoc(aRef, {
                    ...payload,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                }
              }

              for (const p of INITIAL_PRODUCTS) {
                const pRef = doc(db, 'products', p.id);
                const pSnap = await getDoc(pRef);
                if (!pSnap.exists()) {
                  const payload = sanitizeProductPayload({ ...p, authorId: user.uid });
                  await setDoc(pRef, {
                    ...payload,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                }
              }

              for (const s of INITIAL_SOCIAL_LINKS) {
                const sRef = doc(db, 'social_links', s.id);
                const sSnap = await getDoc(sRef);
                if (!sSnap.exists()) {
                  const payload = sanitizeSocialPayload({ ...s, authorId: user.uid });
                  await setDoc(sRef, {
                    ...payload,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                }
              }
            }
          } catch (err) {
            try {
              handleFirestoreError(err, OperationType.WRITE, 'site_settings/main');
            } catch {
              // Handled
            }
          }
        }
      } catch {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore Content (Public Published Queries + Admin Author Queries)
  useEffect(() => {
    const settingsRef = doc(db, 'site_settings', 'main');
    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as SiteSettings;
          // If Firestore contains legacy Hindi text from initial seed, display English defaults
          const isLegacyHindi =
            /[\u0900-\u097F]/.test(raw.tagline || '') ||
            /[\u0900-\u097F]/.test(raw.about_text || '') ||
            /[\u0900-\u097F]/.test(raw.hero_title || '');
          setSettings(
            isLegacyHindi
              ? {
                  ...raw,
                  logo_svg: INITIAL_SITE_SETTINGS.logo_svg,
                  tagline: INITIAL_SITE_SETTINGS.tagline,
                  hero_title: INITIAL_SITE_SETTINGS.hero_title,
                  hero_subtitle: INITIAL_SITE_SETTINGS.hero_subtitle,
                  about_text: INITIAL_SITE_SETTINGS.about_text,
                  disclaimer_text: INITIAL_SITE_SETTINGS.disclaimer_text,
                  shopping_disclaimer: INITIAL_SITE_SETTINGS.shopping_disclaimer,
                }
              : raw
          );
          setHasFirestoreSeeded(true);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'site_settings/main');
        } catch {
          // Handled
        }
      }
    );

    const videoQuery =
      isAdmin && currentUser
        ? query(collection(db, 'videos'), where('authorId', '==', currentUser.uid))
        : query(collection(db, 'videos'), where('status', '==', 'published'));

    const unsubVideos = onSnapshot(
      videoQuery,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => {
              const data = d.data() as Omit<VideoItem, 'id'>;
              const fallbackSeed = INITIAL_VIDEOS.find((v) => v.id === d.id);
              const hasHindiDesc = /[^\u0000-\u007F]/.test(data.description || '');
              return {
                id: d.id,
                ...data,
                description:
                  hasHindiDesc && fallbackSeed ? fallbackSeed.description : data.description,
              };
            })
            .sort((a, b) => a.display_order - b.display_order);
          setVideos(list);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'videos');
        } catch {
          // Handled
        }
      }
    );

    const articleQuery =
      isAdmin && currentUser
        ? query(collection(db, 'articles'), where('authorId', '==', currentUser.uid))
        : query(collection(db, 'articles'), where('status', '==', 'published'));

    const unsubArticles = onSnapshot(
      articleQuery,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => {
              const data = d.data() as Omit<ArticleItem, 'id'>;
              const fallbackSeed = INITIAL_ARTICLES.find((a) => a.id === d.id);
              const hasHindiTitle = /[\u0900-\u097F]/.test(data.title || '');
              if (hasHindiTitle && fallbackSeed) {
                return {
                  ...fallbackSeed,
                  id: d.id,
                  status: data.status,
                  display_order: data.display_order,
                  authorId: data.authorId,
                };
              }
              return {
                id: d.id,
                ...data,
                thumbnail: resolveAssetUrl(data.thumbnail, fallbackSeed?.thumbnail || data.thumbnail),
              };
            })
            .sort((a, b) => a.display_order - b.display_order);
          setArticles(list);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'articles');
        } catch {
          // Handled
        }
      }
    );

    const productQuery =
      isAdmin && currentUser
        ? query(collection(db, 'products'), where('authorId', '==', currentUser.uid))
        : query(collection(db, 'products'), where('status', '==', 'published'));

    const unsubProducts = onSnapshot(
      productQuery,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => {
              const data = d.data() as Omit<ProductItem, 'id'>;
              const fallbackSeed = INITIAL_PRODUCTS.find((p) => p.id === d.id);
              const hasHindiDesc = /[\u0900-\u097F]/.test(data.description || '');
              return {
                id: d.id,
                ...data,
                image: resolveAssetUrl(data.image, fallbackSeed?.image || data.image),
                description:
                  hasHindiDesc && fallbackSeed ? fallbackSeed.description : data.description,
              };
            })
            .sort((a, b) => a.display_order - b.display_order);
          setProducts(list);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'products');
        } catch {
          // Handled
        }
      }
    );

    const socialQuery =
      isAdmin && currentUser
        ? query(collection(db, 'social_links'), where('authorId', '==', currentUser.uid))
        : query(collection(db, 'social_links'), where('status', '==', 'published'));

    const unsubSocial = onSnapshot(
      socialQuery,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => {
              const data = d.data() as Omit<SocialLinkItem, 'id'>;
              const fallbackSeed = INITIAL_SOCIAL_LINKS.find((s) => s.id === d.id);
              const hasHindiDesc = /[\u0900-\u097F]/.test(data.description || '');
              return {
                id: d.id,
                ...data,
                custom_image: resolveAssetUrl(
                  data.custom_image || fallbackSeed?.custom_image || '',
                  fallbackSeed?.custom_image || ''
                ),
                description:
                  hasHindiDesc && fallbackSeed ? fallbackSeed.description : data.description,
              };
            })
            .sort((a, b) => a.display_order - b.display_order);
          setSocialLinks(list);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'social_links');
        } catch {
          // Handled
        }
      }
    );

    return () => {
      unsubSettings();
      unsubVideos();
      unsubArticles();
      unsubProducts();
      unsubSocial();
    };
  }, [isAdmin, currentUser, hasFirestoreSeeded]);

  // Filtered Public Published Lists (PRD Section 39 & 61: Draft and Hidden never appear on public site)
  const publishedVideos = useMemo(
    () =>
      videos
        .filter((v) => v.status === 'published' && Boolean(v.youtube_url))
        .sort((a, b) => a.display_order - b.display_order),
    [videos]
  );

  const publishedArticles = useMemo(
    () =>
      articles
        .filter((a) => a.status === 'published' && Boolean(a.title))
        .sort((a, b) => a.display_order - b.display_order),
    [articles]
  );

  const publishedProducts = useMemo(
    () =>
      products
        .filter((p) => p.status === 'published' && Boolean(p.product_url))
        .sort((a, b) => a.display_order - b.display_order),
    [products]
  );

  const publishedSocials = useMemo(
    () =>
      socialLinks
        .filter((s) => s.status === 'published' && Boolean(s.profile_url))
        .sort((a, b) => a.display_order - b.display_order),
    [socialLinks]
  );

  // Auth Actions: Firebase Google Authentication
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthNotice(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthNotice('Google Sign-In could not be completed. Please allow popups and try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setUserDisplayName('');
    setIsAdmin(false);
    try {
      localStorage.removeItem('dwt_google_session_v1');
    } catch {
      // Ignore
    }
    if (route.page === 'admin') {
      navigate({ page: 'home' });
    }
  };

  const handleUpdateDisplayName = async (rawName: string) => {
    if (!currentUser) return;
    const cleanName = clampStr(rawName, 80, 'Google User');
    setUserDisplayName(cleanName);

    try {
      const token = await currentUser.getIdToken();
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: cleanName,
        }),
      });
    } catch {
      // Ignore
    }

    // Also update Firebase Auth & Firestore /user_profiles/{uid}
    try {
      await updateProfile(currentUser, { displayName: cleanName });
    } catch {
      // Ignore
    }

    const userProfileRef = doc(db, 'user_profiles', currentUser.uid);
    try {
      const existingSnap = await getDoc(userProfileRef);
      if (existingSnap.exists()) {
        await updateDoc(userProfileRef, {
          displayName: cleanName,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userProfileRef, {
          uid: currentUser.uid,
          displayName: cleanName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `user_profiles/${currentUser.uid}`);
      } catch {
        // Handled
      }
    }
  };

  // Admin CRUD Handlers (Updates Live State + Server Store + Firestore when authenticated as Admin)
  const handleSaveVideo = async (
    item: Omit<VideoItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUser || !isAdmin || !activeUid) return;
    const id = existingId || `video_${Date.now()}`;
    const payload = sanitizeVideoPayload({ ...item, authorId: activeUid });

    const nextVideo: VideoItem = { id, ...payload };
    const nextList = existingId
      ? videos.some((v) => v.id === existingId)
        ? videos.map((v) => (v.id === existingId ? nextVideo : v))
        : [...videos, nextVideo]
      : [...videos, nextVideo];
    const sorted = [...nextList].sort((a, b) => a.display_order - b.display_order);
    setVideos(sorted);
    await syncContentToServer({ videos: sorted });

    if (currentUser) {
      const ref = doc(db, 'videos', id);
      try {
        if (existingId) {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const { authorId: _a, ...updateFields } = payload;
            await updateDoc(ref, {
              ...updateFields,
              updatedAt: serverTimestamp(),
            });
            return;
          }
        }
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `videos/${id}`);
        } catch {
          // Handled
        }
      }
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!currentUser || !isAdmin) return;
    const nextList = videos.filter((v) => v.id !== id);
    setVideos(nextList);
    await syncContentToServer({ videos: nextList });

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'videos', id));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `videos/${id}`);
        } catch {
          // Handled
        }
      }
    }
  };

  const handleSaveArticle = async (
    item: Omit<ArticleItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUser || !isAdmin || !activeUid) return;
    const id = existingId || `article_${Date.now()}`;
    const payload = sanitizeArticlePayload({ ...item, authorId: activeUid });

    const nextArticle: ArticleItem = { id, ...payload };
    const nextList = existingId
      ? articles.some((a) => a.id === existingId)
        ? articles.map((a) => (a.id === existingId ? nextArticle : a))
        : [...articles, nextArticle]
      : [...articles, nextArticle];
    const sorted = [...nextList].sort((a, b) => a.display_order - b.display_order);
    setArticles(sorted);
    await syncContentToServer({ articles: sorted });

    if (currentUser) {
      const ref = doc(db, 'articles', id);
      try {
        if (existingId) {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const { authorId: _a, ...updateFields } = payload;
            await updateDoc(ref, {
              ...updateFields,
              updatedAt: serverTimestamp(),
            });
            return;
          }
        }
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `articles/${id}`);
        } catch {
          // Handled
        }
      }
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!currentUser || !isAdmin) return;
    const nextList = articles.filter((a) => a.id !== id);
    setArticles(nextList);
    await syncContentToServer({ articles: nextList });

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'articles', id));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `articles/${id}`);
        } catch {
          // Handled
        }
      }
    }
  };

  const handleSaveProduct = async (
    item: Omit<ProductItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUser || !isAdmin || !activeUid) return;
    const id = existingId || `product_${Date.now()}`;
    const payload = sanitizeProductPayload({ ...item, authorId: activeUid });

    const nextProduct: ProductItem = { id, ...payload };
    const nextList = existingId
      ? products.some((p) => p.id === existingId)
        ? products.map((p) => (p.id === existingId ? nextProduct : p))
        : [...products, nextProduct]
      : [...products, nextProduct];
    const sorted = [...nextList].sort((a, b) => a.display_order - b.display_order);
    setProducts(sorted);
    await syncContentToServer({ products: sorted });

    if (currentUser) {
      const ref = doc(db, 'products', id);
      try {
        if (existingId) {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const { authorId: _a, ...updateFields } = payload;
            await updateDoc(ref, {
              ...updateFields,
              updatedAt: serverTimestamp(),
            });
            return;
          }
        }
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `products/${id}`);
        } catch {
          // Handled
        }
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!currentUser || !isAdmin) return;
    const nextList = products.filter((p) => p.id !== id);
    setProducts(nextList);
    await syncContentToServer({ products: nextList });

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
        } catch {
          // Handled
        }
      }
    }
  };

  const handleSaveSocial = async (
    item: Omit<SocialLinkItem, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!currentUser || !isAdmin || !activeUid) return;
    const id = existingId || `social_${Date.now()}`;
    const payload = sanitizeSocialPayload({ ...item, authorId: activeUid });

    const nextSocial: SocialLinkItem = { id, ...payload };
    const nextList = existingId
      ? socialLinks.some((s) => s.id === existingId)
        ? socialLinks.map((s) => (s.id === existingId ? nextSocial : s))
        : [...socialLinks, nextSocial]
      : [...socialLinks, nextSocial];
    const sorted = [...nextList].sort((a, b) => a.display_order - b.display_order);
    setSocialLinks(sorted);
    await syncContentToServer({ socialLinks: sorted });

    if (currentUser) {
      const ref = doc(db, 'social_links', id);
      try {
        if (existingId) {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const { authorId: _a, ...updateFields } = payload;
            await updateDoc(ref, {
              ...updateFields,
              updatedAt: serverTimestamp(),
            });
            return;
          }
        }
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(
            err,
            existingId ? OperationType.UPDATE : OperationType.CREATE,
            `social_links/${id}`
          );
        } catch {
          // Handled
        }
      }
    }
  };

  const handleDeleteSocial = async (id: string) => {
    if (!currentUser || !isAdmin) return;
    const nextList = socialLinks.filter((s) => s.id !== id);
    setSocialLinks(nextList);
    await syncContentToServer({ socialLinks: nextList });

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'social_links', id));
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `social_links/${id}`);
        } catch {
          // Handled
        }
      }
    }
  };

  const handleSaveSettings = async (next: Omit<SiteSettings, 'createdAt' | 'updatedAt'>) => {
    if (!currentUser || !isAdmin || !activeUid) return;
    const cleanPayload: SiteSettings = {
      logo_svg: clampStr(next.logo_svg, SCHEMA_LIMITS.SETTINGS.LOGO_MAX, INITIAL_SITE_SETTINGS.logo_svg),
      brand_name: clampStr(next.brand_name, SCHEMA_LIMITS.SETTINGS.BRAND_MAX, 'DecodeWithTech'),
      tagline: clampStr(next.tagline, SCHEMA_LIMITS.SETTINGS.TAGLINE_MAX),
      hero_title: clampStr(next.hero_title, SCHEMA_LIMITS.SETTINGS.HERO_TITLE_MAX),
      hero_subtitle: clampStr(next.hero_subtitle, SCHEMA_LIMITS.SETTINGS.HERO_SUB_MAX),
      youtube_channel_url: clampStr(
        next.youtube_channel_url,
        SCHEMA_LIMITS.SETTINGS.YT_URL_MAX,
        INITIAL_SITE_SETTINGS.youtube_channel_url
      ),
      about_text: clampStr(next.about_text, SCHEMA_LIMITS.SETTINGS.ABOUT_MAX, INITIAL_SITE_SETTINGS.about_text),
      disclaimer_text: clampStr(
        next.disclaimer_text,
        SCHEMA_LIMITS.SETTINGS.DISCLAIMER_MAX,
        INITIAL_SITE_SETTINGS.disclaimer_text
      ),
      shopping_disclaimer: clampStr(
        next.shopping_disclaimer,
        SCHEMA_LIMITS.SETTINGS.SHOP_DISCLAIMER_MAX,
        INITIAL_SITE_SETTINGS.shopping_disclaimer
      ),
      footer_text: clampStr(next.footer_text, SCHEMA_LIMITS.SETTINGS.FOOTER_MAX, '© DecodeWithTech'),
      show_videos: Boolean(next.show_videos),
      show_social: Boolean(next.show_social),
      show_shopping: Boolean(next.show_shopping),
      show_explain: Boolean(next.show_explain),
      authorId: activeUid,
    };

    setSettings(cleanPayload);
    await syncContentToServer({ settings: cleanPayload });

    if (currentUser) {
      const ref = doc(db, 'site_settings', 'main');
      const { authorId: _a, ...firestoreFields } = cleanPayload;
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await updateDoc(ref, {
            ...firestoreFields,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...firestoreFields,
            authorId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'site_settings/main');
        } catch {
          // Handled
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950 relative overflow-x-hidden flex flex-col">
      {/* 5-Second DecodeWithTech Intro Screen (PRD Sections 5, 6, 7, 8) */}
      {showIntro && (
        <IntroScreen
          logoSvg={settings.logo_svg}
          onComplete={() => setShowIntro(false)}
        />
      )}

      {/* Single Continuous Soft Blurred Orange/Saffron Ambient Circle (PRD Sections 13 & 47) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="dwt-ambient-glow w-[420px] h-[420px] sm:w-[620px] sm:h-[620px] rounded-full opacity-[0.14] blur-[110px]"
          style={{
            background: 'radial-gradient(circle, #FF6B00 0%, #FF8A00 55%, transparent 100%)',
          }}
        />
      </div>

      {/* Sticky Top Header (PRD Section 10) */}
      <Header
        settings={settings}
        currentRoute={route}
        onNavigate={navigate}
        socialLinks={publishedSocials}
        userEmail={activeEmail}
        userDisplayName={
          userDisplayName ||
          currentUser?.displayName ||
          activeEmail?.split('@')[0] ||
          'Google User'
        }
        userPhotoUrl={activePhotoUrl}
        isAdmin={isAdmin}
        authLoading={authLoading}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onUpdateDisplayName={handleUpdateDisplayName}
      />

      {/* Optional Auth Status Notice */}
      {authNotice && (
        <div className="relative z-20 max-w-[1200px] mx-auto px-4 sm:px-6 pt-3 w-full">
          <div className="px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-medium text-neutral-800 flex items-center justify-between">
            <span>{authNotice}</span>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-neutral-500 hover:text-neutral-900 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1">
        {/* =============================================================== */}
        {/* 1. HOME PAGE (PRD Section 52: Exact Content Order)              */}
        {/* =============================================================== */}
        {route.page === 'home' && (
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-16 sm:space-y-24">
            {/* Hero Intro & Featured YouTube Video Slider (Section 13 & 14) */}
            <section>
              {(settings.hero_title || settings.hero_subtitle) && (
                <div className="mb-8 max-w-2xl">
                  <p className="text-xs font-semibold text-[#EA580C]">
                    Official Companion · Watch · Read · Shop · Discover
                  </p>
                  {settings.hero_title && (
                    <h1 className="mt-1.5 text-2xl sm:text-4xl font-extrabold text-neutral-950 font-display tracking-tight">
                      {settings.hero_title}
                    </h1>
                  )}
                  {settings.hero_subtitle && (
                    <p className="mt-2.5 text-sm sm:text-base text-neutral-600 leading-relaxed">
                      {settings.hero_subtitle}
                    </p>
                  )}
                </div>
              )}

              {settings.show_videos && publishedVideos.length > 0 && (
                <VideoSlider
                  videos={publishedVideos}
                  onViewMore={() => navigate({ page: 'videos' })}
                />
              )}
            </section>

            {/* 2. Social / Channel Preview (PRD Sections 25, 26, 27, 52, 58) */}
            {settings.show_social && publishedSocials.length > 0 && (
              <section aria-label="Official Channels">
                <div className="flex items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-[#EA580C]">Connect</p>
                    <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-neutral-950 font-display">
                      Official Channel
                    </h2>
                  </div>
                </div>

                <div
                  className={`grid grid-cols-1 ${
                    publishedSocials.length > 1 ? 'md:grid-cols-2' : ''
                  } gap-5`}
                >
                  {publishedSocials.map((social) => (
                    <div
                      key={social.id}
                      className="p-6 sm:p-7 rounded-3xl bg-white border border-orange-500/20 shadow-[0_8px_30px_rgba(249,115,22,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                    >
                      <div className="flex items-center gap-4">
                        {social.custom_image ? (
                          <img
                            src={resolveAssetUrl(social.custom_image, social.custom_image)}
                            alt={social.display_name}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-2xl object-cover border border-orange-200 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                            {social.platform === 'YouTube' ? (
                              <DwtLogo svgMarkup={settings.logo_svg} className="w-12 h-12" />
                            ) : social.platform === 'Instagram' ? (
                              <Instagram className="w-8 h-8 text-[#EA580C]" />
                            ) : (
                              <Globe className="w-8 h-8 text-[#EA580C]" />
                            )}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 text-xs text-[#EA580C] font-semibold">
                            <span>{social.platform}</span>
                            {social.handle && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{social.handle}</span>
                              </>
                            )}
                          </div>
                          <h3 className="mt-0.5 text-xl font-bold text-neutral-950 font-display">
                            {social.display_name}
                          </h3>
                          {social.follower_count && (
                            <p className="mt-0.5 text-xs font-mono-num font-semibold text-neutral-700">
                              {social.follower_count}
                            </p>
                          )}
                          {social.description && (
                            <p className="mt-1.5 text-xs sm:text-sm text-neutral-600 max-w-md">
                              {social.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <a
                        href={social.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0"
                      >
                        {social.platform === 'YouTube' && <Youtube className="w-4 h-4" />}
                        <span>
                          {social.platform === 'YouTube'
                            ? 'Visit Channel'
                            : `Visit ${social.platform}`}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. Shopping Preview (PRD Sections 22, 23, 24, 52, 53) */}
            {settings.show_shopping && publishedProducts.length > 0 && (
              <section aria-label="Shopping with DWT">
                <div className="flex items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-[#EA580C]">Curated Gear</p>
                    <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-neutral-950 font-display">
                      Shopping with DWT
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'shopping' })}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#EA580C] hover:text-[#C2410C] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>View All →</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {publishedProducts.slice(0, 2).map((product, idx) => (
                    <div
                      key={product.id}
                      className="group bg-white rounded-3xl border border-orange-500/20 hover:border-[#FF6B00]/60 shadow-[0_8px_30px_rgba(249,115,22,0.06)] overflow-hidden flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="relative aspect-[4/3] bg-neutral-50 overflow-hidden border-b border-neutral-100">
                          <img
                            src={resolveAssetUrl(product.image, product.image)}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </div>

                        <div className="p-6">
                          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 mb-1.5">
                            <span>
                              {product.badge || `DWT Selection #${String(idx + 1).padStart(2, '0')}`}
                            </span>
                            {product.price_text && (
                              <span className="font-mono-num font-bold text-[#EA580C]">
                                {product.price_text}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-neutral-950 font-display">
                            {product.name}
                          </h3>
                          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                            {product.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 pb-6">
                        <a
                          href={product.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-sm font-semibold shadow-xs transition-colors whitespace-nowrap"
                        >
                          <span>{product.button_text || 'View Product →'}</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Affiliate Disclaimer (PRD Section 24) */}
                {settings.shopping_disclaimer && (
                  <p className="mt-4 text-xs text-neutral-500 leading-relaxed">
                    {settings.shopping_disclaimer}
                  </p>
                )}
              </section>
            )}

            {/* 4. Explain / Read Preview (PRD Sections 17, 18, 52, 54) */}
            {settings.show_explain && publishedArticles.length > 0 && (
              <section aria-label="Explain Stories">
                <div className="flex items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-[#EA580C]">Deep-Dive Stories</p>
                    <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-neutral-950 font-display">
                      EXPLAIN
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'explain' })}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#EA580C] hover:text-[#C2410C] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>View All →</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {publishedArticles.slice(0, 2).map((article, idx) => (
                    <article
                      key={article.id}
                      onClick={() => navigate({ page: 'article', articleId: article.id })}
                      className="group bg-white rounded-3xl border border-orange-500/20 hover:border-[#FF6B00]/60 shadow-[0_8px_30px_rgba(249,115,22,0.06)] overflow-hidden flex flex-col justify-between transition-all cursor-pointer"
                    >
                      <div>
                        <div className="relative aspect-video bg-orange-50 overflow-hidden border-b border-neutral-100">
                          <img
                            src={resolveAssetUrl(article.thumbnail, article.thumbnail)}
                            alt={article.title}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </div>

                        <div className="p-6">
                          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                            <span className="font-mono-num text-[#EA580C] font-semibold">
                              0{idx + 1}. Explain Story
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Audio Enabled</span>
                          </div>
                          <h3 className="text-xl font-bold text-neutral-950 font-display group-hover:text-[#EA580C] transition-colors">
                            {article.title}
                          </h3>
                          <p className="mt-2.5 text-sm text-neutral-600 leading-relaxed line-clamp-3">
                            {article.short_description}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-2">
                        <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 group-hover:bg-[#FF6B00] text-[#EA580C] group-hover:text-white text-xs sm:text-sm font-semibold transition-colors">
                          <BookOpen className="w-4 h-4" />
                          <span>Read More</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* 2. MORE VIDEOS PAGE (/videos, PRD Section 16)                   */}
        {/* =============================================================== */}
        {route.page === 'videos' && (
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-10">
            <div className="mb-8 pb-6 border-b border-neutral-200">
              <p className="text-xs font-semibold text-[#EA580C]">Official Video Archive</p>
              <h1 className="mt-1 text-2xl sm:text-4xl font-extrabold text-neutral-950 font-display">
                More Videos
              </h1>
            </div>

            {publishedVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {publishedVideos.map((video, idx) => (
                  <div
                    key={video.id}
                    className="group bg-white rounded-3xl border border-orange-500/20 hover:border-[#FF6B00]/60 shadow-[0_8px_30px_rgba(249,115,22,0.06)] overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div
                        onClick={() => setActiveModalVideo(video)}
                        className="relative aspect-video bg-neutral-950 overflow-hidden cursor-pointer"
                      >
                        <img
                          src={
                            video.thumbnail ||
                            `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`
                          }
                          alt={video.title}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                          <span className="w-14 h-14 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-lg border-2 border-white">
                            <Play className="w-6 h-6 fill-white ml-0.5" />
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                          <span className="font-mono-num text-[#EA580C] font-semibold">
                            Episode {String(idx + 1).padStart(2, '0')}
                          </span>
                          {video.category && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{video.category}</span>
                            </>
                          )}
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-neutral-950 font-display">
                          {video.title}
                        </h2>
                        {video.description && (
                          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                            {video.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-6 pb-6 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveModalVideo(video)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Watch Video</span>
                      </button>
                      <a
                        href={video.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-orange-50 text-neutral-800 hover:text-[#EA580C] text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        <span>YouTube</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* =============================================================== */}
        {/* 3. EXPLAIN LISTING PAGE (/explain, PRD Section 17 & 18)         */}
        {/* =============================================================== */}
        {route.page === 'explain' && (
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-10">
            <div className="mb-8 pb-6 border-b border-neutral-200">
              <p className="text-xs font-semibold text-[#EA580C]">Technology & Science Stories</p>
              <h1 className="mt-1 text-2xl sm:text-4xl font-extrabold text-neutral-950 font-display">
                EXPLAIN
              </h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-600 max-w-2xl">
                In-depth written stories connected to DecodeWithTech videos — exploring how everyday technologies were invented, why they matter, and how they work under the hood.
              </p>
            </div>

            {publishedArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {publishedArticles.map((article, idx) => (
                  <article
                    key={article.id}
                    onClick={() => navigate({ page: 'article', articleId: article.id })}
                    className="group bg-white rounded-3xl border border-orange-500/20 hover:border-[#FF6B00]/60 shadow-[0_8px_30px_rgba(249,115,22,0.06)] overflow-hidden flex flex-col justify-between transition-all cursor-pointer"
                  >
                    <div>
                      <div className="relative aspect-video bg-orange-50 overflow-hidden border-b border-neutral-100">
                        <img
                          src={resolveAssetUrl(article.thumbnail, article.thumbnail)}
                          alt={article.title}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                          <span className="font-mono-num text-[#EA580C] font-semibold">
                            Story #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Audio Story Included</span>
                        </div>
                        <h2 className="text-xl font-bold text-neutral-950 font-display group-hover:text-[#EA580C] transition-colors">
                          {article.title}
                        </h2>
                        <p className="mt-2.5 text-sm text-neutral-600 leading-relaxed">
                          {article.short_description}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] group-hover:bg-[#EA580C] text-white text-xs sm:text-sm font-semibold transition-colors">
                        <BookOpen className="w-4 h-4" />
                        <span>Read More</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* =============================================================== */}
        {/* 4. FULL EXPLAIN ARTICLE PAGE (/explain/:id, PRD Section 19-21)  */}
        {/* =============================================================== */}
        {route.page === 'article' && (
          <ArticleView
            article={
              publishedArticles.find((a) => a.id === route.articleId) ||
              articles.find((a) => a.id === route.articleId) ||
              INITIAL_ARTICLES[0]
            }
            onBack={() => navigate({ page: 'explain' })}
          />
        )}

        {/* =============================================================== */}
        {/* 5. SHOPPING PAGE (/shopping, PRD Section 22, 23, 24)            */}
        {/* =============================================================== */}
        {route.page === 'shopping' && (
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-10">
            <div className="mb-8 pb-6 border-b border-neutral-200">
              <p className="text-xs font-semibold text-[#EA580C]">Curated Recommendations</p>
              <h1 className="mt-1 text-2xl sm:text-4xl font-extrabold text-neutral-950 font-display">
                Shopping with DWT
              </h1>
            </div>

            {publishedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {publishedProducts.map((product, idx) => (
                    <div
                      key={product.id}
                      className="group bg-white rounded-3xl border border-orange-500/20 hover:border-[#FF6B00]/60 shadow-[0_8px_30px_rgba(249,115,22,0.06)] overflow-hidden flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="relative aspect-[4/3] bg-neutral-50 overflow-hidden border-b border-neutral-100">
                          <img
                            src={resolveAssetUrl(product.image, product.image)}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </div>

                        <div className="p-6">
                          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 mb-1.5">
                            <span>
                              {product.badge || `DWT Pick #${String(idx + 1).padStart(2, '0')}`}
                            </span>
                            {product.price_text && (
                              <span className="font-mono-num font-bold text-[#EA580C]">
                                {product.price_text}
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl font-bold text-neutral-950 font-display">
                            {product.name}
                          </h2>
                          <p className="mt-2.5 text-sm text-neutral-600 leading-relaxed">
                            {product.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 pb-6">
                        <a
                          href={product.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-sm font-semibold shadow-xs transition-colors whitespace-nowrap"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>{product.button_text || 'View Product →'}</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Affiliate Disclaimer (PRD Section 24) */}
                <div className="mt-10 p-5 rounded-2xl bg-orange-50/60 border border-orange-200/80">
                  <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                    {settings.shopping_disclaimer}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* =============================================================== */}
        {/* 6. ABOUT & DISCLAIMER PAGE (/about & /disclaimer, PRD 28 & 29)  */}
        {/* =============================================================== */}
        {(route.page === 'about' || route.page === 'disclaimer') && (
          <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-10 space-y-12">
            {/* About Section */}
            <section className="bg-white rounded-3xl border border-orange-500/20 p-6 sm:p-10 shadow-[0_8px_30px_rgba(249,115,22,0.06)]">
              <div className="flex items-center gap-3 mb-6">
                <DwtLogo svgMarkup={settings.logo_svg} className="w-12 h-12" />
                <div>
                  <p className="text-xs font-semibold text-[#EA580C]">Official Platform</p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 font-display">
                    About DecodeWithTech
                  </h1>
                </div>
              </div>

              <div className="text-base sm:text-[17px] text-neutral-800 leading-[1.85] whitespace-pre-line font-editorial">
                {settings.about_text}
              </div>

              {settings.youtube_channel_url && (
                <div className="mt-8 pt-6 border-t border-neutral-100">
                  <a
                    href={settings.youtube_channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                  >
                    <Youtube className="w-4 h-4" />
                    <span>Visit DecodeWithTech YouTube Channel</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </section>

            {/* Website Disclaimer Section (PRD Section 29) */}
            <section
              id="disclaimer"
              className="bg-orange-50/50 rounded-3xl border border-orange-200/80 p-6 sm:p-10"
            >
              <p className="text-xs font-semibold text-[#EA580C]">Transparency & Policies</p>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold text-neutral-950 font-display">
                Website Disclaimer
              </h2>
              <div className="mt-4 text-sm sm:text-base text-neutral-700 leading-[1.8] whitespace-pre-line">
                {settings.disclaimer_text}
              </div>
            </section>
          </div>
        )}

        {/* =============================================================== */}
        {/* 7. PROTECTED ADMIN PANEL (/admin, PRD Section 31-43)            */}
        {/* =============================================================== */}
        {route.page === 'admin' &&
          (isAdmin && activeUid ? (
            <AdminPanel
              videos={videos}
              articles={articles}
              products={products}
              socialLinks={socialLinks}
              settings={settings}
              onSaveVideo={handleSaveVideo}
              onDeleteVideo={handleDeleteVideo}
              onSaveArticle={handleSaveArticle}
              onDeleteArticle={handleDeleteArticle}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onSaveSocial={handleSaveSocial}
              onDeleteSocial={handleDeleteSocial}
              onSaveSettings={handleSaveSettings}
              onExitAdmin={() => navigate({ page: 'home' })}
              adminUid={activeUid}
            />
          ) : (
            <div className="max-w-md mx-auto px-4 py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#EA580C] flex items-center justify-center mx-auto mb-4 border border-orange-200">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-950 font-display">
                Admin Authorization Required
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Sign in with an authorized DecodeWithTech administrator Google account to access the CMS dashboard.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? 'Connecting Google...' : 'Sign in with Google'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'home' })}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs sm:text-sm font-semibold text-neutral-700 cursor-pointer"
                >
                  Return Home
                </button>
              </div>
            </div>
          ))}
      </main>

      {/* Video Player Modal for More Videos Page */}
      {activeModalVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-orange-500/30">
            <div className="px-5 py-3.5 bg-neutral-950 text-white flex items-center justify-between gap-4">
              <h3 className="text-sm sm:text-base font-bold font-display truncate">
                {activeModalVideo.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalVideo(null)}
                className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold cursor-pointer"
              >
                Close ✕
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeModalVideo.youtube_id}?autoplay=1&rel=0`}
                title={activeModalVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4 bg-white flex items-center justify-between gap-4">
              <p className="text-xs text-neutral-600 truncate">{activeModalVideo.description}</p>
              <a
                href={activeModalVideo.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FOOTER (PRD Section 30)                                           */}
      {/* ================================================================= */}
      <footer className="relative z-10 bg-white border-t border-orange-500/15 mt-16">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-neutral-100">
            <div className="flex items-center gap-3.5">
              <DwtLogo svgMarkup={settings.logo_svg} className="w-11 h-11" />
              <div>
                <span className="text-lg font-extrabold text-neutral-950 font-display">
                  {settings.brand_name || 'DecodeWithTech'}
                </span>
                <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                  {settings.tagline || 'The story behind everything, explained simply.'}
                </p>
              </div>
            </div>

            {/* Footer Navigation Links (PRD Section 30) */}
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-neutral-700">
              <button
                type="button"
                onClick={() => navigate({ page: 'home' })}
                className="hover:text-[#EA580C] transition-colors cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'videos' })}
                className="hover:text-[#EA580C] transition-colors cursor-pointer"
              >
                More Videos
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'explain' })}
                className="hover:text-[#EA580C] transition-colors cursor-pointer"
              >
                Explain
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'shopping' })}
                className="hover:text-[#EA580C] transition-colors cursor-pointer"
              >
                Shopping
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'about' })}
                className="hover:text-[#EA580C] transition-colors cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'disclaimer' })}
                className="hover:text-[#EA580C] transition-colors cursor-pointer"
              >
                Disclaimer
              </button>
            </nav>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-neutral-500">
            <p>{settings.footer_text || '© DecodeWithTech'}</p>

            {/* Active Social Links (Only those provided by admin, PRD Section 30) */}
            {publishedSocials.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
                {publishedSocials.map((s) => (
                  <a
                    key={s.id}
                    href={s.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-neutral-700 hover:text-[#EA580C] transition-colors"
                  >
                    <span>{s.platform}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
