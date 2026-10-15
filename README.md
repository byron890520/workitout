# Work It Out

Free South African calculators (salary after tax, VAT, compound interest, prepaid electricity, bond transfer duty) plus daily Wordle and Wortel hints.

Built with **Astro + React**. Every page is pre-built as plain HTML, so Google sees the full content; React then runs the calculators, the 3D tile board and quick search in the browser.

## Where things live

| Path | What it does |
|---|---|
| `src/data/config.json` | Brand name, domain, contact email, AdSense ID, Search Console code |
| `src/data/rates.json` | SARS, VAT and transfer duty figures. Update every February after the Budget |
| `src/data/hints.json` | Daily hint entries |
| `src/pages/` | One file per page (the file name is the web address) |
| `src/components/Calculators.jsx` | The React calculators |
| `src/components/QuickSearch.jsx` | Search box (press `/` or Ctrl/Cmd+K) |
| `src/components/TileBoard.jsx` | The 3D tile board on the home page |
| `src/styles/global.css` | Colours, fonts, spacing and animation |
| `src/lib/calc.js` | The maths behind every calculator |

## Cloudflare Pages settings

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: set by the `.node-version` file (24), no setting needed

## Daily hints

```
npm run add-hint -- wordle 2026-10-15 CRANE "A tall wading bird" 1579
npm run add-hint -- wortel 2026-10-15 TAFEL "Ons eet daaraan" 1701
```

Commit and push. Hints dated in the future stay hidden until that date in South African time, so you can load a week ahead. Cloudflare only rebuilds when you push, so add a daily Deploy Hook if you load hints in advance (see below).

You can also add a hint without the command: open `src/data/hints.json` on GitHub, click the pencil, add an entry in the same format and commit.

## Share images

The preview pictures shown when a link is posted on WhatsApp or social media live in `public/og/`. If you add a calculator or change a title, run `python scripts/make-og.py` (needs `pip install pillow fonttools brotli`).

## Daily rebuild (optional)

In Cloudflare → your project → Settings → Builds → Deploy hooks, create a hook. Then any scheduler (for example a free cron-job.org account) can call that URL just after midnight each day so pre-loaded hints go live on time.

## Run it on your computer

Needs Node.js 22 or newer.

```
npm install
npm run dev          # live preview at http://localhost:4321
npm test             # checks the calculator maths
npm run build:demo   # preview build with sample hints – never deploy this
```

## Yearly maintenance

- **Late February:** update `src/data/rates.json` from the Budget and run `npm test`.
- **April and July:** check the electricity preset rates in `src/components/Calculators.jsx`.
