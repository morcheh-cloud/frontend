import type { CSSProperties } from "react"

import { LogoMark } from "@/components/logo"

// Morcheh means "ant": the fleet is drawn as a colony. Morcheh sits in the
// central chamber, servers are the chambers around it, and ants (the logo's
// three segments) walk the tunnels between them like SSH sessions.
// Coordinates are in a 100×100 viewBox; HTML chips use the same numbers as %.

type Server = {
  name: string
  stat: string
  x: number
  y: number
  // Bend of the tunnel from the hub: control point of a quadratic curve.
  cx: number
  cy: number
}

const servers: Server[] = [
  { name: "web-01", stat: "CPU 12%", x: 22, y: 18, cx: 30, cy: 40 },
  { name: "db-primary", stat: "4.1 GB free", x: 78, y: 20, cx: 58, cy: 26 },
  { name: "cache-01", stat: "Up 41 days", x: 86, y: 58, cx: 70, cy: 46 },
  { name: "backup", stat: "Last run 03:00", x: 68, y: 86, cx: 64, cy: 62 },
  { name: "ci-runner", stat: "2 jobs", x: 20, y: 80, cx: 42, cy: 72 },
  { name: "mail", stat: "Load 0.08", x: 14, y: 50, cx: 30, cy: 58 },
]

// Side tunnels between neighbouring servers, so it reads as a network.
const links = [
  "M22 18 Q12 32 14 50",
  "M78 20 Q92 36 86 58",
  "M20 80 Q44 92 68 86",
]

const HUB = { x: 50, y: 50 }

function tunnel(server: Server) {
  return `M${HUB.x} ${HUB.y} Q${server.cx} ${server.cy} ${server.x} ${server.y}`
}

// Ants per tunnel: [seconds per trip, start offset, walking back to the hub?]
const ants: [number, number, boolean][] = [
  [7, 0, false],
  [7, 3.5, true],
]

function Ant() {
  // The logo mark mirrored so the head leads in the direction of travel.
  return (
    <g className="fill-foreground" transform="scale(1.5)">
      <ellipse cx="-0.8" cy="0" rx="0.7" ry="0.55" />
      <circle cx="0.35" cy="0" r="0.25" />
      <circle cx="1.15" cy="0" r="0.35" />
    </g>
  )
}

function delay(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` }
}

export function ColonyMap() {
  return (
    <div className="relative aspect-square w-[min(100%,35rem,64svh)]">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        {/* Chambers around the hub. */}
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r="14"
          className="fill-none stroke-border"
          strokeWidth="0.3"
        />
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r="26"
          className="fill-none stroke-border"
          strokeWidth="0.3"
          strokeDasharray="0.6 1.2"
        />

        {[...servers.map(tunnel), ...links].map((d, index) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            strokeDasharray="1"
            className="fill-none stroke-mist motion-safe:animate-[trail-draw_1.1s_cubic-bezier(0.65,0,0.35,1)_both]"
            strokeWidth={index < servers.length ? 0.45 : 0.3}
            strokeLinecap="round"
            style={delay(index * 0.08)}
          />
        ))}

        <g className="motion-safe:animate-in motion-safe:delay-1000 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:fade-in motion-reduce:hidden">
          {servers.flatMap((server, index) =>
            ants.map(([duration, offset, back]) => (
              <g key={`${server.name}-${offset}`}>
                <Ant />
                <animateMotion
                  path={tunnel(server)}
                  dur={`${duration + index * 0.6}s`}
                  begin={`-${offset + index * 1.3}s`}
                  repeatCount="indefinite"
                  rotate={back ? "auto-reverse" : "auto"}
                  keyPoints={back ? "1;0" : "0;1"}
                  keyTimes="0;1"
                  calcMode="linear"
                />
              </g>
            )),
          )}
        </g>
      </svg>

      <div
        className="absolute top-1/2 left-1/2 grid size-14 -translate-1/2 place-items-center rounded-2xl bg-brand text-primary-foreground shadow-sm motion-safe:animate-in motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:zoom-in-90 motion-safe:fade-in"
        aria-hidden="true"
      >
        <LogoMark className="h-3.5 w-7" />
      </div>

      <ul aria-hidden="true">
        {servers.map((server, index) => (
          <li
            key={server.name}
            className="absolute flex -translate-1/2 flex-col gap-0.5 rounded-lg border border-border bg-card px-3 py-2 shadow-sm motion-safe:animate-in motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:zoom-in-95 motion-safe:fade-in"
            style={{
              left: `${server.x}%`,
              top: `${server.y}%`,
              ...delay(0.5 + index * 0.07),
            }}
          >
            <span className="flex items-center gap-1.5 text-body-sm font-medium whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-brand" />
              {server.name}
            </span>
            <span className="ps-3 text-caption whitespace-nowrap text-ash tabular-nums">
              {server.stat}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
