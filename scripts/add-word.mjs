// Add an Afrikaans word of the day:
// npm run add-word -- 2026-10-16 "lekker" "byvoeglike naamwoord" "adjective" "Nice, tasty or great." "Die kos is lekker." "The food is tasty." "Optional note"
import { readFileSync, writeFileSync } from "node:fs";
const [date, word, type_af, type_en, meaning, example_af, example_en, note] = process.argv.slice(2);
const fail = (m) => { console.error(m); process.exit(1); };
if (!example_en) fail('Usage: npm run add-word -- DATE WORD "type (af)" "type (en)" "meaning" "example (af)" "example (en)" ["note"]');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("Date must look like 2026-10-16.");
const file = new URL("../src/data/woorde.json", import.meta.url);
const data = JSON.parse(readFileSync(file, "utf8"));
if (data.some((w) => w.word.toLowerCase() === word.toLowerCase() && w.date !== date)) fail(`"${word}" has already been used.`);
const next = data.filter((w) => w.date !== date);
next.push({ date, word: word.toLowerCase(), type_af, type_en, meaning, example_af, example_en, ...(note ? { note } : {}) });
next.sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
console.log(`Saved "${word}" for ${date}.`);
