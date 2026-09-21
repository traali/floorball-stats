export function IceMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <rect x="3.5" y="8" width="25" height="16" rx="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 8v16M3.5 16h25" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="16" cy="16" r="3.2" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  )
}
