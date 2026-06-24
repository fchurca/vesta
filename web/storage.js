var STORAGE_KEY = "vesta-game"

function saveGame() {
  if (!game) return
  var data = {
    game: deepClone(game),
    startRecord: game.startRecord,
    turns: game.turns,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (_) {}
}

function loadGame() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    var data = JSON.parse(raw)
    if (!data || !data.game) return null
    return data
  } catch (_) {
    return null
  }
}

function clearGame() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (_) {}
}

function exportGameRecord() {
  if (!game) return
  var record = {
    startState: game.startRecord,
    turns: game.turns,
    endState: game,
  }
  var json = JSON.stringify(record, null, 2)
  var blob = new Blob([json], { type: "application/json" })
  var url = URL.createObjectURL(blob)
  var a = document.createElement("a")
  a.href = url
  var slug = titleToSlug(game.title || "untitled")
  var ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)
  a.download = slug + "-turn-" + game.turn + "-" + ts + ".json"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function importGameRecord(callback) {
  var input = document.createElement("input")
  input.type = "file"
  input.accept = ".json"
  input.addEventListener("change", function () {
    var file = input.files[0]
    if (!file) return
    var reader = new FileReader()
    reader.addEventListener("load", function () {
      try {
        var record = JSON.parse(reader.result)
        if (!record || !record.startState || !record.turns || !record.endState) {
          alert("Invalid game record: missing required fields")
          return
        }
        callback(record)
      } catch (e) {
        alert("Invalid game file: " + e.message)
      }
    })
    reader.readAsText(file)
    input.value = ""
  })
  input.click()
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}
