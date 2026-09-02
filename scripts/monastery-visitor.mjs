import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const AGENTS_MD_PATH = path.join(ROOT, 'AGENTS.md')

console.log('🏛️  [MONASTERY] Initiating Pre-Visitation Protocol for floorball-stats...\n')

// 1. Check AGENTS.md exists and is within word count cap
if (!fs.existsSync(AGENTS_MD_PATH)) {
  console.error('❌ [FATAL] AGENTS.md not found at project root.')
  process.exit(1)
}

const ruleText = fs.readFileSync(AGENTS_MD_PATH, 'utf-8')
const wordCount = ruleText.trim().split(/\s+/).length
console.log(`📜 The Rule: AGENTS.md (${wordCount} words / 1500 cap)`)
if (wordCount > 1500) {
  console.error(`❌ [RULE VIOLATION] AGENTS.md exceeds 1,500 word cap (${wordCount} words).`)
  process.exit(1)
}

// 2. Check Lint
try {
  console.log('🔍 Running static lint check (eslint)...')
  execSync('npm run lint', { stdio: 'inherit', cwd: ROOT })
  console.log('✅ Lint check passed (0 errors).\n')
} catch {
  console.error('❌ [BLOCKER] Lint failed.')
  process.exit(1)
}

// 3. Check Build
try {
  console.log('📦 Running build check (tsc & vite build)...')
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT })
  console.log('✅ Production build passed.\n')
} catch {
  console.error('❌ [BLOCKER] Build failed. Fix build errors before requesting visitation.')
  process.exit(1)
}

// 4. Check Contracts
const contractsScript = path.resolve(ROOT, '..', 'contracts', 'verify-contracts.mjs')
if (fs.existsSync(contractsScript)) {
  try {
    console.log('🔗 Running cross-repo contract verification...')
    execSync(`node "${contractsScript}" floorball-stats`, { stdio: 'inherit', cwd: ROOT })
    console.log('✅ Cross-repo contracts verified (100% compatible).\n')
  } catch {
    console.error('❌ [BLOCKER] Contract verification failed.')
    process.exit(1)
  }
}

console.log('================================================================')
console.log('✨ [MONASTERY] Pre-conditions met! Ready for Clean-Room Visitor.')
console.log('================================================================')
