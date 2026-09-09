# Rebuilding the professional environment assets

Run these commands from the repository root. They use the delivered editable Blender files in `tools/celta/blend`, the original CC0 maps in this directory, and the delivered navigation metadata in `public/celta/models/worlds.json`. No file from `.dream-loop` is an input.

Requirements: Blender 5.2, Python 3, Node.js and npm. The runtime tool invokes the pinned `@gltf-transform/cli@4.2.1` package using `npx`.

```sh
blender -b --python tools/celta/professional_environments.py -- congo --source-dir tools/celta/blend --output-dir build/celta-models --no-render
python3 tools/celta/professional_environment_runtime.py congo --output-dir build/celta-models --base-worlds public/celta/models/worlds.json
```

On macOS, `blender` may be replaced with `/Applications/Blender.app/Contents/MacOS/Blender`. Remove `--no-render` to produce CPU renders of the exported/reimported GLB using the arrival camera, including roof and bark crops. Use `congo amazonia ireland` instead of `congo` in both commands to regenerate all chapters from their delivered sources. Output goes to a separate directory for review and is never copied into `public` automatically.

The final source already contains its authored soil, roof fibres, bark plates, wood mapping, source images and idempotence markers. Regeneration preserves that geometry and the final UV coordinates. It does not require an earlier round's source or the one-time `--roof-bark-only` transition mode. That mode requires an explicit `--foundation-blend` and a separate output directory; it is for authoring a fresh structural replacement, not the rebuild recipe above.

The compression step keeps diffuse maps at up to 2K, normal and roughness maps at 1K, converts to WebP at quality 86, removes unused UV channels and applies meshopt compression with 16-bit positions. It raycasts all 100,497 Congo fine contact samples against the resulting quantized floor, bank, roots, stones, leaves and floorboards. Preserve and review the generated `worlds.json` alongside the GLB.

Round 15 verification regenerated the final source through the regular command without transition inputs. The resulting raw GLB was byte-identical: SHA-256 `7f05d14e4d8342a13f05e0318ba2f4836dc542763106a75f626a7da6e0ba9425`. All 23 mesh geometries and all 13 professional surfaces' UVs stayed unchanged on regeneration. The closed compressed Congo asset contains 605,945 triangles in 23 batches and is 12,357,584 bytes; its SHA-256 is `28f9ec1646a9c042dfbd21c820202af41647b19a3be36e1b6a7022e8eebf4663`. All navigation fields and all 100,497 fine contact values match round 14 exactly. These are asset checks; device frame rate and the visual gate require testing in the game.

Original maps, authors, source URLs and SHA-256 hashes are listed in `provenance.json`. Their pixels and physical material factors were unchanged by the roof/bark correction. See `LICENSE-REFERENCE.txt` for the Poly Haven CC0 license reference.
