# NeedMart V2 — Claude Code Handoff

This folder contains the current NeedMart V1 starter project plus a detailed build brief for Claude Code.

## What to do
1. Create a GitHub repository, for example `needmart-virtual-store`.
2. Upload the contents of this folder to the repository (or open this folder in Claude Code locally).
3. Open `CLAUDE_CODE_MASTER_PROMPT.md` and give the full prompt to Claude Code.
4. Ask Claude Code to inspect the project first and implement in milestones. Do not ask it to generate the entire platform in one untested step.
5. Enable GitHub Pages only for the static frontend. Configure any backend separately.

## Important reality check
- This is a starter/handoff package, not a completed production V2.
- No GitHub repository has been created or deployed by this package.
- The included sample product data is demo data; affiliate links and live inventory are not configured.
- Realistic human models, voice AI, lip-sync, backend, authentication, payment, and order management require separately selected assets/services and configuration.
- Do not put API keys or private credentials in GitHub Pages or committed files.

## Human model requirement
Use licensed, photorealistic human GLB/GLTF assets with natural animation. Cartoon, toy-like, low-poly, or mascot-style people are explicitly rejected. See `CLAUDE_CODE_MASTER_PROMPT.md` and `ASSET_LICENSES.md`.

## GitHub Pages
The existing `index.html` is the static frontend entry point. In GitHub: Settings → Pages → Deploy from a branch → choose `main` and `/ (root)`. The exact steps may vary slightly with GitHub UI changes.
