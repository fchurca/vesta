function main() {
  UI = new UIInstance()
  UI.init()
}

var UI = null

function UIInstance() {
  this.appEl = null
  this.toastContainer = null
}

UIInstance.prototype.init = function () {
  this.appEl = document.getElementById("app")
  this.showSetup()
}

UIInstance.prototype.showSetup = function () {
  var self = this
  this.appEl.innerHTML =
    '<div id="setup">' +
      '<h1>VESTA</h1>' +
      '<p style="color:var(--text-dim);font-size:0.9rem">Expanding Settlements Through Accord</p>' +

      '<label>' +
        'Number of players' +
        '<select id="player-count">' +
          '<option value="2">2</option>' +
          '<option value="3">3</option>' +
          '<option value="4" selected>4</option>' +
        '</select>' +
      '</label>' +

      '<div class="player-name-inputs" id="name-inputs"></div>' +

      '<button class="btn btn-primary" id="start-btn">Begin</button>' +
    '</div>'

  var countSelect = document.getElementById("player-count")
  var nameDiv = document.getElementById("name-inputs")

  function updateNames() {
    var count = parseInt(countSelect.value)
    nameDiv.innerHTML = ""
    for (var i = 0; i < count; i++) {
      var label = document.createElement("label")
      label.textContent = "Player " + (i + 1) + " name"
      var input = document.createElement("input")
      input.type = "text"
      input.value = "Player " + (i + 1)
      input.dataset.idx = i
      label.appendChild(input)
      nameDiv.appendChild(label)
    }
  }

  countSelect.addEventListener("change", updateNames)
  updateNames()

  document.getElementById("start-btn").addEventListener("click", function () {
    var count = parseInt(countSelect.value)
    var names = []
    var inputs = nameDiv.querySelectorAll("input")
    for (var i = 0; i < inputs.length; i++) {
      names.push(inputs[i].value || "Player " + (i + 1))
    }

    Game.start(count, Date.now())
    for (var j = 0; j < game.players.length; j++) {
      game.players[j].name = names[j] || "Player " + (j + 1)
    }

    self.showGame()
  })
}

UIInstance.prototype.showGame = function () {
  var self = this
  this.appEl.innerHTML =
    '<div id="game">' +
      '<div id="board-container"><canvas id="board"></canvas></div>' +
      '<div id="panel"></div>' +
    '</div>' +
    '<div id="actions"></div>' +
    '<div id="log"></div>' +
    '<div class="toast-container" id="toasts"></div>'

  this.toastContainer = document.getElementById("toasts")

  var canvas = document.getElementById("board")

  initBoard(canvas, {
    onVertexClick: function (q, r, corner, vKey) { self.onVertexClick(q, r, corner, vKey) },
    onEdgeClick: function (edge) { self.onEdgeClick(edge) },
  })

  this.render()
  this.log("Click a hex corner to place a settlement")
}

UIInstance.prototype.render = function () {
  this.renderPanel()
  this.renderActions()
  this.renderLog()
  drawBoard()
}

UIInstance.prototype.renderPanel = function () {
  var panel = document.getElementById("panel")
  if (!panel) return

  var html = ""

  for (var i = 0; i < game.players.length; i++) {
    var p = game.players[i]
    var active = i === game.currentPlayer ? ' active' : ''
    html +=
      '<div class="player-card' + active + '">' +
        '<h3>' +
          '<span class="player-name" style="color:' + PLAYER_COLORS[i] + '">' + p.name + '</span>' +
          '<span class="player-vp">' + p.vp + ' VP</span>' +
        '</h3>' +
        '<div class="resources">' +
          selfResourcePill("brick", p.resources.brick) +
          selfResourcePill("lumber", p.resources.lumber) +
          selfResourcePill("wool", p.resources.wool) +
          selfResourcePill("grain", p.resources.grain) +
          selfResourcePill("ore", p.resources.ore) +
        '</div>' +
      '</div>'
  }

  panel.innerHTML = html
}

function selfResourcePill(res, count) {
  var color = RESOURCE_COLORS[res]
  var emoji = RESOURCE_EMOJI[res]
  return '<div class="resource-pill ' + res + '" style="border-left: 4px solid ' + color + '">' +
    '<span class="emoji">' + emoji + '</span>' +
    '<span class="count">' + count + '</span>' +
  '</div>'
}

UIInstance.prototype.renderActions = function () {
  var self = this
  var actions = document.getElementById("actions")
  if (!actions) return

  var phase = game.phase
  var cp = game.players[game.currentPlayer]

  var html = ''

  if (phase === "initial_first" || phase === "initial_second") {
    html += '<div class="phase-label">' + cp.name + ' — ' + (phase === "initial_first" ? "First" : "Second") + ' settlement</div>'
    if (game.setupStep === "road") {
      html += '<div style="color:var(--text-dim);font-size:0.85rem">Click an edge to place a road</div>'
    } else {
      html += '<div style="color:var(--text-dim);font-size:0.85rem">Click a hex corner to place a settlement</div>'
    }
  }

  if (phase === "play") {
    html += '<div class="phase-label">' + cp.name + '\'s turn</div>'

    if (game.dice) {
      html += '<div id="dice-result">' + game.dice[0] + ' + ' + game.dice[1] + ' = ' + (game.dice[0] + game.dice[1]) + '</div>'
    }

    html += '<div class="btn-row">'

    if (!game.rolled) {
      html += '<button class="btn btn-primary" id="roll-btn">Roll dice</button>'
    }

    html += '<button class="btn" id="end-turn-btn">End turn</button>'
    html += '</div>'

    if (game.rolled) {
      html += '<div class="phase-label" style="margin-top:4px">Build</div>'
      html += '<div class="btn-row">'
      html += buildBtn("Road", BUILDING_COST.road, "build-road")
      html += buildBtn("Settlement", BUILDING_COST.settlement, "build-settlement")
      html += buildBtn("City", BUILDING_COST.city, "build-city")
      html += '</div>'
      html += '<div style="font-size:0.8rem;color:var(--text-dim);margin-top:4px">Click the board to place</div>'
    }

    this._buildMode = null
  }

  if (phase === "gameover") {
    var winner = game._winner
    html += '<div class="phase-label">' + game.players[winner].name + ' wins!</div>'
    html += '<button class="btn btn-primary" id="new-game-btn">New game</button>'
  }

  actions.innerHTML = html

  this.bindActionButtons()
}

function buildBtn(label, cost, id) {
  var cp2 = game.players[game.currentPlayer]
  var canAfford = true
  for (var r in cost) {
    if ((cp2.resources[r] || 0) < cost[r]) { canAfford = false; break }
  }

  var costStr = ""
  for (var r2 in cost) {
    costStr += RESOURCE_EMOJI[r2] + cost[r2] + " "
  }

  return '<button class="btn" id="' + id + '"' + (canAfford ? "" : " disabled") + ' title="' + costStr.trim() + '">' + label + '</button>'
}

UIInstance.prototype.bindActionButtons = function () {
  var self = this

  var rollBtn = document.getElementById("roll-btn")
  if (rollBtn) {
    rollBtn.addEventListener("click", function () {
      var result = Game.rollDice()
      self.render()
      if (result.gains.length > 0) {
        var msgs = result.gains.map(function (g) {
          return game.players[g.player].name + " +" + g.amount + " " + RESOURCE_EMOJI[g.resource]
        })
        self.showToast(msgs.join(", "))
      }
    })
  }

  var endTurn = document.getElementById("end-turn-btn")
  if (endTurn) {
    endTurn.addEventListener("click", function () {
      Game.nextTurn()
      self.render()
    })
  }

  var buildRoad = document.getElementById("build-road")
  if (buildRoad) {
    buildRoad.addEventListener("click", function () {
      self._buildMode = "road"
      self.showToast("Click an edge to build a road")
    })
  }

  var buildSettlement = document.getElementById("build-settlement")
  if (buildSettlement) {
    buildSettlement.addEventListener("click", function () {
      self._buildMode = "settlement"
      self.showToast("Click a corner to build a settlement")
    })
  }

  var buildCity = document.getElementById("build-city")
  if (buildCity) {
    buildCity.addEventListener("click", function () {
      self._buildMode = "city"
      self.showToast("Click a settlement to upgrade to city")
    })
  }

  var newGame = document.getElementById("new-game-btn")
  if (newGame) {
    newGame.addEventListener("click", function () {
      self.showSetup()
    })
  }
}

UIInstance.prototype.onVertexClick = function (q, r, corner, vKey) {
  var phase = game.phase
  var cp = game.currentPlayer

  if (phase === "initial_first" || phase === "initial_second") {
    if (game.setupStep === "settlement") {
      var result = Game.canBuildSettlement(cp, q, r, corner, true)
      if (result.ok) {
        Game.placeSettlement(cp, q, r, corner)
        game.pendingSettlement = { q: q, r: r, corner: corner }
        game.setupStep = "road"
        this.render()
        this.showToast(game.players[cp].name + " placed settlement. Now place a road.")
      } else {
        this.showToast(result.reason)
      }
    }
    return
  }

  if (phase === "play") {
    if (this._buildMode === "settlement") {
      var result2 = Game.canBuildSettlement(cp, q, r, corner, false)
      if (result2.ok) {
        Game.placeSettlement(cp, q, r, corner)
        this._buildMode = null
        this.render()
        this.showToast("Settlement built!")
        this.checkWin()
      } else {
        this.showToast(result2.reason)
      }
    } else if (this._buildMode === "city") {
      var result3 = Game.canBuildCity(cp, q, r, corner)
      if (result3.ok) {
        Game.placeCity(cp, q, r, corner)
        this._buildMode = null
        this.render()
        this.showToast("City built!")
        this.checkWin()
      } else {
        this.showToast(result3.reason)
      }
    }
  }
}

UIInstance.prototype.onEdgeClick = function (edge) {
  var phase = game.phase
  var cp = game.currentPlayer

  if (phase === "initial_first" || phase === "initial_second") {
    if (game.setupStep === "road" && game.pendingSettlement) {
      var ps = game.pendingSettlement

      var c1 = edge.hex.c1
      var c2 = edge.hex.c2
      var eq = edge.hex.q
      var er = edge.hex.r

      var result = Game.canBuildRoad(cp, eq, er, c1, eq, er, c2, true, ps)
      if (result.ok) {
        Game.placeRoad(cp, eq, er, c1, eq, er, c2)

        if (game.phase === "initial_second") {
          Game.giveStartingResources(cp, ps.q, ps.r, ps.corner)
        }

        game.pendingSettlement = null
        var wasPhase = game.phase
        Game.nextTurn()
        this.render()

        if (wasPhase === "initial_second" && game.phase !== "initial_second") {
          var winner = Game.checkWin()
          if (winner >= 0) {
            game._winner = winner
            game.phase = "gameover"
            this.render()
            this.showToast(game.players[winner].name + " wins!")
          }
        }
      } else {
        this.showToast(result.reason)
      }
    }
    return
  }

  if (phase === "play" && this._buildMode === "road") {
    var c1b = edge.hex.c1
    var c2b = edge.hex.c2
    var eqb = edge.hex.q
    var erb = edge.hex.r

    var result2 = Game.canBuildRoad(cp, eqb, erb, c1b, eqb, erb, c2b, false, null)
    if (result2.ok) {
      Game.placeRoad(cp, eqb, erb, c1b, eqb, erb, c2b)
      this._buildMode = null
      this.render()
      this.showToast("Road built!")
    } else {
      this.showToast(result2.reason)
    }
  }
}

UIInstance.prototype.renderLog = function () {
  var logEl = document.getElementById("log")
  if (!logEl) return

  logEl.innerHTML = ""
  for (var i = 0; i < game.log.length; i++) {
    var div = document.createElement("div")
    div.textContent = game.log[i]
    logEl.appendChild(div)
  }

  logEl.scrollTop = logEl.scrollHeight
}

UIInstance.prototype.log = function (msg) {
  Game.log(msg)
  this.renderLog()
}

UIInstance.prototype.showToast = function (msg) {
  if (!this.toastContainer) return
  var el = document.createElement("div")
  el.className = "toast"
  el.textContent = msg
  this.toastContainer.appendChild(el)

  var self = this
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el)
  }, 2200)
}

UIInstance.prototype.checkWin = function () {
  var winner = Game.checkWin()
  if (winner >= 0) {
    game._winner = winner
    game.phase = "gameover"
    this.render()
    this.showToast(game.players[winner].name + " wins with " + game.players[winner].vp + " VP!")
  }
}
