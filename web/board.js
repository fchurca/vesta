var HEX_SIZE = 38
var CANVAS_WIDTH = 600
var CANVAS_HEIGHT = 480
var CANVAS_CENTER_X = CANVAS_WIDTH / 2
var CANVAS_CENTER_Y = CANVAS_HEIGHT / 2
var CLICK_THRESHOLD = 18

var _canvas = null
var _ctx = null
var _hoverVertex = null
var _hoverEdge = null
var _allVertices = null
var _allEdges = null

function initBoard(canvas, callbacks) {
  _canvas = canvas
  _canvas.width = CANVAS_WIDTH
  _canvas.height = CANVAS_HEIGHT
  _ctx = canvas.getContext("2d")
  _callbacks = callbacks || {}

  GameUtil.buildVertexEdgeCache()
  _allVertices = []
  _allEdges = []

  for (var k in _vertexCache) _allVertices.push(_vertexCache[k])
  for (var ek in _edgeCache) _allEdges.push(_edgeCache[ek])

  _canvas.addEventListener("click", function (e) { onCanvasClick(e) })
  _canvas.addEventListener("mousemove", function (e) { onCanvasMove(e) })
  _canvas.addEventListener("mouseleave", function () {
    _hoverVertex = null
    _hoverEdge = null
    drawBoard()
  })

  drawBoard()
}

function drawBoard() {
  var ctx = _ctx

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  for (var i = 0; i < game.board.tiles.length; i++) {
    drawTile(game.board.tiles[i])
  }

  for (var j = 0; j < game.board.tiles.length; j++) {
    drawNumberToken(game.board.tiles[j])
  }

  drawPorts()
  drawRobber()

  drawAllBuildings()
  drawAllRoads()

  if (_hoverVertex) drawVertexHighlight(_hoverVertex, "#ffffff44")
  if (_hoverEdge) drawEdgeHighlight(_hoverEdge, "#ffffff44")
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

  var emoji = RESOURCE_EMOJI[tile.resource] || ""
  ctx.font = "22px serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#fff"
  ctx.fillText(emoji, center.x, center.y - 4)
}

function drawNumberToken(tile) {
  if (tile.resource === DESERT) return

  var center = hexToPixel(tile.coord.q, tile.coord.r)
  var ctx = _ctx

  var isHighProb = tile.number === 6 || tile.number === 8
  var dotCounts = {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
  }

  var ty = center.y + 14

  ctx.beginPath()
  ctx.arc(center.x, ty, 14, 0, Math.PI * 2)
  ctx.fillStyle = isHighProb ? "#c0392b" : "#3a3a3a"
  ctx.fill()
  ctx.strokeStyle = isHighProb ? "#e74c3c" : "#555"
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.font = "bold 12px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = isHighProb ? "#fff" : "#ddd"
  ctx.fillText(tile.number, center.x, ty - 1)

  var dots = dotCounts[tile.number] || 0
  if (dots > 0) {
    var dotY = ty + 11
    ctx.fillStyle = isHighProb ? "#fff" : "#999"
    var spacing = 5
    var startX = center.x - ((dots - 1) * spacing) / 2
    for (var d = 0; d < dots; d++) {
      ctx.beginPath()
      ctx.arc(startX + d * spacing, dotY, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawRobber() {
  if (!game || !game.board.robber) return
  var center = hexToPixel(game.board.robber.q, game.board.robber.r)
  var ctx = _ctx

  ctx.font = "28px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#e74c3c"
  ctx.fillText("\uD83D\uDC80", center.x, center.y - 10)
}

function drawPorts() {
}

function drawAllBuildings() {
  for (var p = 0; p < game.players.length; p++) {
    var player = game.players[p]
    var color = PLAYER_COLORS[p]

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
  var size = type === "city" ? 8 : 6

  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 1.5
  ctx.stroke()

  if (type === "city") {
    ctx.beginPath()
    ctx.arc(x, y, size + 3, 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawAllRoads() {
  for (var p = 0; p < game.players.length; p++) {
    var player = game.players[p]
    var color = PLAYER_COLORS[p]

    for (var i = 0; i < player.roads.length; i++) {
      var r = player.roads[i]
      var px1 = hexCornerPixel(r.q1, r.r1, r.corner1)
      var px2 = hexCornerPixel(r.q2, r.r2, r.corner2)

      var ctx = _ctx
      ctx.beginPath()
      ctx.moveTo(px1.x, px1.y)
      ctx.lineTo(px2.x, px2.y)
      ctx.strokeStyle = color
      ctx.lineWidth = 5
      ctx.lineCap = "round"
      ctx.stroke()
      ctx.strokeStyle = "#ffffff33"
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
}

function drawVertexHighlight(vertex, color) {
  var ctx = _ctx
  ctx.beginPath()
  ctx.arc(vertex.pixel.x, vertex.pixel.y, 6, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 1
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
  ctx.lineWidth = 8
  ctx.lineCap = "round"
  ctx.stroke()
}

function findNearestVertex(x, y) {
  var best = null
  var bestDist = CLICK_THRESHOLD

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
  var bestDist = CLICK_THRESHOLD + 5

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

function onCanvasClick(e) {
  var rect = _canvas.getBoundingClientRect()
  var scaleX = _canvas.width / rect.width
  var scaleY = _canvas.height / rect.height
  var x = (e.clientX - rect.left) * scaleX
  var y = (e.clientY - rect.top) * scaleY

  var nearestV = findNearestVertex(x, y)
  var nearestE = findNearestEdge(x, y)

  if (nearestV && _callbacks.onVertexClick) {
    var h = nearestV.hexes[0]
    _callbacks.onVertexClick(h.q, h.r, h.corner, nearestV.key)
  } else if (nearestE && _callbacks.onEdgeClick) {
    _callbacks.onEdgeClick(nearestE)
  }
}

function onCanvasMove(e) {
  var rect = _canvas.getBoundingClientRect()
  var scaleX = _canvas.width / rect.width
  var scaleY = _canvas.height / rect.height
  var x = (e.clientX - rect.left) * scaleX
  var y = (e.clientY - rect.top) * scaleY

  var nearestV = findNearestVertex(x, y)
  var nearestE = findNearestEdge(x, y)

  _hoverVertex = nearestV || null
  _hoverEdge = nearestE || null
  drawBoard()
}

var _callbacks = null

var PLAYER_COLORS = ["#e07b30", "#3498db", "#2ecc71", "#e74c3c"]
