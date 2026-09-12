# Floorball Stats — 5-point test spec

1. **User Journey:** A parent searches Westend, opens a team, then a match with 3 periods, YV/AV and player links.
2. **Reason it exists:** SSBL pages must discover teams/tournaments/players, not a single hardcoded game.
3. **What it tests:** `SportStatsContract`, `searchDiscovery`, taso-proxy `/ssbl` then origin+`_cb`.
4. **When it succeeds:** Search "Westend" lists teams; team page has last-5 form; match periods sum to the final score.
5. **When it should fail:** Home is a single match with no search; period count ≠ 3; SSBL JSON `call.status` not ok; live match cached; upcoming roster cached longer than 60s.
