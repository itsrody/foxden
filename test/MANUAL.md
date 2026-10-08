# Manual test checklist (Firefox 158+)

Run against a temporary profile (`npx web-ext run`), with uBO disabled unless noted.

## Startup
- [ ] `about:debugging` → extension loads, no errors in background console
- [ ] Background console prints cache summary (`cache has N files, total size …`)
- [ ] Legacy cache migrates to IndexedDB (migration log), `storage.local` keeps only settings/stats metadata

## Redirect pipeline
- [ ] Visit a page using `ajax.googleapis.com/ajax/libs/jquery/…` → request redirected (background log `… fetching` first time, `retrieved from local storage` second time)
- [ ] Page's jQuery works (check `jQuery.fn.jquery` in webconsole)
- [ ] Repeat with `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `code.jquery.com`, `unpkg.com`
- [ ] Binary/CSS response served correctly (e.g. a `.css` from cdnjs renders, relative `url()`s absolute)

## Google Fonts
- [ ] Page using `fonts.googleapis.com/css2?family=…` renders fonts with no gstatic requests from the page (bundled files come from the package; the rest are embedded as `data:` URIs in the cached CSS — Font Awesome glyphs also render)
- [ ] `blockUnknownGoogleFonts` ON: unknown family → CSS blocks font; OFF: font fetched normally
- [ ] `subset=`/`text=` requests render correctly (served as the full-family CSS superset — one cache entry per family, so any subset can be served from it)

## HTML rewriting (filterResponseData)
- [ ] Page with `<script src=CDN integrity=… crossorigin=anonymous>` still executes (both attrs stripped for all CDN tags — data: redirect breaks CORS and SRI)
- [ ] Page with `<script type=module src=CDN integrity=…>` loads from network with integrity intact (module bypass; relative imports inside resolve)
- [ ] Images gain `decoding="async"` (view source); served JS with Chrome sniffs logs a triage hint
- [ ] `<a ping>` gone and `<pre>`/`<code>` carry `translate="no"` (view source)
- [ ] Self-hosted `jquery-3.7.1.min.js` served from cache (background log); modified copy under the same name passes through
- [ ] Livetest `/firstparty`: exact twin logs "served from shared cache", tampered twin logs "differs … passing through" (`timing` fpHits/fpMismatch)
- [ ] Large/fast-loading page (throttle network) — attributes stripped across chunk boundaries
- [ ] Non-UTF-8 page (charset=gb2312 meta) does not throw in filter
- [ ] CSP response header gains `data:` in `script-src`/`style-src` (check Security panel); Report-Only header also patched

## Stats & popup
- [ ] Toolbar badge shows per-tab count, resets on navigation
- [ ] Popup: All/Ses/Pag columns populate; current page rows sorted first
- [ ] uBlock rules tab lists enabled CDN domains

## Settings
- [ ] Domain blacklist: listed domain's CDN requests pass through untouched
- [ ] Domain blacklist: listing `example.com` also covers `sub.example.com` (eTLD+1 via publicSuffix)
- [ ] `allowModifyHeaders` OFF: CSP header untouched
- [ ] Settings sync via `storage.sync`, survive restart

## Cache management
- [ ] Cleanup Cache removes only stale entries (age/hit formula), stats updated
- [ ] Idle 60s+ triggers the same cleanup automatically (background log)
- [ ] Purge Cache empties cache, popup table resets
- [ ] `storage.session` stats survive background console close; cleared on browser restart

## Packaging
- [ ] `npm run lint:ext` → 0 errors 0 warnings
- [ ] `npm run build` → `web-ext-artifacts/foxden.xpi` installs and passes AMO validation
