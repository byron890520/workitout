#!/usr/bin/env python3
"""Work It Out static site generator.

Usage:
  python build.py                 Build the site into dist/
  python build.py --demo          Build including sample hint data (preview only, never deploy)
  python build.py add GAME DATE ANSWER "CLUE" [NUMBER]
                                  Add a daily hint, e.g.
                                  python build.py add wordle 2026-10-15 CRANE "A tall wading bird" 1579

Only hints dated today or earlier (South African time) are published, so you can
load several days in advance and let a scheduled rebuild release them.
"""
import datetime as dt
import html
import json
import re
import shutil
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
CFG = json.loads((ROOT / "config.json").read_text())
RATES = json.loads((ROOT / "rates.json").read_text())
TZ = ZoneInfo(CFG.get("timezone", "Africa/Johannesburg"))
TODAY = dt.datetime.now(TZ).date()
DEMO = "--demo" in sys.argv
BASE = CFG["domain"].rstrip("/")
CSS = (ROOT / "style.css").read_text()
esc = html.escape

GAMES = {
    "wordle": {
        "lang": "en-ZA", "name": "Wordle", "today_slug": "wordle-hint-today",
        "dated_slug": "wordle-hint-{date}",
        "title_today": "Wordle Hint Today ({d}) – Clues and Answer #{n}",
        "title_dated": "Wordle Hint {d} – Clues and Answer #{n}",
        "desc": "Stuck on Wordle #{n} ({d})? Get gentle hints first – vowels, first letter and a clue – then reveal the answer only if you need it.",
        "labels": {"h1": "Wordle hint for {d}", "intro": "Work through the hints one at a time. Each one gives away a little more, and the answer stays hidden until you tap it.",
                   "vowels": "Hint 1: How many vowels?", "vowels_a": "The answer has {v} vowel{s} ({letters}).",
                   "repeat": "Hint 2: Any repeated letters?", "repeat_yes": "Yes – the letter {l} appears more than once.", "repeat_no": "No – every letter is different.",
                   "first": "Hint 3: First letter", "first_a": "It starts with <strong>{l}</strong>.",
                   "last": "Hint 4: Last letter", "last_a": "It ends with <strong>{l}</strong>.",
                   "clue": "Hint 5: Meaning clue", "answer": "Reveal today's answer", "answer_a": "Today's answer is",
                   "recent": "Recent Wordle hints", "disclaimer": "Wordle is a trademark of The New York Times Company. This site is independent and not affiliated with or endorsed by The New York Times.",
                   "play": "New puzzles unlock at midnight South African time."},
    },
    "wortel": {
        "lang": "af", "name": "Wortel", "today_slug": "wortel-wenk-vandag",
        "dated_slug": "wortel-wenk-{date}",
        "title_today": "Wortel Wenk Vandag ({d}) – Leidrade en Antwoord #{n}",
        "title_dated": "Wortel Wenk {d} – Leidrade en Antwoord #{n}",
        "desc": "Vashaak met Wortel #{n} ({d})? Kry eers sagte wenke – klinkers, eerste letter en 'n leidraad – en wys die antwoord net as jy moet.",
        "labels": {"h1": "Wortel-wenk vir {d}", "intro": "Werk een wenk op 'n slag deur. Elkeen gee 'n bietjie meer weg, en die antwoord bly versteek totdat jy daarop tik.",
                   "vowels": "Wenk 1: Hoeveel klinkers?", "vowels_a": "Die antwoord het {v} klinker{s} ({letters}).",
                   "repeat": "Wenk 2: Herhaalde letters?", "repeat_yes": "Ja – die letter {l} kom meer as een keer voor.", "repeat_no": "Nee – elke letter is anders.",
                   "first": "Wenk 3: Eerste letter", "first_a": "Dit begin met <strong>{l}</strong>.",
                   "last": "Wenk 4: Laaste letter", "last_a": "Dit eindig met <strong>{l}</strong>.",
                   "clue": "Wenk 5: Betekenis-leidraad", "answer": "Wys vandag se antwoord", "answer_a": "Vandag se antwoord is",
                   "recent": "Onlangse Wortel-wenke", "disclaimer": "Hierdie webwerf is onafhanklik en nie verbonde aan die makers van Wortel nie.",
                   "play": "Nuwe raaisels verskyn om middernag Suid-Afrikaanse tyd."},
    },
}

TOOLS = [
    ("salary-calculator", "Salary After Tax Calculator", "Take-home pay after PAYE, UIF and medical aid credits."),
    ("vat-calculator", "VAT Calculator (15%)", "Add or remove 15% South African VAT in one tap."),
    ("aps-calculator", "APS Score Calculator", "Work out your matric Admission Point Score for university."),
    ("electricity-calculator", "Prepaid Electricity Calculator", "Units per rand, plus what each appliance costs to run."),
    ("transfer-duty-calculator", "Transfer Duty Calculator", "SARS transfer duty on a property purchase."),
    ("word-hints", "Daily Word Game Hints", "Spoiler-free Wordle and Wortel hints, updated daily."),
]


def money(n):
    return "R" + f"{n:,.0f}".replace(",", " ")


# ---------------------------------------------------------------- layout

def nav(current):
    items = [("/", "Home"), ("/salary-calculator/", "Salary"), ("/vat-calculator/", "VAT"),
             ("/aps-calculator/", "APS"), ("/electricity-calculator/", "Electricity"),
             ("/transfer-duty-calculator/", "Transfer duty"), ("/word-hints/", "Word hints")]
    cur = ' aria-current="page"'
    lis = "".join(
        f'<li><a href="{u}"{cur if u == current else ""}>{t}</a></li>' for u, t in items)
    return f'<nav class="main" aria-label="Main"><ul>{lis}</ul></nav>'


def breadcrumbs(trail):
    """trail: list of (name, path). Returns (html, jsonld)."""
    if len(trail) < 2:
        return "", None
    lis = "".join(
        f'<li><a href="{p}">{esc(n)}</a></li>' if i < len(trail) - 1 else f'<li aria-current="page">{esc(n)}</li>'
        for i, (n, p) in enumerate(trail))
    ld = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + p} for i, (n, p) in enumerate(trail)]}
    return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{lis}</ol></nav>', ld


def faq_block(faqs):
    if not faqs:
        return "", None
    body = "".join(f"<h3>{esc(q)}</h3><p>{a}</p>" for q, a in faqs)
    ld = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", a)}}
        for q, a in faqs]}
    return f'<section class="faq"><h2>Frequently asked questions</h2>{body}</section>', ld


def ad_slot():
    return '<div class="ad-slot" aria-hidden="true">Ad space</div>' if DEMO else ""


SITEMAP = []


def page(path, title, desc, h1, body, *, trail=None, faqs=None, schema=None, js=False, lang="en-ZA",
         lede="", updated=None, current=None, priority="0.7", changefreq="monthly", index=True):
    url = BASE + path
    crumbs_html, crumbs_ld = breadcrumbs(trail or [])
    faq_html, faq_ld = faq_block(faqs)
    graph = [g for g in [schema, crumbs_ld, faq_ld] if g]
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) if graph else ""
    head_extra = ""
    if CFG.get("google_site_verification"):
        head_extra += f'<meta name="google-site-verification" content="{esc(CFG["google_site_verification"])}">'
    if CFG.get("adsense_client") and not DEMO:
        c = esc(CFG["adsense_client"])
        head_extra += (f'<meta name="google-adsense-account" content="{c}">'
                       f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={c}" crossorigin="anonymous"></script>')
    upd = f'<p class="updated">Last updated: <time datetime="{updated}">{updated}</time></p>' if updated else ""
    banner = '<p class="notice"><strong>Preview build:</strong> sample hint data shown. Do not deploy this build.</p>' if DEMO else ""
    doc = f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="{'index,follow,max-image-preview:large' if index and not DEMO else 'noindex,follow'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{esc(CFG['brand'])}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="{CFG.get('locale', 'en_ZA')}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="theme-color" content="#0f5c45">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
{f'<script type="application/ld+json">{ld}</script>' if ld else ''}
{head_extra}
<style>{CSS}</style>
{'<script src="/app.js" defer></script>' if js else ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site"><div class="wrap"><a class="logo" href="/">{CFG['brand_html']}</a>{nav(current or path)}</div></header>
<main id="main" class="wrap">
{crumbs_html}
{banner}
<h1>{h1}</h1>
{f'<p class="lede">{lede}</p>' if lede else ''}
{body}
{faq_html}
{upd}
</main>
<footer class="site"><div class="wrap">
<ul><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li><li><a href="/privacy-policy/">Privacy policy</a></li><li><a href="/terms/">Terms &amp; disclaimer</a></li></ul>
<p>&copy; <span id="year">{TODAY.year}</span> {esc(CFG['brand'])}. Calculators give estimates only and are not financial, tax or legal advice.</p>
</div></footer>
</body>
</html>
"""
    out = DIST / path.strip("/") / "index.html" if path != "/" else DIST / "index.html"
    if path.endswith(".html"):
        out = DIST / path.strip("/")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc)
    if index and not path.endswith(".html"):
        SITEMAP.append((url, (updated or TODAY.isoformat()), changefreq, priority))


def tool_schema(name, path, desc, category="FinanceApplication"):
    return {"@type": "WebApplication", "name": name, "url": BASE + path, "description": desc,
            "applicationCategory": category, "operatingSystem": "Any", "inLanguage": "en-ZA",
            "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ZAR"},
            "areaServed": {"@type": "Country", "name": "South Africa"}}


def related(exclude):
    tiles = "".join(f'<a class="tile" href="/{s}/"><strong>{t}</strong><span>{d}</span></a>'
                    for s, t, d in TOOLS if s != exclude)
    return f"<h2>More free tools</h2><div class=\"grid\">{tiles}</div>"


def rates_updated():
    return TODAY.isoformat()


# ---------------------------------------------------------------- calculators

def build_salary():
    ty = RATES["taxYear"]
    rows = []
    b = RATES["brackets"]
    for i, (lo, base, rate) in enumerate(b):
        hi = f"{money(b[i + 1][0])}" if i + 1 < len(b) else "and above"
        rng = f"{money(lo + 1 if lo else 1)} – {hi}" if i + 1 < len(b) else f"{money(lo + 1)} and above"
        calc = f"{int(rate * 100)}% of taxable income" if not base else f"{money(base)} + {int(rate * 100)}% of the amount above {money(lo)}"
        rows.append(f"<tr><td>{rng}</td><td>{calc}</td></tr>")
    r = RATES["rebates"]; m = RATES["medCredit"]
    body = f"""
<div class="tool">
<form id="salary-form" class="card" novalidate>
<label for="s-gross">Gross monthly salary (R)</label>
<input id="s-gross" type="number" inputmode="decimal" min="0" step="100" value="30000">
<label for="s-age">Your age</label>
<select id="s-age"><option value="30">Under 65</option><option value="65">65 to 74</option><option value="75">75 or older</option></select>
<label for="s-med">People on your medical aid (incl. you)</label>
<input id="s-med" type="number" inputmode="numeric" min="0" step="1" value="0">
<p class="hint">Enter 0 if you don't have medical aid.</p>
<label for="s-ret">Monthly retirement / pension contribution (R)</label>
<input id="s-ret" type="number" inputmode="decimal" min="0" step="50" value="0">
<noscript><p class="hint">Turn on JavaScript to use the calculator. The tax tables below still apply.</p></noscript>
</form>
<div class="result" aria-live="polite">
<div>Take-home pay per month</div><div class="big" id="s-net">–</div>
<dl><dt>PAYE (income tax)</dt><dd id="s-paye">–</dd><dt>UIF (1%)</dt><dd id="s-uif">–</dd>
<dt>Retirement contribution</dt><dd id="s-retout">–</dd><dt>Tax for the year</dt><dd id="s-annual">–</dd>
<dt>Marginal tax rate</dt><dd id="s-marginal">–</dd><dt>Effective tax rate</dt><dd id="s-effective">–</dd></dl>
</div></div>
{ad_slot()}
<h2>How your take-home pay is worked out</h2>
<p>Your employer deducts PAYE (pay-as-you-earn income tax) and UIF from your gross salary each month. This calculator annualises your salary, subtracts tax-deductible retirement contributions (up to 27.5% of income, capped at {money(RATES['retirementCapAmount'])} a year), applies the SARS {ty} tax tables, then subtracts your rebates and medical scheme tax credits.</p>
<h3>SARS income tax brackets {ty} (1 March 2026 – 28 February 2027)</h3>
<div class="table-scroll"><table><thead><tr><th>Taxable income per year</th><th>Tax</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<h3>Rebates and medical tax credits</h3>
<p>Everyone gets a primary rebate of {money(r['primary'])} a year, which means you pay no income tax below about {money(r['primary'] / b[0][2])} a year if you're under 65. People 65 and older get an extra {money(r['secondary'])}, and people 75 and older a further {money(r['tertiary'])}. Medical aid members get a tax credit of R{m['first']} a month for themselves, R{m['second']} for the first dependant and R{m['additional']} for each additional dependant.</p>
<h3>UIF</h3>
<p>UIF is 1% of your salary, capped at R{RATES['uifCeiling'] * RATES['uifRate']:.2f} a month because contributions only apply up to {money(RATES['uifCeiling'])} of monthly pay.</p>
{related('salary-calculator')}"""
    faqs = [
        ("How much tax do I pay on R30 000 a month?", "If you're under 65 with no medical aid or retirement contributions, PAYE on R30 000 a month is about R4 681, and UIF is R177.12, leaving roughly R25 142 take-home. Enter your own figures above for an exact estimate."),
        ("What is the tax-free threshold in South Africa?", f"For the {ty} tax year you pay no income tax on income up to {money(r['primary'] / b[0][2])} a year if you're under 65, because the primary rebate cancels out the tax on that amount."),
        ("Why is my payslip different from this calculator?", "Payroll systems handle bonuses, travel allowances, fringe benefits and mid-year salary changes differently. This calculator assumes the same salary every month for a full tax year."),
        ("Does a raise push all my income into a higher bracket?", "No. South Africa uses marginal tax brackets, so only the portion of income above each threshold is taxed at the higher rate."),
    ]
    page("/salary-calculator/", f"Salary After Tax Calculator South Africa {ty} | Take-Home Pay",
         f"Free SARS {ty} salary calculator. See your take-home pay after PAYE, UIF, medical aid tax credits and pension contributions.",
         f"Salary after tax calculator ({ty})", body, js=True, faqs=faqs, updated=rates_updated(), priority="0.9",
         lede="Enter your monthly salary to see exactly what lands in your bank account after PAYE and UIF.",
         trail=[("Home", "/"), ("Salary calculator", "/salary-calculator/")],
         schema=tool_schema("Salary After Tax Calculator", "/salary-calculator/", "South African take-home pay calculator using SARS tax tables."))


def build_vat():
    body = f"""
<div class="tool">
<form id="vat-form" class="card" novalidate>
<label for="v-amount">Amount (R)</label>
<input id="v-amount" type="number" inputmode="decimal" min="0" step="0.01" value="1000">
<fieldset style="border:0;padding:0;margin:12px 0 0"><legend style="font-weight:600;font-size:.92rem">This amount…</legend>
<div class="radio"><label><input type="radio" name="v-mode" value="add" checked> excludes VAT (add 15%)</label></div>
<div class="radio"><label><input type="radio" name="v-mode" value="remove"> includes VAT (remove 15%)</label></div></fieldset>
</form>
<div class="result" aria-live="polite">
<div>Amount including VAT</div><div class="big" id="v-incl">–</div>
<dl><dt>Amount excluding VAT</dt><dd id="v-excl">–</dd><dt>VAT (15%)</dt><dd id="v-vat">–</dd></dl>
</div></div>
{ad_slot()}
<h2>How to calculate VAT in South Africa</h2>
<p>The standard VAT rate in South Africa is 15%.</p>
<ul><li><strong>Add VAT:</strong> multiply the VAT-exclusive price by 1.15. R1 000 × 1.15 = R1 150.</li>
<li><strong>Remove VAT:</strong> divide the VAT-inclusive price by 1.15. R1 150 ÷ 1.15 = R1 000.</li>
<li><strong>VAT portion of an inclusive price:</strong> multiply by 15 and divide by 115.</li></ul>
<p>A common mistake is subtracting 15% from an inclusive price. That gives R977.50 instead of R1 000, because the 15% was added to the smaller, exclusive amount.</p>
{related('vat-calculator')}"""
    faqs = [
        ("What is the VAT rate in South Africa?", "The standard VAT rate is 15%. Some items, such as certain basic foods and exports, are zero-rated, and some services are exempt."),
        ("How do I remove VAT from a price?", "Divide the VAT-inclusive price by 1.15. To get only the VAT amount, multiply the inclusive price by 15/115."),
        ("When must a business register for VAT?", "Registration becomes compulsory once taxable turnover passes the SARS threshold in a 12-month period. Check the current threshold on the SARS website before deciding."),
    ]
    page("/vat-calculator/", "VAT Calculator South Africa (15%) – Add or Remove VAT",
         "Free 15% VAT calculator for South Africa. Add VAT to a price or remove VAT from an inclusive amount instantly, with the formulas explained.",
         "VAT calculator (15%)", body, js=True, faqs=faqs, updated=rates_updated(), priority="0.9",
         lede="Add or remove South African VAT from any amount.",
         trail=[("Home", "/"), ("VAT calculator", "/vat-calculator/")],
         schema=tool_schema("VAT Calculator", "/vat-calculator/", "Add or remove 15% South African VAT."))


def build_aps():
    rows = "".join(
        f'<div class="aps-row"><input class="aps-mark" type="number" inputmode="numeric" min="0" max="100" '
        f'placeholder="Subject {i} mark %" aria-label="Subject {i} percentage"><span class="aps-pts"></span></div>'
        for i in range(1, 8))
    body = f"""
<div class="tool">
<form id="aps-form" class="card" novalidate>
<label>Your subject marks (%) – excluding Life Orientation</label>
<div style="display:grid;gap:8px">{rows}</div>
<p class="hint">Enter up to 7 subjects. Your best 6 are counted.</p>
<label for="a-lo">Life Orientation mark % (optional)</label>
<input id="a-lo" type="number" inputmode="numeric" min="0" max="100">
</form>
<div class="result" aria-live="polite">
<div>Your APS score</div><div class="big" id="a-total">0</div>
<dl><dt>Subjects counted</dt><dd id="a-counted">–</dd><dt>APS including LO</dt><dd id="a-withlo">–</dd></dl>
</div></div>
{ad_slot()}
<h2>How the APS score is calculated</h2>
<p>Each matric (NSC) subject is converted to points based on your percentage, and the points for your best six subjects are added up. Most universities leave out Life Orientation, which gives a maximum APS of 42.</p>
<div class="table-scroll"><table><thead><tr><th>Mark</th><th>Achievement level</th><th>APS points</th></tr></thead><tbody>
<tr><td>80–100%</td><td>7 – Outstanding</td><td>7</td></tr><tr><td>70–79%</td><td>6 – Meritorious</td><td>6</td></tr>
<tr><td>60–69%</td><td>5 – Substantial</td><td>5</td></tr><tr><td>50–59%</td><td>4 – Adequate</td><td>4</td></tr>
<tr><td>40–49%</td><td>3 – Moderate</td><td>3</td></tr><tr><td>30–39%</td><td>2 – Elementary</td><td>2</td></tr>
<tr><td>0–29%</td><td>1 – Not achieved</td><td>1</td></tr></tbody></table></div>
<p class="notice">Universities don't all use the same formula. Some include Life Orientation or add bonus points for Maths and English, and UCT and Stellenbosch use their own scoring systems. Always confirm with the university's official calculator before you apply.</p>
{related('aps-calculator')}"""
    faqs = [
        ("What is a good APS score?", "Many bachelor's degrees ask for an APS in the high 20s to low 30s, while competitive programmes like medicine and engineering often need well above 35. Requirements change each year, so check each programme's prospectus."),
        ("Is Life Orientation included in the APS?", "Usually not, but some universities include it, often at reduced weight. That's why this calculator shows your score both ways."),
        ("What is the maximum APS score?", "If six subjects are counted and Life Orientation is excluded, the maximum is 42 (six subjects at level 7)."),
    ]
    page("/aps-calculator/", "APS Score Calculator South Africa – Matric Admission Points",
         "Calculate your APS score from your matric marks in seconds. See how many admission points you have for South African university applications.",
         "APS score calculator", body, js=True, faqs=faqs, priority="0.9", updated=rates_updated(),
         lede="Type in your matric percentages to see your Admission Point Score.",
         trail=[("Home", "/"), ("APS calculator", "/aps-calculator/")],
         schema=tool_schema("APS Score Calculator", "/aps-calculator/", "Matric Admission Point Score calculator.", "EducationalApplication"))


def build_electricity():
    presets = [("2.71", "Eskom Homelight 20A (≈R2.71/kWh)"), ("3.44", "Eskom Homelight 60A (≈R3.44/kWh)"),
               ("3.34", "City Power Joburg, block 1 (≈R3.34/kWh)"), ("3.43", "City of Cape Town, block 1 (≈R3.43/kWh)")]
    appliances = [("3000", "Geyser (3 000 W)"), ("2200", "Kettle (2 200 W)"), ("2000", "Heater (2 000 W)"),
                  ("1500", "Aircon (1 500 W)"), ("1000", "Microwave (1 000 W)"), ("150", "Fridge, average (150 W)"),
                  ("100", "TV (100 W)"), ("10", "LED bulb (10 W)")]
    opts = "".join(f'<option value="{v}">{t}</option>' for v, t in presets)
    aopts = "".join(f'<option value="{v}">{t}</option>' for v, t in appliances)
    body = f"""
<div class="tool">
<form id="elec-form" class="card" novalidate>
<label for="e-preset">Your tariff</label>
<select id="e-preset"><option value="">Choose a preset…</option>{opts}</select>
<label for="e-rate">Price per kWh, incl. VAT (R)</label>
<input id="e-rate" type="number" inputmode="decimal" min="0" step="0.01" value="2.71">
<p class="hint">Check the rate on your last token slip – municipal tariffs vary.</p>
<label for="e-rand">How much are you buying? (R)</label>
<input id="e-rand" type="number" inputmode="decimal" min="0" step="10" value="500">
<h3>Appliance running cost</h3>
<label for="e-appl">Appliance</label>
<select id="e-appl"><option value="">Choose an appliance…</option>{aopts}</select>
<label for="e-watts">Power (watts)</label>
<input id="e-watts" type="number" inputmode="numeric" min="0" value="3000">
<label for="e-hours">Hours used per day</label>
<input id="e-hours" type="number" inputmode="decimal" min="0" max="24" step="0.25" value="2">
</form>
<div class="result" aria-live="polite">
<div>Units you'll get</div><div class="big" id="e-units">–</div>
<dl><dt>Appliance use per day</dt><dd id="e-kwh">–</dd><dt>Cost per day</dt><dd id="e-day">–</dd>
<dt>Cost per month</dt><dd id="e-month">–</dd><dt>Cost per year</dt><dd id="e-year">–</dd></dl>
</div></div>
{ad_slot()}
<h2>How prepaid electricity units are calculated</h2>
<p>One prepaid unit is one kilowatt-hour (kWh). Divide the rand amount you spend by your price per kWh to get your units. At R2.71 per kWh, R500 buys about 184 units.</p>
<p>To work out what an appliance costs, multiply its wattage by the hours you use it and divide by 1 000 to get kWh, then multiply by your rate. A 3 000 W geyser running for two hours uses 6 kWh a day.</p>
<p class="notice">Preset rates are approximate 2026/27 figures including VAT. Eskom direct tariffs change every April and municipal tariffs every July. Many municipalities use block tariffs, where the price per unit rises once you've bought a certain amount in a month, and some add a fixed monthly charge. The calculator doesn't include either.</p>
{related('electricity-calculator')}"""
    faqs = [
        ("How many units do I get for R100 of electricity?", "At about R2.71 per kWh (Eskom Homelight 20A), R100 buys around 37 units. On a municipal tariff near R3.40 per kWh you'd get around 29 units."),
        ("Why do I get fewer units later in the month?", "Many municipalities use inclining block tariffs. Once your monthly purchases pass a set number of kWh, the price per unit goes up for the rest of the month."),
        ("What uses the most electricity at home?", "Anything that heats: geysers, heaters, kettles, ovens and tumble dryers. A geyser is often the single biggest cost in a household."),
    ]
    page("/electricity-calculator/", "Prepaid Electricity Calculator SA – Units & Appliance Costs",
         "How many units will you get? Free prepaid electricity calculator for Eskom and municipal tariffs, plus the running cost of geysers, kettles, heaters and more.",
         "Prepaid electricity calculator", body, js=True, faqs=faqs, updated=rates_updated(), priority="0.9",
         lede="See how many units your money buys and what each appliance really costs to run.",
         trail=[("Home", "/"), ("Electricity calculator", "/electricity-calculator/")],
         schema=tool_schema("Prepaid Electricity Calculator", "/electricity-calculator/", "Prepaid units and appliance running cost calculator.", "UtilitiesApplication"))


def build_transfer():
    t = RATES["transferDuty"]
    rows = []
    for i, (lo, base, rate) in enumerate(t):
        hi = money(t[i + 1][0]) if i + 1 < len(t) else None
        rng = f"{money(lo)} – {hi}" if hi else f"Above {money(lo)}"
        if i == 0:
            rng = f"Up to {hi}"
        if rate == 0:
            d = "No duty"
        elif base == 0:
            d = f"{int(rate * 100)}% of the value above {money(lo)}"
        else:
            d = f"{money(base)} + {int(rate * 100)}% of the value above {money(lo)}"
        rows.append(f"<tr><td>{rng}</td><td>{d}</td></tr>")
    body = f"""
<div class="tool">
<form id="td-form" class="card" novalidate>
<label for="td-price">Purchase price (R)</label>
<input id="td-price" type="number" inputmode="decimal" min="0" step="10000" value="1500000">
<p class="hint">Transfer duty doesn't apply if you buy from a VAT-registered developer – VAT is included in the price instead.</p>
</form>
<div class="result" aria-live="polite">
<div>Transfer duty payable to SARS</div><div class="big" id="td-duty">–</div>
<dl><dt>As a % of the price</dt><dd id="td-pct">–</dd></dl>
</div></div>
{ad_slot()}
<h2>Transfer duty rates ({RATES['taxYear']})</h2>
<div class="table-scroll"><table><thead><tr><th>Property value</th><th>Transfer duty</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p>The buyer pays transfer duty, usually through the conveyancing attorney before the property is registered in their name. Remember to budget separately for conveyancing fees, bond registration costs and Deeds Office fees, which this calculator doesn't include.</p>
{related('transfer-duty-calculator')}"""
    faqs = [
        ("Who pays transfer duty?", "The buyer pays it. Your conveyancing attorney collects it and pays it to SARS before transfer."),
        ("Is there transfer duty on properties under R1.21 million?", f"No. For {RATES['taxYear']}, properties up to {money(t[1][0])} are exempt from transfer duty, although you'll still pay legal and registration costs."),
        ("Do I pay transfer duty on a new development?", "Not if the seller is a VAT-registered developer selling in the course of their business. The price then includes VAT instead."),
    ]
    page("/transfer-duty-calculator/", f"Transfer Duty Calculator South Africa {RATES['taxYear']} | SARS Rates",
         f"Calculate SARS transfer duty on a property purchase in seconds using the {RATES['taxYear']} rates. No duty on homes up to R1.21 million.",
         "Transfer duty calculator", body, js=True, faqs=faqs, updated=rates_updated(), priority="0.8",
         lede="Work out the SARS transfer duty on a home or property purchase.",
         trail=[("Home", "/"), ("Transfer duty calculator", "/transfer-duty-calculator/")],
         schema=tool_schema("Transfer Duty Calculator", "/transfer-duty-calculator/", "SARS transfer duty calculator."))


# ---------------------------------------------------------------- word hints

def load_hints():
    data = json.loads((ROOT / "hints.json").read_text())
    if DEMO:
        data += json.loads((ROOT / "hints.sample.json").read_text())
    out = []
    for h in data:
        d = dt.date.fromisoformat(h["date"])
        if d <= TODAY and h["game"] in GAMES:
            h = dict(h, _date=d, answer=h["answer"].strip().upper())
            out.append(h)
    out.sort(key=lambda h: h["_date"], reverse=True)
    return out


def nice_date(d, lang):
    if lang == "af":
        months = ["Januarie", "Februarie", "Maart", "April", "Mei", "Junie", "Julie", "Augustus", "September",
                  "Oktober", "November", "Desember"]
    else:
        months = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
                  "October", "November", "December"]
    return f"{d.day} {months[d.month - 1]} {d.year}"


def hint_body(h, g, recent):
    L = g["labels"]; a = h["answer"]
    vowels = [c for c in a if c in "AEIOU"]
    uniq_v = sorted(set(vowels), key=vowels.index)
    repeats = sorted({c for c in a if a.count(c) > 1})
    rep = L["repeat_yes"].format(l=", ".join(repeats)) if repeats else L["repeat_no"]
    v_txt = L["vowels_a"].format(v=len(vowels), s="" if len(vowels) == 1 else ("s" if g["lang"] != "af" else "s"),
                                 letters=", ".join(uniq_v) or "–")
    rec = "".join(
        f'<li><a href="/word-hints/{g["dated_slug"].format(date=r["_date"].isoformat())}/">{esc(g["name"])} #{r.get("number", "")} – {nice_date(r["_date"], g["lang"])}</a></li>'
        for r in recent[:10])
    return f"""
<p>{L['intro']} {L['play']}</p>
<details><summary>{L['vowels']}</summary><p>{v_txt}</p></details>
<details><summary>{L['repeat']}</summary><p>{rep}</p></details>
<details><summary>{L['first']}</summary><p>{L['first_a'].format(l=esc(a[0]))}</p></details>
<details><summary>{L['last']}</summary><p>{L['last_a'].format(l=esc(a[-1]))}</p></details>
<details><summary>{L['clue']}</summary><p>{esc(h.get('clue', ''))}</p></details>
{ad_slot()}
<details><summary>{L['answer']}</summary><p>{L['answer_a']}</p><p class="answer">{esc(a)}</p></details>
<h2>{L['recent']}</h2><ul>{rec}</ul>
<p class="hint">{L['disclaimer']}</p>
<p><a href="/word-hints/">← All word game hints</a></p>"""


def build_hints():
    hints = load_hints()
    hub_sections = []
    for key, g in GAMES.items():
        items = [h for h in hints if h["game"] == key]
        for i, h in enumerate(items):
            d = h["_date"]; dn = nice_date(d, g["lang"]); n = h.get("number", "")
            slug = g["dated_slug"].format(date=d.isoformat())
            title = g["title_dated"].format(d=dn, n=n)
            desc = g["desc"].format(d=dn, n=n)
            schema = {"@type": "Article", "headline": title, "datePublished": d.isoformat(),
                      "dateModified": d.isoformat(), "inLanguage": g["lang"],
                      "author": {"@type": "Organization", "name": CFG["brand"]},
                      "publisher": {"@type": "Organization", "name": CFG["brand"]},
                      "mainEntityOfPage": f"{BASE}/word-hints/{slug}/"}
            page(f"/word-hints/{slug}/", title, desc, esc(g["labels"]["h1"].format(d=dn)), hint_body(h, g, items),
                 lang=g["lang"], schema=schema, updated=d.isoformat(), current="/word-hints/",
                 changefreq="never", priority="0.5",
                 trail=[("Home", "/"), ("Word hints", "/word-hints/"), (f"{g['name']} {dn}", f"/word-hints/{slug}/")])
            if i == 0:
                t_title = g["title_today"].format(d=dn, n=n)
                page(f"/word-hints/{g['today_slug']}/", t_title, desc, esc(g["labels"]["h1"].format(d=dn)),
                     hint_body(h, g, items[1:]), lang=g["lang"], updated=d.isoformat(), current="/word-hints/",
                     changefreq="daily", priority="0.9",
                     schema=dict(schema, headline=t_title, mainEntityOfPage=f"{BASE}/word-hints/{g['today_slug']}/"),
                     trail=[("Home", "/"), ("Word hints", "/word-hints/"), (f"{g['name']} today", f"/word-hints/{g['today_slug']}/")])
        if items:
            latest = items[0]
            hub_sections.append(
                f'<a class="tile" href="/word-hints/{g["today_slug"]}/"><span class="tag">Today</span>'
                f'<strong>{g["name"]} hint #{latest.get("number", "")}</strong>'
                f'<span>{nice_date(latest["_date"], g["lang"])} – spoiler-free clues</span></a>')
        else:
            hub_sections.append(f'<div class="tile"><strong>{g["name"]} hints</strong><span>Coming soon.</span></div>')
    archive = "".join(
        f'<li><a href="/word-hints/{GAMES[h["game"]]["dated_slug"].format(date=h["_date"].isoformat())}/">{GAMES[h["game"]]["name"]} #{h.get("number", "")} – {nice_date(h["_date"], "en")}</a></li>'
        for h in hints[:60])
    body = f"""<div class="grid">{''.join(hub_sections)}</div>
{ad_slot()}
<h2>How our hints work</h2>
<p>Every day we post a set of hints that get gradually stronger: the number of vowels, whether any letters repeat, the first and last letters, and a meaning clue. The answer is always hidden behind a final tap, so you can keep your streak honest.</p>
<p>Wortel is the Afrikaans version of the daily five-letter word game, and our Wortel hints are written in Afrikaans.</p>
<h2>Archive</h2><ul>{archive or '<li>The archive fills up as daily hints are published.</li>'}</ul>
<p class="hint">Wordle is a trademark of The New York Times Company. {esc(CFG['brand'])} is independent and not affiliated with The New York Times or the makers of Wortel.</p>"""
    page("/word-hints/", "Daily Word Game Hints – Wordle Hint Today & Wortel Wenk",
         "Spoiler-free hints for today's Wordle and Wortel. Get vowels, first letter and a clue before revealing the answer.",
         "Daily word game hints", body, changefreq="daily", priority="0.9",
         lede="Gentle clues first, the answer only if you want it.",
         trail=[("Home", "/"), ("Word hints", "/word-hints/")],
         schema={"@type": "CollectionPage", "name": "Daily word game hints", "url": BASE + "/word-hints/"})
    return hints


# ---------------------------------------------------------------- static pages

def build_static_pages():
    tiles = "".join(f'<a class="tile" href="/{s}/"><strong>{t}</strong><span>{d}</span></a>' for s, t, d in TOOLS)
    body = f"""<div class="grid">{tiles}</div>
{ad_slot()}
<h2>Built for South Africa</h2>
<p>Most online calculators are made for the US or UK. Ours use South African rules: SARS tax tables, 15% VAT, matric APS points, Eskom and municipal electricity tariffs, and SARS transfer duty. Each tool shows the formula and the official rates it uses, so you can check the working yourself.</p>
<p>Everything is free, works on your phone, and doesn't ask you to sign up.</p>"""
    page("/", f"{CFG['brand']} – Free South African Calculators & Daily Word Hints",
         "Free South African calculators for salary after tax, VAT, APS score, prepaid electricity and transfer duty, plus daily Wordle and Wortel hints.",
         "Free South African calculators", body, priority="1.0", changefreq="weekly", lede=esc(CFG["tagline"]) + ".",
         schema={"@type": "WebSite", "name": CFG["brand"], "url": BASE + "/", "inLanguage": "en-ZA",
                 "publisher": {"@type": "Organization", "name": CFG["brand"], "url": BASE + "/"}})

    email = esc(CFG["contact_email"])
    page("/about/", f"About {CFG['brand']}", f"About {CFG['brand']}: free, accurate calculators built for South Africans.",
         f"About {esc(CFG['brand'])}",
         f"""<p>{esc(CFG['brand'])} makes free, simple tools for everyday South African questions: what will I take home after tax, how many electricity units will I get, what's my APS score?</p>
<p>We check every calculator against official sources such as SARS, Eskom and university admission guides, and we update the rates when the Budget or tariffs change. Each page shows the date it was last checked.</p>
<p>Found a mistake? Please tell us at <a href="mailto:{email}">{email}</a>.</p>""",
         trail=[("Home", "/"), ("About", "/about/")], priority="0.3")

    page("/contact/", f"Contact {CFG['brand']}", f"Get in touch with {CFG['brand']}.", "Contact us",
         f"""<p>Questions, corrections or partnership ideas? Email <a href="mailto:{email}">{email}</a>. We usually reply within two working days.</p>""",
         trail=[("Home", "/"), ("Contact", "/contact/")], priority="0.3")

    page("/privacy-policy/", f"Privacy Policy | {CFG['brand']}", f"How {CFG['brand']} handles your information, cookies and advertising.",
         "Privacy policy",
         f"""<p class="updated">Effective {TODAY.isoformat()}</p>
<h2>What we collect</h2><p>Our calculators run in your browser. The numbers you type are not sent to us or stored by us.</p>
<h2>Cookies and advertising</h2><p>We use Google AdSense to show ads. Google and its partners use cookies to serve ads based on your previous visits to this and other websites. You can opt out of personalised advertising in <a href="https://adssettings.google.com" rel="nofollow">Google Ads Settings</a>. Learn more about <a href="https://policies.google.com/technologies/ads" rel="nofollow">how Google uses information from sites that use its services</a>.</p>
<h2>Analytics</h2><p>We may use privacy-friendly analytics to count page views. These don't identify you personally.</p>
<h2>Your rights (POPIA)</h2><p>Under the Protection of Personal Information Act you can ask what personal information we hold about you and ask us to correct or delete it. Contact <a href="mailto:{email}">{email}</a>.</p>
<h2>Changes</h2><p>We'll post any changes to this policy on this page.</p>""",
         trail=[("Home", "/"), ("Privacy policy", "/privacy-policy/")], priority="0.2")

    page("/terms/", f"Terms & Disclaimer | {CFG['brand']}", f"Terms of use and disclaimer for {CFG['brand']}.",
         "Terms of use and disclaimer",
         """<p>Our calculators give estimates for general information only. They are not financial, tax, legal or academic advice. Rates and rules change, and your own circumstances may differ, so confirm important figures with SARS, your employer, your municipality, a conveyancer or the relevant university.</p>
<p>We work hard to keep the information accurate but can't guarantee it is complete or current, and we aren't liable for decisions made using these tools.</p>
<p>Third-party trademarks, including Wordle, belong to their owners. This site is not affiliated with them.</p>""",
         trail=[("Home", "/"), ("Terms", "/terms/")], priority="0.2")

    page("/404.html", "Page not found", "This page doesn't exist.", "Page not found",
         '<p>Sorry, that page doesn\'t exist. Try the <a href="/">home page</a>.</p>', index=False)


# ---------------------------------------------------------------- output

def write_assets():
    js = (ROOT / "app.js").read_text()
    js = re.sub(r"/\*RATES_START\*/.*?/\*RATES_END\*/", lambda m: json.dumps(RATES), js, flags=re.S)
    (DIST / "app.js").write_text(js)
    (DIST / "favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f5c45"/>'
        '<text x="32" y="44" font-family="Arial,sans-serif" font-size="34" font-weight="800" text-anchor="middle" fill="#e8a317">W</text></svg>')
    (DIST / "robots.txt").write_text(
        ("User-agent: *\nDisallow: /\n" if DEMO else "User-agent: *\nAllow: /\n") + f"\nSitemap: {BASE}/sitemap.xml\n")
    urls = "".join(f"<url><loc>{u}</loc><lastmod>{lm}</lastmod><changefreq>{cf}</changefreq><priority>{p}</priority></url>"
                   for u, lm, cf, p in SITEMAP)
    (DIST / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
    if CFG.get("adsense_client"):
        pub = CFG["adsense_client"].replace("ca-", "")
        (DIST / "ads.txt").write_text(f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n")
    (DIST / "_headers").write_text(
        "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n"
        "/app.js\n  Cache-Control: public, max-age=86400\n/favicon.svg\n  Cache-Control: public, max-age=604800\n")


def add_hint(args):
    if len(args) < 4:
        sys.exit('Usage: python build.py add GAME YYYY-MM-DD ANSWER "CLUE" [NUMBER]')
    game, date, answer, clue = args[:4]
    if game not in GAMES:
        sys.exit(f"Unknown game '{game}'. Use one of: {', '.join(GAMES)}")
    dt.date.fromisoformat(date)
    if not re.fullmatch(r"[A-Za-z]{5}", answer):
        sys.exit("The answer should be a five-letter word.")
    path = ROOT / "hints.json"
    data = [h for h in json.loads(path.read_text()) if not (h["game"] == game and h["date"] == date)]
    entry = {"game": game, "date": date, "answer": answer.upper(), "clue": clue}
    if len(args) > 4:
        entry["number"] = int(args[4])
    data.append(entry)
    data.sort(key=lambda h: (h["date"], h["game"]))
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"Saved {game} hint for {date}.")


def main():
    args = [a for a in sys.argv[1:] if a != "--demo"]
    if args and args[0] == "add":
        add_hint(args[1:])
        return
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    build_static_pages()
    build_salary(); build_vat(); build_aps(); build_electricity(); build_transfer()
    hints = build_hints()
    write_assets()
    print(f"Built {len(SITEMAP)} indexable pages ({len(hints)} published hints) into {DIST}{'  [DEMO]' if DEMO else ''}")


if __name__ == "__main__":
    main()
