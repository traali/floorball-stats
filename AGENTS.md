# Floorball Stats Monastery — Agent Rules & Governance
**Scope:** `floorball-stats` (Suomen Salibandyliitto / SSBL Torneopal Matchday Analytics & MCP Apps)  
**Version:** 1.0.0 (2026-09-02)  
**Word Count Cap:** Strictly < 1,500 words.

---

## 1. Domain & Purpose
This monastery owns:
1. **Floorball / Salibandy Matchday Analytics:** 3-period timeline tracking, powerplay stats, 2-min penalty logs, and player points leaderboards (G+A).
2. **SSBL Torneopal REST Client:** Interfaces with `salibandy-api.torneopal.net/taso/rest` with key `zsn3anknxzcfzc23k53jqdcd4pymutsf`.
3. **MCP App UI Layer:** Exposes `@modelcontextprotocol/ext-apps` tools (`get_floorball_match_card`) and sandboxed widgets (`ui://floorball/match-card`).
4. **Dual-Mode Web UI:** Standalone human web app (`https://floorball-stats.pages.dev`) and embed drawer mode (`?embed=true`).

---

## 2. Non-Negotiable Rules
- **Contract Boundary:** This repo communicates with `pelipaiva` and peer repos exclusively through `SportStatsContract` and `CrossRepoQueryContract`.
- **Zero Hallucinated Data:** Live endpoints must be used where available; offline fallbacks must clearly indicate synthetic/offline mode.
- **Strict Verification:** All changes must pass `npm run visit` (0 ESLint errors, clean `tsc && vite build`, contract compatibility).

---

## 3. The 4 Monastic Offices
- **Prior:** Guardian of domain scope and `AGENTS.md` word cap.
- **Cellarer:** Engine & API engineer (Torneopal REST client, data transforms).
- **Master of Works:** UI/UX engineer (React 19, Tailwind, MCP App widget).
- **Legate:** Ambassador to the Federated Chapter and shared contracts.

---

## 4. Pre-Visitation Checklist
Before calling the Clean-Room Visitor:
1. `AGENTS.md` word count < 1,500 words.
2. `npm run lint` exits 0.
3. `npm run build` exits 0.
4. Cross-repo contract verified with canonical rules.
