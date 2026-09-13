import type { FormResult } from '../utils/playerForm'

export function GameBoxes({
  boxes,
}: {
  boxes: Array<{ result: FormResult; date: string; opponent?: string; matchId?: string }>
}) {
  if (!boxes.length) return null
  const shown = boxes.slice(0, 18)
  const extra = boxes.length - shown.length
  return (
    <div>
      <span className="inline-flex items-center flex-wrap gap-0.5" aria-label="Ottelut, uusin ensin">
        {shown.map((d, i) => {
          const cls =
            d.result === 'V' ? 'bg-emerald-400' :
            d.result === 'H' ? 'bg-rose-400' :
            d.result === 'T' ? 'bg-slate-500' :
            'bg-slate-700 border border-slate-500'
          return (
            <span
              key={`${d.matchId || d.date}-${i}`}
              title={`${d.date} · ${d.opponent || ''} · ${d.result === 'DNP' ? 'ei pelannut' : d.result}`}
              className={`inline-block w-2.5 h-2.5 rounded-[3px] shrink-0 ${cls}`}
            />
          )
        })}
        {extra > 0 ? <span className="text-[9px] text-slate-500 ml-0.5">+{extra}</span> : null}
      </span>
    </div>
  )
}
