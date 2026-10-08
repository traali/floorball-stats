/**
 * The app routes with a hash router (/#/match/123) because Pelipäivä links that
 * way. A path link (/match/123) gets index.html from Cloudflare Pages' SPA
 * fallback; this turns it into the hash URL before the router starts, without
 * a reload.
 */
export function hashUrlForPath(pathname: string, search: string, hash: string): string | null {
  if (hash && hash !== '#') return null
  const path = pathname.replace(/\/index\.html$/, '/')
  if (path === '/' || path === '') return null
  return `/#${path}${search || ''}`
}

export interface BuildInfo {
  version: string
  commit: string
  buildTime: string
}

/** Same text as the football-stats badge: «v1.0.0 (git:abc1234)». */
export function formatVersionBadge(info: Pick<BuildInfo, 'version' | 'commit'> | undefined): string {
  return `v${info?.version || '1.0.0'} (git:${info?.commit || 'dev'})`
}
