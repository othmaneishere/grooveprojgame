# Ashbourne House

A first-person browser game set inside a furnished two-storey house. Eight rooms connect to the entrance hall and upper landing. The house geometry, furniture and visual assets were created for this project.

## Play locally

Serve the game over HTTP from the repository root.

```sh
python -m http.server 4173 --directory dist
```

Open [localhost:4173](http://localhost:4173/). Click **Explore the house**, then use **WASD** to walk, the **mouse** to look, **E** to operate doors and **Esc** to pause. On a touch screen, use the thumbstick, drag to look and tap **Door**. The desktop renderer requires a WebGL-capable browser.

Vercel serves the prebuilt static files in `dist/`. There is no dependency install or application build. Three.js is included in `dist/vendor/` under its MIT license.

## Verify the house

Run `node --no-warnings tests/house.test.mjs` with Node.js 24 or newer. The test checks texture files, both directions of travel on the stairs, the accessible footprint of each room and the collision behavior of every door.

## Original textures

The WebP files in `dist/assets/` were cropped and optimized from three atlases generated with ChatGPT’s built-in ImageGen. The briefs were:

- Four flat, evenly lit architectural materials in a 2×2 atlas: smoked oak grain, honed ivory limestone, oatmeal woven upholstery and warm lime plaster.
- Four decor surfaces in a 2×2 atlas: an original dusk landscape painting, a faded red and navy ornamental rug, an original pear and olive-branch still life, and repeating ivory, faded teal and terracotta tile.
- Four decor surfaces in a 2×2 atlas: an indigo and smoky gold botanical rug, a cream Moroccan flatweave with geometric medallions, an original still life of blossoms and books, and an original painting of an Iberian courtyard.

The 36 furniture textures in `dist/assets/furniture/` came from four additional 3×3 atlases generated with built-in ImageGen. Each prompt called for nine edge-to-edge, orthographic material swatches under neutral lighting, with no labels or props.

- **Woods** cover walnut, English oak, mahogany, limed ash, olive-painted oak and rosewood.
- **Upholstery** covers forest velvet, cognac leather, rust herringbone, petrol chenille, rose bouclé, oatmeal linen, striped ticking, moss tartan and Moroccan diamond weave.
- **Bedding** covers cotton percale, sage wool, rose linen, navy windowpane, clay jacquard, sand quilting, ochre velvet, taupe pinstripe and ivory damask.
- **Details** cover verdigris and satin brass, saddle leather, botanical linen, Iberian weave, Moroccan flatweave, burgundy damask, charcoal tweed and houndstooth.

Each furniture texture is a 384×384 WebP. Filenames and rendering finishes are defined in `dist/furniture-materials.js`.
