import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"

const WEB = resolve(import.meta.dirname)
const DIST = resolve(WEB, "dist")
const INDEX = resolve(WEB, "index.html")
const STYLE = resolve(WEB, "style.css")
const CORE_JS = resolve(WEB, "core", "vesta.js")
const GAME_JS = resolve(WEB, "game.js")
const BOARD_JS = resolve(WEB, "board.js")
const STORAGE_JS = resolve(WEB, "storage.js")
const UI_JS = resolve(WEB, "ui.js")
const PKG = resolve(WEB, "..", "package.json")

if (!existsSync(DIST)) mkdirSync(DIST)

const pkg = JSON.parse(readFileSync(PKG, "utf-8"))

let html = readFileSync(INDEX, "utf-8")
html = html.replaceAll("{{VER}}", pkg.version)

const css = readFileSync(STYLE, "utf-8")
html = html.replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)

const replaceScript = (src, filePath) => {
  const content = readFileSync(filePath, "utf-8")
  html = html.replace(`<script src="${src}"></script>`, `<script>${content}</script>`)
}

replaceScript("core/vesta.js", CORE_JS)
replaceScript("game.js", GAME_JS)
replaceScript("board.js", BOARD_JS)
replaceScript("storage.js", STORAGE_JS)
replaceScript("ui.js", UI_JS)

const outPath = resolve(DIST, "index.html")
writeFileSync(outPath, html, "utf-8")
console.log(`Baked: ${outPath}`)
