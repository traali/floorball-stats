# Floorball Stats UI components

Status: **component catalog 2026-09-26**. Every file under `src/components/`. Screen contract: [UI_SPEC.md](./UI_SPEC.md). If a row and the file disagree, the file wins.

| File | Mounted by | What the parent sees | Why |
|---|---|---|---|
| `Layout.tsx` | `routes.tsx` | Chrome, header, bottom nav | One shell |
| `Header.tsx` | Layout, team page | IceMark, Floorball Stats, SSBL · Salibandyliitto, WebMCP badge | Source is the federation, not a guess |
| `IceMark.tsx` | Header, Home | Ice glyph | Identity. Floorball, not a basketball court |
| `WebMcpBadge.tsx` | Header | Native host vs polyfill | Not a dataset |
| `BottomNav.tsx` | Layout | Etusivu, Selaa, Haku, Suosikit | Selaa is `/browse` |
| `FloorballStandingsTable.tsx` | Group, team, match | Sarjataulukko & Kuntopuntari, SSBL Taso, Joukkue, O V T H, Maalit, Ero, Pisteet, Kunto | Voitto 2p, tasapeli 1p. Keep V/T/H |
| `PeriodScoreCard.tsx` | Match | Koti, Vieras, Erät | Period boxes. 1st/2nd/3rd, not basketball quarters |
| `EnnakkoRosters.tsx` | Match Kokoonpano | Dressed players, or Kokoonpanoa ei saatu SSBL:stä | Empty is honest |
| `GameBoxes.tsx` | EnnakkoRosters, player card | Small game chips | Played / did-not-play at a glance |
| `LeaderboardTable.tsx` | Match Pistetilasto | Pelaajatilastot, Pelaaja, Joukkue, Pisteet (G+A) | Goals plus assists. Not PTS |
| `GoalkeeperBattleCard.tsx` | Match Maalivahdit | Torjuntatilastot, Torjunnat, Päästetyt | Floorball only |
| `SpecialTeamsCard.tsx` | Match Erikoistilanteet | Ylivoima (YV%), Alivoima (AV%), erä momentum | Power play. Floorball only |
| `TimelineEventsList.tsx` | Match | Goals and penalties in order. Ei kirjattuja tapahtumia if none | The tape. Not a second table |
| `CommonOpponents.tsx` | Match Vastustajat | Form V/T/H, previous meetings, shared opponents | Uusin vasemmalla. No meetings means say so |
| `FloorballPlayerCard.tsx` | Player page | Season games, newest first, grey = did not play, Joukkueet | The player, not the match |
| `MatchPreviewExport.tsx` | Match Jaa | Share card | Parent chat. Not a live feed |

## Unmounted — do not wire a second roster or schedule

| File | What it would show | Why it is unused |
|---|---|---|
| `TeamRosterView.tsx` | Virallinen SSBL pelaajalista | Team page already renders the roster |
| `TeamScheduleView.tsx` | Valitse ottelu, V/H/T | Team page already lists fixtures |
| `FloorballTeamOnboarding.tsx` | Lisää oma salibandyjoukkue form | Home is search and browse |
