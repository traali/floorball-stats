# ROLL.md — Floorball Stats Monastery Chronicle
Append-only record of decisions, contract versions, and dispensations.

---

## 2026-09-02 — Monastery Inception & SSBL Torneopal Foundation
- **Office / Author:** Legate & Master of Works
- **Scope:** `floorball-stats`
- **Verdict:** PASS
- **Summary:** Initialized `floorball-stats` with React 19, SSBL Torneopal API client (`salibandy-api.torneopal.net`), `@modelcontextprotocol/ext-apps` MCP App widget (`ui://floorball/match-card`), and canonical `SportStatsContract` adapter. Passed deterministic pre-visitation gate.

## 2026-09-12 — Discovery parity with football-stats (house)
- **Office / Author:** Master of Works
- **Scope:** `floorball-stats` Vite SPA (stack unchanged)
- **Verdict:** PASS
- **Summary:** Bottom nav no longer hardcodes match `949661` / team `25301`. Search, browse, competition → category → group, club, player, and favorites routes now match football-stats. Search parses tulospalvelu links and scans club + roster names. Live SSBL standings replace the empty table. Match centre links both teams and loads group standings + form V/T/H. Canon: `docs/DISCOVERY.md` — basketball and volleyball copy this.

## 2026-09-12 — Discovery live on GitHub (house, stack unchanged)
- **Office / Author:** Master of Works
- **Scope:** `floorball-stats` Vite SPA
- **Verdict:** PASS
- **Summary:** Search / browse / club / player / group routes committed. Age chips on competition. Timeline scorers link to player pages. Finnish V/T/H form. Grok preview is a workbench only; this monastery was not overwritten with TanStack Start.

## 2026-09-12 — Torneopal Cloudflare cache (house)
- **Office / Author:** Master of Works
- **Verdict:** PASS (code). Cellarer must deploy taso-proxy.
- **Summary:** Origin `spl.torneopal.net` caches empty 403s (`cf-cache-status: HIT`). Clients now retry via `taso-proxy.sakkoja.workers.dev/{spl,ssbl,basket,volley}` then origin with `_cb` cache-bust. Worker no longer stores 4xx (`Cache-Control: no-store`) and bypasses origin 403 TTL. Played matches stay immutable in Cache API.

## 2026-09-12 — Chapter of Neighbors
- **Office / Author:** Legate
- **Verdict:** PASS
- **Summary:** Vendored check-neighbors.mjs into visit. Graph: federation.neighbors.json. 5-point HOUSE_TEST_SPEC.md. SupportedSport includes weather. Future contract/rule breaks fail closed.

## 2026-09-12 — Match-state cache
- **Office / Author:** Cellarer / Master of Works
- **Verdict:** PASS
- **Summary:** Live matches never cached. Upcoming max-age 30s (lineups). Played immutable. Roster 60s. Worker Cache API only store-played.

## 2026-09-12 — Home is search, not a hardcoded match
- **Office / Author:** Master of Works
- **Verdict:** PASS
- **Summary:** `/` is discovery (search + chips). MCP no longer defaults to match 913481 / Westend. GitHub Pages deploys without Cloudflare token.
