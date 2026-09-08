# Art direction and provenance

The user approved a cinematic, atmospheric jungle-river reference generated with the built-in image-generation tool. The game draws actual Three.js geometry and does not use the concept screenshot as the game background. Working references, candidate screenshots and review notes live in the gitignored `.dream-loop/` directory.

## Built-in image generation prompts

### Reference

An in-engine main-menu screenshot for a Roger Casement narrative adventure in the Congo, 1903. Third-person khaki-clad explorer on an aged riverside jetty, moored wooden canoe on the right, dense natural jungle on the left, a small timber shelter, jade water, olive haze and warm morning sunlight. Editorial ivory title “El sueño del celta” and three chapter tabs. Cinematic physically plausible materials, clean composition, no grain, no fantasy elements, no cartoon or blocky toy figures. Landscape 1536×1024 target. Approved by the creator before implementation.

### Material atlas

An exact 3×2 grid of six equal seamless material tiles, with no labels, borders or cast shadows: weathered wooden planks; tropical tree bark; damp forest soil; khaki linen; a mature green tropical leaf; weathered gray limestone. Orthographic neutral diffuse material scans. Original generated texture converted to JPEG for delivery; tiles are extracted into separate GPU textures at load time.

### Hero surface atlas

A second exact 2×2 atlas replaces the wood, bark and cloth used on nearby meshes and adds a hair texture: continuous weathered hardwood with broad irregular grain and knots (no board joints); plate-like tropical bark with branching fissures; khaki linen with diagonal compression folds; dark swept hair with asymmetric strand groups. Neutral diffuse surface scans, no borders or text. The engine extracts 512-pixel tiles and reduces cloth contrast so the baked fold shading supports the modeled folds. Original generated on 8 September 2026 and converted to JPEG as `surfaces.jpg`.

### Foliage atlas

A transparent 2×2 botanical texture atlas: dense irregular broadleaf tree crown; long arching palm frond; a lush fern; and a leafy rainforest branch. Detailed botanical textures, realistic subtle greens and sunlit leaf edges, isolated alpha background, no labels, sky, ground or frame. Curved and crossed alpha-tested meshes place these textures in the 3D world.

### Sky and environmental light

A wide equirectangular sky panorama with peach-gold tropical dawn, three to four soft cloud banks, detailed cloud edges, warm illumination and a seamless horizon. No land, water, trees or solar disc. The generated image is sampled by the skydome; a PMREM environment map lights physical materials. The sun and river reflection remain live rendering effects. Amazonia and Ireland retain their own cool palettes.

All geometry is constructed locally. No third-party character, vegetation, building or environment models were downloaded. The generated atlases and sky reside in `public/celta/`; final delivery paths are referenced by the engine.

## Real-time materials and rendering

The character uses sculpted cloth cross-sections, a rolled collar and asymmetric hair geometry. Timber includes bevels, recessed splits, worn post caps and a curved canoe hull. Material shaders add spatially varying damp patches and restrained directional edge light. The water combines a planar reflection with irregular ripple and specular fields. Shallow dock puddles reuse the same reflection texture without another reflection render. Desktop HDR targets use single-sample buffers followed by FXAA, avoiding a blank-output regression observed with multisampled HDR targets. A limited HDR glow path is used on non-touch devices; mobile uses fewer distant trees and understory meshes and bypasses that processing. Both paths cap resolution and support an economy mode.

Final refinements include overlapping hair locks constrained to the scalp, diagonal sleeve compression creases, unequal boot folds, reflected dock patches modulated by the actual plank grain, and grouped sun glints. The portrait menu uses its own camera framing to keep Roger fully visible beside the interface.
