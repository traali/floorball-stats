# Discovery Canon — every stats monastery

House gap G14. Football-stats is the gold path. Floorball now matches it. Basketball and volleyball copy this, not a hardcoded match.

Keep the house stack (Vite SPA + wrangler). Do **not** swap in TanStack Start / Grok scaffold.

## Required routes

| Path | What it does |
|---|---|
| `/` | Search box + chips + popular teams + featured form V/T/H + competitions |
| `/search?q=` | Clubs, teams, competitions, categories, players, match IDs, tulospalvelu URLs |
| `/browse` | Competition list with region/age filters |
| `/competition/:id` | Categories with U12/U14/P13/Tytöt chips |
| `/competition/:id/category/:cat` | Groups / lohkot |
| `/group/:comp/:cat/:group` | Standings + fixtures, team names clickable |
| `/club/:id` | All teams of a club, grouped by age |
| `/team/:id` | Schedule, roster (player links), live standings, form V/T/H |
| `/player/:id` | Teams, season line, match log |
| `/match/:id` | Match centre. Both team names are links. Scorers link to players. |
| `/favorites` | localStorage teams / clubs / players |

## Bottom nav (non-negotiable)

`Etusivu · Selaa · Haku · Suosikit`

Never hardcode a match id or a single team id in the tab bar. That is what made floorball look like "only one game".

## Search contract

1. Parse tulospalvelu / Torneopal URLs (`ottelu`, `joukkue`, `pelaaja`, `seura`).
2. Numeric 4–8 digit ids try match, team, player, club.
3. Text ≥ 2 chars: club index → expand club teams → current-season categories → roster name scan on featured + matching club teams.
4. Accent-insensitive Finnish (`Erä` = `Era`).
5. Quick chips on home (`Westend`, `U14`, `P13`, club names).
6. Form letters are Finnish **V / T / H** (voitto / tasapeli / tappio), never W/D/L.

## Copy this into

- `basketball-stats` (Basket.fi)
- `volleyball-stats` (Lentopalloliitto)
- any new stats house
