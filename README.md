# Ashbourne House

A first-person browser game set inside a furnished two-storey house. Eight rooms connect to the entrance hall and upper landing. The house geometry, furniture and visual assets were created for this project.

## Play locally

Serve the game over HTTP from the repository root.

```sh
python -m http.server 4173 --directory dist
```

Open [localhost:4173](http://localhost:4173/). Choose **Explore the house**. Use **WASD** or the arrow keys to walk, **Shift** to walk faster, **C** to crouch, **E** to interact, and **Esc** to pause. Look with the mouse, or use **Q/R** and **Page Up/Page Down**. On a touch screen, use the thumbstick, drag to look, and tap **Use** or **Crouch**.

The controls menu has volume, mouse sensitivity, reduced camera motion, and daylight or evening lighting. **Auto** adapts rendering resolution. **Performance** reduces shadow and reflection resolution. **High** adds contact shading around furniture and soft diffusion around highlights on supported WebGL 2 devices.

Doors use weighted hinges and stop against the player. You can also use light switches, lamps, fireplaces, taps, drawers, two dining chairs, the mantel clock, and the house ledger. Footsteps change with the floor surface. Fire, water, the clock, and drafts are spatially mixed, and closed doors damp sounds from adjoining rooms.

In the upstairs bathroom, aim at the toilet and press **E** to pee standing or **X** to sit. The first time you sit, a loud impact plays and the house loses power. Press **E** to stand. The brass lighter is on the kitchen island. Pick it up with **E** and use **F** to light or close it. The touch controls expose the same actions. The impact uses the sound file supplied for the project and respects the game's volume setting.

Vercel serves the prebuilt static files in `dist/`. There is no dependency install or application build. Three.js is included in `dist/vendor/` under its MIT license.

## Verify the house

Run these checks with Node.js 24 or newer.

```sh
node --no-warnings tests/house.test.mjs
node --no-warnings tests/gameplay.test.mjs
```

The house check verifies material files, reachable room footprints, both directions on the stairs, door and furniture collisions, every interaction's line of sight, and room culling. The gameplay check verifies acceleration and braking, stair cadence, crouch clearance, reduced motion, and the synthesized audio cues.

## Original textures

The architectural WebP files in `dist/assets/` were cropped and optimized from atlases generated with ChatGPT’s built-in ImageGen.

- Four flat, evenly lit architectural materials in a 2×2 atlas: smoked oak grain, honed ivory limestone, oatmeal woven upholstery and warm lime plaster.
- Four decor surfaces in a 2×2 atlas: an original dusk landscape painting, a faded red and navy ornamental rug, an original pear and olive-branch still life, and repeating ivory, faded teal and terracotta tile.
- Four decor surfaces in a 2×2 atlas: an indigo and smoky gold botanical rug, a cream Moroccan flatweave with geometric medallions, an original still life of blossoms and books, and an original painting of an Iberian courtyard.
- Four building finishes in a 2×2 atlas: soot-aged running-bond firebrick, honeyed ivory marble, etched sash-window glass and worn terracotta pavers.
- Four decorative surfaces in a 2×2 atlas: antique olive and hellebore watercolours, a blue-and-ivory Iberian ceramic plate and carved walnut acanthus relief.

The 36 furniture textures in `dist/assets/furniture/` came from four additional 3×3 atlases generated with built-in ImageGen. Each prompt called for nine edge-to-edge, orthographic material swatches under neutral lighting, with no labels or props.

- **Woods** cover walnut, English oak, mahogany, limed ash, olive-painted oak and rosewood.
- **Upholstery** covers forest velvet, cognac leather, rust herringbone, petrol chenille, rose bouclé, oatmeal linen, striped ticking, moss tartan and Moroccan diamond weave.
- **Bedding** covers cotton percale, sage wool, rose linen, navy windowpane, clay jacquard, sand quilting, ochre velvet, taupe pinstripe and ivory damask.
- **Details** cover verdigris and satin brass, saddle leather, botanical linen, Iberian weave, Moroccan flatweave, burgundy damask, charcoal tweed and houndstooth.

Each furniture texture is a 384×384 WebP. Filenames and rendering finishes are defined in `dist/furniture-materials.js`. The renderer estimates local relief and roughness from the color maps at load time. Wood boards use varied UV offsets so grain doesn't repeat uniformly across the floor.
