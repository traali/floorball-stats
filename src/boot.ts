/** Runs before the router module is evaluated (first import in main.tsx). */
import { hashUrlForPath, type BuildInfo } from './utils/deepLink.ts'

export const BUILD_INFO: BuildInfo = {
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
  commit: typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev',
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
}

if (typeof window !== 'undefined') {
  window.__APP_BUILD_INFO__ = BUILD_INFO
  const target = hashUrlForPath(window.location.pathname, window.location.search, window.location.hash)
  if (target) window.history.replaceState(window.history.state, '', target)
}
