/**
 * Range data from GBIF (https://www.gbif.org), fetched live in the browser. No key needed.
 *
 * Primary: two z0 EPSG:4326 density tiles, hex-binned (unbinned tiles at z0 are empty),
 *          stitched into one 2048x1024 equirectangular image. GBIF sends
 *          Access-Control-Allow-Origin: *, so the canvas stays untainted for WebGL.
 * Fallback 1: up to 300 georeferenced occurrence records drawn as soft discs.
 * Fallback 2: an ellipse over the curated bbox.
 */

export type RangeSource = 'gbif-density' | 'gbif-occurrences' | 'curated-bbox';

export interface RangeResult {
  canvas: HTMLCanvasElement;
  source: RangeSource;
}

const W = 2048;
const H = 1024;
const cache = new Map<number, Promise<RangeResult>>();

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

function loadImage(url: string, timeoutMs = 9000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error('tile failed'));
    };
    img.src = url;
  });
}

function hasContent(canvas: HTMLCanvasElement): boolean {
  const probe = document.createElement('canvas');
  probe.width = 256;
  probe.height = 128;
  const ctx = probe.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, 256, 128);
  const data = ctx.getImageData(0, 0, 256, 128).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 20) return true;
  return false;
}

async function fromTiles(taxonKey: number): Promise<HTMLCanvasElement> {
  const base = 'https://api.gbif.org/v2/map/occurrence/density/0';
  const q = `srs=EPSG%3A4326&taxonKey=${taxonKey}&bin=hex&hexPerTile=64&style=classic.poly`;
  const [a, b] = await Promise.all([loadImage(`${base}/0/0@2x.png?${q}`), loadImage(`${base}/1/0@2x.png?${q}`)]);
  const c = makeCanvas();
  const ctx = c.getContext('2d')!;
  ctx.drawImage(a, 0, 0, W / 2, H);
  ctx.drawImage(b, W / 2, 0, W / 2, H);
  if (!hasContent(c)) throw new Error('empty tiles');
  return c;
}

const toX = (lon: number) => ((lon + 180) / 360) * W;
const toY = (lat: number) => ((90 - lat) / 180) * H;

async function fromOccurrences(taxonKey: number): Promise<HTMLCanvasElement> {
  const res = await fetch(`https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&hasCoordinate=true&hasGeospatialIssue=false&occurrenceStatus=PRESENT&limit=300`);
  if (!res.ok) throw new Error(`occurrence search ${res.status}`);
  const json = (await res.json()) as { results: { decimalLatitude?: number; decimalLongitude?: number }[] };
  const pts = json.results.filter((r) => r.decimalLatitude != null && r.decimalLongitude != null);
  if (!pts.length) throw new Error('no occurrences');
  const c = makeCanvas();
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(toX(p.decimalLongitude!), toY(p.decimalLatitude!), 10, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function fromBbox(bbox: [number, number, number, number]): HTMLCanvasElement {
  const [w, s, e, n] = bbox;
  const c = makeCanvas();
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(toX((w + e) / 2), toY((s + n) / 2), ((e - w) / 360) * W * 0.42, ((n - s) / 180) * H * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function loadRange(taxonKey: number, bbox: [number, number, number, number]): Promise<RangeResult> {
  let p = cache.get(taxonKey);
  if (!p) {
    p = fromTiles(taxonKey)
      .then((canvas) => ({ canvas, source: 'gbif-density' as const }))
      .catch(() => fromOccurrences(taxonKey).then((canvas) => ({ canvas, source: 'gbif-occurrences' as const })))
      .catch(() => ({ canvas: fromBbox(bbox), source: 'curated-bbox' as const }));
    cache.set(taxonKey, p);
  }
  return p;
}
