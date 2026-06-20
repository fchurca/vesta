import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"

const WEB = resolve(import.meta.dirname)
const DIST = resolve(WEB, "dist")
const INDEX = resolve(WEB, "index.html")
const STYLE = resolve(WEB, "style.css")
const GAME_JS = resolve(WEB, "game.js")
const BOARD_JS = resolve(WEB, "board.js")
const UI_JS = resolve(WEB, "ui.js")

if (!existsSync(DIST)) mkdirSync(DIST)

let html = readFileSync(INDEX, "utf-8")

const css = readFileSync(STYLE, "utf-8")
html = html.replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)

const replaceScript = (src, filePath) => {
  const content = readFileSync(filePath, "utf-8")
  html = html.replace(`<script src="${src}"></script>`, `<script>${content}</script>`)
}

replaceScript("game.js", GAME_JS)
replaceScript("board.js", BOARD_JS)
replaceScript("ui.js", UI_JS)

const outPath = resolve(DIST, "index.html")
writeFileSync(outPath, html, "utf-8")
console.log(`Baked: ${outPath}`)
