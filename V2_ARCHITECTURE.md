# NeedMart V2 Architecture

## V1 audit (what was there)
- One `index.html` (inline CSS/JS), Three.js 0.160 from CDN, no build step.
- One walkable floor; upper floor and stairs were decoration only.
- One camera (first-person). No collisions; no mobile movement although the on-screen hint implied it.
- Clicking a shelf package opened a random product.
- `products.json` (6 items) was unused; the page had its own list of 8.
- People were cylinder-and-sphere figures (rejected by the brief).
- Cart had no quantity editing or removal.

## Current structure (static, GitHub Pages)
| File | Role |
|---|---|
| `js/layout.js` | Floors, shelves, sections, collisions, stairs (pure) |
| `js/store.js` | Three.js geometry |
| `js/cameras.js` | Drone, long, walk, orbit, tour (pure) |
| `js/catalog.js` | Filter, search, cart (pure) |
| `js/main.js` | UI, input, minimap, render loop |
| `data/products.json` | Demo catalogue (single source) |

If 3D fails to load, the product list and cart still work.

## Planned backend (not built)
Static frontend -> serverless API (`/chat`, `/tts`, `/stt`, `/orders`, `/auth`). Keys live only in backend
environment variables. Until it exists, any assistant must be a clearly labelled demo.

## Human models (not integrated)
Licensed rigged GLB/GLTF, loaded lazily with GLTFLoader at the staff points in `js/store.js`.
Needed per character: PBR textures; idle, walk, talk and point clips; facial blend shapes (visemes) for lip-sync.
Suggested mobile budget (to be measured): under 30k triangles and 5 MB each.
