import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { rankFor, RANKS, type Entry } from '../../lib/journal';

/** "New in your journal": shown for a few seconds the first time a species is met. */
export function JournalToast({ entry }: { entry: Entry | null }) {
  const [shown, setShown] = useState<Entry | null>(null);
  useEffect(() => {
    if (!entry) return;
    setShown(entry);
    const t = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(t);
  }, [entry]);
  if (!shown) return null;
  // a newly earned title is worth saying
  const earned = RANKS.find((r) => r.at === shown.n);
  const { next } = rankFor(shown.n);
  return (
    <div className="jtoast" role="status">
      <span className="jtoast__no num" aria-label={`Number ${shown.n}`}>{String(shown.n).padStart(3, '0')}</span>
      <span className="jtoast__body">
        <span className="label label--ink">{earned ? `New title · ${earned.title}` : 'New in your journal'}</span>
        <span className="jtoast__sub">
          {shown.name}
          {next ? ` · ${next.at - shown.n} to ${next.title}` : ''}
        </span>
      </span>
      <Link to="/journal" className="label label--ink jtoast__open">
        Open
      </Link>
    </div>
  );
}
