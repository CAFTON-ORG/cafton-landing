# Contributing

1. `npm install`, then `npm run dev`.
2. Branch from `main`, one feature or phase step per branch; keep changes focused.
3. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the ADRs in `docs/adr/` before changing structure. File placement rules are in [ADR 0004](docs/adr/0004-folder-structure.md).
4. Public site work does not change its look unless the task says so. Prove it: `npm run build && npm run snapshot:save -- before`, make your change, `npm run build && npm run snapshot:check -- before`. It lists any page whose markup changed (build hashes and class order are ignored).
5. Add tests next to the code (`*.test.ts[x]`). Business rules live in a feature's `rules.ts` and need unit tests.
6. Run `npm run verify` before opening a PR (`npm run build && npm run e2e` for UI changes).
7. Add a Prisma migration with every schema change; never edit an applied migration.
8. Update `docs/ROADMAP.md` checkboxes and add an ADR for any significant decision.
