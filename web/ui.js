function main() {
  UI = new UIInstance()
  UI.init()
  var verEl = document.getElementById("ver")
  if (verEl) verEl.textContent = _V
}

var UI = null

function UIInstance() {
  this.appEl = null
  this.toastContainer = null
}

UIInstance.prototype.init = function () {
  var self = this
  this.appEl = document.getElementById("app")

  document.getElementById("head").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-section]")
    if (!btn) return
    var el = document.getElementById(btn.getAttribute("data-section"))
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  })

  var gearBtn = document.getElementById("gear-btn")
  var gearDropdown = document.getElementById("gear-dropdown")

  function closeGearDropdown() { gearDropdown.style.display = "none" }

  gearBtn.addEventListener("click", function (e) {
    e.stopPropagation()
    gearDropdown.style.display = gearDropdown.style.display === "none" ? "block" : "none"
  })

  document.addEventListener("click", function () {
    closeGearDropdown()
  })

  function maybeConfirm(action) {
    if (game && game.phase) {
      self.confirmDiscard(function () { action() })
    } else {
      action()
    }
  }

  document.getElementById("home-btn").addEventListener("click", function () {
    if (game && game.phase) {
      self.confirmDiscard(function () { game = null; self.showLanding() })
    } else {
      self.showLanding()
    }
  })

  gearDropdown.addEventListener("click", function (e) {
    var item = e.target.closest("[data-gear]")
    if (!item || item.disabled) return
    closeGearDropdown()
    var itemAction = item.getAttribute("data-gear")
    switch (itemAction) {
      case "new":
        maybeConfirm(function () { game = null; clearGame(); self.showLanding() })
        break
      case "load":
        maybeConfirm(function () {
          importGameRecord(function (record) {
            game = deepClone(record.endState)
            game.startRecord = record.startState
            game.turns = record.turns
            game.currentTurnMoves = []
            saveGame()
            self.showGame()
          })
        })
        break
      case "close":
        self.confirmDiscard(function () { game = null; self.showLanding() })
        break
      case "save":
        exportGameRecord()
        break
    }
  })

  this.showLanding()
}

UIInstance.prototype.showSetup = function () {
  var self = this
  document.getElementById("head-nav").classList.remove("show")
  document.querySelector('[data-gear="save"]').style.display = "none"
  document.querySelector('[data-gear="close"]').style.display = "block"
  document.getElementById("game-title-head").textContent = ""
  function pad2(n) { return n < 10 ? "0" + n : "" + n }

  var now = new Date()
  var defaultTitle = "Game " + now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate()) + " " + pad2(now.getHours()) + ":" + pad2(now.getMinutes())

  this.appEl.innerHTML =
    '<div id="setup">' +
      '<label>' +
        'Game title' +
        '<input type="text" id="game-title" value="' + defaultTitle + '">' +
      '</label>' +

      '<label>' +
        'Number of players' +
        '<select id="player-count">' +
          '<option value="2">2</option>' +
          '<option value="3">3</option>' +
          '<option value="4" selected>4</option>' +
        '</select>' +
      '</label>' +

      '<div class="player-name-inputs" id="name-inputs">' +
        '<label style="width:100%">Player names</label>' +
      '</div>' +

      '<button class="btn btn-primary" id="start-btn">Begin</button>' +
    '</div>'

  function toggleOverLimit(input) {
    var val = input.value
    var glyphs = Array.from(val).length
    var bytes = new TextEncoder().encode(val).length
    if (glyphs > 32 || bytes > 64) {
      input.classList.add("over-limit")
    } else {
      input.classList.remove("over-limit")
    }
  }

  var countSelect = document.getElementById("player-count")
  var nameDiv = document.getElementById("name-inputs")
  var titleInput = document.getElementById("game-title")

  function updateNames() {
    var count = parseInt(countSelect.value)
    var label = nameDiv.querySelector("label")
    nameDiv.innerHTML = ""
    if (label) nameDiv.appendChild(label)
    for (var i = 0; i < count; i++) {
      var row = document.createElement("div")
      row.className = "name-row"
      var bubble = document.createElement("span")
      bubble.className = "color-bubble"
      bubble.style.background = PLAYER_COLORS[i]
      var input = document.createElement("input")
      input.type = "text"
      input.value = "Player " + (i + 1)
      input.dataset.idx = i
      row.appendChild(bubble)
      row.appendChild(input)
      nameDiv.appendChild(row)
      input.addEventListener("input", function () {
        toggleOverLimit(this)
      })
      toggleOverLimit(input)
    }
  }

  titleInput.addEventListener("input", function () {
    toggleOverLimit(this)
  })
  toggleOverLimit(titleInput)

  countSelect.addEventListener("change", updateNames)
  updateNames()

  document.getElementById("start-btn").addEventListener("click", function () {
    var count = parseInt(countSelect.value)
    var names = []
    var inputs = nameDiv.querySelectorAll("input")
    for (var i = 0; i < inputs.length; i++) {
      names.push(inputs[i].value || "Player " + (i + 1))
    }

    var rawTitle = titleInput.value || defaultTitle
    Game.start(count, Date.now(), rawTitle)
    for (var j = 0; j < game.players.length; j++) {
      game.players[j].name = truncateText(names[j] || "Player " + (j + 1), 64, 32)
    }
    Game.captureStartRecord()

    self.showGame()
  })
}

UIInstance.prototype.showLanding = function () {
  var self = this
  document.getElementById("head-nav").classList.remove("show")
  document.querySelector('[data-gear="save"]').style.display = "none"
  document.querySelector('[data-gear="close"]').style.display = "none"
  document.getElementById("game-title-head").textContent = ""

  var saved = loadGame()
  var restoreHTML = saved
    ? '<button class="btn btn-primary" id="restore-btn">Restore Game</button>'
    : ''

  this.appEl.innerHTML =
    '<div id="landing">' +
      '<h2>VESTA</h2>' +
      '<p class="landing-sub">Expanding Settlements Through Accord</p>' +
      '<div class="landing-buttons">' +
        restoreHTML +
        '<button class="btn" id="landing-new">⭐ New Game</button>' +
        '<button class="btn" id="landing-load">📁 Load Game</button>' +
      '</div>' +
    '</div>'

  document.getElementById("landing-new").addEventListener("click", function () {
    game = null
    clearGame()
    self.showSetup()
  })

  document.getElementById("landing-load").addEventListener("click", function () {
    importGameRecord(function (record) {
      game = deepClone(record.endState)
      game.startRecord = record.startState
      game.turns = record.turns
      game.currentTurnMoves = []
      saveGame()
      self.showGame()
    })
  })

  if (saved) {
    document.getElementById("restore-btn").addEventListener("click", function () {
      game = saved.game
      game.startRecord = saved.startRecord
      game.turns = saved.turns
      game.currentTurnMoves = saved.game.currentTurnMoves || []
      self.showGame()
    })
  }
}

UIInstance.prototype.confirmDiscard = function (onConfirm) {
  var overlay = document.createElement("div")
  overlay.className = "modal-overlay"
  overlay.innerHTML =
    '<div class="modal">' +
      '<h2>Discard current game?</h2>' +
      '<p>Your current game will be lost.</p>' +
      '<div class="btn-row" style="display:flex;gap:8px;justify-content:center">' +
        '<button class="btn btn-primary" id="confirm-yes" style="flex:1">Yes, discard</button>' +
        '<button class="btn" id="confirm-no" style="flex:1">Cancel</button>' +
      '</div>' +
    '</div>'
  document.body.appendChild(overlay)

  document.getElementById("confirm-yes").addEventListener("click", function () {
    document.body.removeChild(overlay)
    onConfirm()
  })
  document.getElementById("confirm-no").addEventListener("click", function () {
    document.body.removeChild(overlay)
  })
}

var _homeScale = 0
function getHomeScale() {
  if (_homeScale) return _homeScale
  var maxX = 0, maxY = 0
  for (var i = 0; i < BOARD_HEXES.length; i++) {
    var h = BOARD_HEXES[i]
    var p = hexToPixel(h.q, h.r)
    var cx = Math.abs(p.x - CANVAS_CENTER_X)
    var cy = Math.abs(p.y - CANVAS_CENTER_Y)
    if (cx > maxX) maxX = cx
    if (cy > maxY) maxY = cy
  }
  var extentX = maxX + HEX_SIZE + HEX_SIZE / 2
  var extentY = maxY + HEX_SIZE + HEX_SIZE / 2
  _homeScale = Math.min(
    CANVAS_WIDTH / 2 / extentX,
    CANVAS_HEIGHT / 2 / extentY,
    1.5
  )
  return _homeScale
}

UIInstance.prototype.showGame = function () {
  var self = this
  document.getElementById("head-nav").classList.add("show")
  document.querySelector('[data-gear="save"]').style.display = "block"
  document.querySelector('[data-gear="close"]').style.display = "block"
  document.getElementById("game-title-head").textContent = game.title || ""
  this.appEl.innerHTML =
    '<div id="game">' +
      '<div id="status-bar" class="side-bar">' +
        '<div id="actions"></div>' +
      '</div>' +
      '<div id="board-container">' +
        '<canvas id="board"></canvas>' +
        '<div id="view-buttons">' +
          '<button data-action="zoom-in" style="grid-column:1;grid-row:1"><span class="btn-layer btn-bot">➕</span><span class="btn-layer btn-top">🔍</span></button>' +
          '<button data-action="pan-up" style="grid-column:2;grid-row:1">⬆</button>' +
          '<button data-action="pan-left" style="grid-column:1;grid-row:2">⬅</button>' +
          '<button data-action="reset" style="grid-column:2;grid-row:2">🏠</button>' +
          '<button data-action="pan-right" style="grid-column:3;grid-row:2">➡</button>' +
          '<button data-action="zoom-out" style="grid-column:1;grid-row:3"><span class="btn-layer btn-bot">➖</span><span class="btn-layer btn-top">🔍</span></button>' +
          '<button data-action="pan-down" style="grid-column:2;grid-row:3">⬇</button>' +
        '</div>' +
      '</div>' +
      '<div id="panel" class="side-bar">' +
        '<div id="log"></div>' +
      '</div>' +
    '</div>' +
    '<div class="toast-container" id="toasts"></div>'

  this.toastContainer = document.getElementById("toasts")

  var canvas = document.getElementById("board")

  initBoard(canvas, {
    onVertexClick: function (q, r, corner, vKey) { self.onVertexClick(q, r, corner, vKey) },
    onEdgeClick: function (edge) { self.onEdgeClick(edge) },
  })

  var keyMap = {
    ArrowUp: "pan-up", w: "pan-up", W: "pan-up",
    ArrowDown: "pan-down", s: "pan-down", S: "pan-down",
    ArrowLeft: "pan-left", a: "pan-left", A: "pan-left",
    ArrowRight: "pan-right", d: "pan-right", D: "pan-right",
    "+": "zoom-in", "=": "zoom-in", PageUp: "zoom-in",
    "-": "zoom-out", _: "zoom-out", PageDown: "zoom-out",
    Home: "reset",
  }

  self._holdInterval = null

  var _smoothTarget = { cx: view.cx, cy: view.cy, scale: view.scale }
  var _animFrame = null
  var SMOOTH_FACTOR = 0.25

  setSmoothTarget(CANVAS_CENTER_X, CANVAS_CENTER_Y, getHomeScale())

  function setSmoothTarget(cx, cy, scale) {
    var hw = CANVAS_WIDTH / (2 * scale)
    var hh = CANVAS_HEIGHT / (2 * scale)
    _smoothTarget.cx = Math.max(CANVAS_CENTER_X - hw, Math.min(CANVAS_CENTER_X + hw, cx))
    _smoothTarget.cy = Math.max(CANVAS_CENTER_Y - hh, Math.min(CANVAS_CENTER_Y + hh, cy))
    _smoothTarget.scale = scale
    if (!_animFrame) _animFrame = requestAnimationFrame(smoothTick)
  }

  function smoothTick() {
    var dx = _smoothTarget.cx - view.cx
    var dy = _smoothTarget.cy - view.cy
    var ds = _smoothTarget.scale - view.scale
    var dist = Math.sqrt(dx * dx + dy * dy + ds * ds)
    if (dist < 0.01) {
      view.cx = _smoothTarget.cx
      view.cy = _smoothTarget.cy
      view.scale = _smoothTarget.scale
      _animFrame = null
      drawBoard()
      return
    }
    view.cx += dx * SMOOTH_FACTOR
    view.cy += dy * SMOOTH_FACTOR
    view.scale += ds * SMOOTH_FACTOR
    drawBoard()
    _animFrame = requestAnimationFrame(smoothTick)
  }

  function viewAction(action) {
    syncSmoothTarget()
    var offset = 30 / view.scale
    var tcx = view.cx
    var tcy = view.cy
    var tsc = view.scale
    switch (action) {
      case "zoom-in": tsc = Math.min(5, tsc * 1.2); break
      case "zoom-out": tsc = Math.max(0.5, tsc * 0.8); break
      case "pan-up": tcy -= offset; break
      case "pan-down": tcy += offset; break
      case "pan-left": tcx -= offset; break
      case "pan-right": tcx += offset; break
      case "reset": stopHold(); setSmoothTarget(CANVAS_CENTER_X, CANVAS_CENTER_Y, getHomeScale()); return
    }
    setSmoothTarget(tcx, tcy, tsc)
  }

  function syncSmoothTarget() {
    _smoothTarget.cx = view.cx
    _smoothTarget.cy = view.cy
    _smoothTarget.scale = view.scale
  }

  function startHold(action) {
    stopHold()
    viewAction(action)
    self._holdInterval = setInterval(function () { viewAction(action) }, 50)
  }

  function stopHold() {
    if (self._holdInterval) {
      clearInterval(self._holdInterval)
      self._holdInterval = null
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.repeat) return
    if (e.key === "Escape") {
      if (self._buildMode) {
        self._buildMode = null
        self.render()
      }
      return
    }
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return
    var action = keyMap[e.key]
    if (!action) return
    e.preventDefault()
    if (action === "reset") {
      stopHold()
      syncSmoothTarget()
      setSmoothTarget(CANVAS_CENTER_X, CANVAS_CENTER_Y, getHomeScale())
      return
    }
    startHold(action)
  })

  document.addEventListener("keyup", function (e) {
    if (keyMap[e.key]) stopHold()
  })

  var viewBtns = document.getElementById("view-buttons")
  if (viewBtns) {
    viewBtns.addEventListener("mousedown", function (e) {
      var btn = e.target.closest("button")
      if (!btn) return
      e.preventDefault()
      startHold(btn.getAttribute("data-action"))
    })
    viewBtns.addEventListener("mouseleave", stopHold)
  }
  document.addEventListener("mouseup", stopHold)

  this.render()
}

UIInstance.prototype.render = function () {
  this.renderPanel()
  this.renderActions()
  this.renderLog()
  drawBoard()
}

function playerCardHTML(i) {
  var p = game.players[i]
  var active = i === game.currentPlayer ? ' active' : ''
  return (
    '<div class="player-card' + active + '" data-player-idx="' + i + '">' +
      '<div class="player-head">' +
        '<span class="player-name" style="color:' + PLAYER_COLORS[i] + '">' + p.name + '</span>' +
      '</div>' +
      '<div class="player-stats">' +
        '<span>\uD83C\uDF09' + 0 + '</span>' +
        '<span>\uD83D\uDC82' + 0 + '</span>' +
        '<span>\uD83D\uDED6' + p.settlements.length + '</span>' +
        '<span>\uD83C\uDFEF' + p.cities.length + '</span>' +
        '<span>\uD83E\uDE99' + p.vp + '</span>' +
      '</div>' +
      '<div class="resources-compact">' +
        compactResource("brick", p.resources.brick) +
        compactResource("lumber", p.resources.lumber) +
        compactResource("wool", p.resources.wool) +
        compactResource("grain", p.resources.grain) +
        compactResource("ore", p.resources.ore) +
      '</div>' +
    '</div>'
  )
}

function playerCompactHTML(i) {
  var p = game.players[i]
  return (
    '<div class="player-stats">' +
      '<span>\uD83C\uDF09' + 0 + '</span>' +
      '<span>\uD83D\uDC82' + 0 + '</span>' +
      '<span>\uD83D\uDED6' + p.settlements.length + '</span>' +
      '<span>\uD83C\uDFEF' + p.cities.length + '</span>' +
      '<span>\uD83E\uDE99' + p.vp + '</span>' +
    '</div>' +
    '<div class="resources-compact">' +
      compactResource("brick", p.resources.brick) +
      compactResource("lumber", p.resources.lumber) +
      compactResource("wool", p.resources.wool) +
      compactResource("grain", p.resources.grain) +
      compactResource("ore", p.resources.ore) +
    '</div>'
  )
}

UIInstance.prototype.renderPanel = function () {
  var panel = document.getElementById("panel")
  if (!panel) return

  var html = ""

  for (var i = 0; i < game.players.length; i++) {
    if (i === game.currentPlayer) continue
    html += playerCardHTML(i)
  }

  html += '<div id="log"></div>'

  panel.innerHTML = html
  bindPlayerCards(panel)
}

function bindPlayerCards(container) {
  var cards = container.querySelectorAll(".player-card")
  for (var ci = 0; ci < cards.length; ci++) {
    ;(function (idx) {
      cards[ci].addEventListener("mouseenter", function () { setHighlightedPlayer(idx) })
      cards[ci].addEventListener("mouseleave", function () { setHighlightedPlayer(null) })
    })(parseInt(cards[ci].dataset.playerIdx))
  }
}

function compactResource(res, count) {
  var emoji = RESOURCE_EMOJI[res]
  return '<span class="res-item">' + emoji + count + '</span>'
}

UIInstance.prototype.renderActions = function () {
  var self = this
  var actions = document.getElementById("actions")
  if (!actions) return

  var phase = game.phase
  var cp = game.players[game.currentPlayer]

  var html = ''

  if (phase === "initial_first" || phase === "initial_second") {
    var initColor = PLAYER_COLORS[game.currentPlayer]
    html += '<div class="phase-label" style="background:' + initColor + ';color:#fff;font-weight:600;padding:4px 8px;border-radius:4px">' + cp.name + ' — ' + (phase === "initial_first" ? "First" : "Second") + ' settlement</div>'
    if (game.setupStep === "road") {
      html += '<div style="color:var(--text-dim);font-size:0.85rem">Click an edge to place a road</div>'
      setValidPositions("initial-road")
      setClickMode("initial-road")
    } else {
      html += '<div style="color:var(--text-dim);font-size:0.85rem">Click a hex corner to place a settlement</div>'
      setValidPositions("initial-settlement")
      setClickMode("initial-settlement")
    }
  }

  if (phase === "play") {
    var turnColor = PLAYER_COLORS[game.currentPlayer]
    var nextIdx = (game.currentPlayer + 1) % game.players.length
    var nextColor = PLAYER_COLORS[nextIdx]
    html += '<div class="phase-label" data-player-idx="' + game.currentPlayer + '" style="background:' + turnColor + ';color:#fff;font-weight:600;padding:4px 8px;border-radius:4px">' + cp.name + '\'s turn</div>'

    html += '<div class="btn-row btn-row-split">'
    html += '<span class="btn-row-left">'

    if (game.dice) {
      var f1 = String.fromCharCode(0x2680 + game.dice[0] - 1)
      var f2 = String.fromCharCode(0x2680 + game.dice[1] - 1)
      var total = game.dice[0] + game.dice[1]
      html += '<div id="dice-result">' + f1 + f2 + ' ' + total + (total === 7 ? ' \uD83E\uDD77' : '') + '</div>'
    } else if (!game.rolled) {
      html += '<button class="btn btn-primary" id="roll-btn" title="Roll dice" style="background:' + turnColor + '">🎲🔄🎲</button>'
    }

    html += '</span>'
    html += '<span class="btn-row-right">'
    html += '<button class="btn" id="end-turn-btn" title="End turn" style="background:' + nextColor + '"' + (game.rolled ? "" : " disabled") + '>⏭️</button>'
    html += '</span>'
    html += '</div>'

    html += playerCompactHTML(game.currentPlayer)

    html += '<div class="phase-label" style="margin-top:4px">🔨Build</div>'
    html += '<div class="btn-row">'
    html += buildBtn("🌉", BUILDING_COST.road, "build-road", "road", "Build road")
    html += buildBtn("🛖", BUILDING_COST.settlement, "build-settlement", "settlement", "Build settlement")
    html += buildBtn("🏰", BUILDING_COST.city, "build-city", "city", "Build city")
    html += '</div>'

    if (this._buildMode) {
      var msgs = {
        road: "Click an edge to build a road",
        settlement: "Click a corner to build a settlement",
        city: "Click a settlement to upgrade to city",
      }
      html += '<div id="build-status">' + (msgs[this._buildMode] || "") + ' <span id="cancel-build-btn" style="cursor:pointer;background:var(--border);border-radius:3px;padding:1px 8px;margin-left:4px">or cancel \u274C</span></div>'
    }

    if (!this._buildMode) {
      setValidPositions(null)
      setClickMode(null)
    }
  }

  if (phase === "gameover") {
    html += '<div class="phase-label">' + game.players[game.winner].name + ' wins!</div>'
    html += '<button class="btn btn-primary" id="new-game-btn">New game</button>'
  }

  actions.innerHTML = html

  bindPlayerCards(actions)
  this.bindActionButtons()
}

function buildBtn(emoji, cost, id, mode, title) {
  var cp2 = game.players[game.currentPlayer]
  var canAfford = true
  for (var r in cost) {
    if ((cp2.resources[r] || 0) < cost[r]) { canAfford = false; break }
  }

  var canPlace = true
  if (mode && game.phase === "play") {
    var positions = Game.getValidPositions(mode)
    canPlace = positions.length > 0
  }

  var disabled = (!canAfford || !canPlace || !game.rolled)

  var costStr = ""
  for (var r2 in cost) {
    for (var i = 0; i < cost[r2]; i++) costStr += RESOURCE_EMOJI[r2]
  }

  return '<button class="btn" id="' + id + '"' + (disabled ? " disabled" : "") + ' title="' + title + '">' + emoji + '🔨' + costStr + '</button>'
}

UIInstance.prototype.bindActionButtons = function () {
  var self = this

  var rollBtn = document.getElementById("roll-btn")
  if (rollBtn) {
    rollBtn.addEventListener("click", function () {
      var result = Game.rollDice()
      self._lastTotal = result.total
      self.render()
      if (typeof flashTiles === "function") flashTiles(result.total)
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
      self._buildMode = null
      Game.nextTurn()
      self.render()
    })
  }

  var buildRoad = document.getElementById("build-road")
  if (buildRoad) {
    buildRoad.addEventListener("click", function () {
      self._buildMode = "road"
      setValidPositions("road")
      setClickMode("road")
      self.render()
    })
  }

  var buildSettlement = document.getElementById("build-settlement")
  if (buildSettlement) {
    buildSettlement.addEventListener("click", function () {
      self._buildMode = "settlement"
      setValidPositions("settlement")
      setClickMode("settlement")
      self.render()
    })
  }

  var buildCity = document.getElementById("build-city")
  if (buildCity) {
    buildCity.addEventListener("click", function () {
      self._buildMode = "city"
      setValidPositions("city")
      setClickMode("city")
      self.render()
    })
  }

  var newGame = document.getElementById("new-game-btn")
  if (newGame) {
    newGame.addEventListener("click", function () {
      self.showLanding()
    })
  }

  var diceResult = document.getElementById("dice-result")
  if (diceResult && self._lastTotal) {
    (function (total) {
      diceResult.addEventListener("mouseenter", function () {
        if (typeof hoverTiles === "function") hoverTiles(total)
      })
      diceResult.addEventListener("mouseleave", function () {
        if (typeof unhoverTiles === "function") unhoverTiles()
      })
    })(self._lastTotal)
  }

  var turnLabel = document.querySelector("#actions .phase-label[data-player-idx]")
  if (turnLabel) {
    ;(function (idx) {
      turnLabel.addEventListener("mouseenter", function () { setHighlightedPlayer(idx) })
      turnLabel.addEventListener("mouseleave", function () { setHighlightedPlayer(null) })
    })(parseInt(turnLabel.getAttribute("data-player-idx")))
  }

  var cancelBtn = document.getElementById("cancel-build-btn")
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      self._buildMode = null
      self.render()
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
        saveGame()
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
          saveGame()
        }

        game.pendingSettlement = null
        var wasPhase = game.phase
        Game.nextTurn()
        this.render()

        if (wasPhase === "initial_second" && game.phase !== "initial_second") {
          var winner = Game.checkWin()
          if (winner >= 0) {
            game.winner = winner
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

  var names = {}
  for (var i = 0; i < game.players.length; i++) {
    names[i] = game.players[i].name
  }

  var lines = []

  for (var t = 0; t < game.turns.length; t++) {
    var turn = game.turns[t]
    if (turn.phase === "play") {
      lines.push("--- Turn " + turn.turn + " ---")
      lines.push(names[turn.player] + "'s turn")
    }
    for (var m = 0; m < turn.moves.length; m++) {
      GameUtil.deriveLogLine(lines, turn.moves[m], names)
    }
    if (turn.phase !== "play" && turn.moves.length > 0) {
      var lastMove = turn.moves[turn.moves.length - 1]
      if (lastMove.type === "end-turn" && t === game.turns.length - 1 && game.phase === "play") {
        lines.push("--- Game begins! ---")
      }
    }
  }

  if (game.currentTurnMoves && game.currentTurnMoves.length > 0) {
    if (game.turns.length === 0 || game.phase === "play") {
      if (game.phase === "play") {
        var hasHeader = false
        for (var x = 0; x < lines.length; x++) {
          if (lines[x] === "--- Turn " + game.turn + " ---") { hasHeader = true; break }
        }
        if (!hasHeader) {
          lines.push("--- Turn " + game.turn + " ---")
          lines.push(names[game.currentPlayer] + "'s turn")
        }
      }
    }
    for (var n = 0; n < game.currentTurnMoves.length; n++) {
      GameUtil.deriveLogLine(lines, game.currentTurnMoves[n], names)
    }
  }

  logEl.innerHTML = ""
  for (var i = 0; i < lines.length; i++) {
    var div = document.createElement("div")
    div.textContent = lines[i]
    logEl.appendChild(div)
  }

  logEl.scrollTop = logEl.scrollHeight
}

UIInstance.prototype.log = function () {
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
    game.winner = winner
    game.phase = "gameover"
    this.render()
    this.showToast(game.players[winner].name + " wins with " + game.players[winner].vp + " VP!")
  }
}
