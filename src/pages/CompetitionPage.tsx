import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Layers } from 'lucide-react'
import { fetchSalibandyCategories } from '../services/salibandyApi'
import type { SalibandyCategory } from '../types/salibandy'

export function CompetitionPage() {
  const { compId = '' } = useParams()
  const navigate = useNavigate()
  const [cats, setCats] = useState<SalibandyCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!compId) return
    fetchSalibandyCategories(compId)
      .then(setCats)
      .finally(() => setLoading(false))
  }, [compId])

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <button type="button" onClick={() => navigate('/browse')} className="text-xs text-slate-400 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Alueet
      </button>
      <h1 className="text-2xl font-black">{cats[0]?.competitionName || compId}</h1>
      {loading ? (
        <div className="animate-pulse h-24 rounded-2xl bg-[#1C2541]" />
      ) : (
        <div className="space-y-2">
          {cats.map((c) => (
            <button
              key={c.categoryId}
              type="button"
              onClick={() => navigate(`/competition/${compId}/category/${c.categoryId}`)}
              className="w-full text-left rounded-xl border border-slate-800 bg-[#1C2541] p-4 flex items-center gap-3 hover:border-[#5BC0BE]/50"
            >
              <Layers className="w-4 h-4 text-[#5BC0BE]" />
              <div>
                <p className="text-sm font-semibold">{c.categoryName}</p>
                <p className="text-[11px] text-slate-400">
                  {c.teamCount ? `${c.teamCount} joukkuetta` : 'Avaa lohkot'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
