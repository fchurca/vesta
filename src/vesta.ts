export const Resource = {
  Brick: "brick",
  Lumber: "lumber",
  Wool: "wool",
  Grain: "grain",
  Ore: "ore",
  Desert: "desert",
} as const

export type Resource = (typeof Resource)[keyof typeof Resource]

export const TradeResource = {
  Brick: "brick",
  Lumber: "lumber",
  Wool: "wool",
  Grain: "grain",
  Ore: "ore",
} as const
export type TradeResource = (typeof TradeResource)[keyof typeof TradeResource]

export interface HexCoord {
  q: number
  r: number
}

export interface Tile {
  coord: HexCoord
  resource: Resource
  number: number
}

export interface Port {
  resource: Resource | null
  vertices: [{ q: number; r: number; corner: number }, { q: number; r: number; corner: number }]
}

export interface Board {
  tiles: Tile[]
  ports: Port[]
  robber: HexCoord
}

export interface DevCard {
  cardType: string
  available: boolean
}

export interface DevDeck {
  readonly type: string
  remaining: number
  cards: DevCard[]
}

export const DEV_CARD_COUNTS: Record<string, number> = {
  victory: 5,
  knight: 14,
  "road-build": 2,
  "year-of-plenty": 2,
  monopoly: 2,
}

export function createPoolDeck(seed: number): DevDeck {
  const flat: string[] = []
  for (const [type, count] of Object.entries(DEV_CARD_COUNTS)) {
    for (let i = 0; i < count; i++) flat.push(type)
  }
  const shuffled = seededShuffle(flat, seed + 99)
  return {
    type: "pool",
    remaining: shuffled.length,
    cards: shuffled.map(t => ({ cardType: t, available: false })),
  }
}

export interface RoadData {
  key: string
  q1: number
  r1: number
  corner1: number
  q2: number
  r2: number
  corner2: number
}

export interface Player {
  id: number
  name: string
  resources: Record<Resource, number>
  settlements: { q: number; r: number; corner: number }[]
  cities: { q: number; r: number; corner: number }[]
  roads: RoadData[]
  vp: number
  roadCount: number
  rates: Record<TradeResource, number>
  hand: DevCard[]
  knights: number
}

export type GamePhase = "initial_first" | "initial_second" | "play" | "gameover"
export type SetupStep = "settlement" | "road"

export interface GameState {
  phase: GamePhase
  turn: number
  currentPlayer: number
  dice: [number, number] | null
  rolled: boolean
  setupStep: SetupStep
  pendingSettlement: { q: number; r: number; corner: number } | null
  pendingTrade: {
    from: number
    to: number
    give: Record<TradeResource, number>
    take: Record<TradeResource, number>
  } | null
  board: Board
  devDeck: DevDeck
  players: Player[]
  winner: number | null
  largestArmy: number | null
  longestRoad: number | null
  title: string
}

export type GameMove =
  | { type: "roll-dice"; player: number; dice: [number, number] }
  | { type: "place-settlement"; player: number; q: number; r: number; corner: number }
  | { type: "place-road"; player: number; q1: number; r1: number; corner1: number; q2: number; r2: number; corner2: number }
  | { type: "place-city"; player: number; q: number; r: number; corner: number }
  | { type: "end-turn"; player: number }
  | { type: "trade"; player: number; partner: "bank" | number; give: Record<TradeResource, number>; take: Record<TradeResource, number> }
  | { type: "buy-dev-card"; player: number }
  | { type: "play-dev-card"; player: number; cardType: string }
  | { type: "play-monopoly"; player: number; resource: TradeResource; totals?: number[]; total?: number }
  | { type: "play-year-of-plenty"; player: number; resources: [TradeResource, TradeResource] }
  | { type: "move-robber"; player: number; q: number; r: number }
  | { type: "steal-resource"; player: number; victim: number; resource: TradeResource }
  | { type: "propose-trade"; player: number; partner: number; give: Record<TradeResource, number>; take: Record<TradeResource, number> }
  | { type: "accept-trade"; player: number }
  | { type: "reject-trade"; player: number }
  | { type: "cancel-proposal"; player: number }
  | { type: "longest-road-change"; winner: number | null; loser: number | null }

export interface GameTurn {
  turn: number
  player: number
  phase: GamePhase
  moves: GameMove[]
}

export interface GameRecord {
  startState: GameState
  turns: GameTurn[]
  endState: GameState | null
}

export interface GameOptions {
  players: number
  roll: number
  title?: string
}

export function truncateText(text: string, maxBytes: number, maxGlyphs: number): string {
  const glyphs = [...text]
  if (glyphs.length > maxGlyphs) {
    text = glyphs.slice(0, maxGlyphs).join("")
  }
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  if (bytes.length <= maxBytes) return text
  let end = maxBytes
  while (end > 0) {
    const b = bytes[end]
    if (b === undefined || (b & 0xc0) !== 0x80) break
    end--
  }
  const decoder = new TextDecoder()
  return decoder.decode(bytes.slice(0, end))
}

export function titleToSlug(title: string): string {
  const lower = title.toLowerCase()
  let result = ""
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i]!
    if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "-") {
      result += ch
    } else {
      result += "-"
    }
  }
  return result
}

export function hexNeighbors(h: HexCoord): HexCoord[] {
  const dirs: [number, number][] = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]
  return dirs.map(([dq, dr]) => ({ q: h.q + dq, r: h.r + dr }))
}

export const BOARD_HEXES: HexCoord[] = [
  { q: 0, r: 0 },
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
  { q: 2, r: 0 }, { q: 1, r: 1 }, { q: 0, r: 2 }, { q: -1, r: 2 }, { q: -2, r: 2 },
  { q: -2, r: 1 }, { q: -2, r: 0 }, { q: -1, r: -1 }, { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 2, r: -1 },
]

export function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy
}

const RESOURCE_DIST: Resource[] = [
  Resource.Brick, Resource.Brick, Resource.Brick,
  Resource.Lumber, Resource.Lumber, Resource.Lumber, Resource.Lumber,
  Resource.Wool, Resource.Wool, Resource.Wool, Resource.Wool,
  Resource.Grain, Resource.Grain, Resource.Grain, Resource.Grain,
  Resource.Ore, Resource.Ore, Resource.Ore,
  Resource.Desert,
]

const NUMBER_DIST: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
]

export const BUILDING_COST: Record<string, Partial<Record<Resource, number>>> = {
  road: { [Resource.Brick]: 1, [Resource.Lumber]: 1 },
  settlement: { [Resource.Brick]: 1, [Resource.Lumber]: 1, [Resource.Wool]: 1, [Resource.Grain]: 1 },
  city: { [Resource.Grain]: 2, [Resource.Ore]: 3 },
  development: { [Resource.Ore]: 1, [Resource.Wool]: 1, [Resource.Grain]: 1 },
}

export const MAX_ROADS = 15
export const MAX_SETTLEMENTS = 5
export const MAX_CITIES = 4

type PortVertex = { q: number; r: number; corner: number }

const PORT_EDGES: [PortVertex, PortVertex][] = [
  [{ q: 2, r: -2, corner: 0 }, { q: 2, r: -2, corner: 1 }],
  [{ q: 2, r: -1, corner: 0 }, { q: 2, r: -1, corner: 1 }],
  [{ q: 2, r: 0, corner: 1 }, { q: 2, r: 0, corner: 2 }],
  [{ q: 1, r: 1, corner: 1 }, { q: 1, r: 1, corner: 2 }],
  [{ q: 0, r: 2, corner: 2 }, { q: 0, r: 2, corner: 3 }],
  [{ q: -1, r: 2, corner: 2 }, { q: -1, r: 2, corner: 3 }],
  [{ q: -2, r: 2, corner: 3 }, { q: -2, r: 2, corner: 4 }],
  [{ q: -2, r: 1, corner: 3 }, { q: -2, r: 1, corner: 4 }],
  [{ q: -2, r: 0, corner: 4 }, { q: -2, r: 0, corner: 5 }],
  [{ q: -1, r: -1, corner: 4 }, { q: -1, r: -1, corner: 5 }],
  [{ q: 0, r: -2, corner: 5 }, { q: 0, r: -2, corner: 0 }],
  [{ q: 1, r: -2, corner: 5 }, { q: 1, r: -2, corner: 0 }],
]

const HEX_DIRECTIONS: [number, number][] = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]

const PORT_RESOURCE_DIST: (Resource | null)[] = [
  null, null, null, null,
  Resource.Brick,
  Resource.Lumber,
  Resource.Wool,
  Resource.Grain,
  Resource.Ore,
]

export const DESERT = Resource.Desert

export const HEX_SIZE = 48
export const CANVAS_WIDTH = 750
export const CANVAS_HEIGHT = 580
export const CANVAS_CENTER_X = 375
export const CANVAS_CENTER_Y = 290

interface Vertex {
  key: string
  pixel: { x: number; y: number }
  hexes: { q: number; r: number; corner: number }[]
}

interface Edge {
  key: string
  v1: string
  v2: string
  hex: { q: number; r: number; c1: number; c2: number }
}

let _vertexCache: Record<string, Vertex> | null = null
let _edgeCache: Record<string, Edge> | null = null

export function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r)
  const y = HEX_SIZE * (3 / 2 * r)
  return { x: CANVAS_CENTER_X + x, y: CANVAS_CENTER_Y + y }
}

export function hexCornerPixel(q: number, r: number, cornerIndex: number): { x: number; y: number } {
  const center = hexToPixel(q, r)
  const angleDeg = 60 * cornerIndex - 30
  const angleRad = (Math.PI / 180) * angleDeg
  return {
    x: center.x + HEX_SIZE * Math.cos(angleRad),
    y: center.y + HEX_SIZE * Math.sin(angleRad),
  }
}

export function buildVertexEdgeCache(): void {
  if (_vertexCache) return
  _vertexCache = {}
  _edgeCache = {}

  const vByPixel: Record<string, Vertex> = {}

  for (let i = 0; i < BOARD_HEXES.length; i++) {
    const h = BOARD_HEXES[i]!
    for (let c = 0; c < 6; c++) {
      const px = hexCornerPixel(h.q, h.r, c)
      const key = "v_" + Math.round(px.x * 10) + "_" + Math.round(px.y * 10)

      if (!vByPixel[key]) {
        vByPixel[key] = { key, pixel: px, hexes: [] }
      }
      vByPixel[key]!.hexes.push({ q: h.q, r: h.r, corner: c })
    }
  }

  for (const k of Object.keys(vByPixel)) {
    _vertexCache[k] = vByPixel[k]!
  }

  const edgeSet: Record<string, Edge> = {}

  for (let j = 0; j < BOARD_HEXES.length; j++) {
    const h2 = BOARD_HEXES[j]!
    for (let c2 = 0; c2 < 6; c2++) {
      const nextC = (c2 + 1) % 6
      const px1 = hexCornerPixel(h2.q, h2.r, c2)
      const px2 = hexCornerPixel(h2.q, h2.r, nextC)
      const vk1 = "v_" + Math.round(px1.x * 10) + "_" + Math.round(px1.y * 10)
      const vk2 = "v_" + Math.round(px2.x * 10) + "_" + Math.round(px2.y * 10)
      const eKey = vk1 < vk2 ? "e_" + vk1 + "_" + vk2 : "e_" + vk2 + "_" + vk1

      if (!edgeSet[eKey]) {
        edgeSet[eKey] = { key: eKey, v1: vk1, v2: vk2, hex: { q: h2.q, r: h2.r, c1: c2, c2: nextC } }
      }
    }
  }

  for (const ek of Object.keys(edgeSet)) {
    _edgeCache[ek] = edgeSet[ek]!
  }
}

function getVertexCache(): Record<string, Vertex> {
  buildVertexEdgeCache()
  return _vertexCache!
}

function getEdgeCache(): Record<string, Edge> {
  buildVertexEdgeCache()
  return _edgeCache!
}

export function resetCache(): void {
  _vertexCache = null
  _edgeCache = null
}

export function vertexKey(q: number, r: number, corner: number): string {
  const px = hexCornerPixel(q, r, corner)
  return "v_" + Math.round(px.x * 10) + "_" + Math.round(px.y * 10)
}

export function edgeKey(q1: number, r1: number, c1: number, q2: number, r2: number, c2: number): string {
  const px1 = hexCornerPixel(q1, r1, c1)
  const px2 = hexCornerPixel(q2, r2, c2)
  const vk1 = "v_" + Math.round(px1.x * 10) + "_" + Math.round(px1.y * 10)
  const vk2 = "v_" + Math.round(px2.x * 10) + "_" + Math.round(px2.y * 10)
  if (vk1 < vk2) return "e_" + vk1 + "_" + vk2
  return "e_" + vk2 + "_" + vk1
}

export function verticesAreAdjacent(vKey1: string, vKey2: string): boolean {
  if (vKey1 === vKey2) return true
  const edges = getEdgeCache()
  for (const k of Object.keys(edges)) {
    const e = edges[k]!
    if ((e.v1 === vKey1 && e.v2 === vKey2) || (e.v1 === vKey2 && e.v2 === vKey1)) {
      return true
    }
  }
  return false
}

export function roadsShareVertex(eKey1: string, eKey2: string): boolean {
  const edges = getEdgeCache()
  const e1 = edges[eKey1]
  const e2 = edges[eKey2]
  if (!e1 || !e2) return false
  return e1.v1 === e2.v1 || e1.v1 === e2.v2 || e1.v2 === e2.v1 || e1.v2 === e2.v2
}

export function edgeTouchesVertex(eKey: string, vKey: string): boolean {
  const edges = getEdgeCache()
  const e = edges[eKey]
  if (!e) return false
  return e.v1 === vKey || e.v2 === vKey
}

export function getVertexHexes(q: number, r: number, corner: number): { q: number; r: number; corner: number }[] {
  const vk = vertexKey(q, r, corner)
  const v = getVertexCache()[vk]
  return v ? v.hexes : [{ q, r, corner }]
}

export function tileAt(state: GameState, q: number, r: number): Tile | null {
  for (let i = 0; i < state.board.tiles.length; i++) {
    const t = state.board.tiles[i]!
    if (t.coord.q === q && t.coord.r === r) return t
  }
  return null
}

export function hasResources(player: Player, cost: Partial<Record<Resource, number>>): boolean {
  for (const r of Object.keys(cost) as Resource[]) {
    if ((player.resources[r] ?? 0) < (cost[r] ?? 0)) return false
  }
  return true
}

export function deductResources(player: Player, cost: Partial<Record<Resource, number>>): Player {
  const newRes = { ...player.resources }
  for (const r of Object.keys(cost) as Resource[]) {
    newRes[r] = (newRes[r] ?? 0) - (cost[r] ?? 0)
  }
  return { ...player, resources: newRes }
}

export function findBuilding(state: GameState, vKey: string): { player: number; type: "settlement" | "city" } | null {
  for (let p = 0; p < state.players.length; p++) {
    const player = state.players[p]!
    for (let i = 0; i < player.settlements.length; i++) {
      const s = player.settlements[i]!
      if (vertexKey(s.q, s.r, s.corner) === vKey) {
        return { player: p, type: "settlement" }
      }
    }
    for (let j = 0; j < player.cities.length; j++) {
      const c = player.cities[j]!
      if (vertexKey(c.q, c.r, c.corner) === vKey) {
        return { player: p, type: "city" }
      }
    }
  }
  return null
}

export function checkDistanceRule(state: GameState, vKey: string): boolean {
  for (let p = 0; p < state.players.length; p++) {
    const player = state.players[p]!
    for (let i = 0; i < player.settlements.length; i++) {
      const s = player.settlements[i]!
      if (verticesAreAdjacent(vKey, vertexKey(s.q, s.r, s.corner))) return false
    }
    for (let j = 0; j < player.cities.length; j++) {
      const c = player.cities[j]!
      if (verticesAreAdjacent(vKey, vertexKey(c.q, c.r, c.corner))) return false
    }
  }
  return true
}

export function roadExists(state: GameState, eKey: string): boolean {
  for (let p = 0; p < state.players.length; p++) {
    for (let i = 0; i < state.players[p]!.roads.length; i++) {
      if (state.players[p]!.roads[i]!.key === eKey) return true
    }
  }
  return false
}

export function hasAdjacentRoad(state: GameState, playerIdx: number, vKey: string): boolean {
  const player = state.players[playerIdx]!
  for (let i = 0; i < player.roads.length; i++) {
    if (edgeTouchesVertex(player.roads[i]!.key, vKey)) return true
  }
  return false
}

export function edgeConnectedToPlayer(state: GameState, playerIdx: number, eKey: string): boolean {
  const player = state.players[playerIdx]!
  for (let i = 0; i < player.roads.length; i++) {
    if (roadsShareVertex(player.roads[i]!.key, eKey)) return true
  }
  for (let j = 0; j < player.settlements.length; j++) {
    const s = player.settlements[j]!
    if (edgeTouchesVertex(eKey, vertexKey(s.q, s.r, s.corner))) return true
  }
  for (let k = 0; k < player.cities.length; k++) {
    const c = player.cities[k]!
    if (edgeTouchesVertex(eKey, vertexKey(c.q, c.r, c.corner))) return true
  }
  return false
}

export function canBuildSettlement(
  state: GameState,
  playerIdx: number,
  q: number,
  r: number,
  corner: number,
  isInitial: boolean
): { ok: boolean; reason?: string } {
  const vKey = vertexKey(q, r, corner)
  const existing = findBuilding(state, vKey)
  if (existing) return { ok: false, reason: "Vertex already occupied" }

  if (!checkDistanceRule(state, vKey)) return { ok: false, reason: "Too close to another settlement" }

  if (!isInitial) {
    const player = state.players[playerIdx]!
    if (player.settlements.length >= MAX_SETTLEMENTS) return { ok: false, reason: "Maximum settlements reached" }

    const cost = BUILDING_COST.settlement!
    if (!hasResources(player, cost)) return { ok: false, reason: "Not enough resources" }

    if (!hasAdjacentRoad(state, playerIdx, vKey)) return { ok: false, reason: "No adjacent road" }
  }

  return { ok: true }
}

export function canBuildRoad(
  state: GameState,
  playerIdx: number,
  q1: number,
  r1: number,
  corner1: number,
  q2: number,
  r2: number,
  corner2: number,
  isInitial: boolean,
  fromSettlementVertex: { q: number; r: number; corner: number } | null,
  free?: boolean
): { ok: boolean; reason?: string } {
  const eKey = edgeKey(q1, r1, corner1, q2, r2, corner2)
  if (roadExists(state, eKey)) return { ok: false, reason: "Edge already occupied" }

  if (isInitial && fromSettlementVertex) {
    const svKey = vertexKey(fromSettlementVertex.q, fromSettlementVertex.r, fromSettlementVertex.corner)
    if (edgeTouchesVertex(eKey, svKey)) return { ok: true }
    return { ok: false, reason: "Road must connect to placed settlement" }
  }

  if (!isInitial) {
    const player = state.players[playerIdx]!
    if (player.roadCount >= MAX_ROADS) return { ok: false, reason: "Maximum roads reached" }

    if (!free) {
      const cost = BUILDING_COST.road!
      if (!hasResources(player, cost)) return { ok: false, reason: "Not enough resources" }
    }

    if (!edgeConnectedToPlayer(state, playerIdx, eKey)) {
      return { ok: false, reason: "No adjacent settlement or road" }
    }
  }

  return { ok: true }
}

export function canBuildCity(
  state: GameState,
  playerIdx: number,
  q: number,
  r: number,
  corner: number
): { ok: boolean; reason?: string } {
  const player = state.players[playerIdx]!
  const vKey = vertexKey(q, r, corner)

  let found = false
  for (let i = 0; i < player.settlements.length; i++) {
    const s = player.settlements[i]!
    if (vertexKey(s.q, s.r, s.corner) === vKey) { found = true; break }
  }
  if (!found) return { ok: false, reason: "No settlement here" }

  if (player.cities.length >= MAX_CITIES) return { ok: false, reason: "Maximum cities reached" }

  const cost = BUILDING_COST.city!
  if (!hasResources(player, cost)) return { ok: false, reason: "Not enough resources" }

  return { ok: true }
}

export function placeSettlement(
  state: GameState,
  playerIdx: number,
  q: number,
  r: number,
  corner: number
): GameState {
  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIdx) return p
    return {
      ...p,
      settlements: [...p.settlements, { q, r, corner }],
      vp: p.vp + 1,
    }
  })

  let newState = { ...state, players: newPlayers }

  if (state.phase === "play") {
    newState = {
      ...newState,
      players: newPlayers.map((p, i) =>
        i === playerIdx ? deductResources(p, BUILDING_COST.settlement!) : p
      ),
    }
  }

  return updateLongestRoad(newState)
}

export function placeRoad(
  state: GameState,
  playerIdx: number,
  q1: number,
  r1: number,
  corner1: number,
  q2: number,
  r2: number,
  corner2: number,
  free?: boolean
): GameState {
  const eKey = edgeKey(q1, r1, corner1, q2, r2, corner2)
  const road: RoadData = { key: eKey, q1, r1, corner1, q2, r2, corner2 }

  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIdx) return p
    return {
      ...p,
      roads: [...p.roads, road],
      roadCount: p.roadCount + 1,
    }
  })

  let newState = { ...state, players: newPlayers }

  if (state.phase === "play" && !free) {
    newState = {
      ...newState,
      players: newPlayers.map((p, i) =>
        i === playerIdx ? deductResources(p, BUILDING_COST.road!) : p
      ),
    }
  }

  return updateLongestRoad(newState)
}

export function placeCity(
  state: GameState,
  playerIdx: number,
  q: number,
  r: number,
  corner: number
): GameState {
  const player = state.players[playerIdx]!
  const vKey = vertexKey(q, r, corner)

  const newSettlements = player.settlements.filter(s => vertexKey(s.q, s.r, s.corner) !== vKey)
  const newCities = [...player.cities, { q, r, corner }]

  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIdx) return p
    return {
      ...p,
      settlements: newSettlements,
      cities: newCities,
      vp: p.vp + 1,
      resources: { ...deductResources(p, BUILDING_COST.city!).resources },
    }
  })

  return { ...state, players: newPlayers }
}

export function produce(
  state: GameState,
  total: number
): { player: number; resource: string; amount: number }[] {
  const gainsByPlayer: Record<number, Record<string, number>> = {}
  for (let p = 0; p < state.players.length; p++) {
    gainsByPlayer[p] = {}
  }

  for (let i = 0; i < state.board.tiles.length; i++) {
    const tile = state.board.tiles[i]!
    if (tile.resource === DESERT || tile.number !== total) continue

    for (let c = 0; c < 6; c++) {
      const vk = vertexKey(tile.coord.q, tile.coord.r, c)
      const bldg = findBuilding(state, vk)
      if (bldg) {
        const amount = bldg.type === "city" ? 2 : 1
        gainsByPlayer[bldg.player]![tile.resource] = (gainsByPlayer[bldg.player]![tile.resource] ?? 0) + amount
      }
    }
  }

  const gains: { player: number; resource: string; amount: number }[] = []
  for (let gP = 0; gP < state.players.length; gP++) {
    for (const gR of Object.keys(gainsByPlayer[gP]!)) {
      gains.push({ player: gP, resource: gR, amount: gainsByPlayer[gP]![gR]! })
    }
  }

  return gains
}

export function rollDice(state: GameState, rng?: () => number): GameState {
  const r = rng ?? Math.random
  const d1 = Math.ceil(r() * 6)
  const d2 = Math.ceil(r() * 6)
  const total = d1 + d2

  const gains = produce(state, total)

  const newPlayers = state.players.map((p, i) => {
    const playerGains = gains.filter(g => g.player === i)
    if (playerGains.length === 0) return p
    const newRes = { ...p.resources }
    for (const g of playerGains) {
      newRes[g.resource as Resource] = (newRes[g.resource as Resource] ?? 0) + g.amount
    }
    return { ...p, resources: newRes }
  })

  return {
    ...state,
    dice: [d1, d2] as [number, number],
    rolled: true,
    players: newPlayers,
  }
}

export function advanceInitialPlacement(state: GameState): GameState {
  const n = state.players.length
  let newPhase: GamePhase = state.phase
  let newPlayer = state.currentPlayer
  let newTurn = state.turn

  if (state.phase === "initial_first") {
    if (state.currentPlayer < n - 1) {
      newPlayer = state.currentPlayer + 1
    } else {
      newPhase = "initial_second"
      newPlayer = n - 1
    }
  } else {
    if (state.currentPlayer > 0) {
      newPlayer = state.currentPlayer - 1
    } else {
      newPhase = "play"
      newPlayer = 0
      newTurn = 1
    }
  }

  return {
    ...state,
    phase: newPhase,
    currentPlayer: newPlayer,
    turn: newTurn,
    setupStep: "settlement",
    pendingSettlement: null,
  }
}

export function nextTurn(state: GameState): GameState {
  if (state.phase === "initial_first" || state.phase === "initial_second") {
    return advanceInitialPlacement(state)
  }

  const nextPlayer = (state.currentPlayer + 1) % state.players.length
  const newTurn = state.turn + 1

  const newPlayers = state.players.map((p, i) =>
    i === nextPlayer
      ? { ...p, hand: p.hand.map(c => ({ ...c, available: true })) }
      : p
  )

  return {
    ...state,
    currentPlayer: nextPlayer,
    rolled: false,
    dice: null,
    turn: newTurn,
    players: newPlayers,
  }
}

export function giveStartingResources(
  state: GameState,
  playerIdx: number,
  q: number,
  r: number,
  corner: number
): GameState {
  const player = state.players[playerIdx]!
  const hexes = getVertexHexes(q, r, corner)
  const newRes = { ...player.resources }

  for (let i = 0; i < hexes.length; i++) {
    const tile = tileAt(state, hexes[i]!.q, hexes[i]!.r)
    if (tile && tile.resource !== DESERT) {
      newRes[tile.resource]++
    }
  }

  const newPlayers = state.players.map((p, i) =>
    i === playerIdx ? { ...p, resources: newRes } : p
  )

  return { ...state, players: newPlayers }
}

export function checkWin(state: GameState): number {
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i]!.vp >= 10) return i
  }
  return -1
}

export function computeRates(state: GameState, playerIdx: number): Record<TradeResource, number> {
  const rates: Record<string, number> = { brick: 4, lumber: 4, wool: 4, grain: 4, ore: 4 }
  const player = state.players[playerIdx]!
  const occupiedVerts = new Set<string>()

  for (const s of player.settlements) {
    occupiedVerts.add(vertexKey(s.q, s.r, s.corner))
  }
  for (const c of player.cities) {
    occupiedVerts.add(vertexKey(c.q, c.r, c.corner))
  }

  for (const port of state.board.ports) {
    const [v1, v2] = port.vertices
    const vk1 = vertexKey(v1.q, v1.r, v1.corner)
    const vk2 = vertexKey(v2.q, v2.r, v2.corner)

    if (occupiedVerts.has(vk1) || occupiedVerts.has(vk2)) {
      if (port.resource === null) {
        rates[Resource.Brick] = Math.min(rates[Resource.Brick]!, 3)
        rates[Resource.Lumber] = Math.min(rates[Resource.Lumber]!, 3)
        rates[Resource.Wool] = Math.min(rates[Resource.Wool]!, 3)
        rates[Resource.Grain] = Math.min(rates[Resource.Grain]!, 3)
        rates[Resource.Ore] = Math.min(rates[Resource.Ore]!, 3)
      } else if (port.resource !== Resource.Desert) {
        rates[port.resource] = 2
      }
    }
  }

  return rates as Record<TradeResource, number>
}

export function calculateMonopolyTotals(state: GameState, playerIdx: number): Partial<Record<TradeResource, number>> {
  const totals: Record<string, number> = {}
  for (let i = 0; i < state.players.length; i++) {
    if (i === playerIdx) continue
    const p = state.players[i]!
    for (const r of Object.values(TradeResource) as TradeResource[]) {
      totals[r] = (totals[r] ?? 0) + (p.resources[r as Resource] ?? 0)
    }
  }
  const result: Partial<Record<TradeResource, number>> = {}
  for (const [r, count] of Object.entries(totals)) {
    if (count > 0) result[r as TradeResource] = count
  }
  return result
}

export function playMonopolyCard(state: GameState, playerIdx: number, resource: TradeResource): GameState {
  const p = state.players[playerIdx]!
  const idx = p.hand.findIndex(c => c.cardType === "monopoly" && c.available)
  if (idx === -1) return state

  const res = resource as Resource
  let stolen = 0

  const newPlayers = state.players.map((pl, i) => {
    if (i === playerIdx) return pl
    const amount = pl.resources[res] ?? 0
    stolen += amount
    return { ...pl, resources: { ...pl.resources, [res]: 0 } }
  })

  const cp = newPlayers[playerIdx]!
  newPlayers[playerIdx] = {
    ...cp,
    resources: { ...cp.resources, [res]: (cp.resources[res] ?? 0) + stolen },
    hand: cp.hand.filter((_, i) => i !== idx),
  }

  return { ...state, players: newPlayers }
}

export function playYearOfPlentyCard(state: GameState, playerIdx: number, resources: [TradeResource, TradeResource]): GameState {
  const p = state.players[playerIdx]!
  const idx = p.hand.findIndex(c => c.cardType === "year-of-plenty" && c.available)
  if (idx === -1) return state

  const newRes = { ...p.resources }
  for (const r of resources) {
    newRes[r as Resource] = (newRes[r as Resource] ?? 0) + 1
  }
  const newHand = p.hand.filter((_, i) => i !== idx)
  const newPlayers = state.players.map((pl, i) =>
    i === playerIdx ? { ...pl, resources: newRes, hand: newHand } : pl
  )
  return { ...state, players: newPlayers }
}

export function canBuyDevCard(state: GameState, playerIdx: number): boolean {
  const p = state.players[playerIdx]!
  return (
    (p.resources[Resource.Ore] ?? 0) >= 1 &&
    (p.resources[Resource.Wool] ?? 0) >= 1 &&
    (p.resources[Resource.Grain] ?? 0) >= 1
  )
}

export function buyDevCard(state: GameState, playerIdx: number): GameState {
  if (state.devDeck.cards.length === 0) return state
  const p = state.players[playerIdx]!
  const cost = BUILDING_COST.development!
  const newRes = { ...p.resources }
  for (const r in cost) {
    const res = r as Resource
    newRes[res] = (newRes[res] ?? 0) - cost[res]!
  }
  const card = state.devDeck.cards[0]!
  const newDeck: DevDeck = {
    ...state.devDeck,
    cards: state.devDeck.cards.slice(1),
    remaining: state.devDeck.remaining - 1,
  }
  const newPlayers = state.players.map((pl, i) =>
    i === playerIdx
      ? { ...pl, resources: newRes, hand: [...pl.hand, { cardType: card.cardType, available: false }] }
      : pl
  )
  return { ...state, devDeck: newDeck, players: newPlayers }
}

export function playDevCard(state: GameState, playerIdx: number, cardType: string): GameState {
  const p = state.players[playerIdx]!
  const idx = p.hand.findIndex(c => c.cardType === cardType && c.available)
  if (idx === -1) return state

  let newVp = p.vp
  if (cardType === "victory") {
    newVp += 1
  }

  const newKnights = cardType === "knight" ? p.knights + 1 : p.knights

  const newHand = p.hand.filter((_, i) => i !== idx)
  let newPlayers = state.players.map((pl, i) =>
    i === playerIdx ? { ...pl, hand: newHand, vp: newVp, knights: newKnights } : pl
  )
  let newLargestArmy = state.largestArmy

  if (cardType === "knight" && newKnights >= 3) {
    if (state.largestArmy === null) {
      newLargestArmy = playerIdx
      newPlayers = newPlayers.map((pl, i) =>
        i === playerIdx ? { ...pl, vp: pl.vp + 2 } : pl
      )
    } else if (state.largestArmy !== playerIdx) {
      const currentHolderKnights = newPlayers[state.largestArmy]!.knights
      const diff = newKnights - currentHolderKnights
      if (diff > 0) {
        newLargestArmy = playerIdx
        newPlayers = newPlayers.map((pl, i) =>
          i === playerIdx
            ? { ...pl, vp: pl.vp + 2 }
            : i === state.largestArmy
              ? { ...pl, vp: pl.vp - 2 }
              : pl
        )
      }
    }
  }

  return { ...state, players: newPlayers, largestArmy: newLargestArmy }
}

export function computeLongestRoad(state: GameState, playerIdx: number): number {
  const player = state.players[playerIdx]!
  if (player.roads.length < 5) return 0

  const edges = getEdgeCache()

  const adj: Map<string, Set<string>> = new Map()
  for (const road of player.roads) {
    const e = edges[road.key]
    if (!e) continue
    if (!adj.has(e.v1)) adj.set(e.v1, new Set())
    if (!adj.has(e.v2)) adj.set(e.v2, new Set())
    adj.get(e.v1)!.add(e.v2)
    adj.get(e.v2)!.add(e.v1)
  }

  function isBlocked(vKey: string): boolean {
    const bldg = findBuilding(state, vKey)
    return bldg !== null && bldg.player !== playerIdx
  }

  const roots = new Set<string>()
  for (const s of player.settlements) {
    roots.add(vertexKey(s.q, s.r, s.corner))
  }
  for (const c of player.cities) {
    roots.add(vertexKey(c.q, c.r, c.corner))
  }

  const graphs: Set<string>[] = []
  const vertexToGraph = new Map<string, number>()

  for (const root of roots) {
    if (vertexToGraph.has(root)) continue
    const g = new Set([root])
    graphs.push(g)
    vertexToGraph.set(root, graphs.length - 1)
  }

  let changed = true
  while (changed) {
    changed = false
    for (let gi = 0; gi < graphs.length; gi++) {
      const graph = graphs[gi]!
      if (graph.size === 0) continue

      const boundary = new Set<string>()
      for (const vKey of graph) {
        if (isBlocked(vKey)) continue
        const neighbors = adj.get(vKey)
        if (!neighbors) continue
        for (const n of neighbors) {
          if (!graph.has(n)) {
            boundary.add(vKey)
            break
          }
        }
      }

      for (const vKey of boundary) {
        const neighbors = adj.get(vKey)
        if (!neighbors) continue
        for (const n of neighbors) {
          if (graph.has(n)) continue

          if (vertexToGraph.has(n)) {
            const otherGi = vertexToGraph.get(n)!
            if (otherGi === gi) continue
            if (isBlocked(n)) {
              graph.add(n)
              continue
            }
            const other = graphs[otherGi]!
            if (other.size === 0) continue
            for (const v of other) {
              graph.add(v)
              vertexToGraph.set(v, gi)
            }
            other.clear()
            changed = true
          } else {
            graph.add(n)
            vertexToGraph.set(n, gi)
            if (!isBlocked(n)) changed = true
          }
        }
      }
    }
  }

  function bfsFarthest(start: string, graph: Set<string>): { node: string; dist: number } {
    const dist = new Map<string, number>([[start, 0]])
    const queue = [start]
    let idx = 0
    while (idx < queue.length) {
      const v = queue[idx++]!
      if (isBlocked(v)) continue
      const neighbors = adj.get(v)
      if (!neighbors) continue
      for (const n of neighbors) {
        if (graph.has(n) && !dist.has(n)) {
          dist.set(n, dist.get(v)! + 1)
          queue.push(n)
        }
      }
    }
    let farthest = start
    let maxDist = 0
    for (const [v, d] of dist) {
      if (d > maxDist) { maxDist = d; farthest = v }
    }
    return { node: farthest, dist: maxDist }
  }

  let longest = 0
  for (const graph of graphs) {
    if (graph.size < 2) continue
    const anyNode = graph.values().next().value!
    const first = bfsFarthest(anyNode, graph)
    const second = bfsFarthest(first.node, graph)
    const candidate = first.dist > second.dist ? first.dist : second.dist
    if (candidate > longest) longest = candidate
  }

  return longest
}

export function updateLongestRoad(state: GameState): GameState {
  const lengths = state.players.map((_, i) => computeLongestRoad(state, i))

  let bestLen = 0
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i]! > bestLen) bestLen = lengths[i]!
  }

  if (bestLen < 5) {
    if (state.longestRoad !== null) {
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === state.longestRoad ? { ...p, vp: p.vp - 2 } : p
        ),
        longestRoad: null,
      }
    }
    return state
  }

  const leaders: number[] = []
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] === bestLen) leaders.push(i)
  }

  if (leaders.length === 1) {
    const newHolder = leaders[0]!
    if (newHolder !== state.longestRoad) {
      let newPlayers = state.players
      if (state.longestRoad !== null) {
        newPlayers = newPlayers.map((p, i) =>
          i === state.longestRoad ? { ...p, vp: p.vp - 2 } : p
        )
      }
      newPlayers = newPlayers.map((p, i) =>
        i === newHolder ? { ...p, vp: p.vp + 2 } : p
      )
      return { ...state, players: newPlayers, longestRoad: newHolder }
    }
    return state
  }

  if (state.longestRoad !== null && leaders.includes(state.longestRoad)) {
    return state
  }

  if (state.longestRoad !== null) {
    return {
      ...state,
      players: state.players.map((p, i) =>
        i === state.longestRoad ? { ...p, vp: p.vp - 2 } : p
      ),
      longestRoad: null,
    }
  }

  return state
}

export function moveRobber(state: GameState, q: number, r: number): GameState {
  return { ...state, board: { ...state.board, robber: { q, r } } }
}

export function getRobbableVertices(
  state: GameState,
  playerIdx: number,
  tileQ: number,
  tileR: number
): { key: string; owner: number; buildingType: "settlement" | "city" }[] {
  const result: { key: string; owner: number; buildingType: "settlement" | "city" }[] = []
  for (let corner = 0; corner < 6; corner++) {
    const k = vertexKey(tileQ, tileR, corner)
    const building = findBuilding(state, k)
    if (!building) continue
    if (building.player === playerIdx) continue
    result.push({ key: k, owner: building.player, buildingType: building.type })
  }
  return result
}

export function robResource(
  state: GameState,
  robberPlayer: number,
  victimPlayer: number,
  resource: TradeResource
): GameState {
  const res = resource as Resource
  const newPlayers = state.players.map((p, i) => {
    if (i === robberPlayer) {
      return { ...p, resources: { ...p.resources, [res]: p.resources[res] + 1 } }
    }
    if (i === victimPlayer) {
      return { ...p, resources: { ...p.resources, [res]: p.resources[res] - 1 } }
    }
    return p
  })
  return { ...state, players: newPlayers }
}

export function getValidPositions(
  state: GameState,
  mode: string
): { type: string; key: string; edge?: Edge }[] {
  const result: { type: string; key: string; edge?: Edge }[] = []
  const cp = state.currentPlayer
  const cache = getVertexCache()
  const edges = getEdgeCache()

  if (mode === "settlement") {
    for (const k of Object.keys(cache)) {
      const v = cache[k]!
      const h = v.hexes[0]!
      const r = canBuildSettlement(state, cp, h.q, h.r, h.corner, false)
      if (r.ok) result.push({ type: "vertex", key: k })
    }
  } else if (mode === "city") {
    const player = state.players[cp]!
    for (let i = 0; i < player.settlements.length; i++) {
      const s = player.settlements[i]!
      result.push({ type: "vertex", key: vertexKey(s.q, s.r, s.corner) })
    }
  } else if (mode === "road") {
    for (const ek of Object.keys(edges)) {
      const e = edges[ek]!
      const eh = e.hex
      const r = canBuildRoad(state, cp, eh.q, eh.r, eh.c1, eh.q, eh.r, eh.c2, false, null)
      if (r.ok) result.push({ type: "edge", key: ek, edge: e })
    }
  } else if (mode === "initial-settlement") {
    for (const k of Object.keys(cache)) {
      const v = cache[k]!
      const h = v.hexes[0]!
      const r = canBuildSettlement(state, cp, h.q, h.r, h.corner, true)
      if (r.ok) result.push({ type: "vertex", key: k })
    }
  } else if (mode === "initial-road") {
    if (state.pendingSettlement) {
      const ps = state.pendingSettlement
      const svKey = vertexKey(ps.q, ps.r, ps.corner)
      for (const ek of Object.keys(edges)) {
        const e = edges[ek]!
        if (edgeTouchesVertex(ek, svKey)) {
          result.push({ type: "edge", key: ek, edge: e })
        }
      }
    }
  }

  return result
}

export function createGame(opts: GameOptions): GameState {
  const resources = seededShuffle(RESOURCE_DIST, opts.roll)
  const desertIdx = resources.indexOf(Resource.Desert)
  const numbers = seededShuffle(NUMBER_DIST, opts.roll + 1)

  const tiles: Tile[] = BOARD_HEXES.map((coord, i) => {
    if (i === desertIdx) {
      return { coord, resource: Resource.Desert, number: 7 }
    }
    const ni = i < desertIdx ? i : i - 1
    return { coord, resource: resources[i]!, number: numbers[ni]! }
  })

  const robber = tiles.find(t => t.resource === Resource.Desert)!.coord

  const portEdgeOrder = seededShuffle(
    PORT_EDGES.map((_, i) => i),
    opts.roll + 2
  )
  const selectedPortEdges = portEdgeOrder.slice(0, 9)
  const portResources = seededShuffle(PORT_RESOURCE_DIST, opts.roll + 3)
  const ports: Port[] = selectedPortEdges.map((idx, i) => ({
    resource: portResources[i]!,
    vertices: PORT_EDGES[idx]!,
  }))

  const zeroRes = (): Record<Resource, number> => ({
    [Resource.Brick]: 0,
    [Resource.Lumber]: 0,
    [Resource.Wool]: 0,
    [Resource.Grain]: 0,
    [Resource.Ore]: 0,
    [Resource.Desert]: 0,
  })

  return {
    phase: "initial_first",
    turn: 0,
    currentPlayer: 0,
    dice: null,
    rolled: false,
    setupStep: "settlement",
    pendingSettlement: null,
    pendingTrade: null,
    board: { tiles, ports, robber },
    players: Array.from({ length: opts.players }, (_, i) => ({
      id: i,
      name: truncateText("Player " + (i + 1), 64, 32),
      resources: zeroRes(),
      settlements: [],
      cities: [],
      roads: [],
      vp: 0,
      roadCount: 0,
      rates: { brick: 4, lumber: 4, wool: 4, grain: 4, ore: 4 },
      hand: [],
      knights: 0,
    })),
    devDeck: createPoolDeck(opts.roll),
    winner: null,
    largestArmy: null,
    longestRoad: null,
    title: truncateText(opts.title ?? "", 64, 32),
  }
}

export function applyMove(state: GameState, move: GameMove): GameState {
  switch (move.type) {
    case "roll-dice": {
      const total = move.dice[0] + move.dice[1]
      const gains = produce(state, total)
      const newPlayers = state.players.map((p, i) => {
        const playerGains = gains.filter(g => g.player === i)
        if (playerGains.length === 0) return p
        const newRes = { ...p.resources }
        for (const g of playerGains) {
          newRes[g.resource as Resource] = (newRes[g.resource as Resource] ?? 0) + g.amount
        }
        return { ...p, resources: newRes }
      })
      return {
        ...state,
        dice: move.dice,
        rolled: true,
        players: newPlayers,
      }
    }
    case "place-settlement":
      return placeSettlement(state, move.player, move.q, move.r, move.corner)
    case "place-road":
      return placeRoad(state, move.player, move.q1, move.r1, move.corner1, move.q2, move.r2, move.corner2)
    case "place-city":
      return placeCity(state, move.player, move.q, move.r, move.corner)
    case "end-turn":
      return nextTurn(state)
    case "trade": {
      const hasGive = Object.values(move.give).some(v => v > 0)
      const hasTake = Object.values(move.take).some(v => v > 0)
      if (!hasGive || !hasTake) {
        throw new Error("Trade must include both give and take")
      }
      const player = state.players[move.player]!
      for (const r in move.give) {
        const res = r as TradeResource
        if ((player.resources[res] ?? 0) < (move.give[res] ?? 0)) {
          throw new Error("Not enough resources to trade")
        }
      }
      const newPlayers = [...state.players]
      const newCurrRes = { ...player.resources }
      for (const r in move.give) {
        const res = r as TradeResource
        newCurrRes[res] = (newCurrRes[res] ?? 0) - (move.give[res] ?? 0)
      }
      for (const r in move.take) {
        const res = r as TradeResource
        newCurrRes[res] = (newCurrRes[res] ?? 0) + (move.take[res] ?? 0)
      }
      newPlayers[move.player] = { ...player, resources: newCurrRes }

      if (typeof move.partner === "number") {
        const partner = state.players[move.partner]!
        for (const r in move.take) {
          const res = r as TradeResource
          if ((partner.resources[res] ?? 0) < (move.take[res] ?? 0)) {
            throw new Error("Partner does not have enough resources")
          }
        }
        const newPartnerRes = { ...partner.resources }
        for (const r in move.take) {
          const res = r as TradeResource
          newPartnerRes[res] = (newPartnerRes[res] ?? 0) - (move.take[res] ?? 0)
        }
        for (const r in move.give) {
          const res = r as TradeResource
          newPartnerRes[res] = (newPartnerRes[res] ?? 0) + (move.give[res] ?? 0)
        }
        newPlayers[move.partner] = { ...partner, resources: newPartnerRes }
      }

      return { ...state, players: newPlayers }
    }
    case "buy-dev-card": {
      return buyDevCard(state, move.player)
    }
    case "play-dev-card": {
      return playDevCard(state, move.player, move.cardType)
    }
    case "play-monopoly": {
      return playMonopolyCard(state, move.player, move.resource)
    }
    case "play-year-of-plenty": {
      return playYearOfPlentyCard(state, move.player, move.resources)
    }
    case "move-robber": {
      return moveRobber(state, move.q, move.r)
    }
    case "steal-resource": {
      return robResource(state, move.player, move.victim, move.resource)
    }
    case "propose-trade": {
      if (state.pendingTrade) throw new Error("Already a pending trade")
      const hasGive = Object.values(move.give).some(v => v > 0)
      const hasTake = Object.values(move.take).some(v => v > 0)
      if (!hasGive || !hasTake) throw new Error("Trade must include both give and take")
      const proposer = state.players[move.player]!
      for (const r in move.give) {
        const res = r as TradeResource
        if ((proposer.resources[res] ?? 0) < (move.give[res] ?? 0))
          throw new Error("Not enough resources")
      }
      const partner = state.players[move.partner]!
      for (const r in move.take) {
        const res = r as TradeResource
        if ((partner.resources[res] ?? 0) < (move.take[res] ?? 0))
          throw new Error("Partner does not have enough resources")
      }
      for (const r in move.give) {
        if ((move.give[r as TradeResource] ?? 0) > 0 && (move.take[r as TradeResource] ?? 0) > 0)
          throw new Error("Cannot give and take the same resource")
      }
      return {
        ...state,
        pendingTrade: { from: move.player, to: move.partner, give: move.give, take: move.take },
      }
    }
    case "accept-trade": {
      if (!state.pendingTrade) throw new Error("No pending trade")
      if (move.player !== state.pendingTrade.to) throw new Error("Only the partner can accept")
      const newPlayers = [...state.players]
      const proposer = state.players[state.pendingTrade.from]!
      const partner = state.players[state.pendingTrade.to]!
      const newProposerRes = { ...proposer.resources }
      const newPartnerRes = { ...partner.resources }
      for (const r in state.pendingTrade.give) {
        const res = r as TradeResource
        const amount = state.pendingTrade.give[res]!
        newProposerRes[res] = (newProposerRes[res] ?? 0) - amount
        newPartnerRes[res] = (newPartnerRes[res] ?? 0) + amount
      }
      for (const r in state.pendingTrade.take) {
        const res = r as TradeResource
        const amount = state.pendingTrade.take[res]!
        newPartnerRes[res] = (newPartnerRes[res] ?? 0) - amount
        newProposerRes[res] = (newProposerRes[res] ?? 0) + amount
      }
      newPlayers[state.pendingTrade.from] = { ...proposer, resources: newProposerRes }
      newPlayers[state.pendingTrade.to] = { ...partner, resources: newPartnerRes }
      return { ...state, players: newPlayers, pendingTrade: null }
    }
    case "reject-trade": {
      if (!state.pendingTrade) throw new Error("No pending trade")
      if (move.player !== state.pendingTrade.to) throw new Error("Only the partner can reject")
      return { ...state, pendingTrade: null }
    }
    case "cancel-proposal": {
      if (!state.pendingTrade) throw new Error("No pending trade")
      if (move.player !== state.pendingTrade.from) throw new Error("Only the proposer can cancel")
      return { ...state, pendingTrade: null }
    }
    case "longest-road-change":
      return state
  }
}

export function replayRecord(record: GameRecord): GameState {
  let state = record.startState
  for (const turn of record.turns) {
    for (const move of turn.moves) {
      state = applyMove(state, move)
    }
  }
  return state
}

export function deriveLog(record: GameRecord): string[] {
  const out: string[] = []
  const names = record.startState.players.map(p => p.name)

  if (record.turns.length === 0) return out

  for (const turn of record.turns) {
    if (turn.phase === "play") {
      out.push("--- Turn " + turn.turn + " ---")
      out.push(names[turn.player] + "'s turn")
    }

    for (const move of turn.moves) {
      switch (move.type) {
        case "roll-dice": {
          const total = move.dice[0] + move.dice[1]
          out.push(names[move.player] + " rolled " + move.dice[0] + "+" + move.dice[1] + " = " + total)
          break
        }
        case "place-settlement":
          out.push(names[move.player] + " built a settlement")
          break
        case "place-road":
          out.push(names[move.player] + " built a road")
          break
        case "place-city":
          out.push(names[move.player] + " built a city")
          break
        case "end-turn":
          if ((turn.phase === "initial_first" || turn.phase === "initial_second") &&
              record.endState?.phase === "play" &&
              turn === record.turns[record.turns.length - 1] &&
              turn.moves.indexOf(move) === turn.moves.length - 1) {
            out.push("--- Game begins! ---")
          }
          break
        case "trade": {
          const partnerStr = move.partner === "bank" ? "bank" : names[move.partner]
          const giveStr = Object.entries(move.give).filter(([,c]) => c > 0).map(([r,c]) => c + " " + r).join(", ")
          const takeStr = Object.entries(move.take).filter(([,c]) => c > 0).map(([r,c]) => c + " " + r).join(", ")
          out.push(names[move.player] + " traded " + giveStr + " with " + partnerStr + " for " + takeStr)
          break
        }
        case "buy-dev-card":
          out.push(names[move.player] + " bought a development card")
          break
        case "play-dev-card":
          out.push(names[move.player] + " played a " + move.cardType + " card")
          break
        case "play-monopoly": {
          let line = names[move.player] + " played monopoly on " + move.resource
          if (move.total !== undefined && move.totals) {
            const parts: string[] = []
            for (let pi = 0; pi < move.totals.length; pi++) {
              if (move.totals[pi]! > 0) {
                parts.push(names[pi]! + " x" + move.totals[pi])
              }
            }
            line += " (" + parts.join(", ") + ", total " + move.total + ")"
          }
          out.push(line)
          break
        }
        case "play-year-of-plenty":
          out.push(names[move.player] + " played year of plenty")
          break
        case "move-robber":
          out.push(names[move.player] + " moved the robber")
          break
        case "steal-resource":
          out.push(names[move.player] + " stole " + move.resource + " from " + names[move.victim])
          break
        case "propose-trade": {
          const giveStr = Object.entries(move.give).filter(([,c]) => c > 0).map(([r,c]) => c + " " + r).join(", ")
          const takeStr = Object.entries(move.take).filter(([,c]) => c > 0).map(([r,c]) => c + " " + r).join(", ")
          out.push(names[move.player] + " proposed: " + giveStr + " for " + takeStr + " with " + names[move.partner])
          break
        }
        case "accept-trade":
          out.push(names[move.player] + " accepted the trade")
          break
        case "reject-trade":
          out.push(names[move.player] + " canceled the trade")
          break
        case "cancel-proposal":
          out.push(names[move.player] + " canceled the trade")
          break
        case "longest-road-change":
          if (move.winner !== null && move.loser !== null)
            out.push(names[move.winner] + " took the longest road from " + names[move.loser])
          else if (move.winner !== null)
            out.push(names[move.winner] + " gained the longest road")
          else if (move.loser !== null)
            out.push(names[move.loser] + " lost the longest road")
          break
      }
    }
  }

  return out
}
