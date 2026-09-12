# Workflow: Chapter (Session Opening Rite)
The opening rite for any agent session in `floorball-stats`.

## Steps
1. **Read `AGENTS.md`**: Verify non-negotiables, stack rules, and testing requirements.
2. **Read the tail of `ROLL.md`**: Review the last ~10 entries to understand recent decisions and dead ends.
3. **Read the Task**: Understand the user request or feature spec.
4. **Select Accountable Office & Model Tier**:
   - `cellarer_office`: Vite/PWA config, package scripts, edge caching (`pro`/`flash`)
   - `scriptorium_office`: SSBL Torneopal parsers, 3-period event ingest (`pro`/`flash`)
   - `prior_office`: YV%/AV%, F-liiga 3-2-1-0 points, forfeit 5-0 (`pro`)
   - `works_office`: Match card, period timeline, special-teams radar (`inherit`/`flash`)
   - `sacrist_office`: Domain invariant tests, mock fixtures (`flash`)
   - `legate_office`: `SportStatsContract` conformance with Pelipäivä (`pro`/`inherit`)
   - `visitor_office`: Clean-room adversarial audit (`pro`/`inherit`)
5. **Plan Before Execution**: Formulate a concise plan. For major changes, write an implementation plan.
