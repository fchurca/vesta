import { readFileSync, writeFileSync } from "fs"
import { execSync } from "child_process"

const pkgPath = new URL("../package.json", import.meta.url)
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
const cur = pkg.version.split(".").map(Number)

const arg = process.argv[2] || "patch"
const idx = arg === "major" ? 0 : arg === "minor" ? 1 : 2
cur[idx]++
for (let i = idx + 1; i < 3; i++) cur[i] = 0

pkg.version = cur.join(".")
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
console.log("v" + pkg.version)

execSync("npm install", { stdio: "inherit" })
