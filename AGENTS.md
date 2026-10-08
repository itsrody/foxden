# FoxDen — agent instructions

Firefox-first WebExtension (MV2, FF158+): serves CDN JS/CSS/fonts from local
IndexedDB cache via blocking `webRequest` → `data:` redirects. Privacy model:
fetch-once, then zero CDN contact (plus zero-network vendor/fonts bundles).

## Project terms

- firefoxification: additive transforms that make intercepted content behave
  its best on Firefox — CSS standard fallbacks, `font-display:swap`,
  `decoding="async"`, module bypass, resource-hint stripping. Rules: only
  ADD (never rewrite values or remove), keep markers (`/*FoxDen*/`), stay
  node-testable in `src/shared/`.
- UID: host-independent cache key (`name ext version`) from `getUID()`.
- vendor bundle: packaged top-N libs seeding the cache with zero network.
- flavor: build variant folded into the UID (production/bundle/slim/…).

## Power tooling (prefer over coreutils)

All installed in this workspace — use them for exploration and verification:

rg (ripgrep)   search code — `rg -l 'pattern' src test tools`
fd             find files — `fd -e js src/shared`
fzf            fuzzy-pick files/tests when unsure of exact paths
bat            readable file views with syntax highlight
jq             inspect `manifest.json`, `resources/*/manifest.json`
eza            `eza --tree resources/fonts` for bundle layout
delta          readable `git diff` output
yq             (if ever needed for yml CI edits)

Benchmarks: `hyperfine` is NOT installed — use `node --input-type=module -e`
timers or the in-extension `timing` stats (popup console) instead.

## Commands (run all before finishing)

npm test            # mocha, ~500ms, 4k+ tests — must stay green
npm run typecheck   # tsc with checkJs — must be clean
npm run lint:src    # eslint — must be clean
npm run lint:ext    # web-ext lint — must stay 0 errors / 0 warnings
                    # (addons-linter lags new APIs: do NOT adopt an API it
                    # flags, even if the browser supports it)

## Architecture (src/)

background.js  wiring + ready gate (settings→migrate→stats→fonts→vendor)
redirect.js    blocking handler: UID → vendor? → IndexedDB/fetch → data: URI
fetchcache.js  fetch-once + inflight dedupe + hot LRU + 24h unversioned TTL
cache.js       IndexedDB stores + memoized entryToDataUri
fontcss.js     Google Fonts CSS pipeline (fetch per family, embed files)
fonts.js/vendor.js  packaged bundles (fonts, top-N libs) + manifests
htmlfilter.js  streaming HTML rewrite: SRI strip, CSP data:, hints, dedupe
stats.js       hit stats, tab domains, blacklist, alarms flush
shared/urlkey.js   CDN→UID parsers (host-specific regexes + generic fallback)
shared/perf.js     pure save/latency helpers (testable, no browser deps)
shared/timing.js   redirect stage aggregates (lookup/cache/encode)
shared/modulebypass.js  per-tab ESM bypass registry (pure)
shared/cssfix.js   additive CSS transforms (fallbacks, font-display)

## Adding a new module under src/shared/

1. Add to `test/run.mjs` loadSources AND `test/browser.mjs` imports.
2. Add its exports to the `test/test.js` globals in `eslint.config.js`.
3. Keep it browser-free (no `browser.*` at import time) so node tests load it.

## Adding a CDN host

1. Append prefix to `cdnDomains` (constants.js) — interception, CSP, SRI,
   hint-strip and warming all key off this one list.
2. Add a `getVersionNameExt` branch (urlkey.js); without one the generic
   fallback keys per-path with no dedupe.
3. Add `test/cdn-<host>.js` fixtures — the "not null" suite requires every
   fixture URL to parse.
4. Add precise `version/name/ext` cases in test/test.js.

## Regenerating bundles (never hand-edit resources/)

npm run build:vendor        # re-download pinned libs, recompute UID keys
npm run build:fonts:fetch [fam…] && npm run build:fonts
npm run build && npm run lint:ext   # xpi must pass AMO validation

## Invariants (do not break)

- UID uniqueness: different bytes ⇒ different UID (combine hash, esm query
  variants, build flavors). Memo keys must capture every output-varying input.
- Never downgrade: cached newer patch wins (`isNewerPointVersion`); vendor
  guard; no cross-major sharing.
- `data:` needs help: every redirected tag needs SRI strip + CSP `data:`
  allowance — new types/hosts must flow through htmlfilter.
- No `font`-type webRequest redirects (Bugzilla 1645683) — embed in CSS.
- Blocking handlers stay lean: defer IPC (`addTabStats`), memoize encodes,
  6s fetch budget, 2MB data: bypass.
- Stats rows: `{created, hits, last, size?}` — popup renders all four.
