import type { Species } from '../../../data/types';
import { useStore } from '../../../store/useStore';
import { countryName } from '../../../lib/format';
import { ChapterLabel } from '../../ui/ChapterLabel';
import { Reveal } from '../../ui/Reveal';
import { RotateIcon, StageSlot } from '../../ui/StageSlot';

const SOURCE_TEXT: Record<string, string> = {
  'gbif-density': 'Dots: GBIF occurrence density, wild range only',
  'gbif-occurrences': 'Dots: latest 300 GBIF occurrence records',
  'curated-bbox': 'Dots: approximate range (GBIF unavailable)',
};

const MAX_LIST = 6;

function fmtLat(lat: number) {
  return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
}
function fmtLon(lon: number) {
  return `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
}

export function Range({ sp, n }: { sp: Species; n: number }) {
  const source = useStore((s) => s.rangeSource);
  const { regions, countries, summary, centroid } = sp.range;
  const headline = regions.length > 1 ? `From ${regions[0]} to ${regions[regions.length - 1]}` : regions[0] ?? 'Where it lives';
  return (
    <section className="chapter ch-range" aria-labelledby="range-title">
      <div className="stage split">
        <StageSlot kind="globe" chapter="range" className="m-slot--range" reserve={30}>
          <span className="slot-tag">Wild range · GBIF</span>
          <span className="slot-tag">
            <RotateIcon /> Drag to spin
          </span>
        </StageSlot>
        <div className="col-text">
          <Reveal split="fade">
            <ChapterLabel n={n}>Where they live</ChapterLabel>
          </Reveal>
          <Reveal as="h2" id="range-title" className="display h2" split="lines">
            {headline}
          </Reveal>
          <Reveal as="p" className="lede" split="fade" delay={0.15}>
            {summary}
          </Reveal>
          <Reveal className="range__lists" split="fade" delay={0.25}>
            <div>
              <p className="label">Strongholds</p>
              <ul>
                {regions.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            {countries.length > 0 && (
              <div>
                <p className="label">Range states · {countries.length}</p>
                <ul>
                  {countries.slice(0, MAX_LIST).map((c) => (
                    <li key={c}>{countryName(c)}</li>
                  ))}
                  {countries.length > MAX_LIST && <li className="range__more label">+ {countries.length - MAX_LIST} more</li>}
                </ul>
              </div>
            )}
          </Reveal>
          <p className="label caption num">
            {fmtLat(centroid.lat)} {fmtLon(centroid.lon)} · {source ? SOURCE_TEXT[source] : 'Loading range from GBIF'}
          </p>
        </div>
      </div>
    </section>
  );
}
