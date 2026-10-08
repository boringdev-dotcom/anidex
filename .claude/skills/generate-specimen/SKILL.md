---
name: generate-specimen
description: Generate, regenerate or fix the 3D specimen model for an AniDex species using fal.ai (Nano Banana Pro reference image, then Hunyuan 3D v3.1 Pro image-to-3D), wire it into the species JSON, and check it visually as stipple. Use when the user asks to create, redo, improve or fix an animal's 3D model or specimen, add a model for a new species, or when a specimen looks wrong (sideways, blobby, cropped, missing markings).
---

# Generate a species specimen

Each species page shows its animal as a stipple point cloud sampled from a textured GLB in `public/models/<slug>.glb`. The texture's brightness sets each point's size, so markings (stripes, patches, wing veins) show through. This skill produces that GLB and checks it.

Pipeline (all in `scripts/generate-models.ts`, run with `npm run models`):
1. **Reference image.** Nano Banana Pro draws one full-body photo on white. The prompt is built from the body plan's pose plus a per-species detail line.
2. **3D model.** Hunyuan 3D v3.1 Pro (`fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`) turns it into a textured GLB, about 22 MB raw.
3. **Optimize.** glTF-Transform welds, simplifies, converts textures to 1024px WebP and applies meshopt, giving roughly 0.35 to 0.55 MB.
4. **Wire.** If the species JSON has no `specimen.model`, the script adds `{ "url": "/models/<slug>.glb", "yaw": 1.5708 }`.

Every stage is cached in `scripts/.cache/<slug>/` (`reference.png`, `raw.glb`, `thumbnail.png`), so reruns only pay for missing steps.

## Before you start

- **Key:** the script reads `FAL_KEY` from the environment, `.env`, `.env.local` or `src/backend/.env`. Check it exists without printing it, e.g. `grep -c '^FAL_KEY=' src/backend/.env .env 2>/dev/null`. Never echo, log or commit the key.
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

This renders the specimen at four angles in dark (top row) and light (bottom row) themes, writes `scripts/.cache/<slug>/preview.png`, and prints any console errors. Read the image and check:
- **Upright.** Feet on the plinth ring, not on its side or upside down. Hunyuan outputs are Y-up, so this is rare.
- **Recognisable silhouette** in at least two of the four angles.
- **Markings visible.** Light theme shows dark markings as dense dark dots; dark theme shows pale areas as bright dots.
- **Flat animals.** Butterflies, whales, rays and lizards seen edge-on look like slivers. Set `specimen.tilt` in radians to view them from above. Current values are monarch 0.85, axolotl 0.5 and blue whale 0.38; the default is 0.08.
- **`yaw`** only sets the starting heading, because specimens spin. `π/2` (1.5708) suits most Hunyuan outputs.

Tune the JSON, then rerun the preview. No regeneration is needed for `tilt` or `yaw` changes.

### 4. Verify and commit

```bash
npx tsc -b
npm run build
```

Commit `public/models/<slug>.glb` and the species JSON. Never commit `.env` files or `scripts/.cache/`; both are in `.gitignore`. Mention the fal cost in the summary to the user.

## Troubleshooting

- **"FAL_KEY not found":** the user needs to add it to one of the env files above. Do not ask them to paste it into chat.
- **Preview says "redirected to /":** the slug has no JSON in `src/data/species/`.
- **Preview shows the old procedural body:** the GLB failed to load. Look for an `[anidex] model for <slug> failed` line in the preview's problems output. Check that the file exists and that `specimen.model.url` starts with `/models/`.
- **Points look like noise with no markings:** the texture probably has very little contrast, for example an all-white animal. That is expected; the silhouette still carries it.
- **Model file over about 0.8 MB:** lower `face_count` in `makeModel`, or the `simplify` ratio in `optimize`, then rerun with `--force model` or `--force optimize` respectively.
