# Work It Out

Free South African calculators (salary after tax, VAT, APS, prepaid electricity, transfer duty) plus daily Wordle and Wortel hint pages. Plain static HTML, built by one Python script, so every page is fast and fully crawlable.

## What's in the box

| File | What it does |
|---|---|
| `config.json` | Brand name, domain, contact email, AdSense ID, Search Console code. Change these first. |
| `rates.json` | SARS / VAT / transfer duty figures. Update every February after the Budget. |
| `hints.json` | Daily hint entries (empty to start). |
| `build.py` | Builds the whole site into `dist/`. |
| `style.css`, `app.js` | Stylesheet and calculator code. |

SEO built in: unique titles and meta descriptions, canonical URLs, Open Graph tags, JSON-LD (WebApplication, FAQPage, BreadcrumbList, Article), `sitemap.xml`, `robots.txt`, clean `/folder/` URLs, inline CSS, no render-blocking scripts, and calculator content that's readable without JavaScript.

## 1. Go live (about 30 minutes, free)

1. **Buy the domain.** Register your `.co.za` with any local registrar (around R100 a year).
2. **Put the code on GitHub.** Create a free account, make a new repository, and upload this folder (not `dist/`).
3. **Connect Cloudflare Pages.** In Cloudflare → Workers & Pages → Create → Pages → Connect to Git, pick the repo and set:
   - Build command: `python build.py`
   - Build output directory: `dist`
4. **Add your domain** under the project's Custom domains tab and follow the DNS steps.
5. **Edit `config.json`** so `domain` matches your real domain, then commit. Cloudflare rebuilds automatically.

## 2. Get found on Google

1. Add the site in [Google Search Console](https://search.google.com/search-console) (URL-prefix property), paste the verification code into `google_site_verification` in `config.json`, and commit.
2. Submit `https://yourdomain/sitemap.xml` under Sitemaps.

## 3. Turn on ads

1. Apply at [Google AdSense](https://adsense.google.com) with your domain. You need to be 18+, and the about, contact and privacy pages are already included.
2. Paste your publisher ID (looks like `ca-pub-1234567890123456`) into `adsense_client` in `config.json` and commit. The build adds the AdSense script and `ads.txt` automatically.
3. Once approved, switch on Auto ads in AdSense.

## 4. Daily hints

Add tomorrow's hint (the answer stays hidden on the site until the date arrives in SA time):

```
python build.py add wordle 2026-10-15 CRANE "A tall wading bird" 1579
python build.py add wortel 2026-10-15 TAFEL "Ons eet daaraan"
```

Commit and push. You can load a week ahead; the included GitHub workflow rebuilds the site just after midnight each day so each hint publishes on time. To enable it, create a Deploy Hook in Cloudflare (Settings → Builds → Deploy hooks) and save its URL as a GitHub secret named `CF_DEPLOY_HOOK`.

## 5. Yearly maintenance

- **Late February:** update `rates.json` with the new SARS tables from the Budget, and bump `taxYear`.
- **April and July:** check the electricity preset rates in `build.py` (`build_electricity`).

## Preview locally

```
python build.py --demo      # includes sample hints, marked noindex – never deploy this
cd dist && python -m http.server 8000
```
