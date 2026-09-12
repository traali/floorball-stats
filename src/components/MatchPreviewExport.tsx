import React, { useMemo, useState } from 'react'
import { Share2, Check, Copy, Download } from 'lucide-react'
import type {
  SalibandyMatchDetail,
  SalibandyPlayerLeader,
  SalibandyRosterPlayer,
  SalibandyStandingRow,
} from '../types/salibandy'
import { buildFloorballPreviewMd } from '../utils/buildFloorballPreviewMd'

interface MatchPreviewExportProps {
  match: SalibandyMatchDetail
  leaders: SalibandyPlayerLeader[]
  standings?: SalibandyStandingRow[]
  homeRoster?: SalibandyRosterPlayer[]
  awayRoster?: SalibandyRosterPlayer[]
}

export const MatchPreviewExport: React.FC<MatchPreviewExportProps> = ({
  match,
  leaders,
  standings = [],
  homeRoster = [],
  awayRoster = [],
}) => {
  const [copied, setCopied] = useState(false)
  const md = useMemo(
    () => buildFloorballPreviewMd({ match, leaders, standings, homeRoster, awayRoster }),
    [match, leaders, standings, homeRoster, awayRoster],
  )

  const copy = async () => {
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `${match.date}_${match.homeTeamName}_vs_${match.awayTeamName}.md`.replace(/\s+/g, '_')
    el.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#5BC0BE]" />
          AI-ennakko (.md kuten jalkapallo)
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3A506B] text-xs font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Kopioitu' : 'Kopioi markdown'}
          </button>
          <button
            type="button"
            onClick={download}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5BC0BE] text-[#0B132B] text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" /> Lataa .md
          </button>
        </div>
      </div>
      <pre className="bg-[#0B132B] p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-[28rem]">
        {md}
      </pre>
    </div>
  )
}
