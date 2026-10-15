// Daily word hints: loads entries, hides anything dated after today (SA time), derives the clues.
import HINTS from "../data/hints.json" with { type: "json" };
import SAMPLE from "../data/hints.sample.json" with { type: "json" };
import { DEMO, todaySA } from "./site.js";

export const GAMES = {
  wordle: {
    lang: "en-ZA", name: "Wordle", todaySlug: "wordle-hint-today", datedSlug: (d) => `wordle-hint-${d}`,
    titleToday: (d, n) => `Wordle Hint Today (${d}) – Clues and Answer #${n}`,
    titleDated: (d, n) => `Wordle Hint ${d} – Clues and Answer #${n}`,
    desc: (d, n) => `Stuck on Wordle #${n} (${d})? Get gentle hints first – vowels, first letter and a clue – then reveal the answer only if you need it.`,
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    L: {
      h1: (d) => `Wordle hint for ${d}`,
      intro: "Work through the hints one at a time. Each one gives away a little more, and the answer stays hidden until you tap it. New puzzles unlock at midnight South African time.",
      vowels: "Hint 1: How many vowels?", vowelsA: (v, l) => `The answer has ${v} vowel${v === 1 ? "" : "s"} (${l}).`,
      repeat: "Hint 2: Any repeated letters?", repeatYes: (l) => `Yes – the letter ${l} appears more than once.`, repeatNo: "No – every letter is different.",
      first: "Hint 3: First letter", firstA: "It starts with", last: "Hint 4: Last letter", lastA: "It ends with",
      clue: "Hint 5: Meaning clue", answer: "Reveal today's answer", answerA: "Today's answer is",
      recent: "Recent Wordle hints", back: "All word game hints",
      disclaimer: "Wordle is a trademark of The New York Times Company. This site is independent and not affiliated with or endorsed by The New York Times.",
    },
  },
  wortel: {
    lang: "af", name: "Wortel", todaySlug: "wortel-wenk-vandag", datedSlug: (d) => `wortel-wenk-${d}`,
    titleToday: (d, n) => `Wortel Wenk Vandag (${d}) – Leidrade en Antwoord #${n}`,
    titleDated: (d, n) => `Wortel Wenk ${d} – Leidrade en Antwoord #${n}`,
    desc: (d, n) => `Vashaak met Wortel #${n} (${d})? Kry eers sagte wenke – klinkers, eerste letter en 'n leidraad – en wys die antwoord net as jy moet.`,
    months: ["Januarie", "Februarie", "Maart", "April", "Mei", "Junie", "Julie", "Augustus", "September", "Oktober", "November", "Desember"],
    L: {
      h1: (d) => `Wortel-wenk vir ${d}`,
      intro: "Werk een wenk op 'n slag deur. Elkeen gee 'n bietjie meer weg, en die antwoord bly versteek totdat jy daarop tik. Nuwe raaisels verskyn om middernag Suid-Afrikaanse tyd.",
      vowels: "Wenk 1: Hoeveel klinkers?", vowelsA: (v, l) => `Die antwoord het ${v} klinker${v === 1 ? "" : "s"} (${l}).`,
      repeat: "Wenk 2: Herhaalde letters?", repeatYes: (l) => `Ja – die letter ${l} kom meer as een keer voor.`, repeatNo: "Nee – elke letter is anders.",
      first: "Wenk 3: Eerste letter", firstA: "Dit begin met", last: "Wenk 4: Laaste letter", lastA: "Dit eindig met",
      clue: "Wenk 5: Betekenis-leidraad", answer: "Wys vandag se antwoord", answerA: "Vandag se antwoord is",
      recent: "Onlangse Wortel-wenke", back: "Alle woordspeletjie-wenke",
      disclaimer: "Hierdie webwerf is onafhanklik en nie verbonde aan die makers van Wortel nie.",
    },
  },
};

export const niceDate = (iso, game = "wordle") => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${GAMES[game].months[m - 1]} ${y}`;
};

export function publishedHints() {
  const today = todaySA();
  const all = DEMO ? [...HINTS, ...SAMPLE] : HINTS;
  return all
    .filter((h) => GAMES[h.game] && h.date <= today)
    .map((h) => ({ ...h, answer: String(h.answer).trim().toUpperCase() }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function clues(answer) {
  const letters = [...answer];
  const vowels = letters.filter((c) => "AEIOU".includes(c));
  return {
    vowelCount: vowels.length,
    vowelList: [...new Set(vowels)].join(", ") || "–",
    repeats: [...new Set(letters.filter((c, i) => letters.indexOf(c) !== i))],
    first: letters[0],
    last: letters[letters.length - 1],
  };
}
