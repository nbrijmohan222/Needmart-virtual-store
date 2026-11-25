# NeedMart — Virtual Supermarket (V2, in progress)

Static Three.js site: two walkable floors, Drone / Long shot / Walk / Orbit cameras, floor plan, minimap,
product search, details and demo cart. All products and prices are sample data.

## Run
    python -m http.server 8000      # then open http://localhost:8000
Internet is needed (Three.js loads from a CDN). Double-clicking index.html will not work.

## Test
    node --test tests/*.test.mjs

## Publish on GitHub Pages
1. Create a repository and upload everything in this folder, keeping the `js`, `css` and `data` folders.
2. Settings -> Pages -> Deploy from a branch -> `main`, `/ (root)` -> Save.
3. Open the URL shown there after a minute or two.

See `IMPLEMENTATION_PLAN.md` for what is and is not done. Never commit API keys.
