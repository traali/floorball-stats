import type { HigherLevel } from '../utils/playerLevels'

export function OverageBadge({ show }: { show?: boolean }) {
  if (!show) return null
  return (
    <span
      title="Yli-ikäinen"
      aria-label="Yli-ikäinen"
      data-testid="overage-badge"
      className="inline-flex items-center justify-center text-[9px] font-black px-1 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 ml-1 align-middle"
    >
      Y
    </span>
  )
}

export function HigherLevelChips({ levels }: { levels?: HigherLevel[] }) {
  if (!levels?.length) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {levels.map((l) => (
        <span
          key={l.category}
          data-testid="higher-level-chip"
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30"
        >
          Pelaa myös {l.category} ({l.games} o.)
        </span>
      ))}
    </div>
  )
}
