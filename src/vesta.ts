export const Resource = {
  Brick: "brick",
  Lumber: "lumber",
  Wool: "wool",
  Grain: "grain",
  Ore: "ore",
  Desert: "desert",
} as const

export type Resource = (typeof Resource)[keyof typeof Resource]

export const BuildingType = {
  Settlement: "settlement",
  City: "city",
} as const

export type BuildingType = (typeof BuildingType)[keyof typeof BuildingType]

export interface HexCoord {
  q: number
  r: number
}

export interface Tile {
  coord: HexCoord
  resource: Resource
  number: number
}

export interface Building {
  type: BuildingType
  owner: number
  vertex: HexCoord
}

export interface Port {
  resource: Resource | null
  vertices: [HexCoord, HexCoord]
}

export interface Player {
  id: number
  resources: Record<Resource, number>
  buildings: Building[]
  roads: [HexCoord, HexCoord][]
  victoryPoints: number
}

export interface Board {
  tiles: Tile[]
  ports: Port[]
  robber: HexCoord
}

export interface GameState {
  board: Board
  players: Player[]
  turn: number
  currentPlayer: number
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

export interface GameOptions {
  players: number
  roll: number
}

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
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

const PORT_EDGES: [HexCoord, HexCoord][] = [
  [{ q: 2, r: -2 }, { q: 2, r: -1 }],
  [{ q: 2, r: -1 }, { q: 1, r: 1 }],
  [{ q: 1, r: 1 }, { q: 0, r: 2 }],
  [{ q: 0, r: 2 }, { q: -1, r: 2 }],
  [{ q: -1, r: 2 }, { q: -2, r: 2 }],
  [{ q: -2, r: 2 }, { q: -2, r: 1 }],
  [{ q: -2, r: 1 }, { q: -2, r: 0 }],
  [{ q: -2, r: 0 }, { q: -1, r: -1 }],
  [{ q: -1, r: -1 }, { q: 0, r: -2 }],
  [{ q: 0, r: -2 }, { q: 1, r: -2 }],
  [{ q: 1, r: -2 }, { q: 2, r: -2 }],
  [{ q: 2, r: -2 }, { q: 2, r: -1 }],
]

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

  const zeroRes = (): Record<Resource, number> => ({
    [Resource.Brick]: 0,
    [Resource.Lumber]: 0,
    [Resource.Wool]: 0,
    [Resource.Grain]: 0,
    [Resource.Ore]: 0,
    [Resource.Desert]: 0,
  })

  return {
    board: { tiles, ports: PORT_EDGES.map(v => ({ resource: null, vertices: v })), robber },
    players: Array.from({ length: opts.players }, (_, i) => ({
      id: i,
      resources: zeroRes(),
      buildings: [],
      roads: [],
      victoryPoints: 0,
    })),
    turn: 1,
    currentPlayer: 0,
  }
}
