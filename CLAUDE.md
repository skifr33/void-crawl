# VOID CRAWL — Claude Code Instructions

## Project
Mork Borg-inspired solo sci-fi dungeon crawler. Web app PWA built with Vite + React 18.
Design doc: brutal, nihilistic, dark humor. Terminal aesthetic. The station doesn't care if you live.

## Stack
- Vite + React 18
- Plain canvas (no Phaser) for 24×24 grid rendering
- RAF loop for animated tiles
- CSS-injected CRT scan-line + vignette overlays
- PWA: manifest.json + service worker (cache-first, offline play)
- Persistent storage via window.storage (Hall of Heads)
- Deploy target: Vercel (free tier)

## File Structure
```
src/App.jsx        ← entire game (single file, ~900 lines)
public/manifest.json
public/sw.js
public/icons/      ← generate with: node gen-icons.mjs
index.html         ← PWA meta tags, safe area CSS, SW registration
```

## Game Systems (all implemented in App.jsx)
- **2D20 roll system**: Critical Uplink (both ≥12) / Static Pass (one ≥12) / Signal Lost (both <12)
- **Room generation**: digit-sum reduction (19→1+9→10→1), matching dice = large room re-roll
- **Fog of war**: DARK / DIM / LIT states, 4-tile reveal radius
- **Void Portal**: spawns when grid saturates, consequence table on 1D20
- **Combat**: initiative, attack/dodge/cover/jam/phase-step actions, enemy AI table
- **Enemies**: Shambler, Drone Sentry, Void Hound (Deck 1-3), Augment Berserker (2-3), Phantom Echo (3)
- **Ghost Operative**: Phase Step passive (upgrade Signal Lost → Static Pass once/deck)
- **Decks 1-3 implemented**: Docking Ring, Crew Quarters, Medical Bay
- **Hall of Heads**: persistent enshrinement on deck clear (window.storage)

## Visual Effects
- Continuous RAF canvas loop (60fps) with time-based tile animations
- Glitch overlay on Signal Lost (canvas distortion, chromatic aberration)
- Screen shake on enemy crits (CSS keyframe on canvas wrapper)
- D20 tumble animation (9-frame random cycle before landing)
- CRT scan-lines + vignette (fixed CSS overlays)
- Bio-fog tint on Deck 3

## Coding Standards
- Single-file React component (App.jsx) — keep it that way until MVP is proven
- All game state is plain JS objects, no external state library
- Pure state transforms: every action fn takes state → returns new state
- Canvas drawing is side-effectful, called from useEffect on state change + RAF loop
- No TypeScript for now — keep iteration fast

## Current MVP Scope (Phase 1-5 complete)
- 1 class: Ghost Operative
- 3 decks
- 5 enemy types
- Core 2D20 system
- Hall of Heads (1 enshrinement trigger at Deck 3 clear)
- Full PWA shell

## Next Priorities (Phase 6+)
1. GitHub repo + Vercel deploy pipeline
2. Generate real icons (public/icons/) — terminal aesthetic, ☠ skull motif, #39ff14 on #020402
3. Deck 4-10 implementation (see GDD for tile sets and hazard themes)
4. Remaining 3 character classes: Combat Salvager, Void Technician, Corrupted Survivor
5. Weapon drops (Pulse Rifle, Scatter Cannon, Void Sniper)
6. Party expansion (unlocked after 4 enshrined operatives)

## GDD Reference
Tone: Mork Borg in space. Brutal scarcity. Dark humor. The station is indifferent.
Decks: 10 total, each with distinct biome + hazard theme (see original GDD)
Roll language: "Critical Uplink" / "Static Pass" / "Signal Lost" (never say success/fail)
Resources: HP, Power Cells (ammo), Data Shards (currency), Corrupted Fragments (upgrades)

## Commands
```bash
npm run dev      # local dev server at localhost:5173
npm run build    # production build → dist/
node gen-icons.mjs  # generate placeholder PNG icons
```
