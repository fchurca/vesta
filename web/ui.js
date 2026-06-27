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
            backfillPlayerRates()
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
        '<input type="text" id="game-title" placeholder="' + defaultTitle + '">' +
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
  var playerColors = PLAYER_COLORS.slice()

  function updateNames() {
    var count = parseInt(countSelect.value)
    while (playerColors.length < count) {
      var used = {}
      for (var ci = 0; ci < playerColors.length; ci++) used[playerColors[ci]] = true
      for (var ci = 0; ci < PLAYER_COLORS.length; ci++) {
        if (!used[PLAYER_COLORS[ci]]) {
          playerColors.push(PLAYER_COLORS[ci])
          break
        }
      }
    }
    playerColors.length = count
    var label = nameDiv.querySelector("label")
    nameDiv.innerHTML = ""
    if (label) nameDiv.appendChild(label)
    for (var i = 0; i < count; i++) {
      var row = document.createElement("div")
      row.className = "name-row"
      var bubble = document.createElement("span")
      bubble.className = "color-bubble"
      bubble.style.background = playerColors[i]
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
      ;(function (input, defaultValue) {
        input.addEventListener("focus", function () {
          if (input.value === defaultValue) input.value = ""
        })
        input.addEventListener("blur", function () {
          if (input.value === "") input.value = defaultValue
          toggleOverLimit(input)
        })
      })(input, "Player " + (i + 1))
      ;(function (bubble, idx) {
        bubble.addEventListener("click", function () {
          var currentColor = playerColors[idx]
          var currentIdx = PLAYER_COLORS.indexOf(currentColor)
          var nextIdx = (currentIdx + 1) % PLAYER_COLORS.length
          while (nextIdx !== currentIdx) {
            var taken = false
            for (var j = 0; j < playerColors.length; j++) {
              if (j !== idx && playerColors[j] === PLAYER_COLORS[nextIdx]) {
                taken = true
                break
              }
            }
            if (!taken) break
            nextIdx = (nextIdx + 1) % PLAYER_COLORS.length
          }
          playerColors[idx] = PLAYER_COLORS[nextIdx]
          bubble.style.background = PLAYER_COLORS[nextIdx]
        })
      })(bubble, i)
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
      game.players[j].color = playerColors[j]
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
      backfillPlayerRates()
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
      backfillPlayerRates()
      self.showGame()
    })
  }
}

function backfillPlayerRates() {
  for (var p = 0; p < game.players.length; p++) {
    game.players[p].rates = computeRates(game, p)
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
UIInstance.prototype.openTradePopup = function () {
  var self = this
  var cp = game.players[game.currentPlayer]
  var tradeMode = "bank"
  var give = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 }
  var take = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 }
  var RESOURCE_KEYS = ["brick", "lumber", "wool", "grain", "ore"]

  var partners = ["bank"]
  for (var pi = 1; pi < game.players.length; pi++) {
    partners.push((game.currentPlayer + pi) % game.players.length)
  }

  function nextPartner() {
    var idx = partners.indexOf(tradeMode)
    return partners[(idx + 1) % partners.length]
  }

  function partnerLabel() {
    if (tradeMode === "bank") return "bank"
    return game.players[tradeMode].name
  }

  function partnerColor() {
    if (tradeMode === "bank") return "#8b6914"
    return game.players[tradeMode].color
  }

  function giveStep(res) { return tradeMode === "bank" ? cp.rates[res] : 1 }
  function takeStep() { return 1 }

  function canAddGive(res) {
    if (take[res] > 0) return false
    return (cp.resources[res] || 0) - give[res] >= giveStep(res)
  }

  function canAddTake(res) {
    if (give[res] > 0) return false
    if (tradeMode !== "bank") {
      var partner = game.players[tradeMode]
      return (partner.resources[res] || 0) - take[res] >= 1
    }
    return true
  }

  function validate() {
    var anyOverlap = false
    var giveRes = null
    var giveCount = 0
    var giveTotal = 0
    var takeRes = null
    var takeCount = 0
    var takeTotal = 0
    for (var i = 0; i < RESOURCE_KEYS.length; i++) {
      var r = RESOURCE_KEYS[i]
      if (give[r] > 0) { giveCount++; giveRes = r; giveTotal += give[r] }
      if (take[r] > 0) { takeCount++; takeRes = r; takeTotal += take[r] }
      if (give[r] > 0 && take[r] > 0) anyOverlap = true
    }

    if (anyOverlap) return false
    if (giveTotal === 0 || takeTotal === 0) return false

    if (tradeMode === "bank") {
      if (giveCount !== 1 || takeCount !== 1) return false
      if (giveRes === takeRes) return false
      if (give[giveRes] !== cp.rates[giveRes]) return false
      if (take[takeRes] !== 1) return false
      if ((cp.resources[giveRes] || 0) < give[giveRes]) return false
      return true
    }

    var partner = game.players[tradeMode]
    for (var v = 0; v < RESOURCE_KEYS.length; v++) {
      var rv = RESOURCE_KEYS[v]
      if (take[rv] > 0 && (partner.resources[rv] || 0) < take[rv]) return false
    }
    return true
  }

  function chipsHTML(obj, action) {
    var html = ""
    for (var i = 0; i < RESOURCE_KEYS.length; i++) {
      var r = RESOURCE_KEYS[i]
      for (var c = 0; c < obj[r]; c++) {
        html += '<span class="trade-chip" data-trade-action="' + action + '" data-trade-res="' + r + '">' + RESOURCE_EMOJI[r] + '</span>'
      }
    }
    if (!html) html = '<span style="color:var(--text-dim);font-size:0.85rem">\u2014</span>'
    return html
  }

  function poolHTML(keys, action, stepFn, canAdd) {
    var html = ""
    for (var i = 0; i < keys.length; i++) {
      var r = keys[i]
      var disabled = !canAdd(r)
      var style = disabled ? ' style="opacity:0.35;cursor:default;pointer-events:none"' : ''
      var label = tradeMode === "bank" && action === "add-give" ? RESOURCE_EMOJI[r] + '\u00d7' + stepFn(r) : RESOURCE_EMOJI[r]
      html += '<span class="trade-pool-item"' + style + ' data-trade-action="' + action + '" data-trade-res="' + r + '">' + label + '</span>'
    }
    return html
  }

  function resourcesShortHTML(obj) {
    var parts = []
    for (var i = 0; i < RESOURCE_KEYS.length; i++) {
      var r = RESOURCE_KEYS[i]
      parts.push(RESOURCE_EMOJI[r] + (obj[r] || 0))
    }
    return parts.join(" ")
  }

  function render() {
    var giveResHTML = resourcesShortHTML(cp.resources)
    var partnerObj = tradeMode === "bank" ? null : game.players[tradeMode].resources
    var takeResHTML = partnerObj ? resourcesShortHTML(partnerObj) : ""

    return (
      '<div class="modal trade-modal">' +
        '<div class="trade-columns">' +
          '<div class="trade-col">' +
            '<div class="trade-col-title" style="background:' + cp.color + ';color:#fff;font-weight:600;padding:4px 8px;border-radius:4px;text-align:center">' + cp.name + ' <span class="trade-arrow-h">\u2192</span><span class="trade-arrow-v">\u2193</span></div>' +
            '<div class="trade-selection">' + chipsHTML(give, "remove-give") + '</div>' +
            '<div class="trade-pool">' + poolHTML(RESOURCE_KEYS, "add-give", giveStep, canAddGive) + '</div>' +
            '<div class="trade-resources">' + giveResHTML + '</div>' +
          '</div>' +
          '<div class="trade-col">' +
            '<div class="trade-col-title" id="trade-partner-btn" style="background:' + partnerColor() + ';color:#fff;font-weight:600;padding:4px 8px;border-radius:4px;text-align:center;cursor:pointer"><span class="trade-arrow-h">\u2190 </span><span class="trade-arrow-v">\u2191 </span>' + partnerLabel() + '</div>' +
            '<div class="trade-selection">' + chipsHTML(take, "remove-take") + '</div>' +
            '<div class="trade-pool">' + poolHTML(RESOURCE_KEYS, "add-take", takeStep, canAddTake) + '</div>' +
            '<div class="trade-resources">' + takeResHTML + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="trade-actions">' +
          '<button class="btn btn-primary" id="trade-ok"' + (validate() ? '' : ' disabled') + '>OK</button>' +
          '<button class="btn" id="trade-cancel">Cancel</button>' +
        '</div>' +
      '</div>'
    )
  }

  function buildOverlay() {
    var overlay = document.createElement("div")
    overlay.className = "modal-overlay"
    overlay.innerHTML = render()
    document.body.appendChild(overlay)
    return overlay
  }

  function rebind(overlay) {
    var okBtn = document.getElementById("trade-ok")
    if (okBtn && !okBtn.disabled) {
      okBtn.addEventListener("click", function () {
        Game.doTrade(give, take, tradeMode === "bank" ? "bank" : tradeMode)
        document.body.removeChild(overlay)
        self.render()
      })
    }

    document.getElementById("trade-cancel").addEventListener("click", function () {
      document.body.removeChild(overlay)
    })

    var partnerBtn = document.getElementById("trade-partner-btn")
    if (partnerBtn) {
      partnerBtn.addEventListener("click", function () {
        tradeMode = nextPartner()
        give = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 }
        take = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 }
        overlay.innerHTML = render()
        rebind(overlay)
      })
    }

    var poolClicks = overlay.querySelectorAll("[data-trade-action]")
    for (var i = 0; i < poolClicks.length; i++) {
      poolClicks[i].addEventListener("click", function () {
        var action = this.getAttribute("data-trade-action")
        var res = this.getAttribute("data-trade-res")
        if (action === "add-give") {
          give[res] += giveStep(res)
          overlay.innerHTML = render()
          rebind(overlay)
        } else if (action === "remove-give") {
          give[res] = Math.max(0, give[res] - giveStep(res))
          overlay.innerHTML = render()
          rebind(overlay)
        } else if (action === "add-take") {
          take[res] += takeStep()
          overlay.innerHTML = render()
          rebind(overlay)
        } else if (action === "remove-take") {
          take[res] = Math.max(0, take[res] - takeStep())
          overlay.innerHTML = render()
          rebind(overlay)
        }
      })
    }
  }

  var overlay = buildOverlay()
  rebind(overlay)
}

UIInstance.prototype.openMonopolyPopup = function () {
  var self = this
  var cp = game.players[game.currentPlayer]
  var totals = Game.calculateMonopolyTotals(game.currentPlayer)

  var RESOURCE_KEYS = ["brick", "lumber", "wool", "grain", "ore"]

  var overlay = document.createElement("div")
  overlay.className = "modal-overlay"

  function render() {
    var html = '<div class="modal" style="text-align:center">'
    html += '<h3 style="margin:0 0 12px">Monopoly \u2014 pick a resource</h3>'

    var any = false
    for (var i = 0; i < RESOURCE_KEYS.length; i++) {
      var r = RESOURCE_KEYS[i]
      if (totals[r] > 0) {
        any = true
        html += '<button class="btn monopoly-option" data-monopoly-res="' + r + '" style="display:block;width:100%;margin:4px 0">' + RESOURCE_EMOJI[r] + ' ' + r + ' (' + totals[r] + ')</button>'
      }
    }

    if (!any) {
      html += '<p style="color:var(--text-dim)">No resources to steal</p>'
    }

    html += '<button class="btn" id="monopoly-cancel" style="margin-top:12px">Cancel</button>'
    html += '</div>'
    return html
  }

  overlay.innerHTML = render()
  document.body.appendChild(overlay)

  var optBtns = overlay.querySelectorAll("[data-monopoly-res]")
  for (var i = 0; i < optBtns.length; i++) {
    ;(function (res) {
      optBtns[i].addEventListener("click", function () {
        Game.playMonopolyCard(game.currentPlayer, res)
        document.body.removeChild(overlay)
        self.render()
        self.checkWin()
      })
    })(optBtns[i].getAttribute("data-monopoly-res"))
  }

  var cancelBtn = document.getElementById("monopoly-cancel")
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      document.body.removeChild(overlay)
    })
  }

  function onKey(e) {
    if (e.key === "Escape") {
      if (overlay.parentNode) document.body.removeChild(overlay)
      document.removeEventListener("keydown", onKey)
    }
  }
  document.addEventListener("keydown", onKey)
}

UIInstance.prototype.openYearOfPlentyPopup = function () {
  var self = this
  var RESOURCE_KEYS = ["brick", "lumber", "wool", "grain", "ore"]
  var selected = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 }
  var total = 0

  function chipsHTML() {
    var html = ""
    for (var i = 0; i < RESOURCE_KEYS.length; i++) {
      var r = RESOURCE_KEYS[i]
      for (var c = 0; c < selected[r]; c++) {
        html += '<span class="trade-chip" data-yop-action="remove" data-yop-res="' + r + '">' + RESOURCE_EMOJI[r] + '</span>'
      }
    }
    if (!html) html = '<span style="color:var(--text-dim);font-size:0.85rem">\u2014</span>'
    return html
  }

  function poolHTML() {
    var html = ""
    for (var i = 0; i < RESOURCE_KEYS.length; i++) {
      var r = RESOURCE_KEYS[i]
      var disabled = total >= 2 ? ' style="opacity:0.35;cursor:default"' : ''
      html += '<span class="trade-pool-item"' + disabled + ' data-yop-action="add" data-yop-res="' + r + '">' + RESOURCE_EMOJI[r] + '</span>'
    }
    return html
  }

  function render() {
    return (
      '<div class="modal" style="text-align:center">' +
        '<h3 style="margin:0 0 12px">Year of Plenty \u2014 pick 2 resources</h3>' +
        '<div class="trade-selection">' + chipsHTML() + '</div>' +
        '<div class="trade-pool">' + poolHTML() + '</div>' +
        '<div style="font-size:0.85rem;color:var(--text-dim);margin:4px 0">' + total + '/2 selected</div>' +
        '<div class="trade-actions">' +
          '<button class="btn btn-primary" id="yop-ok"' + (total === 2 ? '' : ' disabled') + '>OK</button>' +
          '<button class="btn" id="yop-cancel">Cancel</button>' +
        '</div>' +
      '</div>'
    )
  }

  var overlay = document.createElement("div")
  overlay.className = "modal-overlay"
  overlay.innerHTML = render()
  document.body.appendChild(overlay)

  function rebind() {
    var okBtn = document.getElementById("yop-ok")
    if (okBtn && !okBtn.disabled) {
      okBtn.addEventListener("click", function () {
        var resources = []
        for (var i = 0; i < RESOURCE_KEYS.length; i++) {
          var r = RESOURCE_KEYS[i]
          for (var c = 0; c < selected[r]; c++) resources.push(r)
        }
        Game.playYearOfPlentyCard(game.currentPlayer, resources[0], resources[1])
        document.body.removeChild(overlay)
        self.render()
      })
    }

    document.getElementById("yop-cancel").addEventListener("click", function () {
      document.body.removeChild(overlay)
    })

    var items = overlay.querySelectorAll("[data-yop-action]")
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener("click", function () {
        var action = this.getAttribute("data-yop-action")
        var res = this.getAttribute("data-yop-res")
        if (action === "add" && total < 2) {
          selected[res]++
          total++
          overlay.innerHTML = render()
          rebind()
        } else if (action === "remove") {
          selected[res] = Math.max(0, selected[res] - 1)
          total--
          overlay.innerHTML = render()
          rebind()
        }
      })
    }
  }

  rebind()

  function onKey(e) {
    if (e.key === "Escape") {
      if (overlay.parentNode) document.body.removeChild(overlay)
      document.removeEventListener("keydown", onKey)
    }
  }
  document.addEventListener("keydown", onKey)
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
    onTileClick: function (q, r) { self.onTileClick(q, r) },
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
      if (self._buildMode === "road-card") {
        if (self._roadBuildPlaced > 0) {
          Game.consumeRoadBuildCard(game.currentPlayer)
        }
        self._buildMode = null
        self._roadBuildPlaced = 0
        self.render()
      } else if (self._buildMode === "guard-tile") {
        self._buildMode = null
        self._guardCardIdx = null
        self.render()
      } else if (self._buildMode === "guard-victim") {
        return
      } else if (self._buildMode) {
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
        '<span class="player-name" style="color:' + p.color + '">' + p.name + '</span>' +
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

function cpHasRes(cp) {
  return cp.resources.brick > 0 || cp.resources.lumber > 0 || cp.resources.wool > 0 || cp.resources.grain > 0 || cp.resources.ore > 0
}

UIInstance.prototype.renderActions = function () {
  var self = this
  var actions = document.getElementById("actions")
  if (!actions) return

  var phase = game.phase
  var cp = game.players[game.currentPlayer]

  var html = ''

  if (phase === "initial_first" || phase === "initial_second") {
    var initColor = cp.color
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
    var turnColor = cp.color
    var nextIdx = (game.currentPlayer + 1) % game.players.length
    var nextColor = game.players[nextIdx].color
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

    html += '<div class="phase-label" style="margin-top:4px">⚖Trade</div>'
    html += '<button class="btn" id="trade-btn"' + (!game.rolled || !cpHasRes(cp) ? ' disabled' : '') + '>⚖ Trade</button>'
    if (cp.rates) {
      html += '<div style="font-size:0.8rem;margin-top:2px;text-align:center">'
      html += '⚖: '
      html += RESOURCE_EMOJI.brick + cp.rates.brick + ' '
      html += RESOURCE_EMOJI.lumber + cp.rates.lumber + ' '
      html += RESOURCE_EMOJI.wool + cp.rates.wool + ' '
      html += RESOURCE_EMOJI.grain + cp.rates.grain + ' '
      html += RESOURCE_EMOJI.ore + cp.rates.ore
      html += '</div>'
    }

    html += '<div class="phase-label" style="margin-top:4px">🔨Build</div>'
    html += '<div class="btn-row">'
    var cp = game.players[game.currentPlayer]
    html += buildBtn("🌉", BUILDING_COST.road, "build-road", "road", "Build road", { built: cp.roadCount, max: 15 })
    html += buildBtn("🛖", BUILDING_COST.settlement, "build-settlement", "settlement", "Build settlement", { built: cp.settlements.length, max: 5 })
    html += buildBtn("🏰", BUILDING_COST.city, "build-city", "city", "Build city", { built: cp.cities.length, max: 4 })
    html += '</div>'

    if (this._buildMode === "road-card") {
      var roadLabel = this._roadBuildPlaced === 0 ? "Click edge for first free road" : "Click edge for second free road"
      html += '<div id="build-status">' + roadLabel + ' <span id="cancel-build-btn" style="cursor:pointer;background:var(--border);border-radius:3px;padding:1px 8px;margin-left:4px">or cancel \u274C</span></div>'
    } else if (this._buildMode === "guard-tile") {
      html += '<div id="build-status">Click a tile to move the robber <span id="cancel-build-btn" style="cursor:pointer;background:var(--border);border-radius:3px;padding:1px 8px;margin-left:4px">or cancel \u274C</span></div>'
    } else if (this._buildMode === "guard-victim") {
      html += '<div id="build-status">Click a settlement or city to rob</div>'
    } else if (this._buildMode) {
      var msgs = {
        road: "Click an edge to build a road",
        settlement: "Click a corner to build a settlement",
        city: "Click a settlement to upgrade to city",
      }
      html += '<div id="build-status">' + (msgs[this._buildMode] || "") + ' <span id="cancel-build-btn" style="cursor:pointer;background:var(--border);border-radius:3px;padding:1px 8px;margin-left:4px">or cancel \u274C</span></div>'
    }

    html += '<div class="phase-label" style="margin-top:4px">📜Dev Cards: ' + game.devDeck.remaining + ' left</div>'
    html += '<div class="btn-row">'
    var devCanAfford = true
    var devCost = BUILDING_COST.development
    for (var dr in devCost) { if ((cp.resources[dr] || 0) < devCost[dr]) { devCanAfford = false; break } }
    var devCostStr = ""
    for (var dr2 in devCost) { for (var di = 0; di < devCost[dr2]; di++) devCostStr += RESOURCE_EMOJI[dr2] }
    var deckEmpty = game.devDeck.remaining === 0
    html += '<button class="btn" id="buy-dev-card"' + (devCanAfford && !deckEmpty ? '' : ' disabled') + ' title="Buy development card">\uD83C\uDCCF' + devCostStr + '</button>'
    html += '</div>'

    if (cp.hand && cp.hand.length > 0) {
      html += '<div class="dev-hand">'
      for (var hi = 0; hi < cp.hand.length; hi++) {
        var card = cp.hand[hi]
        var emoji = DEV_CARD_EMOJI[card.cardType] || "?"
        var available = card.available
        var clickable = ""
        if (available) {
          if (card.cardType === "monopoly") {
            clickable = ' data-dev-monopoly-idx="' + hi + '"'
          } else if (card.cardType === "year-of-plenty") {
            clickable = ' data-dev-yop-idx="' + hi + '"'
          } else if (card.cardType === "road-build") {
            if (cp.roadCount < 15 && Game.getValidPositions("road-card").length > 0) {
              clickable = ' data-dev-roadcard-idx="' + hi + '"'
            }
          } else if (card.cardType === "knight") {
            clickable = ' data-dev-guard-idx="' + hi + '"'
          } else {
            clickable = ' data-dev-card-idx="' + hi + '"'
          }
        }
        var dim = available ? '' : ' style="opacity:0.4"'
        html += '<div class="dev-card"' + dim + clickable + '>' + emoji + '</div>'
      }
      html += '</div>'
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

function buildBtn(emoji, cost, id, mode, title, counts) {
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

  var atLimit = counts && counts.built >= counts.max
  var disabled = (!canAfford || !canPlace || !game.rolled || atLimit)

  var costStr = ""
  for (var r2 in cost) {
    for (var i = 0; i < cost[r2]; i++) costStr += RESOURCE_EMOJI[r2]
  }

  if (counts) costStr += " (" + counts.built + "/" + counts.max + ")"
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

  var tradeBtn = document.getElementById("trade-btn")
  if (tradeBtn && !tradeBtn.disabled) {
    tradeBtn.addEventListener("click", function () {
      self.openTradePopup()
    })
  }

  var buyDev = document.getElementById("buy-dev-card")
  if (buyDev && !buyDev.disabled) {
    buyDev.addEventListener("click", function () {
      Game.buyDevCard(game.currentPlayer)
      self.render()
    })
  }

  var devCards = document.querySelectorAll("[data-dev-card-idx]")
  for (var dci = 0; dci < devCards.length; dci++) {
    ;(function (idx) {
      devCards[dci].addEventListener("click", function () {
        Game.playDevCard(game.currentPlayer, idx)
        self.render()
        var winner = Game.checkWin()
        if (winner >= 0) {
          game.winner = winner
          game.phase = "gameover"
          saveGame()
          self.render()
          self.showToast(game.players[winner].name + " wins with " + game.players[winner].vp + " VP!")
        }
      })
    })(parseInt(devCards[dci].getAttribute("data-dev-card-idx")))
  }

  var monopolyCards = document.querySelectorAll("[data-dev-monopoly-idx]")
  for (var mci = 0; mci < monopolyCards.length; mci++) {
    monopolyCards[mci].addEventListener("click", function () {
      self.openMonopolyPopup()
    })
  }

  var yopCards = document.querySelectorAll("[data-dev-yop-idx]")
  for (var yci = 0; yci < yopCards.length; yci++) {
    yopCards[yci].addEventListener("click", function () {
      self.openYearOfPlentyPopup()
    })
  }

  var roadCardCards = document.querySelectorAll("[data-dev-roadcard-idx]")
  for (var rci = 0; rci < roadCardCards.length; rci++) {
    ;(function (idx) {
      roadCardCards[rci].addEventListener("click", function () {
        self._buildMode = "road-card"
        self._roadBuildPlaced = 0
        setValidPositions("road-card")
        setClickMode("road-card")
        self.render()
      })
    })(parseInt(roadCardCards[rci].getAttribute("data-dev-roadcard-idx")))
  }

  var guardCards = document.querySelectorAll("[data-dev-guard-idx]")
  for (var gci = 0; gci < guardCards.length; gci++) {
    ;(function (idx) {
      guardCards[gci].addEventListener("click", function () {
        var self2 = self
        self2._buildMode = "guard-tile"
        self2._guardCardIdx = idx
        setValidPositions("guard-tile")
        setClickMode("guard-tile")
        self2.render()
      })
    })(parseInt(guardCards[gci].getAttribute("data-dev-guard-idx")))
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
      if (self._buildMode === "road-card") {
        if (self._roadBuildPlaced > 0) {
          Game.consumeRoadBuildCard(game.currentPlayer)
        }
        self._roadBuildPlaced = 0
        self._buildMode = null
      } else {
        self._buildMode = null
      }
      self._guardCardIdx = null
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
    } else if (this._buildMode === "guard-victim") {
      var vKey = vertexKey(q, r, corner)
      var target = null
      for (var pi = 0; pi < _validPositions.length; pi++) {
        if (_validPositions[pi].type === "vertex" && _validPositions[pi].key === vKey) {
          target = _validPositions[pi]
          break
        }
      }
      if (target && target.owner !== undefined) {
        Game.robRandomResource(cp, target.owner)
        Game.playDevCard(cp, this._guardCardIdx)
        this._buildMode = null
        this._guardCardIdx = null
        this.render()
        this.showToast("Stole a resource!")
        this.checkWin()
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
            saveGame()
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

  if (phase === "play" && (this._buildMode === "road" || this._buildMode === "road-card")) {
    var c1b = edge.hex.c1
    var c2b = edge.hex.c2
    var eqb = edge.hex.q
    var erb = edge.hex.r

    var free = this._buildMode === "road-card" || undefined
    var result2 = Game.canBuildRoad(cp, eqb, erb, c1b, eqb, erb, c2b, false, null, free)
    if (result2.ok) {
      Game.placeRoad(cp, eqb, erb, c1b, eqb, erb, c2b, free)

      if (this._buildMode === "road-card") {
        this._roadBuildPlaced++
        if (this._roadBuildPlaced >= 2) {
          Game.consumeRoadBuildCard(cp)
          this._buildMode = null
          this._roadBuildPlaced = 0
          this.render()
          this.showToast("Roads built!")
        } else {
          var remaining = Game.getValidPositions("road-card")
          if (remaining.length === 0) {
            Game.consumeRoadBuildCard(cp)
            this._buildMode = null
            this._roadBuildPlaced = 0
            this.render()
            this.showToast("No more valid positions — card resolved")
          } else {
            setValidPositions("road-card")
            this.render()
            this.showToast("Place second free road")
          }
        }
      } else {
        this._buildMode = null
        this.render()
        this.showToast("Road built!")
      }
    } else {
      this.showToast(result2.reason)
    }
  }
}

UIInstance.prototype.onTileClick = function (q, r) {
  if (this._buildMode !== "guard-tile") return
  var cp = game.currentPlayer
  Game.moveRobber(cp, q, r)

  var vertices = Game.getRobbableVertices(q, r)
  if (vertices.length > 0) {
    var pos = vertices.map(function (v) { return { type: "vertex", key: v.key, owner: v.owner } })
    setValidPositions(null)
    _validPositions = pos
    setClickMode("guard-victim")
    this._buildMode = "guard-victim"
    this.render()
    this.showToast("Choose a player to rob")
  } else {
    Game.playDevCard(cp, this._guardCardIdx)
    this._buildMode = null
    this._guardCardIdx = null
    this.render()
    this.showToast("No one to rob — card played")
  }
}

UIInstance.prototype.renderLog = function () {
  var logEl = document.getElementById("log")
  if (!logEl) return

  var names = {}
  for (var i = 0; i < game.players.length; i++) {
    names[i] = game.players[i].name
  }

  function lineForMove(move) {
    switch (move.type) {
      case "roll-dice":
        return names[move.player] + " rolled " + move.dice[0] + "+" + move.dice[1] + " = " + (move.dice[0] + move.dice[1])
      case "place-settlement":
        return names[move.player] + " built a settlement"
      case "place-road":
        return names[move.player] + " built a road"
      case "place-city":
        return names[move.player] + " built a city"
      case "trade": {
        var partnerStr = move.partner === "bank" ? "bank" : names[move.partner]
        var giveStr = Object.entries(move.give).filter(function (e) { return e[1] > 0 }).map(function (e) { return e[1] + " " + e[0] }).join(", ")
        var takeStr = Object.entries(move.take).filter(function (e) { return e[1] > 0 }).map(function (e) { return e[1] + " " + e[0] }).join(", ")
        return names[move.player] + " traded " + giveStr + " with " + partnerStr + " for " + takeStr
      }
      case "buy-dev-card":
        return names[move.player] + " bought a development card"
      case "play-dev-card":
        return names[move.player] + " played a " + move.cardType + " card"
      case "play-monopoly":
        return names[move.player] + " played monopoly on " + move.resource
      case "play-year-of-plenty":
        return names[move.player] + " played year of plenty"
    }
    return ""
  }

  var lines = []

  for (var t = 0; t < game.turns.length; t++) {
    var turn = game.turns[t]
    if (turn.phase === "play") {
      lines.push("--- Turn " + turn.turn + " ---")
      lines.push(names[turn.player] + "'s turn")
    }
    for (var m = 0; m < turn.moves.length; m++) {
      var l = lineForMove(turn.moves[m])
      if (l) lines.push(l)
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
      var l = lineForMove(game.currentTurnMoves[n])
      if (l) lines.push(l)
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
    saveGame()
    this.render()
    this.showToast(game.players[winner].name + " wins with " + game.players[winner].vp + " VP!")
  }
}
