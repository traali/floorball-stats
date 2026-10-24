import { useState } from 'react'
import { Download, ClipboardCopy } from 'lucide-react'
import { fetchRawMatch, fetchRawPlayer } from '../services/salibandyApi'
import { buildMatchExport, buildPlayerExport, matchCsv, matchPrompt, playerCsv, playerPrompt } from '../utils/statsExport'

type Built = { json: string; csv: string; prompt: string; base: string }

async function build(kind: 'player' | 'match', id: string): Promise<Built | null> {
  const at = new Date().toISOString()
  if (kind === 'player') {
    const raw = await fetchRawPlayer(id)
    if (!raw) return null
    const x = buildPlayerExport(raw, at)
    return { json: JSON.stringify(x, null, 2), csv: playerCsv(x), prompt: playerPrompt(x), base: `pelaaja-${id}` }
  }
  const raw = await fetchRawMatch(id)
  if (!raw) return null
  const x = buildMatchExport(raw, at)
  return { json: JSON.stringify(x, null, 2), csv: matchCsv(x), prompt: matchPrompt(x), base: `ottelu-${id}` }
}

function save(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function StatsExport({ kind, id }: { kind: 'player' | 'match'; id: string }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [fallback, setFallback] = useState('')

  async function run(action: 'download' | 'prompt') {
    setBusy(true); setMsg(''); setFallback('')
    try {
      const b = await build(kind, id)
      if (!b) { setMsg('TASO ei palauttanut dataa.'); return }
      if (action === 'download') {
        save(`${b.base}.json`, b.json, 'application/json')
        save(`${b.base}.csv`, '\ufeff' + b.csv, 'text/csv;charset=utf-8')
        setMsg('Ladattu JSON + CSV.')
      } else {
        try { await navigator.clipboard.writeText(b.prompt); setMsg(`Kehote kopioitu (${b.prompt.length} merkkiä).`) }
        catch { setMsg('Kopioi alla oleva teksti.') }
        setFallback(b.prompt)
      }
    } finally { setBusy(false) }
  }

  const btn = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C2541] border border-slate-700/80 text-xs font-bold text-[#6FFFE9] disabled:opacity-50'
  return (
    <section data-testid="stats-export" className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="stats-download" disabled={busy} onClick={() => run('download')} className={btn}><Download className="w-3.5 h-3.5" /> Lataa tilastot</button>
        <button type="button" data-testid="stats-prompt" disabled={busy} onClick={() => run('prompt')} className={btn}><ClipboardCopy className="w-3.5 h-3.5" /> Kopioi analyysikehote</button>
      </div>
      {msg && <p data-testid="stats-export-msg" className="text-[11px] text-slate-400">{msg}</p>}
      {fallback && <textarea data-testid="stats-prompt-text" readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} className="w-full h-28 text-[10px] font-mono bg-[#0B132B] border border-slate-700 rounded-lg p-2 text-slate-300" />}
    </section>
  )
}
