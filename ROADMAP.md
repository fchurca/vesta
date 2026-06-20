# VESTA Roadmap

## Status

| What | Status |
|---|---|
| Core TS types + `createGame` | Done |
| README + symbology | Done |
| Web client (hotseat, no network) | In progress |
| URD integration | Next |
| Nostr bindings | Planned |

## Current: Hotseat web client

Single-page HTML/JS/CSS app, no build step, works from any webserver or file://.

### Files

| File | Status |
|---|---|
| `web/index.html` | Done |
| `web/style.css` | Done |
| `web/game.js` | Done |
| `web/board.js` | Done |
| `web/ui.js` | Done |
| `web/bake.mjs` | Done |

### Game phases

1. **Setup** — enter player names (2-4), click Start
2. **Initial placement** — forward order (1→N), then reverse (N→1), place settlement + road each
3. **Play** — roll dice, distribute resources, build, end turn
4. **Win** — first to 10 victory points

### Next after hotseat

- URD integration for verifiable dice
- Nostr events for multiplayer
- Trading, dev cards, robber
- PWA packaging
