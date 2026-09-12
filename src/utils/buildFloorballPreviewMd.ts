import type {
  SalibandyMatchDetail,
  SalibandyPlayerLeader,
  SalibandyRosterPlayer,
  SalibandyStandingRow,
} from '../types/salibandy'

function table(rows: SalibandyStandingRow[]): string {
  if (!rows.length) return '_ei taulukkoa_'
  return [
    '```',
    ...rows.map(
      (r) =>
        `${r.rank}. ${r.teamName}  ${r.matchesPlayed}ott ${r.wins}V ${r.draws}T ${r.losses}H  ${r.goalsFor}–${r.goalsAgainst}  ${r.totalPoints}p`,
    ),
    '```',
  ].join('\n')
}

function rosterBlock(name: string, roster: SalibandyRosterPlayer[]): string {
  if (!roster.length) return `### ${name}\n_ei kokoonpanoa_`
  const lines = [...roster]
    .sort((a, b) => b.points - a.points || b.goals - a.goals)
    .map((p) => {
      const cap = p.isCaptain ? ' C' : ''
      const shirt = p.shirtNumber ? `#${p.shirtNumber}` : ''
      const rm = p.penaltiesMin ? ` · ${p.penaltiesMin} RM` : ''
      return `- **${p.fullName}**${cap} ${shirt} · ${p.goals}+${p.assists}=${p.points}p${rm}${p.birthYear ? ` · s. ${p.birthYear}` : ''}`
    })
  return [`### ${name}`, ...lines].join('\n')
}

function eventsBlock(match: SalibandyMatchDetail): string {
  if (match.phase === 'upcoming') return '_tuleva ottelu — ei tapahtumia_'
  const goals = match.goals.length
    ? match.goals
        .map((g) => {
          const extra = [
            g.isPowerplayGoal ? 'YV' : '',
            g.isShorthandedGoal ? 'AV' : '',
            g.isEmptyNetGoal ? 'TM' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return `- ${g.time} e${g.period} ${g.team === 'home' ? match.homeTeamName : match.awayTeamName}: ${g.scorerName}${g.assistName ? ` (${g.assistName})` : ''} ${g.scoreHome}–${g.scoreAway}${extra ? ` ${extra}` : ''}`
        })
        .join('\n')
    : '_ei maaleja_'
  const pens = match.penalties.length
    ? match.penalties
        .map(
          (p) =>
            `- ${p.time} e${p.period} ${p.team === 'home' ? match.homeTeamName : match.awayTeamName}: ${p.playerName} ${p.code} ${p.reasonText || ''}`,
        )
        .join('\n')
    : '_ei jäähyjä_'
  return ['### Maalit', goals, '', '### Jäähyt', pens].join('\n')
}

function analysisPrompt(match: SalibandyMatchDetail): string {
  const upcoming = match.phase === 'upcoming'
  return [
    '## Prompt tekoälylle',
    '',
    'Kopioi tämä osio + yllä oleva data malliin. Vastaa suomeksi, valmentajalle, juniori salibandy.',
    '',
    '```',
    'Olet juniorisalibandyn otteluanalyytikko. Käytä VAIN tämän dokumentin lukuja. Älä keksi pelaajia, aikoja, YV/AV% tai torjuntaprosentteja. Jos tieto puuttuu, sano "ei datassa". Ei xG, ei GPS, ei shift-tracking.',
    '',
    `Ottelu: ${match.homeTeamName} vs ${match.awayTeamName}, ${match.date}${match.time ? ` ${match.time}` : ''}. Vaihe: ${match.phase}.`,
    '',
    'Tee tämä rakenne:',
    upcoming
      ? '1. Ennakko (5–8 riviä): tasoero taulukosta, pörssipisteet, maalivahdit jos dataa.'
      : '1. Lyhyt eräanalyysi: 1./2./3. erä, milloin peli kääntyi.',
    '2. Avainpelaajat: G+A=P, RM. Maalivahdit: torjunnat ja T% vain jos dokumentissa.',
    '3. Erikoistilanteet: YV/AV maalit ja jäähyt — älä laske % jos jäähyjen lkm puuttuu.',
    '4. Ennuste: todennäköisin tuloshaarukka. 3 skenaariota: koti, tasapeli, vieras.',
    '5. Valmentajan 4 tekoa: avauserä, erätauko, ylivoima, jos peli aukeaa.',
    '',
    'Sävy: asiallinen, ei hypeä. Juniorit. Salibandy 3×erää, ei jalkapallon keltaisia.',
    '```',
  ].join('\n')
}

export function buildFloorballPreviewMd(opts: {
  match: SalibandyMatchDetail
  leaders: SalibandyPlayerLeader[]
  standings?: SalibandyStandingRow[]
  homeRoster?: SalibandyRosterPlayer[]
  awayRoster?: SalibandyRosterPlayer[]
}): string {
  const m = opts.match
  const score =
    m.phase === 'upcoming' ? 'vs' : `${m.scoreHome}–${m.scoreAway}`
  const periods = m.periods.map((p) => `${p.period}. erä ${p.scoreHome}–${p.scoreAway}`).join(', ')
  const leaders = opts.leaders.length
    ? opts.leaders
        .slice(0, 8)
        .map((p) => `- ${p.playerName} (${p.teamName}) ${p.goals}+${p.assists}=${p.points}p${p.penaltiesMin ? ` · ${p.penaltiesMin} RM` : ''}`)
        .join('\n')
    : '_ei pörssiä_'

  const gkH = m.goalkeepers.home
  const gkA = m.goalkeepers.away

  return [
    `# ${m.homeTeamName} vs ${m.awayTeamName}`,
    '',
    `${m.date}${m.time ? ` ${m.time}` : ''} · ${m.venueName || ''}`,
    `${m.competitionName} · ${m.categoryName}`,
    m.phase === 'upcoming' ? 'Vaihe: ennakko (tuleva ottelu)' : `Tulos: ${score}`,
    periods ? `Erät: ${periods}` : '',
    '',
    '## Sarjataulukko',
    table(opts.standings || []),
    '',
    '## Pistepörssi',
    leaders,
    '',
    '## Maalivahdit',
    `- ${m.homeTeamName}: ${gkH.goalieName} · ${gkH.saves} torj · päästetyt ${gkH.goalsConceded} · T% ${gkH.savePercentage}`,
    `- ${m.awayTeamName}: ${gkA.goalieName} · ${gkA.saves} torj · päästetyt ${gkA.goalsConceded} · T% ${gkA.savePercentage}`,
    '',
    '## Kokoonpanot (kausi G+A)',
    rosterBlock(m.homeTeamName, opts.homeRoster || []),
    '',
    rosterBlock(m.awayTeamName, opts.awayRoster || []),
    '',
    '## Ottelun tapahtumat',
    eventsBlock(m),
    '',
    analysisPrompt(m),
    '',
    `_Luotu floorball-stats, ottelu ${m.matchId}_`,
  ]
    .filter((line) => line !== '')
    .join('\n')
}
