import React, { useState } from 'react'
import type { SalibandyMatchDetail, SalibandyPlayerLeader } from '../types/salibandy'
import { Share2, Check, Copy } from 'lucide-react'

interface MatchPreviewExportProps {
  match: SalibandyMatchDetail
  leaders: SalibandyPlayerLeader[]
}

export const MatchPreviewExport: React.FC<MatchPreviewExportProps> = ({ match, leaders }) => {
  const [copied, setCopied] = useState(false)

  const generateMarkdown = () => {
    const periodStr = match.periods.map(p => `${p.period}. erä ${p.scoreHome}–${p.scoreAway}`).join(', ')
    const topScorersStr = leaders
      .slice(0, 5)
      .map(p => `• ${p.playerName} (${p.teamName}): ${p.goals}+${p.assists}=${p.points}p`)
      .join('\n')

    return `🏑 *OTTELURAPORTTI (Salibandy Torneopal)*
━━━━━━━━━━━━━━━━━━━━
🏆 *${match.competitionName}* (${match.categoryName})
🆚 *${match.homeTeamName}* ${match.scoreHome} – ${match.scoreAway} *${match.awayTeamName}*
📊 *Erät:* ${periodStr}
📍 *Pelipaikka:* ${match.venueName} (${match.date} klo ${match.time})
👥 *Katsojat:* ${match.spectators || '30'} | 👮‍♂️ *Tuomarit:* ${match.referee1 || 'Tuomari 1'}, ${match.referee2 || 'Tuomari 2'}

⭐ *PISTEPÖRSSI (TOP 5):*
${topScorersStr}

🧤 *MAALIVAHDIT:*
• ${match.homeTeamName}: ${goalkeepersSummary(match.goalkeepers.home)}
• ${match.awayTeamName}: ${goalkeepersSummary(match.goalkeepers.away)}
━━━━━━━━━━━━━━━━━━━━
🔗 https://floorball-stats.pages.dev/match/${match.matchId}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMarkdown())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="bg-[#1C2541] rounded-2xl p-5 border border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/50">
        <h3 className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#5BC0BE]" />
          Jaa Otteluraportti (WhatsApp / Markdown)
        </h3>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3A506B] hover:bg-[#5BC0BE] hover:text-[#0B132B] transition-all text-xs font-semibold text-slate-100"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>Kopioitu!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Kopioi WhatsAppiin</span>
            </>
          )}
        </button>
      </div>

      <pre className="bg-[#0B132B] p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
        {generateMarkdown()}
      </pre>
    </div>
  )
}

function goalkeepersSummary(g: { goalieName: string; saves: number; goalsConceded: number; savePercentage: string }) {
  return `${g.goalieName} (${g.saves} torjuntaa, T% ${g.savePercentage})`
}
