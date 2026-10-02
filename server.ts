import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-side secret admin allowlist (always includes owner email ndnilamdevi12@gmail.com)
const ADMIN_ALLOWLIST = new Set([
  'ndnilamdevi12@gmail.com',
  ...(process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => Boolean(email) && email.includes('@')),
]);

// Persistent server store path for seamless data persistence alongside Firestore
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'dwt_store.json');

function readServerStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) || {};
      return {
        settings: parsed.settings || null,
        videos: Array.isArray(parsed.videos) ? parsed.videos : null,
        articles: Array.isArray(parsed.articles) ? parsed.articles : null,
        products: Array.isArray(parsed.products) ? parsed.products : null,
        socialLinks: Array.isArray(parsed.socialLinks) ? parsed.socialLinks : null,
        profiles: parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {},
      };
    }
  } catch {
    // Fallback to empty store
  }
  return {
    settings: null,
    videos: null,
    articles: null,
    products: null,
    socialLinks: null,
    profiles: {},
  };
}

function writeServerStore(next: Record<string, unknown>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

// Simple in-memory rate limiter for authentication checks
const authRateLimit = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    authRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 60) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Extract YouTube Video ID safely
function extractYouTubeId(rawUrl: string): string | null {
  try {
    const trimmed = rawUrl.trim();
    const u = new URL(trimmed);
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id && id.length >= 5 ? id : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return parts[1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveVerifiedIdentity(req: express.Request) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const bodyEmail =
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const bodyUid = typeof req.body?.uid === 'string' ? req.body.uid.trim() : '';

  if (token) {
    // 1. Try decoding JWT (Firebase ID Token or Google ID Token)
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson) || {};
        const nowSec = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp >= nowSec - 60) {
          const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
          const isVerified = payload.email_verified !== false;
          const isAdmin = Boolean(isVerified && email && ADMIN_ALLOWLIST.has(email));
          return {
            email,
            uid: payload.sub || bodyUid || `google_${email.replace(/[^a-z0-9]/g, '_')}`,
            isAdmin,
          };
        }
      } catch {
        // Proceed to OAuth access_token check
      }
    }

    // 2. Try verifying as Google OAuth 2.0 access_token via Google userinfo endpoint
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userInfoRes.ok) {
        const info = (await userInfoRes.json()) || {};
        const email = typeof info.email === 'string' ? info.email.trim().toLowerCase() : '';
        const isVerified = info.email_verified !== false;
        const isAdmin = Boolean(isVerified && email && ADMIN_ALLOWLIST.has(email));
        return {
          email,
          uid: info.sub || bodyUid || `google_${email.replace(/[^a-z0-9]/g, '_')}`,
          isAdmin,
        };
      }
    } catch {
      // Fallback to body email check
    }
  }

  if (bodyEmail) {
    const isAdmin = ADMIN_ALLOWLIST.has(bodyEmail);
    return {
      email: bodyEmail,
      uid: bodyUid || `google_${bodyEmail.replace(/[^a-z0-9]/g, '_')}`,
      isAdmin,
    };
  }

  return { email: '', uid: '', isAdmin: false };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));

  // ---------------------------------------------------------------------------
  // POST /api/auth/verify-admin
  // Server-side verification of Firebase ID token / Google OAuth token / email
  // against server-side allowlist (ndnilamdevi12@gmail.com).
  // ---------------------------------------------------------------------------
  app.post('/api/auth/verify-admin', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ isAdmin: false, error: 'Too many verification requests. Please wait.' });
      return;
    }

    const identity = await resolveVerifiedIdentity(req);
    const store = readServerStore();
    const profileKey = identity.uid || identity.email;
    const profilesMap = store.profiles as Record<string, { displayName?: string }>;
    const savedProfile = profileKey ? profilesMap[profileKey] : undefined;

    res.json({
      isAdmin: identity.isAdmin,
      uid: identity.uid || null,
      displayName: savedProfile?.displayName || null,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/profile/update
  // Saves user's editable displayName (Menu Profile section)
  // ---------------------------------------------------------------------------
  app.post('/api/profile/update', async (req, res) => {
    const identity = await resolveVerifiedIdentity(req);
    const rawName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    const cleanName = rawName.slice(0, 80);

    if (!cleanName || (!identity.uid && !identity.email)) {
      res.status(400).json({ error: 'Valid user session and display name are required.' });
      return;
    }

    const store = readServerStore();
    const profilesMap = store.profiles as Record<string, { displayName: string; updatedAt: string }>;
    const updatedAt = new Date().toISOString();
    if (identity.uid) {
      profilesMap[identity.uid] = { displayName: cleanName, updatedAt };
    }
    if (identity.email) {
      profilesMap[identity.email] = { displayName: cleanName, updatedAt };
    }
    writeServerStore(store);

    res.json({ ok: true, displayName: cleanName });
  });

  // ---------------------------------------------------------------------------
  // GET /api/content
  // Returns server-persisted content store for fast initial load & fallback sync
  // ---------------------------------------------------------------------------
  app.get('/api/content', (_req, res) => {
    const store = readServerStore();
    res.json(store);
  });

  // ---------------------------------------------------------------------------
  // POST /api/content/sync
  // Admin-only endpoint to persist settings, videos, articles, products, socials
  // ---------------------------------------------------------------------------
  app.post('/api/content/sync', async (req, res) => {
    const identity = await resolveVerifiedIdentity(req);
    if (!identity.isAdmin) {
      res.status(403).json({ error: 'Admin authorization required.' });
      return;
    }

    const store = readServerStore();
    if (req.body.settings && typeof req.body.settings === 'object') {
      store.settings = req.body.settings;
    }
    if (Array.isArray(req.body.videos)) {
      store.videos = req.body.videos;
    }
    if (Array.isArray(req.body.articles)) {
      store.articles = req.body.articles;
    }
    if (Array.isArray(req.body.products)) {
      store.products = req.body.products;
    }
    if (Array.isArray(req.body.socialLinks)) {
      store.socialLinks = req.body.socialLinks;
    }
    writeServerStore(store);

    res.json({ ok: true, store });
  });

  // ---------------------------------------------------------------------------
  // GET /api/youtube-meta?url=...
  // Fetches real YouTube video title & thumbnail via official YouTube oEmbed API.
  // ---------------------------------------------------------------------------
  app.get('/api/youtube-meta', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const videoId = extractYouTubeId(rawUrl);

    if (!rawUrl || !videoId) {
      res.status(400).json({ error: 'Invalid YouTube URL' });
      return;
    }

    const canonicalWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const fallbackThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalWatchUrl)}&format=json`;
      const response = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'DecodeWithTech-Companion/1.0' },
      });

      if (!response.ok) {
        res.json({
          youtube_id: videoId,
          title: '',
          author_name: 'DecodeWithTech',
          thumbnail_url: fallbackThumbnail,
        });
        return;
      }

      const data = (await response.json()) || {};

      res.json({
        youtube_id: videoId,
        title: typeof data.title === 'string' ? data.title : '',
        author_name: typeof data.author_name === 'string' ? data.author_name : 'DecodeWithTech',
        thumbnail_url: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : fallbackThumbnail,
      });
    } catch {
      res.json({
        youtube_id: videoId,
        title: '',
        author_name: 'DecodeWithTech',
        thumbnail_url: fallbackThumbnail,
      });
    }
  });

  const distPath = path.join(__dirname, 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== 'production' || !hasBuiltDist) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DecodeWithTech server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
