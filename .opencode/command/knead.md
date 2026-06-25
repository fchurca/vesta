---
description: Review all modified/new files for integrity, consistency, and correctness. Cross-check function signatures between TS and web JS, verify no dead references or drift, check script load order, and report any issues.
---

Review all modified and new files for integrity, consistency, and correctness.

1. Read every file modified since the last commit (use `git diff --name-only HEAD` to find them).
2. Cross-check function signatures between `src/vesta.ts` and the web JS files (`web/game.js`, `web/board.js`, `web/ui.js`, `web/storage.js`) — every call must match the TS signature.
3. Verify no dead references: search for any function, constant, or variable that is defined but never used, or used but never defined.
4. Check script load order in `web/index.html` and inline order in `web/bake.mjs` — dependencies must load before consumers.
5. Check that `_vertexCache` / `_edgeCache` are initialized (`buildVertexEdgeCache` called) before any consumer reads them.
6. Check that the TS `deriveLog` and the JS inline log generate the same messages for all move types (roll, settlement, road, city, trade, end-turn/Game-begins).
7. Report any issues found with file paths and line numbers. If everything is clean, say so.
