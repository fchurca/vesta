# VESTA Game Rules

## Overview

VESTA is a web adaptation of the classic Settlers of Catan board game. 2-4 players compete to build settlements, cities, and roads on the island of VESTA. Players collect and trade resources to expand their civilization and earn victory points. The first player to reach **10 victory points** wins.

## Setup

1. The board consists of 19 hexagonal tiles arranged in a honeycomb pattern. Each tile produces one of five resources - brick, lumber, wool, grain, or ore - except the desert tile which produces nothing.
2. Each tile (except the desert) has a number token from 2-12. Number 7 is not used on tiles.
3. Each player starts with two settlements and two roads placed during the initial placement phase.
4. During initial placement, players receive one resource for each adjacent non-desert tile from their second settlement.

## Turn Structure

Each turn follows this order:

1. **Roll**: The active player rolls two dice. Tiles matching the sum produce resources for any player with an adjacent settlement (1 resource) or city (2 resources).
2. **Robber (7)**: If a 7 is rolled, all players with more than 7 resources discard half (rounded down). The active player moves the robber to any tile and may steal one resource from an opponent building on that tile.
3. **Trade and Build**: The active player may trade resources and build roads, settlements, cities, or buy development cards in any order.
4. **End Turn**: Play passes to the next player clockwise.

## Resources

### Resource Types

| Resource | Produced By |
|----------|-------------|
| Brick    | Hills       |
| Lumber   | Forest      |
| Wool     | Pasture     |
| Grain    | Fields      |
| Ore      | Mountains   |

### Production

When a tile's number is rolled, each player with a building on a vertex of that tile collects resources:
- **Settlement**: 1 resource
- **City**: 2 resources

### Discarding

When a 7 is rolled, any player with **more than 7** resource cards must discard half (rounded down). Discarded cards are returned to the bank.

## Building

### Costs

| Building   | Cost                                        | Max |
|------------|---------------------------------------------|-----|
| Road       | 1 brick + 1 lumber                          | 15  |
| Settlement | 1 brick + 1 lumber + 1 wool + 1 grain       | 5   |
| City       | 2 grain + 3 ore                             | 4   |
| Dev Card   | 1 ore + 1 wool + 1 grain                    | -   |

### Rules

- **Roads** must connect to an existing road or settlement owned by the player.
- **Settlements** must be at least 2 road segments away from any other settlement (distance rule). During regular play, a settlement must also connect to one of the player's roads.
- **Cities** can only be built by upgrading an existing settlement. The settlement is replaced by a city, which produces 2 resources instead of 1.
- **Road building** is also available as a development card that lets the player place two free roads.

## Development Cards

There are 25 development cards in the deck:

| Card Type      | Count | Effect |
|----------------|-------|--------|
| Knight         | 14    | Activate the robber (move and steal). The first player to play 3 knights gains the Largest Army card (+2 VP). |
| Victory Point  | 5     | +1 victory point. Played immediately. |
| Monopoly       | 2     | Take all of one resource from all opponents. |
| Year of Plenty | 2     | Draw any 2 resources from the bank. |
| Road Building  | 2     | Place 2 free roads. |

- A development card may not be played on the turn it is bought.
- Multiple knights can be played in the same turn.

## Trading

### Bank Trading

Players may trade resources with the bank at published rates. The default rate is **4:1** (4 of any resource for 1 of any other). Ports around the board provide better rates:
- **3:1 port**: Trade 3 of any resource for 1 of any other.
- **2:1 port**: Trade 2 of a specific resource for 1 of any other.

### Player Trading

Players may propose trades to other players. A trade proposal specifies what resources the active player gives and what they want in return. The receiving player may accept or reject the trade.

## Special Cards

### Largest Army (+2 VP)

The first player to play 3 or more knight cards receives the Largest Army card, worth 2 victory points. If another player surpasses the current holder's knight count, they take the Largest Army card. In case of a tie, the current holder retains the card.

### Longest Road (+2 VP)

The player with the longest continuous road of at least 5 segments receives the Longest Road card, worth 2 victory points. If another player builds a longer road, they take the card. A road is broken by opponent settlements. In case of a tie, the current holder retains the card.

## Victory Points

Victory points are earned from:

| Source             | VP |
|--------------------|-----|
| Each settlement    | 1  |
| Each city          | 2  |
| Largest Army       | 2  |
| Longest Road       | 2  |
| Victory Point card | 1  |

The first player to reach 10 victory points on their turn wins immediately.

## Ports

9 ports are distributed around the board:
- Four **3:1 ports** (trade 3 of any resource)
- Five **2:1 ports**, one for each resource type

A settlement or city on a port vertex allows the player to use that port's trade rate.
