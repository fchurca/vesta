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
  computeRates,
  canBuyDevCard,
  buyDevCard,
  playDevCard,
  getValidPositions,
  tileAt,
  BUILDING_COST,
  MAX_ROADS,
  MAX_SETTLEMENTS,
  MAX_CITIES,
  BOARD_HEXES,
  resetCache,
  Resource,
  DESERT,
  applyMove,
  replayRecord,
  deriveLog,
  truncateText,
  titleToSlug,
} from "./vesta.ts"

import type { GameMove, GameTurn, GameRecord, TradeResource, DevCard } from "./vesta.ts"

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

  it("starts with 9 ports", () => {
    const g = makeState()
    equal(g.board.ports.length, 9)
  })

  it("ports have correct resource distribution", () => {
    let nullCount = 0
    let specificCount = 0
    const resources = new Set<string>()
    for (let seed = 0; seed < 50; seed++) {
      const g = createGame({ players: 4, roll: seed })
      equal(g.board.ports.length, 9)
      for (const p of g.board.ports) {
        if (p.resource === null) nullCount++
        else { specificCount++; resources.add(p.resource) }
      }
    }
    equal(nullCount, 200)
    equal(specificCount, 250)
    equal(resources.size, 5)
    ok(resources.has(Resource.Brick))
    ok(resources.has(Resource.Lumber))
    ok(resources.has(Resource.Wool))
    ok(resources.has(Resource.Grain))
    ok(resources.has(Resource.Ore))
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

  it("development costs 1 ore + 1 wool + 1 grain", () => {
    equal(BUILDING_COST.development!["ore"], 1)
    equal(BUILDING_COST.development!["wool"], 1)
    equal(BUILDING_COST.development!["grain"], 1)
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
    rates: { brick: 4, lumber: 4, wool: 4, grain: 4, ore: 4 },
    hand: [],
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
      rates: { brick: 4, lumber: 4, wool: 4, grain: 4, ore: 4 },
      hand: [],
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
      rates: { brick: 4, lumber: 4, wool: 4, grain: 4, ore: 4 },
      hand: [],
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

  it("rejects regular placement when max settlements reached", () => {
    let g = makeState()
    g = { ...g, phase: "play" }
    for (let i = 0; i < MAX_SETTLEMENTS; i++) {
      g.players[0]!.settlements.push({ q: i * 10, r: 0, corner: 0 })
    }
    g.players[0]!.resources[Resource.Brick] = 1
    g.players[0]!.resources[Resource.Lumber] = 1
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    const result = canBuildSettlement(g, 0, 50, 0, 0, false)
    ok(!result.ok)
    equal(result.reason, "Maximum settlements reached")
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

  it("rejects regular placement when max roads reached", () => {
    let g = makeState()
    g = { ...g, phase: "play" }
    g = placeSettlement(g, 0, 0, 0, 0)
    g = placeRoad(g, 0, 0, 0, 0, 0, 0, 1)
    g.players[0]!.resources[Resource.Brick] = 1
    g.players[0]!.resources[Resource.Lumber] = 1
    g.players[0]!.roadCount = MAX_ROADS
    const result = canBuildRoad(g, 0, 0, 0, 1, 0, 0, 2, false, null)
    ok(!result.ok)
    equal(result.reason, "Maximum roads reached")
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

  it("rejects city when max cities reached", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g.players[0]!.resources[Resource.Grain] = 2
    g.players[0]!.resources[Resource.Ore] = 3
    g.players[0]!.cities = Array.from({ length: MAX_CITIES }, (_, i) => ({ q: i * 10, r: 0, corner: 0 }))
    const result = canBuildCity(g, 0, 0, 0, 0)
    ok(!result.ok)
    equal(result.reason, "Maximum cities reached")
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

  it("frees a settlement slot for reuse after upgrade", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g.players[0]!.resources[Resource.Grain] = 2
    g.players[0]!.resources[Resource.Ore] = 3
    g = placeCity(g, 0, 0, 0, 0)
    g = { ...g, phase: "play" }
    g.players[0]!.resources[Resource.Brick] = 2
    g.players[0]!.resources[Resource.Lumber] = 2
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    g = placeRoad(g, 0, 0, 0, 1, 0, 0, 2)
    const result = canBuildSettlement(g, 0, 0, 0, 2, false)
    ok(result.ok)
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

describe("computeRates", () => {
  it("returns 4 for all resources when player has no port access", () => {
    const g = makeState()
    const rates = computeRates(g, 0)
    equal(rates.brick, 4)
    equal(rates.lumber, 4)
    equal(rates.wool, 4)
    equal(rates.grain, 4)
    equal(rates.ore, 4)
  })

  it("returns 2 for the matching resource when player uses a 2:1 port", () => {
    const g = makeState()
    for (const port of g.board.ports) {
      if (port.resource !== null) {
        const v = port.vertices[0]
        let g2 = placeSettlement(g, 0, v.q, v.r, v.corner)
        g2 = { ...g2, players: g2.players.map((p, i) =>
          i === 0
            ? { ...p, vp: 2, settlements: [...p.settlements, { q: v.q, r: v.r, corner: v.corner }] }
            : p
        ) as typeof g2.players }
        const rates = computeRates(g2, 0)
        equal(rates[port.resource as TradeResource], 2)
        break
      }
    }
  })

  it("returns 3 for all resources when player uses a 3:1 port", () => {
    const g = makeState()
    for (const port of g.board.ports) {
      if (port.resource === null) {
        const v = port.vertices[0]
        let g2 = placeSettlement(g, 0, v.q, v.r, v.corner)
        g2 = { ...g2, players: g2.players.map((p, i) =>
          i === 0
            ? { ...p, vp: 2, settlements: [...p.settlements, { q: v.q, r: v.r, corner: v.corner }] }
            : p
        ) as typeof g2.players }
        const rates = computeRates(g2, 0)
        equal(rates.brick, 3)
        equal(rates.lumber, 3)
        equal(rates.wool, 3)
        equal(rates.grain, 3)
        equal(rates.ore, 3)
        break
      }
    }
  })
})

describe("devCards", () => {
  it("canBuyDevCard returns false when player has no resources", () => {
    const g = makeState()
    equal(canBuyDevCard(g, 0), false)
  })

  it("canBuyDevCard returns true when player has enough resources", () => {
    const g = makeState()
    g.players[0]!.resources[Resource.Ore] = 1
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    equal(canBuyDevCard(g, 0), true)
  })

  it("buyDevCard adds a card to hand as unavailable", () => {
    let g = makeState()
    g.players[0]!.resources[Resource.Ore] = 1
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    g = buyDevCard(g, 0)
    equal(g.players[0]!.hand.length, 1)
    equal(g.players[0]!.hand[0]!.cardType, "victory")
    equal(g.players[0]!.hand[0]!.available, false)
  })

  it("buyDevCard deducts resources", () => {
    let g = makeState()
    g.players[0]!.resources[Resource.Ore] = 1
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    g = buyDevCard(g, 0)
    equal(g.players[0]!.resources[Resource.Ore], 0)
    equal(g.players[0]!.resources[Resource.Wool], 0)
    equal(g.players[0]!.resources[Resource.Grain], 0)
  })

  it("playDevCard removes the card and grants VP", () => {
    let g = makeState()
    g.players[0]!.hand = [{ cardType: "victory", available: true }]
    g = playDevCard(g, 0, "victory")
    equal(g.players[0]!.hand.length, 0)
    equal(g.players[0]!.vp, 1)
  })

  it("playDevCard refuses unavailable card", () => {
    let g = makeState()
    g.players[0]!.hand = [{ cardType: "victory", available: false }]
    g = playDevCard(g, 0, "victory")
    equal(g.players[0]!.hand.length, 1)
    equal(g.players[0]!.vp, 0)
  })

  it("playDevCard refuses card not in hand", () => {
    let g = makeState()
    g = playDevCard(g, 0, "victory")
    equal(g.players[0]!.hand.length, 0)
    equal(g.players[0]!.vp, 0)
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

describe("applyMove", () => {
  it("roll-dice sets dice and rolled flag", () => {
    const g = makeState()
    const next = applyMove(g, { type: "roll-dice", player: 0, dice: [3, 4] })
    equal(next.dice![0], 3)
    equal(next.dice![1], 4)
    ok(next.rolled)
  })

  it("roll-dice produces resources for matching buildings", () => {
    let g = makeState()
    const tile = g.board.tiles.find(t => t.number === 6 && t.resource !== DESERT)
    if (!tile) return
    g = placeSettlement(g, 0, tile.coord.q, tile.coord.r, 0)
    const next = applyMove(g, { type: "roll-dice", player: 0, dice: [3, 3] })
    ok(next.players[0]!.resources[tile.resource] >= 1)
  })

  it("place-settlement adds settlement", () => {
    const g = makeState()
    const next = applyMove(g, { type: "place-settlement", player: 0, q: 0, r: 0, corner: 0 })
    equal(next.players[0]!.settlements.length, 1)
  })

  it("place-road adds road", () => {
    const g = makeState()
    const next = applyMove(g, { type: "place-road", player: 0, q1: 0, r1: 0, corner1: 0, q2: 0, r2: 0, corner2: 1 })
    equal(next.players[0]!.roads.length, 1)
  })

  it("place-city upgrades settlement to city", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g.players[0]!.resources[Resource.Grain] = 2
    g.players[0]!.resources[Resource.Ore] = 3
    const next = applyMove(g, { type: "place-city", player: 0, q: 0, r: 0, corner: 0 })
    equal(next.players[0]!.cities.length, 1)
    equal(next.players[0]!.settlements.length, 0)
  })

  it("end-turn advances to next player", () => {
    const g = makeState()
    const next = applyMove(g, { type: "end-turn", player: 0 })
    equal(next.currentPlayer, 1)
  })

  it("trade deducts give and adds take resources", () => {
    let g = makeState()
    g.players[0]!.resources[Resource.Brick] = 5
    const next = applyMove(g, { type: "trade", player: 0, partner: "bank", give: { brick: 4, lumber: 0, wool: 0, grain: 0, ore: 0 }, take: { brick: 0, lumber: 1, wool: 0, grain: 0, ore: 0 } })
    equal(next.players[0]!.resources[Resource.Brick], 1)
    equal(next.players[0]!.resources[Resource.Lumber], 1)
  })

  it("trade throws on insufficient resources", () => {
    const g = makeState()
    g.players[0]!.resources[Resource.Brick] = 2
    try {
      applyMove(g, { type: "trade", player: 0, partner: "bank", give: { brick: 4, lumber: 0, wool: 0, grain: 0, ore: 0 }, take: { brick: 0, lumber: 1, wool: 0, grain: 0, ore: 0 } })
      ok(false, "should have thrown")
    } catch (e: any) {
      ok(e.message.includes("Not enough resources"))
    }
  })

  it("buy-dev-card adds a card to hand as unavailable", () => {
    let g = makeState()
    g.players[0]!.resources[Resource.Ore] = 1
    g.players[0]!.resources[Resource.Wool] = 1
    g.players[0]!.resources[Resource.Grain] = 1
    const next = applyMove(g, { type: "buy-dev-card", player: 0 })
    equal(next.players[0]!.hand.length, 1)
    equal(next.players[0]!.hand[0]!.available, false)
  })

  it("play-dev-card removes card and adds VP", () => {
    let g = makeState()
    g.players[0]!.hand = [{ cardType: "victory", available: true }]
    const next = applyMove(g, { type: "play-dev-card", player: 0, cardType: "victory" })
    equal(next.players[0]!.hand.length, 0)
    equal(next.players[0]!.vp, 1)
  })
})

describe("replayRecord", () => {
  it("rebuilds endState from startState and turns", () => {
    let g = makeState()
    g = placeSettlement(g, 0, 0, 0, 0)
    g = nextTurn(g)
    const turn1: GameTurn = {
      turn: 0, player: 0, phase: "initial_first",
      moves: [
        { type: "place-settlement", player: 0, q: 0, r: 0, corner: 0 },
        { type: "end-turn", player: 0 },
      ],
    }
    const turn2: GameTurn = {
      turn: 0, player: 1, phase: "initial_first",
      moves: [{ type: "end-turn", player: 1 }],
    }
    const record: GameRecord = { startState: makeState(), turns: [turn1, turn2], endState: g }
    const rebuilt = replayRecord(record)
    equal(rebuilt.players[0]!.settlements.length, 1)
    equal(rebuilt.players[0]!.vp, 1)
    equal(rebuilt.currentPlayer, 2)
  })

  it("handles multiple moves in one turn", () => {
    let g = makeState()
    g = { ...g, phase: "play", turn: 1 }
    g = placeSettlement(g, 0, 0, 0, 0)
    g = placeRoad(g, 0, 0, 0, 0, 0, 0, 1)
    const turn: GameTurn = {
      turn: 1, player: 0, phase: "play",
      moves: [
        { type: "place-settlement", player: 0, q: 0, r: 0, corner: 0 },
        { type: "place-road", player: 0, q1: 0, r1: 0, corner1: 0, q2: 0, r2: 0, corner2: 1 },
      ],
    }
    const start = makeState()
    const start2 = { ...start, phase: "play", turn: 1 } as typeof start
    const record: GameRecord = { startState: start2, turns: [turn], endState: g }
    const rebuilt = replayRecord(record)
    equal(rebuilt.players[0]!.settlements.length, 1)
    equal(rebuilt.players[0]!.roads.length, 1)
  })

  it("does not mutate startState", () => {
    const g = makeState()
    const record: GameRecord = { startState: g, turns: [], endState: g }
    const rebuilt = replayRecord(record)
    equal(rebuilt.players[0]!.settlements.length, 0)
  })

  it("empty turns returns startState unchanged", () => {
    const g = makeState()
    const record: GameRecord = { startState: g, turns: [], endState: g }
    const rebuilt = replayRecord(record)
    equal(rebuilt.players.length, 4)
    equal(rebuilt.turn, 0)
  })
})

describe("deriveLog", () => {
  it("returns empty array for empty turns", () => {
    const g = makeState()
    const record: GameRecord = { startState: g, turns: [], endState: g }
    equal(deriveLog(record).length, 0)
  })

  it("includes roll message for roll-dice move", () => {
    const g = makeState()
    const turn: GameTurn = {
      turn: 1, player: 0, phase: "play",
      moves: [{ type: "roll-dice", player: 0, dice: [3, 4] }],
    }
    const start = makeState()
    const start2 = { ...start, phase: "play", turn: 1 } as typeof start
    const record: GameRecord = { startState: start2, turns: [turn], endState: g }
    const log = deriveLog(record)
    ok(log.some(m => m.includes("rolled")))
    ok(log.some(m => m.includes("3+4")))
  })

  it("includes settlement message", () => {
    const g = makeState()
    const turn: GameTurn = {
      turn: 0, player: 0, phase: "initial_first",
      moves: [{ type: "place-settlement", player: 0, q: 0, r: 0, corner: 0 }],
    }
    const record: GameRecord = { startState: makeState(), turns: [turn], endState: g }
    const log = deriveLog(record)
    ok(log.some(m => m.includes("built a settlement")))
  })

  it("includes road message", () => {
    const g = makeState()
    const turn: GameTurn = {
      turn: 0, player: 0, phase: "initial_first",
      moves: [{ type: "place-road", player: 0, q1: 0, r1: 0, corner1: 0, q2: 0, r2: 0, corner2: 1 }],
    }
    const record: GameRecord = { startState: makeState(), turns: [turn], endState: g }
    const log = deriveLog(record)
    ok(log.some(m => m.includes("built a road")))
  })

  it("includes city message", () => {
    const g = makeState()
    const turn: GameTurn = {
      turn: 1, player: 0, phase: "play",
      moves: [{ type: "place-city", player: 0, q: 0, r: 0, corner: 0 }],
    }
    const start = makeState()
    const start2 = { ...start, phase: "play", turn: 1 } as typeof start
    const record: GameRecord = { startState: start2, turns: [turn], endState: g }
    const log = deriveLog(record)
    ok(log.some(m => m.includes("built a city")))
  })

  it("includes --- Turn N --- header in play phase", () => {
    const g = makeState()
    const turn: GameTurn = {
      turn: 1, player: 0, phase: "play",
      moves: [{ type: "roll-dice", player: 0, dice: [1, 2] }],
    }
    const start = makeState()
    const start2 = { ...start, phase: "play", turn: 1 } as typeof start
    const record: GameRecord = { startState: start2, turns: [turn], endState: g }
    const log = deriveLog(record)
    ok(log.some(m => m.startsWith("--- Turn")))
  })

  it("includes --- Game begins! --- after last end-turn of setup", () => {
    let g = makeState()
    g = advanceInitialPlacement(g)
    g = advanceInitialPlacement(g)
    g = advanceInitialPlacement(g)
    g = advanceInitialPlacement(g)
    g = advanceInitialPlacement(g)
    g = advanceInitialPlacement(g)
    g = advanceInitialPlacement(g)
    const firstPlayer0 = advanceInitialPlacement(g)
    const turn: GameTurn = {
      turn: 0, player: 0, phase: "initial_second",
      moves: [{ type: "end-turn", player: 0 }],
    }
    const record: GameRecord = { startState: makeState(), turns: [turn], endState: firstPlayer0 }
    const log = deriveLog(record)
    ok(log.some(m => m === "--- Game begins! ---"))
  })

  it("includes trade message", () => {
    const g = makeState()
    const turn: GameTurn = {
      turn: 1, player: 0, phase: "play",
      moves: [{ type: "trade", player: 0, partner: "bank", give: { brick: 4, lumber: 0, wool: 0, grain: 0, ore: 0 }, take: { brick: 0, lumber: 1, wool: 0, grain: 0, ore: 0 } }],
    }
    const start = makeState()
    const start2 = { ...start, phase: "play", turn: 1 } as typeof start
    const record: GameRecord = { startState: start2, turns: [turn], endState: g }
    const log = deriveLog(record)
    ok(log.some(m => m.includes("traded")))
    ok(log.some(m => m.includes("bank")))
  })

  it("includes buy-dev-card message", () => {
    const g = makeState()
    const turn: GameTurn = {
      turn: 1, player: 0, phase: "play",
      moves: [{ type: "buy-dev-card", player: 0 }],
    }
    const start = makeState()
    const start2 = { ...start, phase: "play", turn: 1 } as typeof start
    const record: GameRecord = { startState: start2, turns: [turn], endState: g }
    const log = deriveLog(record)
    ok(log.some(m => m.includes("bought a development card")))
  })

  it("includes play-dev-card message", () => {
    const g = makeState()
    const turn: GameTurn = {
      turn: 1, player: 0, phase: "play",
      moves: [{ type: "play-dev-card", player: 0, cardType: "victory" }],
    }
    const start = makeState()
    const start2 = { ...start, phase: "play", turn: 1 } as typeof start
    const record: GameRecord = { startState: start2, turns: [turn], endState: g }
    const log = deriveLog(record)
    ok(log.some(m => m.includes("played a victory card")))
  })
})

describe("truncateText", () => {
  it("keeps short ascii under limits", () => {
    equal(truncateText("hello", 64, 32), "hello")
  })

  it("truncates by glyphs when limit is smaller", () => {
    equal(truncateText("abcdefghij", 64, 5), "abcde")
  })

  it("truncates by bytes when limit is smaller", () => {
    equal(truncateText("abcde", 3, 32), "abc")
  })

  it("removes incomplete multi-byte glyph at byte boundary", () => {
    const result = truncateText("a\u00e9bc", 2, 32)
    equal(result, "a")
  })

  it("truncates 4-byte glyph cleanly", () => {
    const result = truncateText("a\ud83d\ude00bc", 4, 32)
    equal(result, "a")
  })

  it("handles empty string", () => {
    equal(truncateText("", 64, 32), "")
  })
})

describe("titleToSlug", () => {
  it("lowers case", () => {
    equal(titleToSlug("My Game"), "my-game")
  })

  it("replaces non-[a-z0-9-] with -", () => {
    equal(titleToSlug("hello world!"), "hello-world-")
  })

  it("keeps valid characters", () => {
    equal(titleToSlug("abc-123"), "abc-123")
  })

  it("handles empty string", () => {
    equal(titleToSlug(""), "")
  })
})
