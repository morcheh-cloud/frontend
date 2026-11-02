export type Level = "viewer" | "operator" | "engineer" | "owner"

export const LEVELS: readonly Level[] = [
  "viewer",
  "operator",
  "engineer",
  "owner",
]

const RANK: Record<string, number> = {
  none: 0,
  viewer: 1,
  operator: 2,
  engineer: 3,
  owner: 4,
}

export function atLeast(level: string | undefined, min: Level) {
  return (RANK[level ?? "none"] ?? 0) >= RANK[min]
}

export function higher(a: string | undefined, b: string | undefined) {
  return (RANK[a ?? "none"] ?? 0) >= (RANK[b ?? "none"] ?? 0)
    ? (a ?? "none")
    : (b ?? "none")
}

export const levelLabels: Record<Level, string> = {
  viewer: "Viewer",
  operator: "Operator",
  engineer: "Engineer",
  owner: "Owner",
}

export function levelLabel(level: string) {
  return levelLabels[level as Level] ?? "No access"
}

// What each level adds, for the pickers.
export const levelHints: Record<Level, string> = {
  viewer: "Status, live resources and read-only lists.",
  operator: "Viewer, plus logs, files (read), restart and reboot.",
  engineer: "Operator, plus terminal, editing files, services and cron.",
  owner: "Engineer, plus SSH credentials, editing, deleting and sharing.",
}

export const storageLevelHints: Record<Level, string> = {
  viewer: "See the files.",
  operator: "Viewer, plus download.",
  engineer: "Operator, plus upload, change and delete.",
  owner: "Engineer, plus keys, editing, deleting and sharing.",
}
