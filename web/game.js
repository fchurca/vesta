var BRICK = "brick"
var LUMBER = "lumber"
var WOOL = "wool"
var GRAIN = "grain"
var ORE = "ore"

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

var DEV_CARD_EMOJI = {
  victory: "\uD83E\uDE99",
  knight: "\uD83D\uDC82",
  "road-build": "\uD83C\uDF09",
  "year-of-plenty": "\uD83E\uDDFA",
  monopoly: "\uD83D\uDC51",
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
    var isSeven = total === 7
    var discardPlayers = []
    if (isSeven) {
      for (var i = 0; i < game.players.length; i++) {
        var totalRes = game.players[i].resources.brick + game.players[i].resources.lumber +
          game.players[i].resources.wool + game.players[i].resources.grain + game.players[i].resources.ore
        if (totalRes > 7) discardPlayers.push(i)
      }
    }
    saveGame()
    return { dice: [d1, d2], total: total, gains: gains, isSeven: isSeven, discardPlayers: discardPlayers }
  },

  discardResources: function (playerIdx, resources) {
    game = applyMove(game, { type: "discard-resources", player: playerIdx, resources: resources })
    game.currentTurnMoves.push({ type: "discard-resources", player: playerIdx, resources: resources })
    saveGame()
  },

  tileAt: function (q, r) {
    return tileAt(game, q, r)
  },

  canBuildSettlement: function (playerIdx, q, r, corner, isInitial) {
    return canBuildSettlement(game, playerIdx, q, r, corner, isInitial)
  },

  canBuildRoad: function (playerIdx, q1, r1, corner1, q2, r2, corner2, isInitial, fromSettlementVertex, free) {
    return canBuildRoad(game, playerIdx, q1, r1, corner1, q2, r2, corner2, isInitial, fromSettlementVertex, free)
  },

  canBuildCity: function (playerIdx, q, r, corner) {
    return canBuildCity(game, playerIdx, q, r, corner)
  },

  placeSettlement: function (playerIdx, q, r, corner) {
    game = placeSettlement(game, playerIdx, q, r, corner)
    game.players[playerIdx].rates = computeRates(game, playerIdx)
    game.currentTurnMoves.push({ type: "place-settlement", player: playerIdx, q: q, r: r, corner: corner })
    saveGame()
  },

  placeRoad: function (playerIdx, q1, r1, corner1, q2, r2, corner2, free) {
    var prev = game.longestRoad
    game = placeRoad(game, playerIdx, q1, r1, corner1, q2, r2, corner2, free)
    game.currentTurnMoves.push({ type: "place-road", player: playerIdx, q1: q1, r1: r1, corner1: corner1, q2: q2, r2: r2, corner2: corner2 })
    if (game.longestRoad !== prev) {
      game.currentTurnMoves.push({ type: "longest-road-change", winner: game.longestRoad, loser: prev })
    }
    saveGame()
  },

  placeCity: function (playerIdx, q, r, corner) {
    game = placeCity(game, playerIdx, q, r, corner)
    game.players[playerIdx].rates = computeRates(game, playerIdx)
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

  proposeTrade: function (give, take, partner) {
    game = applyMove(game, {
      type: "propose-trade",
      player: game.currentPlayer,
      partner: partner,
      give: give,
      take: take,
    })
    game.currentTurnMoves.push({
      type: "propose-trade",
      player: game.currentPlayer,
      partner: partner,
      give: give,
      take: take,
    })
    saveGame()
  },

  acceptTrade: function () {
    var partner = game.pendingTrade.to
    game = applyMove(game, {
      type: "accept-trade",
      player: partner,
    })
    game.currentTurnMoves.push({
      type: "accept-trade",
      player: partner,
    })
    saveGame()
  },

  rejectTrade: function () {
    var partner = game.pendingTrade.to
    game = applyMove(game, {
      type: "reject-trade",
      player: partner,
    })
    game.currentTurnMoves.push({
      type: "reject-trade",
      player: partner,
    })
    saveGame()
  },

  cancelProposal: function () {
    game = applyMove(game, {
      type: "cancel-proposal",
      player: game.currentPlayer,
    })
    game.currentTurnMoves.push({
      type: "cancel-proposal",
      player: game.currentPlayer,
    })
    saveGame()
  },

  canBuyDevCard: function (playerIdx) {
    return canBuyDevCard(game, playerIdx)
  },

  buyDevCard: function (playerIdx) {
    game = applyMove(game, { type: "buy-dev-card", player: playerIdx })
    game.currentTurnMoves.push({ type: "buy-dev-card", player: playerIdx })
    saveGame()
  },

  playDevCard: function (playerIdx, cardIndex) {
    if (!game.players[playerIdx] || !game.players[playerIdx].hand[cardIndex]) return
    var card = game.players[playerIdx].hand[cardIndex]
    if (!card.available) return
    var move = { type: "play-dev-card", player: playerIdx, cardType: card.cardType }
    game = applyMove(game, move)
    game.currentTurnMoves.push(move)
    saveGame()
  },

  calculateMonopolyTotals: function (playerIdx) {
    var totals = {}
    for (var i = 0; i < game.players.length; i++) {
      if (i === playerIdx) continue
      var p = game.players[i]
      for (var r in RESOURCE_NAMES) {
        if (r === "desert") continue
        totals[r] = (totals[r] || 0) + (p.resources[r] || 0)
      }
    }
    var result = {}
    for (var r in totals) {
      if (totals[r] > 0) result[r] = totals[r]
    }
    return result
  },

  playMonopolyCard: function (playerIdx, resource) {
    var total = 0
    var totals = []
    for (var i = 0; i < game.players.length; i++) {
      if (i === playerIdx) { totals.push(0); continue }
      var amount = game.players[i].resources[resource] || 0
      totals.push(amount)
      total += amount
      game.players[i].resources[resource] = 0
    }
    game.players[playerIdx].resources[resource] = (game.players[playerIdx].resources[resource] || 0) + total

    var hand = game.players[playerIdx].hand
    for (var hi = 0; hi < hand.length; hi++) {
      if (hand[hi].cardType === "monopoly" && hand[hi].available) {
        hand.splice(hi, 1)
        break
      }
    }

    game.currentTurnMoves.push({
      type: "play-monopoly",
      player: playerIdx,
      resource: resource,
      totals: totals,
      total: total,
    })
    saveGame()
  },

  playYearOfPlentyCard: function (playerIdx, r1, r2) {
    var hand = game.players[playerIdx].hand
    for (var hi = 0; hi < hand.length; hi++) {
      if (hand[hi].cardType === "year-of-plenty" && hand[hi].available) {
        hand.splice(hi, 1)
        break
      }
    }
    game.players[playerIdx].resources[r1] = (game.players[playerIdx].resources[r1] || 0) + 1
    game.players[playerIdx].resources[r2] = (game.players[playerIdx].resources[r2] || 0) + 1

    game.currentTurnMoves.push({
      type: "play-year-of-plenty",
      player: playerIdx,
      resources: [r1, r2],
    })
    saveGame()
  },

  consumeRoadBuildCard: function (playerIdx) {
    var hand = game.players[playerIdx].hand
    for (var hi = 0; hi < hand.length; hi++) {
      if (hand[hi].cardType === "road-build" && hand[hi].available) {
        hand.splice(hi, 1)
        break
      }
    }
    game.currentTurnMoves.push({ type: "play-dev-card", player: playerIdx, cardType: "road-build" })
    saveGame()
  },

  moveRobber: function (playerIdx, q, r) {
    game = moveRobber(game, q, r)
    game.currentTurnMoves.push({ type: "move-robber", player: playerIdx, q: q, r: r })
    saveGame()
  },

  getRobbableVertices: function (tileQ, tileR) {
    return getRobbableVertices(game, game.currentPlayer, tileQ, tileR)
  },

  robRandomResource: function (playerIdx, victimIdx) {
    var available = []
    var victim = game.players[victimIdx]
    for (var r in RESOURCE_NAMES) {
      if (r === "desert") continue
      if (victim.resources[r] > 0) available.push(r)
    }
    if (available.length === 0) return false
    var picked = available[Math.floor(Math.random() * available.length)]
    game = robResource(game, playerIdx, victimIdx, picked)
    game.currentTurnMoves.push({ type: "steal-resource", player: playerIdx, victim: victimIdx, resource: picked })
    saveGame()
    return picked
  },

  getValidGuardTiles: function () {
    var robber = game.board.robber
    var result = []
    for (var ti = 0; ti < game.board.tiles.length; ti++) {
      var t = game.board.tiles[ti]
      if (t.coord.q === robber.q && t.coord.r === robber.r) continue
      result.push({ type: "tile", q: t.coord.q, r: t.coord.r })
    }
    return result
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
    } else if (mode === "road" || mode === "road-card") {
      for (var ek in _edgeCache) {
        var e = _edgeCache[ek]
        var free = mode === "road-card"
        var r2 = canBuildRoad(game, cp, e.hex.q, e.hex.r, e.hex.c1, e.hex.q, e.hex.r, e.hex.c2, false, null, free)
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
    } else if (mode === "guard-tile") {
      var robber = game.board.robber
      for (var ti = 0; ti < game.board.tiles.length; ti++) {
        var t = game.board.tiles[ti]
        if (t.coord.q === robber.q && t.coord.r === robber.r) continue
        result.push({ type: "tile", q: t.coord.q, r: t.coord.r })
      }
    }

    return result
  },
}
