# Match page roster = football Ennakko

House: floorball-stats. Copy to basketball-stats and volleyball-stats.

## Rule

Upcoming **and** played match pages always render two-column **player cards** (name, #, G+A=P). Tap → player page.

Do **not** wait for official lineup. Use:

1. `getMatch` embedded players (`players[]`, `team_A_players`, `lineups.A`)
2. Else `getTeam?team_id=` season roster (`players=1` retry)

Empty state: "Kokoonpanoa ei saatu …stä." Never hide the section.

## TASO

`getTeam` / `getMatch` via `taso-proxy.sakkoja.workers.dev/{ssbl|basket|volley}/…` then origin. Proxy 403 is JSON `{call.status:error}` — client must fall through, not paint HTTP 403.

## Tabs

Football: `MatchLineups`. Floorball: `EnnakkoRosters` + **Kokoonpano** tab.
