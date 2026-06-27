var CLICK_THRESHOLD = 50
var EDGE_CLICK_THRESHOLD = 65

var _oceanPattern = null

function getOceanPattern() {
  if (_oceanPattern) return _oceanPattern
  var size = 60
  var c = document.createElement("canvas")
  c.width = size
  c.height = size
  var cx = c.getContext("2d")
  cx.fillStyle = "#0a1628"
  cx.fillRect(0, 0, size, size)

  cx.strokeStyle = "#1a3a5c"
  cx.lineWidth = 1.5

  var chevrons = [
    { x: 10, y: 14 },
    { x: 30, y: 8 },
    { x: 50, y: 16 },
    { x: 6, y: 40 },
    { x: 28, y: 46 },
    { x: 48, y: 38 },
    { x: 18, y: 26 },
    { x: 42, y: 28 },
  ]
  var arm = 5
  var dx = arm * 0.866
  var dy = arm * 0.5
  for (var ci = 0; ci < chevrons.length; ci++) {
    var px = chevrons[ci].x
    var py = chevrons[ci].y
    cx.beginPath()
    cx.moveTo(px, py)
    cx.lineTo(px + dx, py + dy)
    cx.lineTo(px, py)
    cx.lineTo(px - dx, py + dy)
    cx.stroke()
  }

  _oceanPattern = _ctx.createPattern(c, "repeat")
  return _oceanPattern
}

var _canvas = null
var _ctx = null
var _hoverVertex = null
var _hoverEdge = null
var _allVertices = null
var _allEdges = null
var _validPositions = null
var _callbacks = null

var view = {
  cx: CANVAS_CENTER_X,
  cy: CANVAS_CENTER_Y,
  scale: 1.5,
}

var _panState = null
var _clickMode = null
var _highlightedPlayer = null

function setClickMode(mode) {
  _clickMode = mode
}

function setHighlightedPlayer(idx) {
  _highlightedPlayer = idx
  drawBoard()
}

function initBoard(canvas, callbacks) {
  _canvas = canvas
  _canvas.width = CANVAS_WIDTH
  _canvas.height = CANVAS_HEIGHT
  _ctx = canvas.getContext("2d")
  _callbacks = callbacks || {}

  buildVertexEdgeCache()
  _allVertices = []
  _allEdges = []

  for (var k in _vertexCache) _allVertices.push(_vertexCache[k])
  for (var ek in _edgeCache) _allEdges.push(_edgeCache[ek])

  _canvas.addEventListener("mousedown", function (e) { onMouseDown(e) })
  _canvas.addEventListener("mousemove", function (e) { onMouseMove(e) })
  _canvas.addEventListener("mouseup", function (e) { onMouseUp(e) })
  _canvas.addEventListener("mouseleave", function () { onMouseLeave() })
  _canvas.addEventListener("wheel", function (e) { onWheel(e) }, { passive: false })

  resetView()
  drawBoard()
}

function resetView() {
  view.cx = CANVAS_CENTER_X
  view.cy = CANVAS_CENTER_Y
  view.scale = 1.5
  drawBoard()
}

function setValidPositions(mode) {
  if (!mode || !game) {
    _validPositions = null
  } else {
    _validPositions = Game.getValidPositions(mode)
  }
  drawBoard()
}

function screenToWorld(sx, sy) {
  return {
    x: (sx - CANVAS_WIDTH / 2) / view.scale + view.cx,
    y: (sy - CANVAS_HEIGHT / 2) / view.scale + view.cy,
  }
}

function worldToScreen(wx, wy) {
  return {
    x: (wx - view.cx) * view.scale + CANVAS_WIDTH / 2,
    y: (wy - view.cy) * view.scale + CANVAS_HEIGHT / 2,
  }
}

function onMouseDown(e) {
  var rect = _canvas.getBoundingClientRect()
  var sx = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width)
  var sy = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)

  _panState = { startSx: sx, startSy: sy, startCx: view.cx, startCy: view.cy }
  _canvas.style.cursor = "grabbing"
}

function onMouseMove(e) {
  var rect = _canvas.getBoundingClientRect()
  var sx = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width)
  var sy = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)

  if (_panState) {
    var dx = (sx - _panState.startSx) / view.scale
    var dy = (sy - _panState.startSy) / view.scale
    view.cx = _panState.startCx - dx
    view.cy = _panState.startCy - dy
    drawBoard()
    return
  }

  var w = screenToWorld(sx, sy)
  var nearestV = findNearestVertex(w.x, w.y)
  var nearestE = findNearestEdge(w.x, w.y)

  _hoverVertex = nearestV || null
  _hoverEdge = nearestE || null

  if (_hoverVertex || _hoverEdge) _canvas.style.cursor = "pointer"
  else _canvas.style.cursor = "grab"

  drawBoard()
}

function onMouseUp(e) {
  if (_panState) {
    var rect = _canvas.getBoundingClientRect()
    var sx = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width)
    var sy = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
    var dx = sx - _panState.startSx
    var dy = sy - _panState.startSy

    _panState = null
    _canvas.style.cursor = "grab"

    if (Math.sqrt(dx * dx + dy * dy) < 5) {
      onCanvasClick(e)
    }
  }
}

function onMouseLeave() {
  _hoverVertex = null
  _hoverEdge = null
  _panState = null
  drawBoard()
}

function onWheel(e) {
  e.preventDefault()
  var rect = _canvas.getBoundingClientRect()
  var sx = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width)
  var sy = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)

  var delta = e.deltaY > 0 ? 0.9 : 1.1
  var newScale = Math.max(0.5, Math.min(5, view.scale * delta))

  var wx = (sx - CANVAS_WIDTH / 2) / view.scale + view.cx
  var wy = (sy - CANVAS_HEIGHT / 2) / view.scale + view.cy

  view.cx = wx - (sx - CANVAS_WIDTH / 2) / newScale
  view.cy = wy - (sy - CANVAS_HEIGHT / 2) / newScale
  view.scale = newScale

  drawBoard()
}

function onCanvasClick(e) {
  var rect = _canvas.getBoundingClientRect()
  var sx = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width)
  var sy = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)

  var w = screenToWorld(sx, sy)
  var nearestV = findNearestVertex(w.x, w.y)
  var nearestE = findNearestEdge(w.x, w.y)

  var preferEdges = _clickMode === "road" || _clickMode === "initial-road" || _clickMode === "road-card"

  if (preferEdges) {
    if (nearestE && _callbacks.onEdgeClick) {
      _callbacks.onEdgeClick(nearestE)
    } else if (nearestV && _callbacks.onVertexClick) {
      var h = nearestV.hexes[0]
      _callbacks.onVertexClick(h.q, h.r, h.corner, nearestV.key)
    }
  } else {
    if (nearestV && _callbacks.onVertexClick) {
      var h = nearestV.hexes[0]
      _callbacks.onVertexClick(h.q, h.r, h.corner, nearestV.key)
    } else if (nearestE && _callbacks.onEdgeClick) {
      _callbacks.onEdgeClick(nearestE)
    }
  }
}

function clampView() {
  var hw = CANVAS_WIDTH / (2 * view.scale)
  var hh = CANVAS_HEIGHT / (2 * view.scale)
  view.cx = Math.max(CANVAS_CENTER_X - hw, Math.min(CANVAS_CENTER_X + hw, view.cx))
  view.cy = Math.max(CANVAS_CENTER_Y - hh, Math.min(CANVAS_CENTER_Y + hh, view.cy))
}

function drawBoard() {
  var ctx = _ctx
  if (!ctx) return

  clampView()

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.fillStyle = getOceanPattern()
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.save()
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
  ctx.scale(view.scale, view.scale)
  ctx.translate(-view.cx, -view.cy)

  for (var i = 0; i < game.board.tiles.length; i++) {
    drawTile(game.board.tiles[i])
  }
  for (var j = 0; j < game.board.tiles.length; j++) {
    drawNumberToken(game.board.tiles[j])
  }
  drawPorts()
  drawRobber()
  drawPlayerHighlights()
  drawAllRoads()
  drawAllBuildings()
  drawValidPositions()
  drawHoverHighlights()

  ctx.restore()
}

function drawTile(tile) {
  var ctx = _ctx
  var center = hexToPixel(tile.coord.q, tile.coord.r)
  var corners = []
  for (var i = 0; i < 6; i++) {
    var c = hexCornerPixel(tile.coord.q, tile.coord.r, i)
    corners.push(c)
  }

  ctx.beginPath()
  ctx.moveTo(corners[0].x, corners[0].y)
  for (var j = 1; j < 6; j++) {
    ctx.lineTo(corners[j].x, corners[j].y)
  }
  ctx.closePath()

  var color = RESOURCE_COLORS[tile.resource] || "#888"
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = "#333"
  ctx.lineWidth = 2
  ctx.stroke()

  var intensity = getPulseIntensity()
  if (intensity > 0 && tile.number === _highlightedNumber) {
    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    for (var k = 1; k < 6; k++) ctx.lineTo(corners[k].x, corners[k].y)
    ctx.closePath()
    ctx.fillStyle = "rgba(255, 255, 200, " + (0.28 * intensity) + ")"
    ctx.fill()
    ctx.strokeStyle = "rgba(255, 255, 200, " + (0.7 * intensity) + ")"
    ctx.lineWidth = 3
    ctx.stroke()
  }

  ctx.font = "26px serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#fff"
  ctx.fillText(RESOURCE_EMOJI[tile.resource] || "", center.x, center.y - 5)
}

function drawNumberToken(tile) {
  if (tile.resource === DESERT) return

  var center = hexToPixel(tile.coord.q, tile.coord.r)
  var ctx = _ctx

  var isHighProb = tile.number === 6 || tile.number === 8
  var dotCounts = {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
  }

  var ty = center.y + 17

  ctx.beginPath()
  ctx.arc(center.x, ty, 16, 0, Math.PI * 2)
  ctx.fillStyle = isHighProb ? "#c0392b" : "#3a3a3a"
  ctx.fill()
  ctx.strokeStyle = isHighProb ? "#e74c3c" : "#555"
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = "bold 13px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = isHighProb ? "#fff" : "#ddd"
  ctx.fillText(tile.number, center.x, ty - 1)

  var dots = dotCounts[tile.number] || 0
  if (dots > 0) {
    var dotY = ty + 12
    ctx.fillStyle = isHighProb ? "#fff" : "#999"
    var spacing = 6
    var startX = center.x - ((dots - 1) * spacing) / 2
    for (var d = 0; d < dots; d++) {
      ctx.beginPath()
      ctx.arc(startX + d * spacing, dotY, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawRobber() {
  if (!game || !game.board.robber) return
  var rc = game.board.robber
  var ctx = _ctx
  var corners = []
  for (var i = 0; i < 6; i++) {
    var c = hexCornerPixel(rc.q, rc.r, i)
    corners.push(c)
  }

  ctx.beginPath()
  ctx.moveTo(corners[0].x, corners[0].y)
  for (var j = 1; j < 6; j++) {
    ctx.lineTo(corners[j].x, corners[j].y)
  }
  ctx.closePath()
  ctx.fillStyle = "#00000044"
  ctx.fill()

  var center = hexToPixel(rc.q, rc.r)
  ctx.font = "32px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("\uD83E\uDD77", center.x, center.y - 12)
}

var _highlightedNumber = null
var _pulseStart = 0
var _pulseMode = null
var _pulseFrame = null
var _hoverPending = false

function flashTiles(number) {
  _highlightedNumber = number
  _pulseStart = performance.now()
  _pulseMode = "flash"
  _hoverPending = false
  if (!_pulseFrame) _pulseFrame = requestAnimationFrame(pulseLoop)
}

function hoverTiles(number) {
  if (_pulseMode === "flash") {
    _hoverPending = true
    return
  }
  _highlightedNumber = number
  _pulseStart = performance.now()
  _pulseMode = "hover"
  if (!_pulseFrame) _pulseFrame = requestAnimationFrame(pulseLoop)
}

function unhoverTiles() {
  _hoverPending = false
  if (_pulseMode === "hover") {
    _highlightedNumber = null
    _pulseMode = null
    drawBoard()
  }
}

function pulseLoop(time) {
  if (_pulseMode === "flash") {
    if (time - _pulseStart >= 1200) {
      if (_hoverPending) {
        _hoverPending = false
        _pulseStart = time
        _pulseMode = "hover"
      } else {
        _highlightedNumber = null
        _pulseMode = null
      }
    }
  }
  drawBoard()
  if (_pulseMode) _pulseFrame = requestAnimationFrame(pulseLoop)
  else _pulseFrame = null
}

function getPulseIntensity() {
  if (!_highlightedNumber || !_pulseMode) return 0
  var elapsed = performance.now() - _pulseStart
  if (_pulseMode === "flash") {
    if (elapsed >= 1200) return 0
    return Math.sin(Math.PI * elapsed / 1200)
  }
  return 0.3 + 0.35 * (1 + Math.sin(2 * Math.PI * elapsed / 2000))
}

function drawPorts() {
  var ctx = _ctx
  for (var pi = 0; pi < game.board.ports.length; pi++) {
    var port = game.board.ports[pi]
    var v1 = port.vertices[0]
    var v2 = port.vertices[1]
    var p1 = hexCornerPixel(v1.q, v1.r, v1.corner)
    var p2 = hexCornerPixel(v2.q, v2.r, v2.corner)
    var mx = (p1.x + p2.x) / 2
    var my = (p1.y + p2.y) / 2

    var typeText = ""
    if (port.resource === null) {
      typeText = "\u2696\u2696\u2696"
    } else {
      var em = RESOURCE_EMOJI[port.resource] || ""
      typeText = em + em
    }
    drawPortLabel(ctx, mx, my, typeText)
  }
}

function drawPortLabel(ctx, x, y, text) {
  ctx.font = "bold 12px sans-serif"
  var tw = ctx.measureText(text).width
  var bw = tw + 8
  var bh = 20

  ctx.fillStyle = "rgba(60, 40, 20, 0.85)"
  roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 4)
  ctx.fill()
  ctx.strokeStyle = "#8b6914"
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#fff"
  ctx.fillText(text, x, y + 1)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawAllBuildings() {
  for (var p = 0; p < game.players.length; p++) {
    var player = game.players[p]
    var color = player.color

    for (var i = 0; i < player.settlements.length; i++) {
      var s = player.settlements[i]
      var px = hexCornerPixel(s.q, s.r, s.corner)
      drawBuilding(px.x, px.y, "settlement", color)
    }

    for (var j = 0; j < player.cities.length; j++) {
      var c = player.cities[j]
      var px2 = hexCornerPixel(c.q, c.r, c.corner)
      drawBuilding(px2.x, px2.y, "city", color)
    }
  }
}

function drawBuilding(x, y, type, color) {
  var ctx = _ctx
  var emoji = type === "city" ? "\uD83C\uDFEF" : "\uD83D\uDED6"
  var bgSize = type === "city" ? 13 : 10

  ctx.beginPath()
  ctx.arc(x, y, bgSize, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.font = (type === "city" ? 16 : 13) + "px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(emoji, x, y + 1)
}

function drawPlayerHighlights() {
  if (_highlightedPlayer === null || _highlightedPlayer < 0 || !game) return
  var player = game.players[_highlightedPlayer]
  if (!player) return

  for (var i = 0; i < player.settlements.length; i++) {
    var s = player.settlements[i]
    var px = hexCornerPixel(s.q, s.r, s.corner)
    drawBuildingHighlight(px.x, px.y, "settlement")
  }
  for (var j = 0; j < player.cities.length; j++) {
    var c = player.cities[j]
    var px2 = hexCornerPixel(c.q, c.r, c.corner)
    drawBuildingHighlight(px2.x, px2.y, "city")
  }
  for (var k = 0; k < player.roads.length; k++) {
    var r = player.roads[k]
    var p1 = hexCornerPixel(r.q1, r.r1, r.corner1)
    var p2 = hexCornerPixel(r.q2, r.r2, r.corner2)
    drawRoadHighlight(p1, p2)
  }
}

function drawBuildingHighlight(x, y, type) {
  var ctx = _ctx
  var size = type === "city" ? 16 : 13
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 3
  ctx.stroke()
}

function drawRoadHighlight(p1, p2) {
  var ctx = _ctx
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 12
  ctx.lineCap = "round"
  ctx.stroke()
}

function drawAllRoads() {
  for (var p = 0; p < game.players.length; p++) {
    var player = game.players[p]
    var color = player.color

    for (var i = 0; i < player.roads.length; i++) {
      var r = player.roads[i]
      var px1 = hexCornerPixel(r.q1, r.r1, r.corner1)
      var px2 = hexCornerPixel(r.q2, r.r2, r.corner2)

      var ctx = _ctx
      ctx.beginPath()
      ctx.moveTo(px1.x, px1.y)
      ctx.lineTo(px2.x, px2.y)
      ctx.strokeStyle = color
      ctx.lineWidth = 6
      ctx.lineCap = "round"
      ctx.stroke()
      ctx.strokeStyle = "#ffffff44"
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
}

function drawValidPositions() {
  if (!_validPositions) return

  for (var i = 0; i < _validPositions.length; i++) {
    var p = _validPositions[i]
    if (p.type === "vertex") {
      var v = _vertexCache[p.key]
      if (v) drawVertexHighlight(v, "#ffffff44")
    } else if (p.type === "edge") {
      drawEdgeHighlight(p.edge, "#ffffff44")
    }
  }
}

function drawHoverHighlights() {
  if (!_validPositions) return

  var isRoadMode = _clickMode && _clickMode.indexOf("road") >= 0
  var isVertexMode = _clickMode && (_clickMode === "city" || _clickMode.indexOf("settlement") >= 0)

  if (_hoverVertex && !isRoadMode) {
    var isValid = _validPositions.some(function (p) { return p.type === "vertex" && p.key === _hoverVertex.key })
    if (isValid) {
      drawVertexHighlight(_hoverVertex, "#ffffffcc")
    } else {
      drawHashedVertex(_hoverVertex, "#ff444466")
    }
  }
  if (_hoverEdge && !isVertexMode) {
    var isValid2 = _validPositions.some(function (p) { return p.type === "edge" && p.key === _hoverEdge.key })
    if (isValid2) {
      drawEdgeHighlight(_hoverEdge, "#ffffffcc")
    } else {
      drawHashedEdge(_hoverEdge, "#ff444466")
    }
  }
}

function drawHashedVertex(vertex, color) {
  var ctx = _ctx
  ctx.save()
  ctx.setLineDash([3, 4])
  ctx.beginPath()
  ctx.arc(vertex.pixel.x, vertex.pixel.y, 8, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

function drawHashedEdge(edge, color) {
  var ctx = _ctx
  var v1 = _vertexCache[edge.v1]
  var v2 = _vertexCache[edge.v2]
  if (!v1 || !v2) return
  ctx.save()
  ctx.setLineDash([4, 5])
  ctx.beginPath()
  ctx.moveTo(v1.pixel.x, v1.pixel.y)
  ctx.lineTo(v2.pixel.x, v2.pixel.y)
  ctx.strokeStyle = color
  ctx.lineWidth = 8
  ctx.lineCap = "round"
  ctx.stroke()
  ctx.restore()
}

function drawVertexHighlight(vertex, color) {
  var ctx = _ctx
  ctx.beginPath()
  ctx.arc(vertex.pixel.x, vertex.pixel.y, 8, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function drawEdgeHighlight(edge, color) {
  var ctx = _ctx
  var v1 = _vertexCache[edge.v1]
  var v2 = _vertexCache[edge.v2]
  if (!v1 || !v2) return
  ctx.beginPath()
  ctx.moveTo(v1.pixel.x, v1.pixel.y)
  ctx.lineTo(v2.pixel.x, v2.pixel.y)
  ctx.strokeStyle = color
  ctx.lineWidth = 10
  ctx.lineCap = "round"
  ctx.stroke()
}

function findNearestVertex(x, y) {
  var best = null
  var worldThreshold = CLICK_THRESHOLD / view.scale
  var bestDist = worldThreshold

  for (var i = 0; i < _allVertices.length; i++) {
    var v = _allVertices[i]
    var dx = v.pixel.x - x
    var dy = v.pixel.y - y
    var dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < bestDist) {
      bestDist = dist
      best = v
    }
  }

  return best
}

function findNearestEdge(x, y) {
  var best = null
  var worldThreshold = EDGE_CLICK_THRESHOLD / view.scale
  var bestDist = worldThreshold

  for (var i = 0; i < _allEdges.length; i++) {
    var e = _allEdges[i]
    var v1 = _vertexCache[e.v1]
    var v2 = _vertexCache[e.v2]
    if (!v1 || !v2) continue

    var dist = distToSegment(x, y, v1.pixel.x, v1.pixel.y, v2.pixel.x, v2.pixel.y)
    if (dist < bestDist) {
      bestDist = dist
      best = e
    }
  }

  return best
}

function distToSegment(px, py, x1, y1, x2, y2) {
  var vx = x2 - x1
  var vy = y2 - y1
  var wx = px - x1
  var wy = py - y1

  var c1 = wx * vx + wy * vy
  if (c1 <= 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1))

  var c2 = vx * vx + vy * vy
  if (c2 <= c1) return Math.sqrt((px - x2) * (px - x2) + (py - y2) * (py - y2))

  var b = c1 / c2
  var nearX = x1 + b * vx
  var nearY = y1 + b * vy
  return Math.sqrt((px - nearX) * (px - nearX) + (py - nearY) * (py - nearY))
}

var PLAYER_COLORS = ["#e07b30", "#3498db", "#2ecc71", "#e74c3c"]
