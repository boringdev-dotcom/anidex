---
name: generate-specimen
description: Generate, regenerate or fix the 3D specimen model for an AniDex species using fal.ai (Nano Banana Pro reference image, then Hunyuan 3D v3.1 Pro image-to-3D), wire it into the species JSON, and check it visually as stipple. Use when the user asks to create, redo, improve or fix an animal's 3D model or specimen, add a model for a new species, or when a specimen looks wrong (sideways, blobby, cropped, missing markings).
---

# Generate a species specimen

Each species page shows its animal as a stipple point cloud sampled from a textured GLB. Models live in the Cloudflare R2 bucket `anidex-models`, served from `https://models.anidex.fyi/models/<slug>-<hash>.glb`; data refers to them by path (`/models/<slug>-<hash>.glb`) and the client prefixes the domain. The name includes a content hash, so a regenerated model gets a new URL and old ones can be cached forever. The texture's brightness sets each point's size, so markings (stripes, patches, wing veins) show through. This skill produces that GLB and checks it.

Pipeline (stages in `server/specimens.ts`, shared by `scripts/generate-models.ts` and the on-demand worker in `server/models.ts`; run locally with `npm run models`):
1. **Reference image.** Nano Banana Pro draws one full-body photo on white. The prompt is built from the body plan's pose plus a per-species detail line.
2. **3D model.** Hunyuan 3D v3.1 Pro (`fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`) turns it into a textured GLB, about 22 MB raw.
3. **Optimize and store.** glTF-Transform welds, simplifies, converts textures to 1024px WebP and applies meshopt, giving roughly 0.35 to 0.8 MB. The result is uploaded to R2 as `models/<slug>-<hash>.glb` (a copy stays in `scripts/.cache/<slug>/model.glb`).
4. **Wire.** The script points the species JSON at the stored path, keeping any hand-tuned `yaw` (new models get `yaw: 1.5708`).

**Open-data species** (the ~200 in the database, `tier = 'auto'`) are not JSON files. `npm run models -- --auto --top 200 --concurrency 6` generates the most popular ones without a model and writes `species.model = { url, orient: 'auto' }` straight to the database in `DATABASE_URL` (production). `--only a,b` picks specific slugs. `orient: auto` makes the client turn the model side-on by its longest axis, because generated models face different ways. Body plans that are low and flat get a default camera tilt (`PLAN_TILT` in `src/three/SceneDirector.tsx`). Visitors also trigger generation on first visit to a species without a model (`POST /api/species/:slug/specimen`, capped by `MODEL_DAILY_CAP`, default 30 a day).

**Subspecies.** A species can list `variants` in its JSON, like the tiger's nine subspecies. Each variant becomes its own task with key `<species>--<variant>` (e.g. `tiger--amur`). It stores `models/tiger--amur-<hash>.glb` and wires the model into that variant's `specimen.model` inside the parent JSON. `--only tiger` selects the species and all its variants; `--only tiger--amur` selects one. Variant prompts use `variants[].specimen.promptDetail`. Extinct variants (`alive: false`) get a "careful reconstruction" line in the prompt. A variant that already points at a model (e.g. Bengal reusing the `bengal-tiger` model) is skipped.

Every stage is cached in `scripts/.cache/<slug>/` (`reference.png`, `raw.glb`, `thumbnail.png`), so reruns only pay for missing steps.

## Before you start

- **Keys:** the script reads `FAL_KEY` and `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` from the environment or `src/backend/.env`. Check they exist without printing values, e.g. `grep -oE '^(FAL_KEY|R2_[A-Z_]+)=' src/backend/.env`. Never echo, log or commit them.
- **Species file:** `src/data/species/<slug>.json` must exist. For a brand-new species, add a detail line, either in the `DETAIL` map in the script or as `specimen.promptDetail` in its JSON. Describe colours and markings plus any defining feature (tusks, gills, ringed tail).
- **Cost:** about $0.15 per reference image and $0.38 per Hunyuan Pro model. Tell the user the estimate before generating more than two or three species, or before regenerating ones that already look fine.
- **Dev server:** the preview step needs `npm run dev` running on port 5173 (the `anidex` launch config). Use `--url` if it is elsewhere.

## Steps

### 1. Generate and review the reference image first

Images are cheap; models are not. Always look before spending on 3D.

```bash
npm run models -- --only <slug> --image-only
```

Read `scripts/.cache/<slug>/reference.png` (make a small copy first if it is large). It must have:
- exactly one animal, with the whole body in frame: no cropped feet, tail, ears, wings or flukes
- a plain white background and no props, ground or text
- a natural, readable pose; a three-quarter view works best for most animals
- clear natural markings, because they become the halftone pattern

If anything is off, adjust the prompt and regenerate. Use `specimen.promptDetail` in the JSON for the species, or the `POSE` map for a whole body plan. Then run:

```bash
npm run models -- --only <slug> --image-only --force image
```

### 2. Generate the model

```bash
npm run models -- --only <slug>
```

This takes 2 to 4 minutes. Several slugs can run in parallel with `--only a,b,c`. If only the 3D result is bad and the image was good, rerun just that stage with `--force model`. To re-run only the web optimization, use `--force optimize`.

Check `scripts/.cache/<slug>/thumbnail.png` for broken geometry: fused or missing legs, melted heads, holes. If it is broken, regenerate with `--force model` once. If it is still broken, improve the reference image instead.

### 3. Preview it as stipple

```bash
node .claude/skills/generate-specimen/scripts/preview.mjs <slug>
```

For a variant, the preview shows the species page's main specimen. Check variants in the species' Subspecies chapter in the browser instead, where scrolling or hovering each row morphs the specimen.

This renders the specimen at four angles in dark (top row) and light (bottom row) themes, writes `scripts/.cache/<slug>/preview.png`, and prints any console errors. Read the image and check:
- **Upright.** Feet on the plinth ring, not on its side or upside down. Hunyuan outputs are Y-up, so this is rare.
- **Recognisable silhouette** in at least two of the four angles.
- **Reads in both themes.** Each specimen is auto-exposed around its own median fur tone, so the body should look solid on black and on cream, with markings as darker or lighter dots on top. If one theme still looks weak or blown out, set `specimen.tone` in the JSON, e.g. `{ "light": 0.12 }` or `{ "dark": -0.1 }`. Use roughly -0.3 to 0.3; positive means more ink. Current tweaks: gorilla light 0.14, blue whale dark 0.16, elephant light 0.08. Variants inherit their species' value.
- **Flat animals.** Butterflies, whales, rays and lizards seen edge-on look like slivers. Set `specimen.tilt` in radians to view them from above. Current values are monarch 0.85, axolotl 0.5 and blue whale 0.38; the default is 0.08.
- **`yaw`** only sets the starting heading, because specimens spin. `π/2` (1.5708) suits most Hunyuan outputs.

Tune the JSON, then rerun the preview. No regeneration is needed for `tilt` or `yaw` changes.

### 4. Verify and commit

```bash
npx tsc -b
npm run build
```

Commit the species JSON (the model itself is already in R2). Never commit `.env` files or `scripts/.cache/`; both are in `.gitignore`. Mention the fal cost in the summary to the user.

## Troubleshooting

- **"FAL_KEY not found":** the user needs to add it to one of the env files above. Do not ask them to paste it into chat.
- **Preview says "redirected to /":** the slug has no JSON in `src/data/species/`.
- **Preview shows the old procedural body:** the GLB failed to load. Look for an `[anidex] model for <slug> failed` line in the preview's problems output. Check that `specimen.model.url` starts with `/models/` and that the file loads from `https://models.anidex.fyi` (a 404 means the upload didn't happen; a CORS error means the page's origin is missing from the bucket's CORS policy).
- **Points look like noise with no markings:** the texture probably has very little contrast, for example an all-white animal. That is expected; the silhouette still carries it.
- **Model file over about 0.8 MB:** lower `face_count` in `generateModel`, or the `simplify` ratio in `optimizeGlb` (both in `server/specimens.ts`), then rerun with `--force model` or `--force optimize` respectively.
