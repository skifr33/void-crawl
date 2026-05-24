# VOID CRAWL — Deployment Guide

## Stack
- **Framework**: Vite + React 18
- **Hosting**: Vercel (free tier)
- **PWA**: Web manifest + service worker (offline play)
- **No build cost. No app store. Ships as a URL.**

---

## Step 1 — Project Setup

```bash
# Clone or create a new GitHub repo called void-crawl
# Copy all files from this folder into it, then:

npm install
npm run dev       # local dev at http://localhost:5173
```

---

## Step 2 — Add the Game

Copy `void-crawl-v4.jsx` (your latest build) into `src/App.jsx`.

That's the only file you need to add. Everything else is already wired.

---

## Step 3 — Generate Icons

```bash
npm install canvas   # one-time, dev only
node gen-icons.mjs   # writes to public/icons/
```

This generates placeholder terminal-aesthetic icons. For production,
replace `public/icons/icon-{size}.png` with proper art.

Easiest tool: **realfavicongenerator.net** — upload one 512×512 image,
download the full icon pack, drop into `public/icons/`.

---

## Step 4 — Deploy to Vercel

### Option A — GitHub Integration (recommended)
1. Push your project to GitHub
2. Go to **vercel.com** → New Project
3. Import your GitHub repo
4. Framework preset: **Vite** (auto-detected)
5. Click **Deploy**

Done. Vercel gives you a URL like `void-crawl.vercel.app`.

### Option B — Vercel CLI
```bash
npm install -g vercel
vercel          # follow prompts, auto-detects Vite
vercel --prod   # promote to production
```

### Custom Domain (optional, free)
In Vercel dashboard → Domains → Add your domain.
Point your DNS to Vercel's nameservers.

---

## Step 5 — Install on iPhone

1. Open the deployed URL in Safari
2. Tap the **Share** icon (bottom center)
3. Tap **Add to Home Screen**
4. Name it "VOID CRAWL" → tap **Add**

The game installs as a standalone app icon. No browser chrome.
No App Store. Fully offline after first load (service worker caches all assets).

---

## Step 6 — Future Updates

Every push to your `main` branch auto-deploys via Vercel.
The service worker cache is busted by updating `CACHE_NAME` in `public/sw.js`:

```js
const CACHE_NAME = 'void-crawl-v2';   // bump version on breaking changes
```

---

## File Map

```
void-crawl/
├── index.html              ← PWA meta tags, SW registration, safe area CSS
├── vite.config.js          ← Vite + React plugin
├── package.json
├── gen-icons.mjs           ← Icon generator (run once)
├── public/
│   ├── manifest.json       ← PWA manifest (name, icons, standalone mode)
│   ├── sw.js               ← Service worker (cache-first, offline)
│   └── icons/              ← PNG icons (generated or replaced with real art)
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-180.png
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.jsx            ← React entry point
    └── App.jsx             ← void-crawl-v4.jsx (copy here)
```

---

## Checklist Before Shipping

- [ ] `src/App.jsx` contains the latest game build (void-crawl-v4.jsx)
- [ ] Icons generated or replaced in `public/icons/`
- [ ] `manifest.json` name/description matches your game
- [ ] Deployed to Vercel — URL works in Safari
- [ ] Tested "Add to Home Screen" on a real iPhone
- [ ] Offline play verified (turn off WiFi after first load)
- [ ] `CACHE_NAME` version set correctly in `sw.js`

---

## Costs

| Item            | Cost        |
|-----------------|-------------|
| Vite            | Free        |
| React           | Free        |
| Vercel hosting  | Free tier   |
| Custom domain   | ~$12/yr (optional) |
| App Store       | Not needed  |

**Total: $0 to ship.**
