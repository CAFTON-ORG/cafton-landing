# rules/

Pure business rules: no database, no `server-only`, so the UI and the server share them and a unit test covers them. `core.ts` plus one file per area, with `core.test.ts` beside it.
