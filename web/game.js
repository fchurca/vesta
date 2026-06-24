var BRICK = "brick"
var LUMBER = "lumber"
var WOOL = "wool"
var GRAIN = "grain"
var ORE = "ore"
var DESERT = "desert"

var RESOURCE_NAMES = {
  brick: "Brick",
  lumber: "Lumber",
  wool: "Wool",
  grain: "Grain",
  ore: "Ore",
  desert: "Desert",
}

var RESOURCE_EMOJI = {
  brick: "\uD83E\uDDF1",
  lumber: "\uD83E\uDEB5",
  wool: "\uD83D\uDC11",
  grain: "\uD83C\uDF3E",
  ore: "\uD83E\uDEA8",
  desert: "\uD83C\uDF35",
}

var RESOURCE_COLORS = {
  brick: "#b45309",
  lumber: "#15803d",
  wool: "#a8a29e",
  grain: "#ca8a04",
  ore: "#57534e",
  desert: "#d6bd8a",
}

var BUILDING_COST = {
  road: { brick: 1, lumber: 1 },
  settlement: { brick: 1, lumber: 1, wool: 1, grain: 1 },
  city: { grain: 2, ore: 3 },
}

var BOARD_HEXES = [
  { q: 0, r: 0 },
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
  { q: 2, r: 0 }, { q: 1, r: 1 }, { q: 0, r: 2 }, { q: -1, r: 2 }, { q: -2, r: 2 },
  { q: -2, r: 1 }, { q: -2, r: 0 }, { q: -1, r: -1 }, { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 2, r: -1 },
]

var RESOURCE_DIST = [
  BRICK, BRICK, BRICK,
  LUMBER, LUMBER, LUMBER, LUMBER,
  WOOL, WOOL, WOOL, WOOL,
  GRAIN, GRAIN, GRAIN, GRAIN,
  ORE, ORE, ORE,
  DESERT,
]

var NUMBER_DIST = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]

var game = null

function mulberry32(seed) {
  var s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    var t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle(arr, seed) {
  var rng = mulberry32(seed)
  var copy = arr.slice()
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1))
    var tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function hexNeighbors(h) {
  var dirs = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]
  return dirs.map(function (d) {
    return { q: h.q + d[0], r: h.r + d[1] }
  })
}

function createGame(playerCount, seed) {
  var resources = seededShuffle(RESOURCE_DIST, seed)
  var desertIdx = resources.indexOf(DESERT)
  var numbers = seededShuffle(NUMBER_DIST, seed + 1)

  var tiles = BOARD_HEXES.map(function (coord, i) {
    if (i === desertIdx) {
      return { coord: coord, resource: DESERT, number: 7 }
    }
    var ni = i < desertIdx ? i : i - 1
    return { coord: coord, resource: resources[i], number: numbers[ni] }
  })

  var robber = tiles.filter(function (t) { return t.resource === DESERT })[0].coord

  var players = []
  for (var i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      name: "Player " + (i + 1),
      resources: { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 },
      settlements: [],
      cities: [],
      roads: [],
      vp: 0,
      roadCount: 0,
    })
  }

  return {
    phase: "setup",
    turn: 0,
    currentPlayer: 0,
    dice: null,
    rolled: false,
    setupStep: "settlement",
    pendingSettlement: null,
    board: { tiles: tiles, robber: robber },
    players: players,
  }
}

var Game = {
  start: function (playerCount, seed) {
    game = createGame(playerCount, seed)
    game.phase = "initial_first"
    game.currentPlayer = 0
    game.setupStep = "settlement"
    game.pendingSettlement = null
    game.turns = []
    game.currentTurnMoves = []
  },

  captureStartRecord: function () {
    game.startRecord = JSON.parse(JSON.stringify(game))
  },

  log: function () {},

  currentPlayer: function () {
    return game.players[game.currentPlayer]
  },

  rollDice: function () {
    var d1 = Math.ceil(Math.random() * 6)
    var d2 = Math.ceil(Math.random() * 6)
    game.dice = [d1, d2]
    game.rolled = true
    var total = d1 + d2
    game.currentTurnMoves.push({ type: "roll-dice", player: game.currentPlayer, dice: [d1, d2] })
    var gains = Game.produce(total)
    saveGame()
    return { dice: [d1, d2], total: total, gains: gains }
  },

  produce: function (total) {
    var gainsByPlayer = {}
    for (var p = 0; p < game.players.length; p++) {
      gainsByPlayer[p] = {}
    }

    for (var i = 0; i < game.board.tiles.length; i++) {
      var tile = game.board.tiles[i]
      if (tile.resource === DESERT || tile.number !== total) continue

      var r = tile.resource
      for (var c = 0; c < 6; c++) {
        var vk = vertexKey(tile.coord.q, tile.coord.r, c)
        var bldg = Game.findBuilding(vk)
        if (bldg) {
          var amount = bldg.type === "city" ? 2 : 1
          game.players[bldg.player].resources[r] += amount
          gainsByPlayer[bldg.player][r] = (gainsByPlayer[bldg.player][r] || 0) + amount
        }
      }
    }

    var gains = []
    for (var gP = 0; gP < game.players.length; gP++) {
      for (var gR in gainsByPlayer[gP]) {
        gains.push({ player: gP, resource: gR, amount: gainsByPlayer[gP][gR] })
      }
    }

    return gains
  },

  tileAt: function (q, r) {
    for (var i = 0; i < game.board.tiles.length; i++) {
      var t = game.board.tiles[i]
      if (t.coord.q === q && t.coord.r === r) return t
    }
    return null
  },

  canBuildSettlement: function (playerIdx, q, r, corner, isInitial) {
    var player = game.players[playerIdx]
    var vKey = vertexKey(q, r, corner)
    var existing = Game.findBuilding(vKey)
    if (existing) return { ok: false, reason: "Vertex already occupied" }

    var distOk = Game.checkDistanceRule(vKey)
    if (!distOk) return { ok: false, reason: "Too close to another settlement" }

    if (!isInitial) {
      var cost = BUILDING_COST.settlement
      if (!Game.hasResources(player, cost)) return { ok: false, reason: "Not enough resources" }

      var connected = Game.hasAdjacentRoad(playerIdx, vKey)
      if (!connected) return { ok: false, reason: "No adjacent road" }
    }

    return { ok: true }
  },

  canBuildRoad: function (playerIdx, q1, r1, corner1, q2, r2, corner2, isInitial, fromSettlementVertex) {
    var eKey = edgeKey(q1, r1, corner1, q2, r2, corner2)
    if (Game.roadExists(eKey)) return { ok: false, reason: "Edge already occupied" }

    var player = game.players[playerIdx]

    if (isInitial && fromSettlementVertex) {
      var svKey = vertexKey(fromSettlementVertex.q, fromSettlementVertex.r, fromSettlementVertex.corner)
      if (edgeTouchesVertex(eKey, svKey)) return { ok: true }
      return { ok: false, reason: "Road must connect to placed settlement" }
    }

    if (!isInitial) {
      var cost = BUILDING_COST.road
      if (!Game.hasResources(player, cost)) return { ok: false, reason: "Not enough resources" }

      if (!Game.edgeConnectedToPlayer(playerIdx, eKey)) {
        return { ok: false, reason: "No adjacent settlement or road" }
      }
    }

    return { ok: true }
  },

  canBuildCity: function (playerIdx, q, r, corner) {
    var player = game.players[playerIdx]
    var vKey = vertexKey(q, r, corner)

    var found = false
    for (var i = 0; i < player.settlements.length; i++) {
      var s = player.settlements[i]
      if (vertexKey(s.q, s.r, s.corner) === vKey) { found = true; break }
    }
    if (!found) return { ok: false, reason: "No settlement here" }

    var cost = BUILDING_COST.city
    if (!Game.hasResources(player, cost)) return { ok: false, reason: "Not enough resources" }

    return { ok: true }
  },

  hasResources: function (player, cost) {
    for (var r in cost) {
      if ((player.resources[r] || 0) < cost[r]) return false
    }
    return true
  },

  deductResources: function (player, cost) {
    for (var r in cost) {
      player.resources[r] -= cost[r]
    }
  },

  hasAdjacentRoad: function (playerIdx, vKey) {
    var player = game.players[playerIdx]
    for (var i = 0; i < player.roads.length; i++) {
      if (edgeTouchesVertex(player.roads[i].key, vKey)) return true
    }
    return false
  },

  edgeConnectedToPlayer: function (playerIdx, eKey) {
    var player = game.players[playerIdx]
    for (var i = 0; i < player.roads.length; i++) {
      if (roadsShareVertex(player.roads[i].key, eKey)) return true
    }
    for (var j = 0; j < player.settlements.length; j++) {
      var s = player.settlements[j]
      if (edgeTouchesVertex(eKey, vertexKey(s.q, s.r, s.corner))) return true
    }
    for (var k = 0; k < player.cities.length; k++) {
      var c = player.cities[k]
      if (edgeTouchesVertex(eKey, vertexKey(c.q, c.r, c.corner))) return true
    }
    return false
  },

  placeSettlement: function (playerIdx, q, r, corner) {
    var player = game.players[playerIdx]
    player.settlements.push({ q: q, r: r, corner: corner, type: "settlement" })
    player.vp += 1

    if (game.phase === "play") {
      Game.deductResources(player, BUILDING_COST.settlement)
    }

    game.currentTurnMoves.push({ type: "place-settlement", player: playerIdx, q: q, r: r, corner: corner })
    saveGame()
  },

  placeRoad: function (playerIdx, q1, r1, corner1, q2, r2, corner2) {
    var player = game.players[playerIdx]
    var eKey = edgeKey(q1, r1, corner1, q2, r2, corner2)
    player.roads.push({
      key: eKey,
      q1: q1, r1: r1, corner1: corner1,
      q2: q2, r2: r2, corner2: corner2,
    })
    player.roadCount++

    if (game.phase === "play") {
      Game.deductResources(player, BUILDING_COST.road)
    }

    game.currentTurnMoves.push({ type: "place-road", player: playerIdx, q1: q1, r1: r1, corner1: corner1, q2: q2, r2: r2, corner2: corner2 })
    saveGame()
  },

  placeCity: function (playerIdx, q, r, corner) {
    var player = game.players[playerIdx]

    var idx = -1
    for (var i = 0; i < player.settlements.length; i++) {
      if (player.settlements[i].q === q && player.settlements[i].r === r && player.settlements[i].corner === corner) {
        idx = i; break
      }
    }
    if (idx >= 0) player.settlements.splice(idx, 1)

    player.cities.push({ q: q, r: r, corner: corner, type: "city" })
    player.vp += 1
    Game.deductResources(player, BUILDING_COST.city)
    game.currentTurnMoves.push({ type: "place-city", player: playerIdx, q: q, r: r, corner: corner })
    saveGame()
  },

  findBuilding: function (vKey) {
    for (var p = 0; p < game.players.length; p++) {
      var player = game.players[p]
      for (var i = 0; i < player.settlements.length; i++) {
        if (vertexKey(player.settlements[i].q, player.settlements[i].r, player.settlements[i].corner) === vKey) {
          return { player: p, type: "settlement", building: player.settlements[i] }
        }
      }
      for (var j = 0; j < player.cities.length; j++) {
        if (vertexKey(player.cities[j].q, player.cities[j].r, player.cities[j].corner) === vKey) {
          return { player: p, type: "city", building: player.cities[j] }
        }
      }
    }
    return null
  },

  checkDistanceRule: function (vKey) {
    for (var p = 0; p < game.players.length; p++) {
      var player = game.players[p]
      for (var i = 0; i < player.settlements.length; i++) {
        if (verticesAreAdjacent(vKey, vertexKey(player.settlements[i].q, player.settlements[i].r, player.settlements[i].corner))) {
          return false
        }
      }
      for (var j = 0; j < player.cities.length; j++) {
        if (verticesAreAdjacent(vKey, vertexKey(player.cities[j].q, player.cities[j].r, player.cities[j].corner))) {
          return false
        }
      }
    }
    return true
  },

  roadExists: function (eKey) {
    for (var p = 0; p < game.players.length; p++) {
      for (var i = 0; i < game.players[p].roads.length; i++) {
        if (game.players[p].roads[i].key === eKey) return true
      }
    }
    return false
  },

  nextTurn: function () {
    game.currentTurnMoves.push({ type: "end-turn", player: game.currentPlayer })
    var prevPhase = game.phase
    var prevPlayer = game.currentPlayer
    var prevTurn = game.turn

    if (game.phase === "initial_first" || game.phase === "initial_second") {
      Game.advanceInitialPlacement()
    } else {
      game.currentPlayer = (game.currentPlayer + 1) % game.players.length
      game.rolled = false
      game.dice = null
      game.turn++
    }

    if (game.currentTurnMoves.length > 0) {
      game.turns.push({
        turn: prevTurn,
        player: prevPlayer,
        phase: prevPhase,
        moves: game.currentTurnMoves,
      })
      game.currentTurnMoves = []
    }
    saveGame()
  },

  advanceInitialPlacement: function () {
    var n = game.players.length

    if (game.phase === "initial_first") {
      if (game.currentPlayer < n - 1) {
        game.currentPlayer++
      } else {
        game.phase = "initial_second"
        game.currentPlayer = n - 1
      }
    } else {
      if (game.currentPlayer > 0) {
        game.currentPlayer--
      } else {
        game.phase = "play"
        game.currentPlayer = 0
        game.turn = 1
        game.rolled = false
      }
    }

    game.setupStep = "settlement"
    game.pendingSettlement = null
  },

  giveStartingResources: function (playerIdx, q, r, corner) {
    var player = game.players[playerIdx]
    var hexes = getVertexHexes(q, r, corner)

    for (var i = 0; i < hexes.length; i++) {
      var tile = Game.tileAt(hexes[i].q, hexes[i].r)
      if (tile && tile.resource !== DESERT) {
        player.resources[tile.resource]++
      }
    }
  },

  checkWin: function () {
    for (var i = 0; i < game.players.length; i++) {
      if (game.players[i].vp >= 10) return i
    }
    return -1
  },

  getValidPositions: function (mode) {
    var result = []
    var cp = game.currentPlayer

    if (mode === "settlement") {
      for (var k in _vertexCache) {
        var v = _vertexCache[k]
        var h = v.hexes[0]
        var r = Game.canBuildSettlement(cp, h.q, h.r, h.corner, false)
        if (r.ok) result.push({ type: "vertex", key: k })
      }
    } else if (mode === "city") {
      var player = game.players[cp]
      for (var i = 0; i < player.settlements.length; i++) {
        var s = player.settlements[i]
        result.push({ type: "vertex", key: vertexKey(s.q, s.r, s.corner) })
      }
    } else if (mode === "road") {
      for (var ek in _edgeCache) {
        var e = _edgeCache[ek]
        var r2 = Game.canBuildRoad(cp, e.hex.q, e.hex.r, e.hex.c1, e.hex.q, e.hex.r, e.hex.c2, false, null)
        if (r2.ok) result.push({ type: "edge", key: ek, edge: e })
      }
    } else if (mode === "initial-settlement") {
      for (var k2 in _vertexCache) {
        var v2 = _vertexCache[k2]
        var h2 = v2.hexes[0]
        var r3 = Game.canBuildSettlement(cp, h2.q, h2.r, h2.corner, true)
        if (r3.ok) result.push({ type: "vertex", key: k2 })
      }
    } else if (mode === "initial-road") {
      if (game.pendingSettlement) {
        var ps = game.pendingSettlement
        var svKey = vertexKey(ps.q, ps.r, ps.corner)
        for (var ek2 in _edgeCache) {
          var e2 = _edgeCache[ek2]
          if (edgeTouchesVertex(ek2, svKey)) {
            result.push({ type: "edge", key: ek2, edge: e2 })
          }
        }
      }
    }

    return result
  },
}

var _vertexCache = null
var _edgeCache = null

function buildVertexEdgeCache() {
  if (_vertexCache) return

  _vertexCache = {}
  _edgeCache = {}

  var vByPixel = {}

  for (var i = 0; i < BOARD_HEXES.length; i++) {
    var h = BOARD_HEXES[i]
    for (var c = 0; c < 6; c++) {
      var px = hexCornerPixel(h.q, h.r, c)
      var key = "v_" + Math.round(px.x * 10) + "_" + Math.round(px.y * 10)

      if (!vByPixel[key]) {
        vByPixel[key] = { key: key, pixel: px, hexes: [] }
      }
      vByPixel[key].hexes.push({ q: h.q, r: h.r, corner: c })
    }
  }

  for (var k in vByPixel) {
    _vertexCache[k] = vByPixel[k]
  }

  var edgeSet = {}
  for (var j = 0; j < BOARD_HEXES.length; j++) {
    var h2 = BOARD_HEXES[j]
    for (var c2 = 0; c2 < 6; c2++) {
      var nextC = (c2 + 1) % 6
      var px1 = hexCornerPixel(h2.q, h2.r, c2)
      var px2 = hexCornerPixel(h2.q, h2.r, nextC)
      var vk1 = "v_" + Math.round(px1.x * 10) + "_" + Math.round(px1.y * 10)
      var vk2 = "v_" + Math.round(px2.x * 10) + "_" + Math.round(px2.y * 10)
      if (vk1 < vk2) { var eKey = "e_" + vk1 + "_" + vk2 }
      else { eKey = "e_" + vk2 + "_" + vk1 }

      if (!edgeSet[eKey]) {
        edgeSet[eKey] = { key: eKey, v1: vk1, v2: vk2, hex: { q: h2.q, r: h2.r, c1: c2, c2: nextC } }
      }
    }
  }

  for (var ek in edgeSet) {
    _edgeCache[ek] = edgeSet[ek]
  }
}

function vertexKey(q, r, corner) {
  buildVertexEdgeCache()
  var px = hexCornerPixel(q, r, corner)
  return "v_" + Math.round(px.x * 10) + "_" + Math.round(px.y * 10)
}

function edgeKey(q1, r1, c1, q2, r2, c2) {
  var px1 = hexCornerPixel(q1, r1, c1)
  var px2 = hexCornerPixel(q2, r2, c2)
  var vk1 = "v_" + Math.round(px1.x * 10) + "_" + Math.round(px1.y * 10)
  var vk2 = "v_" + Math.round(px2.x * 10) + "_" + Math.round(px2.y * 10)
  if (vk1 < vk2) return "e_" + vk1 + "_" + vk2
  return "e_" + vk2 + "_" + vk1
}

function verticesAreAdjacent(vKey1, vKey2) {
  if (vKey1 === vKey2) return true
  for (var k in _edgeCache) {
    var e = _edgeCache[k]
    if ((e.v1 === vKey1 && e.v2 === vKey2) || (e.v1 === vKey2 && e.v2 === vKey1)) {
      return true
    }
  }
  return false
}

function roadsShareVertex(eKey1, eKey2) {
  var e1 = _edgeCache[eKey1]
  var e2 = _edgeCache[eKey2]
  if (!e1 || !e2) return false
  return e1.v1 === e2.v1 || e1.v1 === e2.v2 || e1.v2 === e2.v1 || e1.v2 === e2.v2
}

function edgeTouchesVertex(eKey, vKey) {
  var e = _edgeCache[eKey]
  if (!e) return false
  return e.v1 === vKey || e.v2 === vKey
}

function getVertexHexes(q, r, corner) {
  var vk = vertexKey(q, r, corner)
  var v = _vertexCache[vk]
  return v ? v.hexes : [{ q: q, r: r, corner: corner }]
}

function hexCornerPixel(q, r, cornerIndex) {
  var center = hexToPixel(q, r)
  var angleDeg = 60 * cornerIndex - 30
  var angleRad = Math.PI / 180 * angleDeg
  return {
    x: center.x + HEX_SIZE * Math.cos(angleRad),
    y: center.y + HEX_SIZE * Math.sin(angleRad),
  }
}

function hexToPixel(q, r) {
  var x = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r)
  var y = HEX_SIZE * (3 / 2 * r)
  return { x: CANVAS_CENTER_X + x, y: CANVAS_CENTER_Y + y }
}

var GameUtil = {
  vertexKey: vertexKey,
  hexCornerPixel: hexCornerPixel,
  hexToPixel: hexToPixel,
  buildVertexEdgeCache: buildVertexEdgeCache,

  deriveLogLine: function (lines, move, names) {
    switch (move.type) {
      case "roll-dice":
        lines.push(names[move.player] + " rolled " + move.dice[0] + "+" + move.dice[1] + " = " + (move.dice[0] + move.dice[1]))
        break
      case "place-settlement":
        lines.push(names[move.player] + " built a settlement")
        break
      case "place-road":
        lines.push(names[move.player] + " built a road")
        break
      case "place-city":
        lines.push(names[move.player] + " built a city")
        break
    }
  },
}
