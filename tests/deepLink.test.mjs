import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { formatVersionBadge, hashUrlForPath } from '../src/utils/deepLink.ts'

describe('path deep links become hash routes', () => {
  it('turns /match/<id> into /#/match/<id>', () => {
    assert.equal(hashUrlForPath('/match/6055', '', ''), '/#/match/6055')
    assert.equal(hashUrlForPath('/team/25301', '?embed=true', ''), '/#/team/25301?embed=true')
    assert.equal(hashUrlForPath('/competition/sb2026/category/366', '', '#'), '/#/competition/sb2026/category/366')
  })

  it('leaves the root and existing hash routes alone', () => {
    assert.equal(hashUrlForPath('/', '', ''), null)
    assert.equal(hashUrlForPath('/index.html', '', ''), null)
    assert.equal(hashUrlForPath('/', '', '#/match/6055'), null)
    assert.equal(hashUrlForPath('/match/6055', '', '#/match/6055'), null)
  })
})

describe('version badge', () => {
  it('uses the football-stats format', () => {
    assert.equal(formatVersionBadge({ version: '1.0.0', commit: 'abc1234' }), 'v1.0.0 (git:abc1234)')
    assert.equal(formatVersionBadge(undefined), 'v1.0.0 (git:dev)')
  })

  it('is rendered in the header (every route) and in embed mode', () => {
    const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8')
    const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
    const badge = readFileSync(new URL('../src/components/VersionBadge.tsx', import.meta.url), 'utf8')
    assert.match(badge, /data-testid="app-version-badge"/)
    assert.match(badge, /__APP_BUILD_INFO__/)
    assert.match(header, /<VersionBadge/)
    assert.match(layout, /isEmbed && \(\s*<div[^>]*>\s*<VersionBadge/)
  })
})

describe('Cloudflare Pages SPA fallback', () => {
  it('ships no 404.html (it would turn /match/<id> into an HTTP 404)', () => {
    assert.equal(existsSync(new URL('../public/404.html', import.meta.url)), false)
  })

  it('builds with absolute asset URLs so /match/<id> can load them', () => {
    const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
    assert.match(vite, /base:\s*'\/'/)
  })

  it('boot runs before the router module', () => {
    const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
    assert.match(main.split('\n')[0], /^import '\.\/boot'/)
  })
})
