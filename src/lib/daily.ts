/**
 * The daily specimen: one animal a day, the same for everyone, guessed in six tries.
 * Each guess is scored against the answer on four clues (kinship, size, status, range),
 * and the specimen fills in a little more with every miss.
 */
import type { Species } from '../data/types';
import type { SpeciesSummary } from '../data/api';
import { kinship, type Rank } from './kinship';
import { realSize } from './compare';

export const MAX_GUESSES = 6;
/** Share of the specimen's points shown before each guess (index = guesses made so far). */
export const ALIVE_STEPS = [0.04, 0.08, 0.15, 0.26, 0.42, 0.62];

/** Day one of the puzzle, so each day has a number to share. */
const EPOCH = Date.UTC(2026, 9, 12);

/** The visitor's local calendar date as YYYY-MM-DD, so the puzzle turns over at their midnight. */
export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function puzzleNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000) + 1;
}

function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + days));
}

/** FNV-1a: small, fast, and identical in every browser. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pick by highest hash of seed+slug. Adding or dropping a species only changes the days it
 * would win or did win, so everyone still gets the same animal while the catalogue grows.
 */
function rank(pool: string[], seed: string): string[] {
  return [...pool].sort((a, b) => hash(`${seed}:${b}`) - hash(`${seed}:${a}`) || a.localeCompare(b));
}

/** Today's answer; never the same animal as yesterday. */
export function dailyAnswer(pool: string[], key: string): string {
  const yesterday = rank(pool, shiftDay(key, -1))[0];
  return rank(pool, key).find((s) => s !== yesterday) ?? pool[0];
}

export const practiceAnswer = (pool: string[], seed: string) => rank(pool, `practice:${seed}`)[0];

/** Answers come from the best-known animals that have a 3D specimen and a Red List status. */
export function answerPool(items: SpeciesSummary[]): string[] {
  const good = items.filter((s) => s.specimen?.model && s.iucn && s.iucn !== 'DD' && s.iucn !== 'NE');
  return (good.length >= 10 ? good : items).map((s) => s.slug);
}

// ---------------- clues ----------------

export type Mark = 'hit' | 'near' | 'miss';
export interface Clue {
  mark: Mark;
  text: string;
  /** arrow for size and status (answer is bigger / more threatened = up) */
  dir?: 'up' | 'down';
  /** compass bearing in degrees from the guess to the answer (range) */
  bearing?: number;
}
export interface Clues {
  correct: boolean;
  kin: Clue;
  size: Clue;
  status: Clue;
  range: Clue;
}

const KIN_TEXT: Record<Rank, string> = {
  Species: 'Same species',
  Genus: 'Same genus',
  Family: 'Same family',
  Order: 'Same order',
  Class: 'Same class',
  Phylum: 'Same phylum',
  Kingdom: 'Distant',
};
const KIN_MARK: Record<Rank, Mark> = { Species: 'hit', Genus: 'near', Family: 'near', Order: 'near', Class: 'miss', Phylum: 'miss', Kingdom: 'miss' };

const STATUS_RANK: Record<string, number> = { LC: 1, NT: 2, VU: 3, EN: 4, CR: 5, EW: 6, EX: 7 };

const rad = (d: number) => (d * Math.PI) / 180;

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const times = (r: number) => (r < 10 ? `${Math.round(r * 10) / 10}`.replace(/\.0$/, '') : `${Math.round(r)}`);

export function scoreGuess(guess: Species, answer: Species): Clues {
  const correct = guess.slug === answer.slug;
  const k = correct ? 'Species' : kinship(guess, answer).level;
  const kin: Clue = { mark: KIN_MARK[k], text: KIN_TEXT[k] };

  const r = realSize(answer).metres / Math.max(realSize(guess).metres, 1e-4);
  const size: Clue =
    correct || (r <= 1.3 && r >= 1 / 1.3)
      ? { mark: 'hit', text: 'Same size' }
      : {
          mark: r <= 2.5 && r >= 1 / 2.5 ? 'near' : 'miss',
          dir: r > 1 ? 'up' : 'down',
          text: r > 1 ? `${times(r)}× bigger` : `${times(1 / r)}× smaller`,
        };

  const sa = STATUS_RANK[answer.status.iucn];
  const sg = STATUS_RANK[guess.status.iucn];
  const status: Clue =
    !sa || !sg
      ? { mark: 'miss', text: 'Unknown' }
      : sa === sg
        ? { mark: 'hit', text: 'Same status' }
        : { mark: Math.abs(sa - sg) === 1 ? 'near' : 'miss', dir: sa > sg ? 'up' : 'down', text: sa > sg ? 'More at risk' : 'Less at risk' };

  const km = correct ? 0 : distanceKm(guess.range.centroid, answer.range.centroid);
  const range: Clue =
    km < 400
      ? { mark: 'hit', text: correct ? 'Right here' : 'Same area' }
      : {
          mark: km < 2000 ? 'near' : 'miss',
          bearing: bearing(guess.range.centroid, answer.range.centroid),
          text: `${(Math.round(km / 100) * 100).toLocaleString('en-US')} km`,
        };

  return { correct, kin, size, status, range };
}

/** Free hints that unlock as misses pile up. */
export function hints(answer: Species, misses: number): { after: number; label: string; text: string }[] {
  const CLASS: Record<string, string> = {
    Mammalia: 'a mammal', Aves: 'a bird', Reptilia: 'a reptile', Amphibia: 'an amphibian', Actinopterygii: 'a ray-finned fish',
    Elasmobranchii: 'a shark or ray', Insecta: 'an insect', Malacostraca: 'a crustacean', Cephalopoda: 'a cephalopod', Arachnida: 'an arachnid',
  };
  const where = answer.range.regions.slice(0, 3).join(', ');
  const all = [
    { after: 2, label: 'Class', text: `It is ${CLASS[answer.taxonomy.class] ?? `in the class ${answer.taxonomy.class}`}.` },
    { after: 4, label: 'Range', text: where ? `Look for it in ${where}.` : `Family ${answer.taxonomy.family}.` },
    { after: 5, label: 'Name', text: `Its name starts with “${answer.commonName[0]}”.` },
  ];
  return all.filter((h) => misses >= h.after);
}

// ---------------- saved games and stats ----------------

const STORE = 'anidex-daily';
export interface SavedGame {
  guesses: string[];
  result: 'won' | 'lost' | null;
}
type Saved = Record<string, SavedGame>;

function readAll(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? '{}');
    return v && typeof v === 'object' ? (v as Saved) : {};
  } catch {
    return {};
  }
}

export function loadGame(key: string): SavedGame {
  const g = readAll()[key];
  return g && Array.isArray(g.guesses) ? g : { guesses: [], result: null };
}

export function saveGame(key: string, game: SavedGame) {
  try {
    const all = readAll();
    all[key] = game;
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    /* private mode: the game still plays, it just isn't remembered */
  }
}

export interface Stats {
  played: number;
  won: number;
  streak: number;
  best: number;
  /** wins by number of guesses, index 0 = solved in one */
  dist: number[];
}

export function stats(today: string): Stats {
  const all = readAll();
  const done = Object.entries(all).filter(([, g]) => g.result);
  const dist = Array(MAX_GUESSES).fill(0) as number[];
  for (const [, g] of done) if (g.result === 'won') dist[g.guesses.length - 1]++;
  const won = (k: string) => all[k]?.result === 'won';
  // the current streak runs back from today (or yesterday, if today isn't solved yet)
  let streak = 0;
  for (let k = won(today) ? today : shiftDay(today, -1); won(k); k = shiftDay(k, -1)) streak++;
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of Object.keys(all).sort()) {
    run = won(k) ? (prev && won(prev) && shiftDay(prev, 1) === k ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    prev = k;
  }
  return { played: done.length, won: done.filter(([, g]) => g.result === 'won').length, streak, best, dist };
}

// ---------------- sharing ----------------

const SQUARE: Record<Mark, string> = { hit: '🟩', near: '🟨', miss: '⬛' };
export function shareText(num: number, rows: Clues[], won: boolean, url: string): string {
  const grid = rows.map((c) => [c.kin, c.size, c.status, c.range].map((x) => SQUARE[x.mark]).join(''));
  return [`AniDex Daily #${num} · ${won ? rows.length : 'X'}/${MAX_GUESSES}`, ...grid, url].join('\n');
}
