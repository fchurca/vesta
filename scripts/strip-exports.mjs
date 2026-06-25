import { readFileSync, writeFileSync, rmSync } from "node:fs"
import { resolve } from "node:path"

const SRC = resolve(import.meta.dirname, "..", "web", "core", "src", "vesta.js")
const DST = resolve(import.meta.dirname, "..", "web", "core", "vesta.js")
const SRC_DIR = resolve(import.meta.dirname, "..", "web", "core", "src")

let code = readFileSync(SRC, "utf-8")

code = code
  .split("\n")
  .filter(line => !line.startsWith("import "))
  .map(line => {
    if (line.startsWith("export const ")) return line.slice("export ".length)
    if (line.startsWith("export function ")) return line.slice("export ".length)
    if (line.startsWith("export {")) return null
    if (line.startsWith("export default ")) return line.slice("export ".length)
    if (line.startsWith("export default")) return line.slice("export ".length)
    return line
  })
  .filter(line => line !== null)
  .join("\n")

writeFileSync(DST, code, "utf-8")
rmSync(SRC_DIR, { recursive: true, force: true })
