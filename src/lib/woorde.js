// Afrikaans word of the day: entries dated after today (SA time) stay hidden until their day.
import WOORDE from "../data/woorde.json" with { type: "json" };
import { todaySA } from "./site.js";

const MAANDE = ["Januarie", "Februarie", "Maart", "April", "Mei", "Junie", "Julie", "Augustus", "September", "Oktober", "November", "Desember"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const datum = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MAANDE[m - 1]} ${y}`; };
export const dateEn = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

export function publishedWords() {
  const today = todaySA();
  return WOORDE.filter((w) => w.date <= today && w.word).sort((a, b) => (a.date < b.date ? 1 : -1));
}
