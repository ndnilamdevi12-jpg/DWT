import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth, DecodedIdToken } from 'firebase-admin/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load public Firebase project ID for cryptographic token audience/issuer verification
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8')) as {
  projectId: string;
};
const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

const adminApp =
  getAdminApps().length > 0
    ? getAdminApps()[0]!
    : initializeAdminApp({
        projectId: FIREBASE_PROJECT_ID,
      });

const adminAuth = getAdminAuth(adminApp);

// Server-side admin UID allowlist (preferred)
const ADMIN_UID_ALLOWLIST = new Set(
  (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean)
);

// Server-side admin email allowlist (only evaluated against cryptographically verified Firebase ID tokens with email_verified === true)
const ADMIN_EMAIL_ALLOWLIST = new Set([
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

// In-memory rate limiter for authentication & admin endpoints
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

/**
 * Cryptographically verifies the Firebase ID token from the Authorization: Bearer header
 * using the official Firebase Admin SDK.
 * Never trusts client-supplied body/query/header email, uid, or unverified JWT payloads.
 */
async function verifyFirebaseIdToken(req: express.Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.split('.').length !== 3) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const nowSec = Math.floor(Date.now() / 1000);
    const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

    if (
      !decoded ||
      typeof decoded.uid !== 'string' ||
      !decoded.uid.trim() ||
      decoded.aud !== FIREBASE_PROJECT_ID ||
      decoded.iss !== expectedIssuer ||
      typeof decoded.exp !== 'number' ||
      decoded.exp <= nowSec
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Determines whether a cryptographically verified Firebase user is an authorized administrator.
 * Evaluates Firebase custom claims, server-side ADMIN_UIDS, or verified email against server-side allowlist.
 */
function isAuthorizedAdmin(decoded: DecodedIdToken): boolean {
  if (!decoded || typeof decoded.uid !== 'string' || !decoded.uid.trim()) {
    return false;
  }

  // 1. Check Firebase custom claims on the verified token
  if (decoded.admin === true || decoded.role === 'admin') {
    return true;
  }

  // 2. Check server-side ADMIN_UIDS environment variable
  if (ADMIN_UID_ALLOWLIST.has(decoded.uid)) {
    return true;
  }

  // 3. Check verified email from the cryptographically verified token against server-side allowlist
  const verifiedEmail =
    decoded.email_verified === true && typeof decoded.email === 'string'
      ? decoded.email.trim().toLowerCase()
      : '';

  if (verifiedEmail && ADMIN_EMAIL_ALLOWLIST.has(verifiedEmail)) {
    return true;
  }

  return false;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));

  // ---------------------------------------------------------------------------
  // POST /api/auth/verify-admin
  // Cryptographically verifies Firebase ID token via Firebase Admin SDK and
  // checks server-side admin authorization. Never trusts req.body.email or uid.
  // ---------------------------------------------------------------------------
  app.post('/api/auth/verify-admin', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ isAdmin: false, error: 'Too many verification requests. Please wait.' });
      return;
    }

    const decoded = await verifyFirebaseIdToken(req);
    if (!decoded) {
      res.status(401).json({
        isAdmin: false,
        error: 'Unauthorized: A valid Firebase ID token is required.',
      });
      return;
    }

    const isAdmin = isAuthorizedAdmin(decoded);
    if (!isAdmin) {
      res.status(403).json({
        isAdmin: false,
        error: 'Forbidden: Account is not an authorized administrator.',
      });
      return;
    }

    const store = readServerStore();
    const profilesMap = store.profiles as Record<string, { displayName?: string }>;
    const savedProfile = profilesMap[decoded.uid];

    res.json({
      isAdmin: true,
      uid: decoded.uid,
      displayName: savedProfile?.displayName || null,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/profile/update
  // Saves authenticated user's editable displayName using verified token UID only
  // ---------------------------------------------------------------------------
  app.post('/api/profile/update', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Too many requests. Please wait.' });
      return;
    }

    const decoded = await verifyFirebaseIdToken(req);
    if (!decoded) {
      res.status(401).json({ error: 'Unauthorized: A valid Firebase ID token is required.' });
      return;
    }

    const rawName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    const cleanName = rawName.slice(0, 80);

    if (!cleanName) {
      res.status(400).json({ error: 'A valid display name is required.' });
      return;
    }

    const store = readServerStore();
    const profilesMap = store.profiles as Record<string, { displayName: string; updatedAt: string }>;
    const updatedAt = new Date().toISOString();
    profilesMap[decoded.uid] = { displayName: cleanName, updatedAt };
    writeServerStore(store);

    res.json({ ok: true, displayName: cleanName });
  });

  // ---------------------------------------------------------------------------
  // GET /api/content
  // Returns public site content only (excludes user profiles)
  // ---------------------------------------------------------------------------
  app.get('/api/content', (_req, res) => {
    const store = readServerStore();
    res.json({
      settings: store.settings,
      videos: store.videos,
      articles: store.articles,
      products: store.products,
      socialLinks: store.socialLinks,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/content/sync
  // Admin-only endpoint to persist settings, videos, articles, products, socials.
  // Independently verifies Firebase ID token and admin status on the server.
  // ---------------------------------------------------------------------------
  app.post('/api/content/sync', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Too many requests. Please wait.' });
      return;
    }

    const decoded = await verifyFirebaseIdToken(req);
    if (!decoded) {
      res.status(401).json({ error: 'Unauthorized: A valid Firebase ID token is required.' });
      return;
    }

    if (!isAuthorizedAdmin(decoded)) {
      res.status(403).json({ error: 'Forbidden: Admin authorization required.' });
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

    res.json({
      ok: true,
      store: {
        settings: store.settings,
        videos: store.videos,
        articles: store.articles,
        products: store.products,
        socialLinks: store.socialLinks,
      },
    });
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
