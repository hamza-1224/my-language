# My Language (my-language): notes for future changes

- Static web app served by GitHub Pages from `main` at https://hamza-1224.github.io/my-language/
- `index.html` (page shell), `app.js` (the tutor), `sync.js` (sign-in, Supabase sync, demo, offline cache, updates, feeds), `style.css`, `data/french.js` + `data/persian.js` (course content). `vendor/supabase.js` is supabase-js 2.118.0 (UMD). Font: `fonts/NotoNastaliqUrdu.ttf` (OFL).
- Data lives in the same Supabase project and table as My Budget and Kanban (`itgujuuslkymplwfxmft`, `public.docs`), as three documents: `zb_state/settings` {lang, script}, `zb_state/fr`, `zb_state/fa`, each with a `ts`. Never touch other apps' collections. Offline edits on two devices are merged with `mergeLang` (per card: more reps wins).
- Same origin as My Budget and Kanban on github.io: keep every localStorage key prefixed `zb.` and the service-worker cache prefixed `my-language-`. Sign out uses `scope:"local"`.
- News: `.github/workflows/feeds.yml` runs `scripts/fetch_feeds.py` every 3 hours and force-pushes `fr.json`/`fa.json` to the `feeds` branch; the app reads them from raw.githubusercontent.com (cached in `zb.feed.<lang>`).
- Interface and explanations are in English. Urdu/Hindi (the learner picks, `S.script`) appear only for pronunciation and comparisons, and must be everyday spoken Urdu/Hindi, not formal or Sanskritised. Persian data: vocab `[fa, translit, english, urdu, hindi]` (`v[0]` is the card id, keep it stable), grammar `{id, t, x, cmp:[ur,hi], ex:[[fa, translit, en]], q}`.
- Look: Duolingo-like (green 3D buttons, lesson path, full-screen practice) but with no Duolingo assets. Illustrations are Fluent Emoji 3D PNGs in `img/` (MIT), flags from flag-icons (MIT), font Nunito (OFL). Don't draw custom art.
- No AI calls in the hosted app (the ✨ buttons from the laptop version are hidden; `ai()` in app.js is unused). No analytics.
- Demo: "Try the demo" uses a local store (`zb.demo.data`, `zb.demo.on`), never the database.
- Releasing a change: bump the version in **three places together**: `version.json`, `APP_VERSION` in `sync.js`, and the `CACHE` name in `sw.js`.
- Never commit personal data, backups or progress.json. Only the publishable key belongs in `config.js`.
- iPhone app: `native/` (Capacitor 8, appId io.github.hamza1224.mylanguage), Mac app: `desktop/` (Tauri 2). `native/assemble.mjs` writes the stylesheet and scripts into one `app.html` behind `native/loader.html`; at runtime `ZB.inlinePage` builds the same page from the website for updates (`zb.native.app`). Workflows build `My-Language.ipa` (release `iphone-app`) and `My-Language.dmg` (release `mac-app`) when those folders change.
