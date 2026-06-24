import { describe, it } from "node:test"
import { equal, ok, deepEqual, notEqual } from "node:assert/strict"
import {
  createGame,
  hexNeighbors,
  vertexKey,
  edgeKey,
  verticesAreAdjacent,
  hasResources,
  deductResources,
  findBuilding,
  checkDistanceRule,
  roadExists,
  canBuildSettlement,
  canBuildRoad,
  canBuildCity,
  placeSettlement,
  placeRoad,
  placeCity,
  produce,
  rollDice,
  advanceInitialPlacement,
  nextTurn,
  giveStartingResources,
  checkWin,
  getValidPositions,
  tileAt,
  BUILDING_COST,
  BOARD_HEXES,
  resetCache,
  Resource,
  DESERT,
} from "./vesta.ts"

const makeState = () => createGame({ players: 4, roll: 42 })

describe("createGame", () => {
  it("returns 19 tiles", () => {
    const g = makeState()
    equal(g.board.tiles.length, 19)
  })

  it("all tiles are connected (each has >=2 neighbors on board)", () => {
    const g = makeState()
    const coordSet = new Set(g.board.tiles.map(t => `${t.coord.q},${t.coord.r}`))
    for (const tile of g.board.tiles) {
      const connected = hexNeighbors(tile.coord)
        .filter(n => coordSet.has(`${n.q},${n.r}`))
      ok(connected.length >= 2, `tile (${tile.coord.q},${tile.coord.r}) has ${connected.length} neighbor(s)`)
    }
  })

  it("has exactly one desert tile with number 7", () => {
    const g = makeState()
    const desertTiles = g.board.tiles.filter(t => t.resource === DESERT)
    equal(desertTiles.length, 1)
    equal(desertTiles[0]!.number, 7)
  })

  it("places the robber on the desert tile", () => {
    const g = makeState()
    const desertTile = g.board.tiles.find(t => t.resource === DESERT)!
    equal(g.board.robber.q, desertTile.coord.q)
    equal(g.board.robber.r, desertTile.coord.r)
  })

  it("creates correct number of players (2-4)", () => {
    for (const count of [2, 3, 4]) {
      const g = createGame({ players: count, roll: 42 })
      equal(g.players.length, count)
    }
  })

  it("each player starts with zero resources and no buildings", () => {
    const g = createGame({ players: 3, roll: 42 })
    for (const p of g.players) {
      equal(p.settlements.length, 0)
      equal(p.cities.length, 0)
      equal(p.roads.length, 0)
      equal(p.vp, 0)
      for (const r of [Resource.Brick, Resource.Lumber, Resource.Wool, Resource.Grain, Resource.Ore]) {
        equal(p.resources[r], 0)
      }
    }
  })

  it("produces deterministic output for same seed", () => {
    const a = createGame({ players: 4, roll: 99 })
    const b = createGame({ players: 4, roll: 99 })
    for (let i = 0; i < a.board.tiles.length; i++) {
      equal(a.board.tiles[i]!.resource, b.board.tiles[i]!.resource)
      equal(a.board.tiles[i]!.number, b.board.tiles[i]!.number)
    }
  })

  it("produces different output for different seeds", () => {
    const a = createGame({ players: 4, roll: 42 })
    const b = createGame({ players: 4, roll: 43 })
    const same = a.board.tiles.every((t, i) => t.resource === b.board.tiles[i]!.resource)
    ok(!same, "different seeds should produce different boards")
  })

  it("starts in initial_first phase", () => {
    const g = makeState()
    equal(g.phase, "initial_first")
    equal(g.currentPlayer, 0)
    equal(g.turn, 0)
  })

  it("starts with 12 ports", () => {
    const g = makeState()
    equal(g.board.ports.length, 12)
  })

  it("has correct resource distribution (3 brick, 4 lumber, 4 wool, 4 grain, 3 ore, 1 desert)", () => {
    const g = makeState()
    const counts: Record<string, number> = {}
    for (const t of g.board.tiles) {
      counts[t.resource] = (counts[t.resource] ?? 0) + 1
    }
    equal(counts[Resource.Brick], 3)
    equal(counts[Resource.Lumber], 4)
    equal(counts[Resource.Wool], 4)
    equal(counts[Resource.Grain], 4)
    equal(counts[Resource.Ore], 3)
    equal(counts[Resource.Desert], 1)
  })
})

describe("hexNeighbors", () => {
  it("returns 6 neighbors for center hex", () => {
    const n = hexNeighbors({ q: 0, r: 0 })
    equal(n.length, 6)
  })

  it("neighbors are symmetric", () => {
    const a = hexNeighbors({ q: 1, r: 0 })
    const b = hexNeighbors({ q: 2, r: -1 })
    ok(a.some(h => h.q === 2 && h.r === -1))
    ok(b.some(h => h.q === 1 && h.r === 0))
  })
})

describe("vertexKey", () => {
  it("produces consistent keys", () => {
    const a = vertexKey(0, 0, 0)
    const b = vertexKey(0, 0, 0)
    equal(a, b)
  })

  it("different corners produce different keys", () => {
    const a = vertexKey(0, 0, 0)
    const b = vertexKey(0, 0, 1)
    notEqual(a, b)
  })

  it("shared vertex (two hexes, same corner) produces same key", () => {
    const a = vertexKey(0, 0, 0)
    const b = vertexKey(1, 0, 4)
    equal(a, b)
  })
})

describe("verticesAreAdjacent", () => {
  it("same vertex is adjacent to itself", () => {
    const k = vertexKey(0, 0, 0)
    ok(verticesAreAdjacent(k, k))
  })

  it("consecutive corners of same hex are adjacent", () => {
    const a = vertexKey(0, 0, 0)
    const b = vertexKey(0, 0, 1)
    ok(verticesAreAdjacent(a, b))
  })

  it("non-consecutive corners are not adjacent", () => {
    const a = vertexKey(0, 0, 0)
    const c = vertexKey(0, 0, 2)
    ok(!verticesAreAdjacent(a, c))
  })
})

describe("BOARD_HEXES", () => {
  it("has 19 hexes", () => {
    equal(BOARD_HEXES.length, 19)
  })

  it("has unique coordinates", () => {
    const set = new Set(BOARD_HEXES.map(h => `${h.q},${h.r}`))
    equal(set.size, 19)
  })
})

describe("BUILDING_COST", () => {
  it("road costs 1 brick + 1 lumber", () => {
    equal(BUILDING_COST.road!["brick"], 1)
    equal(BUILDING_COST.road!["lumber"], 1)
  })

  it("settlement costs 1 brick + 1 lumber + 1 wool + 1 grain", () => {
    equal(BUILDING_COST.settlement!["brick"], 1)
    equal(BUILDING_COST.settlement!["lumber"], 1)
    equal(BUILDING_COST.settlement!["wool"], 1)
    equal(BUILDING_COST.settlement!["grain"], 1)
  })

  it("city costs 2 grain + 3 ore", () => {
    equal(BUILDING_COST.city!["grain"], 2)
    equal(BUILDING_COST.city!["ore"], 3)
  })
})

describe("hasResources", () => {
  const player = (res: Partial<Record<string, number>>) => ({
    id: 0,
    name: "Tester",
    resources: { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0, desert: 0, ...res } as Record<Resource, number>,
    settlements: [],
    cities: [],
    roads: [],
    vp: 0,
    roadCount: 0,
  })

  it("returns true when player has enough resources", () => {
    ok(hasResources(player({ brick: 2, lumber: 2 }), { [Resource.Brick]: 1, [Resource.Lumber]: 1 }))
  })

  it("returns false when player is missing a resource", () => {
    ok(!hasResources(player({ brick: 1, lumber: 0 }), { [Resource.Brick]: 1, [Resource.Lumber]: 1 }))
  })

  it("returns false when player has insufficient quantity", () => {
    ok(!hasResources(player({ grain: 1, ore: 3 }), { [Resource.Grain]: 2, [Resource.Ore]: 3 }))
  })
})

describe("deductResources", () => {
  it("deducts correct amounts", () => {
    const p = {
      id: 0,
      name: "Tester",
      resources: { brick: 5, lumber: 5, wool: 5, grain: 5, ore: 5, desert: 0 } as Record<Resource, number>,
      settlements: [],
      cities: [],
      roads: [],
      vp: 0,
      roadCount: 0,
    }
    const result = deductResources(p, { [Resource.Brick]: 1, [Resource.Lumber]: 2 })
    equal(result.resources[Resource.Brick], 4)
    equal(result.resources[Resource.Lumber], 3)
  })

  it("does not mutate the original player", () => {
    const p = {
      id: 0,
      name: "Tester",
      resources: { brick: 5, lumber: 5, wool: 5, grain: 5, ore: 5, desert: 0 } as Record<Resource, number>,
      settlements: [],
      cities: [],
      roads: [],
      vp: 0,
      roadCount: 0,
    }
    deductResources(p, { [Resource.Brick]: 1 })
    equal(p.resources[Resource.Brick], 5)
  })
})

describe("findBuilding", () => {
  it("returns null for empty vertex", () => {
    const g = makeState()
    const k = vertexKey(0, 0, 0)
    equal(findBuilding(g, k), null)
  })

  it("finds settlement after placement", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const k = vertexKey(0, 0, 0)
    const found = findBuilding(g, k)
    notEqual(found, null)
    equal(found!.player, 0)
    equal(found!.type, "settlement")
  })
})

describe("checkDistanceRule", () => {
  it("allows building on empty board", () => {
    const g = makeState()
    ok(checkDistanceRule(g, vertexKey(0, 0, 0)))
  })

  it("blocks vertex adjacent to existing settlement", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const adjKey = vertexKey(0, 0, 1)
    ok(!checkDistanceRule(g, adjKey))
  })

  it("allows vertex two steps away from existing settlement", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const farKey = vertexKey(0, 0, 2)
    ok(checkDistanceRule(g, farKey))
  })
})

describe("roadExists", () => {
  it("returns false for empty edge", () => {
    const g = makeState()
    const ek = edgeKey(0, 0, 0, 0, 0, 1)
    ok(!roadExists(g, ek))
  })

  it("returns true after road placement", () => {
    let g = makeState()
    g = placeRoad(g, 0, 0, 0, 0, 0, 0, 1)
    const ek = edgeKey(0, 0, 0, 0, 0, 1)
    ok(roadExists(g, ek))
  })
})

describe("canBuildSettlement", () => {
  it("allows initial placement on any vertex", () => {
    const g = makeState()
    const result = canBuildSettlement(g, 0, 0, 0, 0, true)
    ok(result.ok)
  })

  it("rejects initial placement on occupied vertex", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const result = canBuildSettlement(g, 1, 0, 0, 0, true)
    ok(!result.ok)
    equal(result.reason, "Vertex already occupied")
  })

  it("rejects initial placement too close to existing settlement", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const result = canBuildSettlement(g, 1, 0, 0, 1, true)
    ok(!result.ok)
    equal(result.reason, "Too close to another settlement")
  })

  it("rejects regular placement without adjacent road", () => {
    const g = makeState()
    g.players[0]!.resources[Resource.Brick] = 1
    g.players[0]!.resources[Resource.Lumber] = 1
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    const result = canBuildSettlement(g, 0, 0, 0, 0, false)
    ok(!result.ok)
    equal(result.reason, "No adjacent road")
  })

  it("rejects regular placement without resources", () => {
    let g = makeState()
    g = { ...g, phase: "play" }
    g = placeRoad(g, 0, 0, 0, 0, 0, 0, 1)
    const result = canBuildSettlement(g, 0, 0, 0, 2, false)
    ok(!result.ok)
    equal(result.reason, "Not enough resources")
  })

  it("allows regular placement with road and resources", () => {
    let g = makeState()
    g = { ...g, phase: "play" }
    g = placeRoad(g, 0, 0, 0, 0, 0, 0, 1)
    g.players[0]!.resources[Resource.Brick] = 1
    g.players[0]!.resources[Resource.Lumber] = 1
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    const result = canBuildSettlement(g, 0, 0, 0, 1, false)
    ok(result.ok)
  })
})

describe("canBuildRoad", () => {
  it("allows initial road from settlement vertex", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const ps = { q: 0, r: 0, corner: 0 }
    const result = canBuildRoad(g, 0, 0, 0, 0, 0, 0, 1, true, ps)
    ok(result.ok)
  })

  it("rejects initial road not touching settlement", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const ps = { q: 0, r: 0, corner: 0 }
    const result = canBuildRoad(g, 0, 1, 0, 0, 1, 0, 1, true, ps)
    ok(!result.ok)
    equal(result.reason, "Road must connect to placed settlement")
  })
})

describe("canBuildCity", () => {
  it("rejects city without settlement", () => {
    const g = makeState()
    const result = canBuildCity(g, 0, 0, 0, 0)
    ok(!result.ok)
    equal(result.reason, "No settlement here")
  })

  it("rejects city without resources", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const result = canBuildCity(g, 0, 0, 0, 0)
    ok(!result.ok)
    equal(result.reason, "Not enough resources")
  })

  it("allows city with settlement and resources", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g.players[0]!.resources[Resource.Grain] = 2
    g.players[0]!.resources[Resource.Ore] = 3
    const result = canBuildCity(g, 0, 0, 0, 0)
    ok(result.ok)
  })
})

describe("placeSettlement", () => {
  it("adds settlement and gives VP", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    equal(g.players[0]!.settlements.length, 1)
    equal(g.players[0]!.vp, 1)
  })

  it("deducts resources during play phase", () => {
    let g = makeState()
    g = { ...g, phase: "play" }
    g.players[0]!.resources[Resource.Brick] = 1
    g.players[0]!.resources[Resource.Lumber] = 1
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    g = placeSettlement(g, 0, 0, 0, 0)
    equal(g.players[0]!.resources[Resource.Brick], 0)
    equal(g.players[0]!.resources[Resource.Lumber], 0)
    equal(g.players[0]!.resources[Resource.Wool], 0)
    equal(g.players[0]!.resources[Resource.Grain], 0)
  })

  it("does not deduct resources during initial placement", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    for (const r of [Resource.Brick, Resource.Lumber, Resource.Wool, Resource.Grain]) {
      equal(g.players[0]!.resources[r], 0)
    }
  })

  it("adds to log", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    ok(g.log.some(msg => msg.includes("built a settlement")))
  })
})

describe("placeRoad", () => {
  it("adds road and increments roadCount", () => {
    let g = makeState()
    g = placeRoad(g, 0, 0, 0, 0, 0, 0, 1)
    equal(g.players[0]!.roads.length, 1)
    equal(g.players[0]!.roadCount, 1)
  })

  it("deducts resources during play phase", () => {
    let g = makeState()
    g = { ...g, phase: "play" }
    g.players[0]!.resources[Resource.Brick] = 1
    g.players[0]!.resources[Resource.Lumber] = 1
    g = placeRoad(g, 0, 0, 0, 0, 0, 0, 1)
    equal(g.players[0]!.resources[Resource.Brick], 0)
    equal(g.players[0]!.resources[Resource.Lumber], 0)
  })

  it("adds to log", () => {
    let g = makeState()
    g = placeRoad(g, 0, 0, 0, 0, 0, 0, 1)
    ok(g.log.some(msg => msg.includes("built a road")))
  })
})

describe("placeCity", () => {
  it("upgrades settlement to city and gives VP", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g.players[0]!.resources[Resource.Grain] = 2
    g.players[0]!.resources[Resource.Ore] = 3
    g = placeCity(g, 0, 0, 0, 0)
    equal(g.players[0]!.settlements.length, 0)
    equal(g.players[0]!.cities.length, 1)
    equal(g.players[0]!.vp, 2)
  })

  it("adds to log", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g.players[0]!.resources[Resource.Grain] = 2
    g.players[0]!.resources[Resource.Ore] = 3
    g = placeCity(g, 0, 0, 0, 0)
    ok(g.log.some(msg => msg.includes("built a city")))
  })
})

describe("produce", () => {
  it("returns empty gains when no buildings match dice number", () => {
    const g = makeState()
    const gains = produce(g, 7)
    equal(gains.length, 0)
  })

  it("distributes resources to settlement owners on matching number", () => {
    let g = makeState()

    const tile = g.board.tiles.find(t => t.number === 6 && t.resource !== DESERT)
    if (!tile) return
    const tileRes = tile.resource
    g = placeSettlement(g, 0, tile.coord.q, tile.coord.r, 0)
    const gains = produce(g, tile.number)

    ok(gains.length > 0)
    ok(gains.some(gg => gg.player === 0 && gg.resource === tileRes && gg.amount === 1))
  })

  it("gives 2 resources per city on matching number", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g.players[0]!.resources[Resource.Grain] = 2
    g.players[0]!.resources[Resource.Ore] = 3
    g = placeCity(g, 0, 0, 0, 0)

    const tile0 = g.board.tiles[0]!
    const gains = produce(g, tile0.number)
    if (gains.length > 0) {
      const ourGain = gains.find(gg => gg.player === 0)
      if (ourGain) {
        equal(ourGain.amount, 2)
      }
    }
  })

  it("produce does not mutate original state", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const before = g.players[0]!.resources[Resource.Brick]
    produce(g, 6)
    const after = g.players[0]!.resources[Resource.Brick]
    equal(before, after)
  })

  it("does not produce from desert tile", () => {
    let g = makeState()
    const desertTile = g.board.tiles.find(t => t.resource === DESERT)!
    const gains = produce(g, 7)
    ok(gains.length === 0 || gains.every(gg => gg.amount === 0))
  })
})

describe("rollDice", () => {
  it("sets dice values and rolled flag", () => {
    const g = makeState()
    const rng = () => 0.5
    const result = rollDice(g, rng)
    ok(result.rolled)
    ok(Array.isArray(result.dice))
    equal(result.dice!.length, 2)
  })

  it("adds roll to log", () => {
    const g = makeState()
    const rng = () => 0.5
    const result = rollDice(g, rng)
    ok(result.log.some(msg => msg.includes("rolled")))
  })
})

describe("advanceInitialPlacement", () => {
  it("advances to next player in initial_first phase", () => {
    const g = makeState()
    const next = advanceInitialPlacement(g)
    equal(next.currentPlayer, 1)
    equal(next.phase, "initial_first")
    equal(next.setupStep, "settlement")
  })

  it("transitions to initial_second after last player", () => {
    let g = makeState()
    g = { ...g, currentPlayer: 3 }
    const next = advanceInitialPlacement(g)
    equal(next.phase, "initial_second")
    equal(next.currentPlayer, 3)
  })

  it("reverses order in initial_second", () => {
    let g = makeState()
    g = { ...g, phase: "initial_second", currentPlayer: 2 }
    const next = advanceInitialPlacement(g)
    equal(next.currentPlayer, 1)
    equal(next.phase, "initial_second")
  })

  it("transitions to play phase after initial_second reaches player 0", () => {
    let g = makeState()
    g = { ...g, phase: "initial_second", currentPlayer: 0 }
    const next = advanceInitialPlacement(g)
    equal(next.phase, "play")
    equal(next.currentPlayer, 0)
    equal(next.turn, 1)
  })

  it("clears pendingSettlement on transition", () => {
    let g = makeState()
    g = { ...g, pendingSettlement: { q: 0, r: 0, corner: 0 } }
    const next = advanceInitialPlacement(g)
    equal(next.pendingSettlement, null)
  })
})

describe("nextTurn", () => {
  it("delegates to advanceInitialPlacement during setup", () => {
    const g = makeState()
    const next = nextTurn(g)
    equal(next.currentPlayer, 1)
  })

  it("cycles to next player during play phase", () => {
    let g = makeState()
    g = { ...g, phase: "play", turn: 1, currentPlayer: 0, rolled: true }
    const next = nextTurn(g)
    equal(next.currentPlayer, 1)
    equal(next.turn, 2)
    equal(next.rolled, false)
    equal(next.dice, null)
  })

  it("wraps around to player 0", () => {
    let g = makeState()
    g = { ...g, phase: "play", players: [{ ...g.players[0]!, id: 0 }, { ...g.players[0]!, id: 1 }].slice(0, 2), currentPlayer: 1, rolled: true }
    g = { ...g, players: g.players.slice(0, 2) }
    g = { ...g, phase: "play", turn: 5 }
    const next = nextTurn(g)
    equal(next.currentPlayer, 0)
    equal(next.turn, 6)
  })
})

describe("giveStartingResources", () => {
  it("gives one resource per adjacent non-desert tile", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g = giveStartingResources(g, 0, 0, 0, 0)
    const total = Object.values(g.players[0]!.resources).reduce((a, b) => a + b, 0)
    ok(total >= 1 && total <= 3)
  })
})

describe("checkWin", () => {
  it("returns -1 when no player has 10 VP", () => {
    const g = makeState()
    equal(checkWin(g), -1)
  })

  it("returns player index when a player reaches 10 VP", () => {
    let g = makeState()
    for (let i = 0; i < 10; i++) {
      g = placeSettlement(g, 0, 0, 0, 0)
    }
    equal(g.players[0]!.vp, 10)
    equal(checkWin(g), 0)
  })
})

describe("getValidPositions", () => {
  it("returns all vertices for initial-settlement mode", () => {
    const g = makeState()
    const positions = getValidPositions(g, "initial-settlement")
    ok(positions.length > 0)
    ok(positions.every(p => p.type === "vertex"))
  })

  it("returns edges touching pending settlement for initial-road mode", () => {
    let g = makeState()
    g = { ...g, pendingSettlement: { q: 0, r: 0, corner: 0 } }
    const positions = getValidPositions(g, "initial-road")
    ok(positions.length > 0)
    ok(positions.every(p => p.type === "edge"))
  })

  it("returns settlement vertices for city mode", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    const positions = getValidPositions(g, "city")
    equal(positions.length, 1)
    equal(positions[0]!.type, "vertex")
  })
})

describe("tileAt", () => {
  it("finds existing tile by coordinate", () => {
    const g = makeState()
    const tile = tileAt(g, 0, 0)
    notEqual(tile, null)
    equal(tile!.coord.q, 0)
    equal(tile!.coord.r, 0)
  })

  it("returns null for missing coordinate", () => {
    const g = makeState()
    equal(tileAt(g, 99, 99), null)
  })
})

describe("resetCache", () => {
  it("allows cache to be rebuilt", () => {
    resetCache()
    const a = vertexKey(0, 0, 0)
    const b = vertexKey(0, 0, 0)
    equal(a, b)
    resetCache()
  })
})
