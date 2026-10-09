/**
 * How closely two species are related: the classification ranks they share, where their lines
 * part, and (for deep splits only) roughly when. Split times are rounded molecular-clock estimates
 * (TimeTree); within an order they vary too much from case to case to state, so none is given.
 */
import type { Species } from '../data/types';

export type Rank = 'Kingdom' | 'Phylum' | 'Class' | 'Order' | 'Family' | 'Genus' | 'Species';

const PHYLUM: Record<string, string> = {
  Mammalia: 'Chordata', Aves: 'Chordata', Reptilia: 'Chordata', Amphibia: 'Chordata',
  Actinopterygii: 'Chordata', Sarcopterygii: 'Chordata', Elasmobranchii: 'Chordata', Chondrichthyes: 'Chordata', Holocephali: 'Chordata',
  Insecta: 'Arthropoda', Malacostraca: 'Arthropoda', Arachnida: 'Arthropoda', Branchiopoda: 'Arthropoda', Merostomata: 'Arthropoda', Chilopoda: 'Arthropoda', Diplopoda: 'Arthropoda',
  Cephalopoda: 'Mollusca', Gastropoda: 'Mollusca', Bivalvia: 'Mollusca',
  Anthozoa: 'Cnidaria', Scyphozoa: 'Cnidaria', Hydrozoa: 'Cnidaria',
  Asteroidea: 'Echinodermata', Echinoidea: 'Echinodermata', Holothuroidea: 'Echinodermata',
  Clitellata: 'Annelida', Polychaeta: 'Annelida',
};

const CLASS_COMMON: Record<string, string> = {
  Mammalia: 'mammals', Aves: 'birds', Reptilia: 'reptiles', Amphibia: 'amphibians', Actinopterygii: 'ray-finned fish',
  Elasmobranchii: 'sharks and rays', Chondrichthyes: 'cartilaginous fish', Insecta: 'insects', Malacostraca: 'crustaceans',
  Arachnida: 'arachnids', Cephalopoda: 'cephalopods', Gastropoda: 'snails and slugs', Bivalvia: 'bivalves', Anthozoa: 'corals and anemones',
};

const PHYLUM_COMMON: Record<string, string> = {
  Chordata: 'chordates', Arthropoda: 'arthropods', Mollusca: 'molluscs', Cnidaria: 'cnidarians', Echinodermata: 'echinoderms', Annelida: 'segmented worms',
};

/** A branch point. `mya` is when its lineages split, in millions of years; `over` marks a minimum. */
interface Clade {
  name: string;
  mya?: number;
  over?: boolean;
}

const C = (name: string, mya?: number, over = false): Clade => ({ name, mya, over });
const ANIMALIA = C('Animalia');
const BILATERIA = C('Bilateria', 550, true);
const GNATHOSTOMATA = [ANIMALIA, BILATERIA, C('Chordata'), C('Vertebrata'), C('Gnathostomata', 465)];
const OSTEICHTHYES = [...GNATHOSTOMATA, C('Osteichthyes', 435)];
const SARCOPTERYGII = [...OSTEICHTHYES, C('Sarcopterygii', 410)];
const AMNIOTA = [...SARCOPTERYGII, C('Tetrapoda', 352), C('Amniota', 319)];
const SAUROPSIDA = [...AMNIOTA, C('Sauropsida', 280)];
const ARCHOSAURIA = [...SAUROPSIDA, C('Archelosauria', 255), C('Archosauria', 245)];
const PLACENTALIA = [...AMNIOTA, C('Mammalia', 180), C('Theria', 160), C('Placentalia', 99)];
const BOREOEUTHERIA = [...PLACENTALIA, C('Boreoeutheria', 94)];

const MAMMAL_GROUP: Record<string, Clade[]> = {
  Monotremata: [...AMNIOTA, C('Mammalia', 180), C('Monotremata')],
  ...Object.fromEntries(
    ['Didelphimorphia', 'Paucituberculata', 'Microbiotheria', 'Dasyuromorphia', 'Peramelemorphia', 'Notoryctemorphia', 'Diprotodontia'].map((o) => [
      o,
      [...AMNIOTA, C('Mammalia', 180), C('Theria', 160), C('Marsupialia')],
    ]),
  ),
  ...Object.fromEntries(['Proboscidea', 'Sirenia', 'Hyracoidea', 'Afrosoricida', 'Macroscelidea', 'Tubulidentata'].map((o) => [o, [...PLACENTALIA, C('Afrotheria')]])),
  ...Object.fromEntries(['Pilosa', 'Cingulata'].map((o) => [o, [...PLACENTALIA, C('Xenarthra')]])),
  ...Object.fromEntries(['Primates', 'Rodentia', 'Lagomorpha', 'Scandentia', 'Dermoptera'].map((o) => [o, [...BOREOEUTHERIA, C('Euarchontoglires', 87)]])),
  ...Object.fromEntries(
    ['Carnivora', 'Pholidota', 'Perissodactyla', 'Artiodactyla', 'Cetartiodactyla', 'Cetacea', 'Chiroptera', 'Eulipotyphla'].map((o) => [
      o,
      [...BOREOEUTHERIA, C('Laurasiatheria', 80)],
    ]),
  ),
};

const REPTILE_GROUP: Record<string, Clade[]> = {
  Crocodylia: [...ARCHOSAURIA, C('Crocodylia')],
  Testudines: [...SAUROPSIDA, C('Archelosauria', 255), C('Testudines')],
};

/** Branch points from the root of the animal tree down to a species' class (or mammal group). */
function lineage(cls: string, order: string): Clade[] {
  switch (cls) {
    case 'Mammalia':
      return MAMMAL_GROUP[order] ?? [...AMNIOTA, C('Mammalia', 180)];
    case 'Aves':
      return [...ARCHOSAURIA, C('Aves')];
    case 'Reptilia':
      return REPTILE_GROUP[order] ?? [...SAUROPSIDA, C('Lepidosauria')];
    case 'Amphibia':
      return [...SARCOPTERYGII, C('Tetrapoda', 352), C('Amphibia')];
    case 'Sarcopterygii':
      return [...SARCOPTERYGII, C('Sarcopterygii (fish)')];
    case 'Actinopterygii':
      return [...OSTEICHTHYES, C('Actinopterygii')];
    case 'Elasmobranchii':
    case 'Chondrichthyes':
    case 'Holocephali':
      return [...GNATHOSTOMATA, C('Chondrichthyes')];
  }
  const phylum = PHYLUM[cls];
  if (phylum === 'Arthropoda' || phylum === 'Mollusca' || phylum === 'Annelida') return [ANIMALIA, BILATERIA, C('Protostomia'), C(phylum), C(cls)];
  if (phylum === 'Echinodermata') return [ANIMALIA, BILATERIA, C('Deuterostomia'), C(phylum), C(cls)];
  return [ANIMALIA, C(phylum ?? '?'), C(cls)];
}

export interface KinRow {
  rank: Rank;
  a: string;
  b: string;
  shared: boolean;
}

export interface Kinship {
  rows: KinRow[];
  /** deepest rank both share */
  level: Rank;
  /** when their lines split, for splits at class level or deeper */
  split: { mya: number; over: boolean; clade: string } | null;
  sentence: string;
}

const genusOf = (sp: Species) => sp.scientificName.split(' ')[0];

export function kinship(a: Species, b: Species): Kinship {
  const pa = PHYLUM[a.taxonomy.class];
  const pb = PHYLUM[b.taxonomy.class];
  const all: [Rank, string, string][] = [
    ['Kingdom', 'Animalia', 'Animalia'],
    ['Phylum', pa ?? '', pb ?? ''],
    ['Class', a.taxonomy.class, b.taxonomy.class],
    ['Order', a.taxonomy.order, b.taxonomy.order],
    ['Family', a.taxonomy.family, b.taxonomy.family],
    ['Genus', genusOf(a), genusOf(b)],
    ['Species', a.scientificName, b.scientificName],
  ];
  // an unknown phylum is left out rather than guessed
  const ranks = all.filter(([r, x, y]) => r !== 'Phylum' || (x && y));
  let sharing = true;
  const rows: KinRow[] = ranks.map(([rank, x, y]) => {
    sharing = sharing && x === y;
    return { rank, a: x, b: y, shared: sharing };
  });
  const level = [...rows].reverse().find((r) => r.shared)?.rank ?? 'Kingdom';

  let split: Kinship['split'] = null;
  if (level === 'Kingdom' || level === 'Phylum' || level === 'Class') {
    const la = lineage(a.taxonomy.class, a.taxonomy.order);
    const lb = lineage(b.taxonomy.class, b.taxonomy.order);
    let common: Clade | null = null;
    for (let i = 0; i < Math.min(la.length, lb.length) && la[i].name === lb[i].name; i++) common = la[i];
    if (common?.mya) split = { mya: common.mya, over: common.over ?? false, clade: common.name };
  }

  const when = split ? `${split.over ? 'more than' : 'about'} ${split.mya} million years ago` : '';
  const row = (r: Rank) => rows.find((x) => x.rank === r)!;
  let sentence: string;
  switch (level) {
    case 'Species':
      sentence = 'The same species.';
      break;
    case 'Genus':
      sentence = `Close cousins: both belong to the genus ${row('Genus').a}.`;
      break;
    case 'Family':
      sentence = `Same family, ${row('Family').a}, but different genera.`;
      break;
    case 'Order':
      sentence = `Both are ${row('Order').a}, from different families.`;
      break;
    case 'Class': {
      const c = CLASS_COMMON[row('Class').a] ?? row('Class').a;
      sentence = split ? `Both are ${c}, but their lines split ${when}.` : `Both are ${c}, from different orders.`;
      break;
    }
    case 'Phylum': {
      const p = PHYLUM_COMMON[row('Phylum').a] ?? row('Phylum').a;
      sentence = split ? `Distant relatives: both are ${p}, and their last shared ancestor lived ${when}.` : `Distant relatives: both are ${p}, from different classes.`;
      break;
    }
    default:
      sentence = split ? `Barely related: both are animals, and their lines split ${when}.` : 'Barely related: both are animals, and that is where their family tree splits.';
  }
  return { rows, level, split, sentence };
}
