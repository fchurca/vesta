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

var game = null

var Game = {
  start: function (playerCount, seed, title) {
    game = createGame({ players: playerCount, roll: seed, title: title || "" })
    game.turns = []
    game.currentTurnMoves = []
  },

  captureStartRecord: function () {
    game.startRecord = JSON.parse(JSON.stringify(game))
  },

  currentPlayer: function () {
    return game.players[game.currentPlayer]
  },

  rollDice: function () {
    var d1 = Math.ceil(Math.random() * 6)
    var d2 = Math.ceil(Math.random() * 6)
    var total = d1 + d2
    var gains = produce(game, total)
    game = applyMove(game, { type: "roll-dice", player: game.currentPlayer, dice: [d1, d2] })
    game.currentTurnMoves.push({ type: "roll-dice", player: game.currentPlayer, dice: [d1, d2] })
    saveGame()
    return { dice: [d1, d2], total: total, gains: gains }
  },

  tileAt: function (q, r) {
    return tileAt(game, q, r)
  },

  canBuildSettlement: function (playerIdx, q, r, corner, isInitial) {
    return canBuildSettlement(game, playerIdx, q, r, corner, isInitial)
  },

  canBuildRoad: function (playerIdx, q1, r1, corner1, q2, r2, corner2, isInitial, fromSettlementVertex) {
    return canBuildRoad(game, playerIdx, q1, r1, corner1, q2, r2, corner2, isInitial, fromSettlementVertex)
  },

  canBuildCity: function (playerIdx, q, r, corner) {
    return canBuildCity(game, playerIdx, q, r, corner)
  },

  placeSettlement: function (playerIdx, q, r, corner) {
    game = placeSettlement(game, playerIdx, q, r, corner)
    game.currentTurnMoves.push({ type: "place-settlement", player: playerIdx, q: q, r: r, corner: corner })
    saveGame()
  },

  placeRoad: function (playerIdx, q1, r1, corner1, q2, r2, corner2) {
    game = placeRoad(game, playerIdx, q1, r1, corner1, q2, r2, corner2)
    game.currentTurnMoves.push({ type: "place-road", player: playerIdx, q1: q1, r1: r1, corner1: corner1, q2: q2, r2: r2, corner2: corner2 })
    saveGame()
  },

  placeCity: function (playerIdx, q, r, corner) {
    game = placeCity(game, playerIdx, q, r, corner)
    game.currentTurnMoves.push({ type: "place-city", player: playerIdx, q: q, r: r, corner: corner })
    saveGame()
  },

  doTrade: function (give, take, partner) {
    game = applyMove(game, {
      type: "trade",
      player: game.currentPlayer,
      partner: partner || "bank",
      give: give,
      take: take,
    })
    game.currentTurnMoves.push({
      type: "trade",
      player: game.currentPlayer,
      partner: partner || "bank",
      give: give,
      take: take,
    })
    saveGame()
  },

  nextTurn: function () {
    game.currentTurnMoves.push({ type: "end-turn", player: game.currentPlayer })
    var prevPhase = game.phase
    var prevPlayer = game.currentPlayer
    var prevTurn = game.turn
    game = applyMove(game, { type: "end-turn", player: prevPlayer })
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

  giveStartingResources: function (playerIdx, q, r, corner) {
    game = giveStartingResources(game, playerIdx, q, r, corner)
  },

  checkWin: function () {
    return checkWin(game)
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
