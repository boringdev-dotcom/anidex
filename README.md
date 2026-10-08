# AniDex

A field guide to the animals we might lose. Search a species and scroll through its story:

1. **Specimen.** A 3D stipple study of the animal.
2. **Where they live.** A dotted globe with the wild range from live GBIF data.
3. **Population over time.** A draggable timeline. As you scrub, the globe shows where the species was lost and where it came back, with a caption for each event.
4. **Vulnerability.** The IUCN Red List category, trend and main threats.
5. **Where and when to see them.** Places on the globe and the best months of the year.
6. **How you can help.** Concrete actions and organisations to support.
7. **Next specimen.** The point cloud morphs into the next animal.

Light and dark themes follow the OS setting until you pick one.

## Run it

```bash
npm install
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run gbif:check` | Check every species' GBIF key against the GBIF backbone |

`dist/` is a static single-page app. Any host works if unknown paths fall back to `index.html`, so `/species/<slug>` deep links load.

## Stack

Vite, React 19, TypeScript, React Three Fiber on three.js, GSAP with ScrollTrigger and SplitText, Lenis, zustand, d3-shape. Styling is plain CSS with custom properties.

## How it fits together

- **One canvas.** `src/three/SceneRoot.tsx` mounts a single fixed WebGL canvas behind the page. It never unmounts, so morphs carry across route changes.
- **Scroll drives the scene.** Each chapter is a tall section with a sticky stage. `src/scroll/useChapterTracking.ts` turns scroll into a continuous chapter position. `src/three/SceneDirector.tsx` blends a pose per chapter for the specimen and the globe.
- **One point cloud.** `src/three/stipple/` holds a single `Points` object. Its shader handles the morph between shapes and the collapse into a dot on the globe.
- **Theme tokens.** `src/styles/tokens.css` is the only place colours live. `src/three/ThemeBridge.tsx` reads the same tokens and fades the WebGL colours to match.
- **Range history.** Each species has curated `rangeHistory` regions with the year they were lost (`to`) or regained (`from`). `src/data/rangeState.ts` turns a year into present, lost or not yet. If `from` is later than `to`, the area was lost and later returned.
- **Range layer.** `src/lib/gbif.ts` stitches two GBIF density tiles into a world texture. It falls back to raw occurrence records, then to the curated bounding box. The globe masks records outside the curated wild range, which hides zoo animals.

## Add a species

1. Create `src/data/species/<slug>.json` matching the `Species` type in `src/data/types.ts`. `bengal-tiger.json` is a good template.
2. Set `gbifTaxonKey` from `https://api.gbif.org/v1/species/match?name=<scientific name>`, then run `npm run gbif:check`.
3. Point another species' `next` at the new slug so it joins the chain.

The index and search pick it up automatically.

## 3D specimens

Each species has a textured GLB in `public/models/`, generated with fal.ai and sampled into the stipple point cloud. The texture sets each point's size and strength like a halftone, so stripes, patches and wing veins show through.

To regenerate or add one:

```bash
npm run models -- --only <slug>
```

The script reads `FAL_KEY` from the environment or a `.env` file. It draws a reference image with Nano Banana Pro, turns it into a model with Hunyuan 3D v3.1 Pro, then shrinks it with glTF-Transform. Every step is cached in `scripts/.cache/`, so a rerun only pays for missing steps. Pass `--force image` to start over, or `--image-only` to review references first.

Then add `"model": { "url": "/models/<slug>.glb", "yaw": 1.5708 }` to the species' `specimen` block. Use `yaw` to turn the model and `specimen.tilt` to view flat animals from above. If a model fails to load, the procedural body plan in `src/three/specimen/bodyPlans.ts` is used instead.

## Data sources

- **Ranges:** [GBIF](https://www.gbif.org) occurrence density maps, fetched live.
- **Status:** the [IUCN Red List](https://www.iucnredlist.org). Each species links to its assessment.
- **Populations:** sourced per species. The source and any caveats appear under each chart.
- **Range history:** curated per species from the IUCN Red List, specialist group reports and peer-reviewed papers. Circles are approximate areas, not exact boundaries.
- **Land outlines:** [Natural Earth](https://www.naturalearthdata.com), public domain.

Population series mix methods across decades. Each species notes where early figures are back-estimates or not directly comparable.

## License

Apache 2.0. See `LICENSE`.
