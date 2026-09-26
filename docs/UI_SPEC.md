# Floorball Stats UI spec

Status: **signed off 2026-09-26** for other models. Code-reviewed against `src/` on main `8a04c6f`. Not a fresh phone tap of every control in this session.
Live: https://floorball-stats.pages.dev
Job: find a Salibandyliitto team, series, or player and read live TASO numbers. No hardcoded match.

If this doc and the code disagree, the code wins. Update this file in the same commit.

## 0. Sign-off

**Signed.** Shell, routes, home, team tabs, match tabs, standings, and favorites storage below. Data is Salibandyliitto TASO. Court and hall names come from `venue_name`. Do not drop `kenttä N`.

**Do not change these because basketball does it:**

- Bottom nav is Etusivu, Selaa, Haku, Suosikit. Selaa is `/browse`.
- Home says "Ei kovakoodattua ottelua."
- Match points tab is **Pistetilasto (G+A)**, then **Maalivahdit**, then **Erikoistilanteet**. Those three are the sport. Do not replace them with fouls and bonus.
- Standings subtitle is "Voitto 2p, Tasapeli 1p". Columns include O, V, T, H. Form chips use the same letters.
- Favorites stay in `localStorage` key `floorball.favorites.v1`. Not Cloudflare.
- Header mark is IceMark, source pill SSBL.

**Not signed:** the share-export card's inner layout, and a live tap of every browse chip after this commit.

## 1. Shell

| Element | File | Why |
|---|---|---|
| Header + IceMark | `src/components/Header.tsx` | Home, and the WebMCP badge |
| WebMcpBadge | `src/components/WebMcpBadge.tsx` | Native `document.modelContext` vs polyfill. Not a data source |
| Bottom nav | `src/components/BottomNav.tsx` | Etusivu, Selaa, Haku, Suosikit. Active color `#6FFFE9` |

Hash router: `src/routes.tsx`. Unknown paths go home.

## 2. Routes

| Path | Page | Why |
|---|---|---|
| `/` | Home | Search, favorites, quick chips, open-by-id, popular shortcuts |
| `/search` | Search | Name or a pasted salibandy.fi link |
| `/browse` | Browse | Competitions, filter by name |
| `/competition/:compId` | Competition | Categories |
| `/competition/:compId/category/:catId` | Category | Groups |
| `/group/:compId/:catId/:groupId` | Group | Table, Tulevat, Pelatut |
| `/club/:clubId` | Club | Teams grouped |
| `/team/:teamId` | Team | Ottelut, roster, table. Example id on home is `25301` (Westend Indians Yellow) |
| `/player/:playerId` | Player | Person |
| `/match/:matchId` | Match | Tabs below |
| `/favorites` | Favorites | Local list |

## 3. Home

`src/pages/Home.tsx`

| Element | Why |
|---|---|
| IceMark + Salibandytilastot + SSBL | Identity and federation |
| Search | Placeholder is Westend, U14, or a salibandy.fi link |
| Suosikkijoukkueet | Empty state points at the heart on a team page |
| Quick chips + Selaa sarjoja | Search chips, or `/browse` |
| Avaa tunnuksella | Joukkue-ID, Ottelu-ID, Pelaaja-ID. Team example `25301` is a hint, not a pinned team page |
| Pikavalinnat | Search shortcuts. The heading says they are not a hardcoded match |

## 4. Team

`src/pages/TeamPage.tsx`

| Tab | Why |
|---|---|
| Ottelut | This team's fixtures, with count |
| Kokoonpano | Players and points (the table header is Pelaaja) |
| Sarjataulukko | `FloorballStandingsTable` |

Heart: `aria-label` Lisää suosikkeihin / Poista suosikeista. Writes `floorball.favorites.v1`.

## 5. Match tabs

`src/pages/MatchPage.tsx`, in order:

| Tab | Why |
|---|---|
| Ottelukeskus | Score, period boxes, venue, same-day games |
| Kokoonpano | Dressed players |
| Pistetilasto (G+A) | Goals plus assists. Not basketball PTS |
| Maalivahdit | Goalkeeper battle. Floorball-only |
| Erikoistilanteet | Power play / penalty kill. Floorball-only |
| Sarjataulukko | Group table |
| Vastustajat | Common opponents |
| Jaa | Export for a parent chat |

Timeline of goals and penalties is `TimelineEventsList` inside the match view. It is the event tape, not a second table.

## 6. What not to "improve"

- Do not pin Selaa to one series.
- Do not invent a hero match.
- Do not rename V/T/H.
- Do not strip a court number out of `venue_name`.
- Do not overwrite a native `document.modelContext`. See `src/webmcp.ts`.
