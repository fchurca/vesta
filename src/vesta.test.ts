import { describe, it } from "node:test"
import { equal, ok } from "node:assert/strict"
import { createGame, hexNeighbors } from "./vesta.ts"

describe("createGame", () => {
  it("returns a board with 19 tiles and all tiles connected", () => {
    const game = createGame({ players: 4, roll: 42 })
    equal(game.board.tiles.length, 19)

    const coordSet = new Set(game.board.tiles.map(t => `${t.coord.q},${t.coord.r}`))
    for (const tile of game.board.tiles) {
      const connected = hexNeighbors(tile.coord)
        .filter(n => coordSet.has(`${n.q},${n.r}`))
      ok(connected.length >= 2, `tile (${tile.coord.q},${tile.coord.r}) has ${connected.length} neighbor(s)`)
    }
  })
})
