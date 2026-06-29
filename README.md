# VESTA: VESTA Expanding Settlements Through Accord

A decentralized settlement-building board game built on Nostr and URD.

Vesta shares its name with the Roman goddess of the hearth, home, and family — fitting for a game where settlements expand not by conquest but by voluntary accord around a communal table.

[Try it now!](https://fchurca.github.io/vesta/)

License: see [LICENSE](./LICENSE) file (BSD 2-Clause).

![VESTA](./doc/vesta.png)

## Dependencies

Relies on [URD](https://github.com/fchurca/urd) for verifiable randomness.

## Features

### Implemented
- Deterministic board generation with configurable seed
- Settlement, city, and road building (resource costs, distance rule, connectivity)
- Dice rolling with resource production
- 7-roll robber flow (discard modal → robber movement → steal)
- Bank and player-to-player trading with port rates
- Development cards (knight, victory point, monopoly, year of plenty, road building)
- Largest Army and Longest Road bonus victory points
- Hot-seat local play with save/resume

### Planned
- Nostr webclient (nip-XX event types for game actions)
- Verifiable dice rolls and board generation via URD
- Cryptographically private development card draws

## Links

- 🐙 [GitHub](https://github.com/fchurca/vesta) [![Deploy to GitHub Pages](https://github.com/fchurca/vesta/actions/workflows/deploy.yml/badge.svg)](https://github.com/fchurca/vesta/actions/workflows/deploy.yml)
- 🔮 [Urd](https://github.com/fchurca/urd)
- 🏯 [La Crypta Dev](https://www.lacrypta.dev/hackathons/zaps/8ab7e22b-9b17-409a-8519-488c01aa1114)
- 🌑 [Luna Negra](https://luna.naranja.fit/game/vesta)

