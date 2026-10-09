import { useEffect, useState, type ReactNode } from 'react';
import { listSpecies, prefetchSpecies, relatedSpecies, STATUS_LABEL } from '../../data';
import type { SpeciesSummary } from '../../data/api';
import type { Species } from '../../data/types';
import { useStore } from '../../store/useStore';
import { Reveal } from '../ui/Reveal';
import { useTransitionNavigate } from '../ui/useTransitionNavigate';

interface Row {
  k: string;
  v: ReactNode;
  sub?: string;
}

/** Desktop only: a small museum-style label under the specimen, with things the rest of the page doesn't say. */
function SideNote({ title, rows, children }: { title: string; rows: Row[]; children?: ReactNode }) {
  if (!rows.length) return null;
  return (
    <Reveal as="aside" className="side-note" split="fade" delay={0.3}>
      <p className="label side-note__title">{title}</p>
      {children}
      <dl className="side-note__rows">
        {rows.map((r) => (
          <div key={r.k}>
            <dt className="label">{r.k}</dt>
            <dd>
              {r.v}
              {r.sub && <span className="side-note__sub">{r.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

const THREATENED = 'VU,EN,CR';

/** Other species as links; hovering one brings its specimen forward in place of this one. */
function SpeciesLinks({ items }: { items: SpeciesSummary[] }) {
  const go = useTransitionNavigate();
  return (
    <ul className="side-note__links">
      {items.map((s) => (
        <li key={s.slug}>
          <a
            href={`/species/${s.slug}`}
            className="link"
            onMouseEnter={() => {
              useStore.setState({ previewShape: s.slug });
              prefetchSpecies(s.slug);
            }}
            onMouseLeave={() => useStore.setState({ previewShape: null })}
            onClick={(e) => {
              e.preventDefault();
              useStore.setState({ previewShape: null });
              go(`/species/${s.slug}`, s.slug);
            }}
          >
            {s.commonName}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** About chapter: other names, the rest of the classification, and its closest relatives here. */
export function AboutNote({ sp }: { sp: Species }) {
  const [relatives, setRelatives] = useState<SpeciesSummary[]>([]);
  useEffect(() => {
    let live = true;
    // the endpoint falls back to anything in the same class; only same family or order counts as a relative here
    const { family, order } = sp.taxonomy;
    relatedSpecies(sp.slug, 8)
      .then((r) => live && setRelatives(r.filter((s) => (family && s.family === family) || (order && s.order === order)).slice(0, 4)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [sp.slug, sp.taxonomy]);

  const common = sp.commonName.toLowerCase();
  const aliases = sp.aliases.filter((a) => a.toLowerCase() !== common && !common.includes(a.toLowerCase())).slice(0, 3);
  const rows = ([
    aliases.length ? { k: 'Also called', v: aliases.join(', ') } : null,
    sp.taxonomy.order ? { k: 'Order', v: sp.taxonomy.order } : null,
    { k: 'Genus', v: <i>{sp.scientificName.split(' ')[0]}</i> },
    relatives.length ? { k: 'Relatives', v: <SpeciesLinks items={relatives} /> } : null,
  ] as (Row | null)[]).filter((r): r is Row => !!r);
  return <SideNote title="Specimen label" rows={rows} />;
}

interface StatusContext {
  same: number;
  family: { threatened: number; total: number };
  peers: SpeciesSummary[];
}

/** Status chapter: where this category sits among the other species on AniDex. */
export function StatusNote({ sp }: { sp: Species }) {
  const [ctx, setCtx] = useState<StatusContext | null>(null);
  const { iucn } = sp.status;
  useEffect(() => {
    let live = true;
    const { class: cls, family } = sp.taxonomy;
    Promise.all([
      listSpecies({ status: iucn, pageSize: 6, class: cls }),
      listSpecies({ status: iucn, pageSize: 6 }),
      listSpecies({ family, pageSize: 1 }),
      listSpecies({ family, status: THREATENED, pageSize: 1 }),
    ])
      .then(([sameClass, same, fam, famThreat]) => {
        if (!live) return;
        // peers from the same class first, then any other species with this status
        const peers = [...sameClass.items, ...same.items].filter((s, i, a) => s.slug !== sp.slug && a.findIndex((o) => o.slug === s.slug) === i).slice(0, 3);
        setCtx({ same: same.total, family: { threatened: famThreat.total, total: fam.total }, peers });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [sp.slug, iucn, sp.taxonomy]);

  if (!ctx) return null;
  const label = STATUS_LABEL[iucn] ?? iucn;
  const others = ctx.same - 1;
  const rows: Row[] = [];
  if (others > 0) rows.push({ k: 'Same category', v: `${others.toLocaleString('en-US')} other ${others === 1 ? 'species' : 'species'}`, sub: `rated ${label.toLowerCase()} on AniDex` });
  if (ctx.family.total > 1) rows.push({ k: 'Its family', v: `${ctx.family.threatened} of ${ctx.family.total} threatened`, sub: `${sp.taxonomy.family} on AniDex` });
  if (ctx.peers.length) rows.push({ k: `Also ${iucn}`, v: <SpeciesLinks items={ctx.peers} /> });
  return <SideNote title="In context" rows={rows} />;
}
