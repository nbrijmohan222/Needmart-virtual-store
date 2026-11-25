# Implementation Plan and Status

Last updated: 25 Nov 2026 (V3 — owner's V2 base + ported list page, compliance and UX work).

| Milestone | Status |
|---|---|
| 1. Audit, architecture, plan, licence register | DONE |
| 2. Camera modes, walkable two-floor store | DONE for demo scope: logic unit-tested; **3D now viewed in headless Chromium (SwiftShader)** — drone, long shot, walk on both floors, mobile. Not yet checked on a real phone/GPU. |
| 3. Realistic human models and animation | BLOCKED: no licensed assets. Staff points are branded Help kiosks (clickable, tip on approach). No stylised people. |
| 4. Catalogue, search, details, shopping list | PARTIAL: search, aisle filter, Shop by Problem, sort, details, shopping list (qty/remove, saved on device, shared across pages), Buy-from-retailer list, 2D list page. Missing: comparison, favourites, variants, real images/data. No checkout by design. |
| 5. Hindi + English staff chat, voice, lip-sync | NOT STARTED |
| 6. Admin-ready data and backend interface | PARTIAL: products.json schema documented and validated by tests; no backend/admin |
| 7. Performance tiers, accessibility, 2D fallback | PARTIAL: touch joystick, reduced motion, list page without WebGL, packages instanced (draw calls ~830 → ~250). No High/Balanced/Lite switch yet. |
| 8. Final checks and deployment | PARTIAL: unit + headless browser checks pass; not deployed |

## Done in V3 (this round)
- `products.html` responsive list; shared `js/shoplist.js` UI; `js/listpage.js`.
- Cart → **My Shopping List**; checkout → **Buy from retailer** (plain affiliate URLs, `rel="sponsored noopener"`, disabled "Link coming soon" when empty). No totals or payment wording.
- Timestamped price logic (`priceLabel`, IST, disclaimer); unverified → "Check price"; sort puts unverified last.
- Six colour-coded aisles (GF Kitchen / Home Utility / Personal Care; 1F Mobile Accessories / Travel / Office Productivity); "Shop on Amazon / Flipkart via these links" wall signs; checkouts → help desks.
- Welcome screen with loading bar; aisle quick-jump chips with a short fade (the rig still cuts rather than flying through walls); Shop by Problem chips; kiosk tips; disclosure footer on both pages.
- Fixes found in the browser check: mobile page was 1341px wide (grid blowout from nowrap toolbars) → fixed; welcome screen unreachable on mobile → now full-screen; stray "null" text in details → fixed; hanging aisle signs at eye level → raised; dark ceilings → warmer lighting.
- Tests: 10 original (2 updated for new data/list semantics) + 8 new = 18 passing.

## Known gaps (prioritised)
1. No real products: all 10 are demo, no images, no affiliate links, so every Buy button is disabled.
2. Not tested on a real phone or GPU; headless SwiftShader only. Frame rate and touch feel unknown.
3. Walk view: section spawn points sit between short gondola ends, so the first view is a close shelf face; aisles don't read as long supermarket aisles yet.
4. Products on shelves are plain coloured boxes; no hover/crosshair highlight; product identity only visible after clicking.
5. Quick jump is a fade-cut, not a walked glide; no lift.
6. Mobile: 3D stage is ~58% of the screen with the catalogue below; the toolbar scrolls sideways.
7. No High/Balanced/Lite graphics tiers; Three.js still from CDN (offline/blocked-CDN users fall back to the list page).
8. No Hindi; no staff chat; no comparison/favourites.

## Needs owner action
1. Open the site on a real phone and computer and report what looks wrong.
2. Supply real, verified product data (affiliate URL, image URL as allowed by the programme, price + `verified_at`).
3. Choose and buy/download realistic human models whose licence allows web use, or approve a budget.
4. Later: choose AI/voice provider and backend host (may cost money).
