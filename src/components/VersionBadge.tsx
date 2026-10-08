import { formatVersionBadge } from '../utils/deepLink.ts'
import { BUILD_INFO } from '../boot'

/** Build badge the Hakemisto gate looks for (data-testid="app-version-badge"). */
export function VersionBadge({ className = '' }: { className?: string }) {
  const info = (typeof window !== 'undefined' && window.__APP_BUILD_INFO__) || BUILD_INFO
  return (
    <span
      data-testid="app-version-badge"
      title={`Build ${info.buildTime}`}
      className={`inline-block px-1.5 py-px rounded-md bg-[#0B132B] border border-slate-700 font-mono text-[9px] leading-tight text-teal-400 ${className}`}
    >
      {formatVersionBadge(info)}
    </span>
  )
}
