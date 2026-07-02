# Explora — Partner Site

Vite + React + TypeScript clone-shape of the Explora Journeys partner-facing site, ingesting the official Explora flatfile API (Okta auth → S3 signed URLs → daily XLS) into Neon Postgres, with dual Vercel + cPanel deploy.

Project plan: `~/.claude/plans/read-all-the-project-kind-tarjan.md`.

## Quick start

```bash
cd /Users/kostasanastasopoulos/Desktop/nonameproject/Explora
npm install
cp .env.example .env.local
# fill EXPLORA_USERNAME / EXPLORA_PASSWORD (preprod Okta account) when ready
npm run dev          # Vite on http://localhost:5173
npm run server:dev   # cPanel-style Express on http://localhost:3000 (after build)
```

## Stack

- Vite 5 + React 18 + TypeScript 5
- Tailwind CSS v3 (brand tokens in `src/styles/tokens.css` + `tailwind.config.ts`)
- Framer Motion 11, Swiper 12, Radix UI primitives
- i18next + react-i18next (en + el)
- Vercel `/api/*` functions + `lib/vercel-adapter.mjs` (lifted from Pame_Costa)
- Neon Postgres via `@neondatabase/serverless`
- SheetJS (`xlsx`) for flatfile parsing — Vercel Node runtime only (NOT Edge)
- Cloudinary URL builder mimicking Adobe Scene7 (`src/lib/image.ts`)

## Project layout

```
/Explora/
├── api/                         Vercel serverless functions
├── lib/                         Server-only utilities (DB client, flatfile ingest, adapter)
├── src/                         Frontend (Vite + React)
│   ├── components/chrome/        Header, MegaMenu, Footer, PromoBar, CountryLanguageSwitcher
│   ├── components/hero/          RotatingHeadline (generic, phrases via props)
│   ├── components/forms/         NewsletterInline
│   ├── data/                     megaMenu + footer structural data
│   ├── lib/                      api client, image URL builder, TypeScript types
│   ├── locales/                  en.json + el.json (placeholder copy)
│   ├── routes/                   Home + page templates
│   └── styles/                   tokens.css + globals.css
├── server.js                    cPanel Passenger entrypoint
├── vercel.json                  Vercel build + cron config
└── tailwind.config.ts
```

## Brand / IP boundary

This project ships with **structural skeletons + placeholder copy**. Brand-licensed assets must come from the partner:

- Marketing copy and the rotating-headline phrases (`hero.rotatingPhrases` in locale files) are placeholders. Partner replaces with approved content.
- Logos, brand campaign imagery, and licensed fonts (GT Sectra / GT America if licensed) are NOT in this repo. Partner adds licensed `.woff2` files to `public/fonts/` and updates the Tailwind font stacks.
- Image asset IDs reference Cloudinary paths the partner uploads. Until then, Picsum placeholders render.

## Milestones

See plan §7. Status:

- **M1 Foundation** — scaffolded. Run `npm install` then `npm run dev`.
- **M2 Static templates** — pending.
- **M3 Flatfile data layer** — pending (needs Explora preprod credentials).
- **M4 Voyage detail + Find-a-Journey** — pending.
- **M5 Polish + deploy** — pending.
