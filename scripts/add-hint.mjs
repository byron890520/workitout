// Add a daily hint:  npm run add-hint -- wordle 2026-10-15 CRANE "A tall wading bird" 1579
import { readFileSync, writeFileSync } from "node:fs";
const [game, date, answer, clue, number] = process.argv.slice(2);
const fail = (m) => { console.error(m); process.exit(1); };
if (!clue) fail('Usage: npm run add-hint -- GAME YYYY-MM-DD ANSWER "CLUE" [NUMBER]');
if (!["wordle", "wortel"].includes(game)) fail("Game must be wordle or wortel.");
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("Date must look like 2026-10-15.");
if (!/^[A-Za-z]{5}$/.test(answer)) fail("The answer should be a five-letter word.");
const file = new URL("../src/data/hints.json", import.meta.url);
const data = JSON.parse(readFileSync(file, "utf8")).filter((h) => !(h.game === game && h.date === date));
data.push({ game, date, answer: answer.toUpperCase(), clue, ...(number ? { number: +number } : {}) });
data.sort((a, b) => (a.date + a.game).localeCompare(b.date + b.game));
writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(`Saved ${game} hint for ${date}.`);
