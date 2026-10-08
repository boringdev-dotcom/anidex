import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Species } from '../../data/types';
import { useStore } from '../../store/useStore';
import { COUNTRY_CENTROIDS } from '../../data/countryCentroids';
import { countryName, fmt } from '../../lib/format';

/** Half-width of the box searched around a tapped spot, in degrees (about 220 km tall). */
const BOX = 2;

interface Look {
  count: number;
  countries: string[];
}
const cache = new Map<string, Promise<Look>>();

/** Wild observations of a species around a point since 2000 (GBIF), with the countries they came from. */
function lookup(taxonKey: number, lat: number, lon: number): Promise<Look> {
  const key = `${taxonKey}|${lat.toFixed(1)}|${lon.toFixed(1)}`;
  let p = cache.get(key);
  if (!p) {
    const dLon = Math.min(BOX / Math.max(0.2, Math.cos((lat * Math.PI) / 180)), 30);
    const q = new URLSearchParams({
      taxonKey: String(taxonKey),
      limit: '0',
      hasCoordinate: 'true',
      hasGeospatialIssue: 'false',
      occurrenceStatus: 'PRESENT',
      year: `2000,${new Date().getFullYear()}`,
      decimalLatitude: `${Math.max(-90, lat - BOX)},${Math.min(90, lat + BOX)}`,
      decimalLongitude: `${Math.max(-180, lon - dLon)},${Math.min(180, lon + dLon)}`,
      facet: 'country',
      facetLimit: '3',
    });
    for (const b of ['HUMAN_OBSERVATION', 'MACHINE_OBSERVATION', 'OBSERVATION']) q.append('basisOfRecord', b);
    p = fetch(`https://api.gbif.org/v1/occurrence/search?${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: { count: number; facets?: { counts: { name: string }[] }[] }) => ({
        count: b.count,
        countries: (b.facets?.[0]?.counts ?? []).map((c) => c.name),
      }));
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

const toRad = (d: number) => (d * Math.PI) / 180;
/** great-circle distance in degrees */
function arc(aLat: number, aLon: number, bLat: number, bLon: number) {
  const s = Math.sin(toRad(aLat)) * Math.sin(toRad(bLat)) + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(aLon - bLon));
  return (Math.acos(Math.min(1, Math.max(-1, s))) * 180) / Math.PI;
}

/** Closest country centre, if one is reasonably near (for spots with no records to name them). */
function nearestCountry(lat: number, lon: number): string | null {
  let best: string | null = null;
  let bestD = 9;
  for (const [code, [cLat, cLon]] of Object.entries(COUNTRY_CENTROIDS)) {
    const d = arc(lat, lon, cLat, cLon);
    if (d < bestD) {
      bestD = d;
      best = code;
    }
  }
  return best;
}

const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? pos : neg}`;

/**
 * Tap the globe: a small card at that spot with where it is, how many wild sightings of this species
 * GBIF holds around it, and the story of a circled area if the tap landed in one.
 */
export function GlobeTapCard({ sp }: { sp: Species }) {
  const tap = useStore((s) => s.globeTap);
  const [look, setLook] = useState<Look | null | 'error'>(null);
  const ref = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);

  // a new species closes it
  useEffect(() => () => useStore.setState({ globeTap: null }), [sp.slug]);

  useEffect(() => {
    if (!tap) return;
    setLook(null);
    openedAt.current = window.scrollY;
    let live = true;
    lookup(sp.gbifTaxonKey, tap.lat, tap.lon).then(
      (l) => live && setLook(l),
      () => live && setLook('error'),
    );
    return () => {
      live = false;
    };
  }, [tap, sp.gbifTaxonKey]);

  // close on scroll away, or on a press anywhere outside the card (a new globe tap reopens it)
  useEffect(() => {
    if (!tap) return;
    const close = () => useStore.setState({ globeTap: null });
    const onScroll = () => Math.abs(window.scrollY - openedAt.current) > 160 && close();
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [tap]);

  if (!tap) return null;

  const region = (sp.rangeHistory?.regions ?? []).find((r) => arc(tap.lat, tap.lon, r.lat, r.lon) <= Math.max(r.radius, 2.2) + 0.8);
  const regionState = region ? (region.from != null && region.to != null && region.from > region.to ? 'Came back' : region.to != null ? 'Lost' : region.from != null ? 'Came back' : 'Still home') : null;
  const ready = look && look !== 'error';
  const places = ready && look.countries.length ? look.countries.map(countryName) : null;
  const fallback = nearestCountry(tap.lat, tap.lon);
  const place = places ? places.slice(0, 2).join(' and ') : fallback ? `Near ${countryName(fallback)}` : 'Open water';

  // desktop: beside the tap, inside the screen. phones: a panel along the bottom, so the globe and its
  // marker stay in view. Rendered at the top of the document, above the 3D canvas.
  const phone = window.innerWidth <= 768;
  const w = Math.min(300, window.innerWidth - 32);
  const style = phone
    ? undefined
    : {
        left: Math.min(window.innerWidth - w - 16, Math.max(16, tap.x + 18)),
        top: Math.min(window.innerHeight - 220, Math.max(80, tap.y - 30)),
        width: w,
      };

  return createPortal(
    <div ref={ref} className={`tapcard${phone ? ' tapcard--sheet' : ''}`} style={style} role="dialog" aria-label={`What's at ${place}`}>
      <div className="tapcard__head">
        <span className="label num">
          {coord(tap.lat, 'N', 'S')} · {coord(tap.lon, 'E', 'W')}
        </span>
        <button className="tapcard__close" aria-label="Close" onClick={() => useStore.setState({ globeTap: null })}>
          ×
        </button>
      </div>
      <p className="tapcard__place">{look ? place : 'Looking…'}</p>
      {look === 'error' ? (
        <p className="tapcard__count">Couldn’t reach the sightings records just now.</p>
      ) : ready ? (
        <>
          <p className="tapcard__count">
            {look.count > 0 ? (
              <>
                <span className="num">{fmt(look.count)}</span> wild sighting{look.count === 1 ? '' : 's'} recorded within about 220 km since 2000
              </>
            ) : (
              <>No wild sightings recorded within about 220 km since 2000.</>
            )}
          </p>
          {look.count > 0 && <p className="label tapcard__hint">Sightings, not a head count: one animal can be recorded many times.</p>}
        </>
      ) : null}
      {region && (
        <div className="tapcard__region">
          <p className="label">
            {regionState} · {region.name}
          </p>
          <p className="tapcard__note">{region.note}</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
