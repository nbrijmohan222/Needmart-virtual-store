# NeedMart — Virtual Supermarket (V3, in progress)

Static Three.js site (no build step): a walkable two-floor 3D store with Drone / Long shot / Walk / Orbit cameras,
floor plan, minimap and aisle quick-jump, plus a 2D product list page. NeedMart is a **guide, not a shop**: it keeps a
"My Shopping List" on the device and sends you to the retailer (Amazon / Flipkart) via affiliate links to buy.
All current products are demo data.

## Pages
- `index.html` — welcome screen with loading bar, 3D store, Shop by Problem, aisle filter, product details, My Shopping List.
- `products.html` — responsive grid with aisle filter, Shop by Problem, search and sort. Works without WebGL.
Both read `data/products.json` and share the same list (`localStorage` key `needmart.shoppingList.v1`).

## Store layout
| Floor | Aisles (colour) |
|---|---|
| Ground | Kitchen (orange), Home Utility (teal), Personal Care (pink) · entrance · 2 help desks · help kiosks |
| First | Mobile Accessories (blue), Travel (amber), Office Productivity (violet) · help kiosk |
Stairs on the right connect the floors. Staff points are branded **Help kiosks** until licensed realistic human GLB models are supplied (see `ASSET_LICENSES.md`).

## products.json schema
| Field | Type | Notes |
|---|---|---|
| `id` | string | unique |
| `name`, `category`, `problem_solved` | string | `category` must be one of the six aisles above |
| `key_benefits` | string[] | |
| `target_customer` | string | |
| `price_inr` | number \| null | **shown only when `verified_at` is set**, as "₹X (as of <date time> IST)" + disclaimer; otherwise "Check price" |
| `image_url` | string | https URL used exactly as provided (hot-linked, never re-hosted); emoji placeholder otherwise |
| `affiliate_url` | string | plain, direct https affiliate URL (no redirects/cloaking); opens in new tab with `rel="sponsored noopener"`. Empty → "Link coming soon" (disabled) |
| `commission_info`, `source` | string | internal notes |
| `verified_at` | string | ISO 8601 with offset, e.g. `2026-11-20T14:30:00+05:30` |
| `status` | `"demo"` \| `"verified"` | demo items must keep `affiliate_url` empty (enforced by tests) |
| `icon` | string | emoji fallback |

## Compliance rules built in
- No cart, checkout, bill, totals or payment wording; "My Shopping List" + "Buy from retailer" only.
- Prices never shown unless verified with a timestamp; price sort puts unverified items last; no price tracking.
- Footer on every page: "As an Amazon Associate I earn from qualifying purchases." + general affiliate disclosure.

## Run
    python -m http.server 8000      # then open http://localhost:8000
Internet is needed (Three.js loads from jsDelivr). Double-clicking index.html will not work.

## Test
    node --test tests/*.test.mjs                 # 18 logic tests (layout, cameras, catalogue, compliance)
    python -m http.server 8766 &                 # then, with Playwright installed:
    python test/browser_check.py                 # headless Chromium; screenshots in test/screens/

## Publish on GitHub Pages
1. Create a public repository (e.g. `needmart-virtual-store`) and upload everything in this folder, keeping
   `js/`, `css/`, `data/` and the empty `.nojekyll` file. (`test/` is optional.)
2. Settings → Pages → Build and deployment → **Deploy from a branch** → branch `main`, folder `/ (root)` → Save.
3. Open the URL shown there after a minute or two. Check both `index.html` and `products.html`.

See `IMPLEMENTATION_PLAN.md` for what is and is not done. Never commit API keys or affiliate account credentials.
