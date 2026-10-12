import { useEffect, useMemo, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { fetchSpecies, STATUS_SHORT } from '../../data';
import type { SpeciesRecord, SpeciesSummary } from '../../data/api';
import type { Species } from '../../data/types';
import { ALIVE_STEPS, hints, loadGame, MAX_GUESSES, saveGame, scoreGuess, shareText, stats, type Clue, type Clues } from '../../lib/daily';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { live, useStore } from '../../store/useStore';
import { SpeciesPicker } from '../compare/SpeciesPicker';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';
import { record } from '../../lib/journal';

export interface DailyData {
  /** the visitor's local date, YYYY-MM-DD */
  day: string;
  number: number;
  /** practice round seed (not saved, no streak), or null for the daily puzzle */
  practice: string | null;
  answer: SpeciesRecord;
  suggestions: SpeciesSummary[];
}

interface Row {
  sp: Species;
  clues: Clues;
}

/** The daily specimen: guess the animal from a few of its points, with clues after each try. */
export default function DailyPage() {
  const data = useLoaderData() as DailyData;
  // a new answer (the next practice round) starts a fresh game
  return <Game key={`${data.answer.slug}:${data.practice ?? data.day}`} {...data} />;
}

function Game({ day, number, practice, answer, suggestions }: DailyData) {
  const go = useTransitionNavigate();
  const navigate = useNavigate();
  const phone = useMediaQuery('(max-width: 768px)');
  const saved = useMemo(() => (practice ? { guesses: [], result: null } : loadGame(day)), [day, practice]);
  const [rows, setRows] = useState<Row[]>([]);
  const [restored, setRestored] = useState(saved.guesses.length === 0);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  const won = rows.some((r) => r.clues.correct);
  const over = won || rows.length >= MAX_GUESSES;
  const misses = rows.length - (won ? 1 : 0);

  // the scene: today's animal, mostly scattered until it is guessed
  useEffect(() => {
    live.chapterKeys = ['daily'];
    live.pos = 0;
    live.alive = ALIVE_STEPS[0];
    useStore.setState({ page: 'daily', slug: null, shape: answer.slug, previewShape: null, activePlace: -1 });
    document.title = practice ? 'Practice specimen · AniDex' : `Daily specimen No. ${number} · AniDex`;
    window.scrollTo(0, 0);
    return () => {
      live.alive = 1;
    };
  }, [answer.slug, number, practice]);

  useEffect(() => {
    live.alive = over ? 1 : ALIVE_STEPS[Math.min(rows.length, ALIVE_STEPS.length - 1)];
  }, [rows.length, over]);

  // pick up where the visitor left off today
  useEffect(() => {
    if (!saved.guesses.length) return;
    Promise.all(saved.guesses.map((s) => fetchSpecies(s).catch(() => null)))
      .then((list) => setRows(list.filter((s): s is SpeciesRecord => !!s).map((sp) => ({ sp, clues: scoreGuess(sp, answer) }))))
      .finally(() => setRestored(true));
  }, [saved, answer]);

  const guess = async (s: SpeciesSummary) => {
    if (busy || over || rows.some((r) => r.sp.slug === s.slug)) return;
    setBusy(true);
    setPicking(false);
    try {
      const sp = await fetchSpecies(s.slug);
      if (!sp) return;
      const next = [...rows, { sp, clues: scoreGuess(sp, answer) }];
      setRows(next);
      if (next.at(-1)!.clues.correct) record(answer, 'guessed');
      if (!practice) {
        const done = next.at(-1)!.clues.correct ? 'won' : next.length >= MAX_GUESSES ? 'lost' : null;
        saveGame(day, { guesses: next.map((r) => r.sp.slug), result: done });
      }
    } finally {
      setBusy(false);
    }
  };

  const playPractice = () => navigate(`/daily?p=${Math.random().toString(36).slice(2, 8)}`);

  return (
    <main className="daily" data-page>
      <section className="chapter daily__stage">
        <div className="daily__panel">
          <p className="label label--dot">{practice ? 'Practice round · not counted' : `Daily specimen · No. ${number}`}</p>
          {over ? (
            <h1 className="display daily__title">
              {won ? 'Yes, the ' : 'It was the '}
              <em>{answer.commonName.replace(/^the /i, '')}</em>
            </h1>
          ) : (
            <h1 className="display daily__title">
              Who is <em>this?</em>
            </h1>
          )}
          {!over && (
            <p className="daily__lede">
              {MAX_GUESSES} guesses. Each miss brings more of it back. Drag the dots to turn it.
            </p>
          )}

          {!over && restored && (
            <div className="daily__input">
              {phone && !picking ? (
                <button className="compare-btn daily__guess-btn" onClick={() => setPicking(true)} disabled={busy}>
                  Guess {rows.length + 1} of {MAX_GUESSES}
                </button>
              ) : (
                <SpeciesPicker
                  key={rows.length}
                  label={busy ? 'Checking…' : `Guess ${rows.length + 1} of ${MAX_GUESSES}`}
                  // desktop shows matches as you type; the phone sheet also offers the best-known animals
                  suggestions={phone ? suggestions : []}
                  exclude={rows.map((r) => r.sp.slug)}
                  onPick={guess}
                  onClose={phone ? () => setPicking(false) : undefined}
                  autoFocus={!phone || picking}
                />
              )}
            </div>
          )}

          <Board rows={rows} over={over} />

          {!over && <Hints answer={answer} misses={misses} />}

          {over && (
            <Result
              won={won}
              rows={rows}
              answer={answer}
              day={day}
              number={number}
              practice={!!practice}
              onRead={() => go(`/species/${answer.slug}`, answer.slug)}
              onPractice={playPractice}
            />
          )}
        </div>
      </section>
    </main>
  );
}

// ---------------- the board ----------------

const COLS = ['Kin', 'Size', 'Status', 'Range'] as const;

function Board({ rows, over }: { rows: Row[]; over: boolean }) {
  const empty = over ? 0 : Math.max(0, MAX_GUESSES - rows.length);
  return (
    <div className="board" role="table" aria-label="Your guesses">
      <div className="board__row board__head label" role="row">
        <span role="columnheader">Guess</span>
        {COLS.map((c) => (
          <span key={c} role="columnheader">
            {c}
          </span>
        ))}
      </div>
      {rows.map(({ sp, clues }, i) => (
        <div key={sp.slug} className={`board__row is-filled${clues.correct ? ' is-correct' : ''}`} role="row" style={{ ['--i' as string]: i }}>
          <span className="board__name" role="cell">
            {sp.commonName}
          </span>
          <Tile clue={clues.kin} n={0} />
          <Tile clue={clues.size} n={1} />
          <Tile clue={clues.status} n={2} />
          <Tile clue={clues.range} n={3} />
        </div>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <div key={`e${i}`} className="board__row is-empty" role="row" aria-hidden="true">
          <span className="board__name">{rows.length + i + 1}</span>
          {COLS.map((c) => (
            <span key={c} className="tile" />
          ))}
        </div>
      ))}
    </div>
  );
}

function Tile({ clue, n }: { clue: Clue; n: number }) {
  const turn = clue.dir ? (clue.dir === 'up' ? 0 : 180) : clue.bearing;
  return (
    <span className={`tile tile--${clue.mark}`} role="cell" style={{ ['--n' as string]: n }}>
      {turn != null && (
        <svg className="tile__arrow" viewBox="0 0 12 12" aria-hidden="true" style={{ transform: `rotate(${turn}deg)` }}>
          <path d="M6 1.5v9M6 1.5L2.8 4.7M6 1.5l3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
      <span className="tile__text">{clue.text}</span>
    </span>
  );
}

function Hints({ answer, misses }: { answer: Species; misses: number }) {
  const list = hints(answer, misses);
  const next = [2, 4, 5].find((n) => n > misses);
  return (
    <div className="daily__hints">
      {list.map((h) => (
        <p key={h.label} className="daily__hint">
          <span className="label">{h.label}</span> {h.text}
        </p>
      ))}
      {next != null && (
        <p className="label daily__hint-next">
          {next - misses === 1 ? 'A hint unlocks after your next miss' : `A hint unlocks after ${next - misses} misses`}
        </p>
      )}
    </div>
  );
}

// ---------------- the result ----------------

function untilMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

interface ResultProps {
  won: boolean;
  rows: Row[];
  answer: SpeciesRecord;
  day: string;
  number: number;
  practice: boolean;
  onRead: () => void;
  onPractice: () => void;
}

function Result({ won, rows, answer, day, number, practice, onRead, onPractice }: ResultProps) {
  const [clock, setClock] = useState(untilMidnight);
  const [shared, setShared] = useState<'idle' | 'copied' | 'failed'>('idle');
  const st = useMemo(() => stats(day), [day]);

  useEffect(() => {
    const t = setInterval(() => setClock(untilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  const share = async () => {
    const text = shareText(number, rows.map((r) => r.clues), won, `${location.origin}/daily`);
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared('copied');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShared('failed');
    }
    setTimeout(() => setShared('idle'), 2400);
  };

  const most = Math.max(1, ...st.dist);
  return (
    <div className="result">
      <p className="result__line">
        <span className="italic muted">{answer.scientificName}</span>
        {answer.status.iucn && (
          <span className="status-chip" style={{ ['--status' as string]: `var(--st-${answer.status.iucn})` }}>
            {STATUS_SHORT[answer.status.iucn]}
          </span>
        )}
      </p>
      <p className="result__verdict">
        {won ? (rows.length === 1 ? 'First try. Remarkable.' : `Found in ${rows.length} of ${MAX_GUESSES}.`) : 'Out of guesses this time.'}
        {answer.descriptor ? ` ${answer.descriptor}` : ''}
      </p>

      <div className="result__actions">
        <button className="compare-btn is-on" onClick={onRead}>
          Read its story →
        </button>
        {!practice && (
          <button className="compare-btn" onClick={share}>
            {shared === 'copied' ? 'Copied to clipboard' : shared === 'failed' ? 'Couldn’t copy' : 'Share result'}
          </button>
        )}
        <button className="compare-btn" onClick={onPractice}>
          {practice ? 'Another practice round' : 'Practice round'}
        </button>
      </div>

      {!practice && (
        <div className="result__stats">
          <dl className="result__nums">
            {(
              [
                ['Played', st.played],
                ['Won', st.played ? `${Math.round((st.won / st.played) * 100)}%` : '—'],
                ['Streak', st.streak],
                ['Best', st.best],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dd className="display num">{v}</dd>
                <dt className="label">{k}</dt>
              </div>
            ))}
          </dl>
          <ol className="result__dist" aria-label="Wins by number of guesses">
            {st.dist.map((n, i) => (
              <li key={i} className={won && rows.length === i + 1 ? 'is-today' : ''}>
                <span className="label num">{i + 1}</span>
                <span className="result__bar" style={{ ['--w' as string]: `${(n / most) * 100}%` }}>
                  <span className="num">{n}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="label">
            Next specimen in <span className="num label--ink">{clock}</span>
          </p>
        </div>
      )}
    </div>
  );
}
