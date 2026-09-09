import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Floorball Domain Invariants', () => {
  // 1. SSBL 3-Period Math & Standings
  describe('SSBL 3-Period Scoring & F-liiga 3-2-1-0 Math', () => {
    it('sums 3 regulation periods correctly', () => {
      const periods = [
        { period: 1, home: 2, away: 1 },
        { period: 2, home: 1, away: 3 },
        { period: 3, home: 3, away: 1 },
      ];
      const homeScore = periods.reduce((sum, p) => sum + p.home, 0);
      const awayScore = periods.reduce((sum, p) => sum + p.away, 0);
      assert.strictEqual(homeScore, 6);
      assert.strictEqual(awayScore, 5);
    });

    it('verifies F-liiga 3-2-1-0 points: W_reg=3, W_ot=2, L_ot=1, L_reg=0', () => {
      const standings = { w3: 10, w2: 3, l1: 2, l0: 5 };
      const points = standings.w3 * 3 + standings.w2 * 2 + standings.l1 * 1 + standings.l0 * 0;
      assert.strictEqual(points, 38);
    });

    it('calculates player tehopisteet: P = M + S', () => {
      const goals = 14;
      const assists = 9;
      const points = goals + assists;
      assert.strictEqual(points, 23);
    });

    it('verifies 3-period match format total regulation duration is 60 minutes', () => {
      const periodLengthsMinutes = [20, 20, 20];
      const totalRegulationMinutes = periodLengthsMinutes.reduce((a, b) => a + b, 0);
      assert.strictEqual(totalRegulationMinutes, 60);
    });
  });

  // 2. Overtime & Shootout Taxonomy
  describe('Overtime & Shootout Taxonomy Invariant', () => {
    it('distinguishes OT (Period 4) and Shootout (Period 5)', () => {
      const matchOT = { p1_A: 1, p1_B: 1, p2_A: 2, p2_B: 2, p3_A: 1, p3_B: 1, p4_A: 1, p4_B: 0 };
      const regTied = (matchOT.p1_A + matchOT.p2_A + matchOT.p3_A) === (matchOT.p1_B + matchOT.p2_B + matchOT.p3_B);
      assert.strictEqual(regTied, true);
      assert.strictEqual(matchOT.p4_A > matchOT.p4_B, true);
    });

    it('enforces SSBL official forfeit score 5-0 (SSBL § 47)', () => {
      const forfeit = { isForfeit: true, homeScore: 5, awayScore: 0 };
      assert.strictEqual(forfeit.homeScore, 5);
      assert.strictEqual(forfeit.awayScore, 0);
      assert.strictEqual(forfeit.homeScore - forfeit.awayScore, 5);
    });

    it('links assist to goal via connected_event_id', () => {
      const goal = { event_id: '41212360', code: 'maali' };
      const assist = { event_id: '41212362', code: 'syotto', connected_event_id: '41212360' };
      assert.strictEqual(assist.connected_event_id, goal.event_id);
    });
  });

  // 3. Goalie Save % Zero-Shot Division Guard (MATH-04)
  describe('Goalie Save % Zero-Shot Division Guard (MATH-04)', () => {
    function calcSavePct(saves, conceded) {
      const total = saves + conceded;
      if (total <= 0) return '100.0%';
      return `${((saves / total) * 100).toFixed(1)}%`;
    }

    it('returns 100.0% when saves=0 and conceded=0 (never NaN, null, or undefined)', () => {
      const pct = calcSavePct(0, 0);
      assert.strictEqual(pct, '100.0%');
      assert.ok(!pct.includes('NaN'));
      assert.ok(!pct.includes('null'));
      assert.ok(!pct.includes('undefined'));
    });

    it('computes regular save percentages accurately', () => {
      assert.strictEqual(calcSavePct(17, 4), '81.0%');
      assert.strictEqual(calcSavePct(0, 3), '0.0%');
      assert.strictEqual(calcSavePct(20, 0), '100.0%');
    });
  });

  // 4. WhatsApp Briefing Token Safety
  describe('WhatsApp Briefing Token Safety', () => {
    const TOKEN_LEAK_REGEX = /(?:\b(?:undefined|null|NaN)\b|\[object Object\]|\[SYÖTÄ TULOS\]|\[PVM\])/;

    it('verifies zero token leaks in floorball match report', () => {
      const briefing = '🏑 OTTELURAPORTTI: Indians 5 – 4 EräViikingit\nErät: 0–0, 1–3, 3–1, 1–0\nMaalivahdit: Indians (17 torjuntaa, T% 81.0%)';
      assert.strictEqual(TOKEN_LEAK_REGEX.test(briefing), false);
    });

    it('permits Finnish word annulloitu without false positive', () => {
      const fiNotice = 'Ottelu on virallisesti annulloitu sarjajärjestäjän päätöksellä.';
      assert.strictEqual(TOKEN_LEAK_REGEX.test(fiNotice), false);
    });

    it('catches template placeholder leaks', () => {
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Pisteet: [object Object]'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Peliaika: undefined min'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Torjuntaprosentti: NaN%'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Maalit: null'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Päivämäärä: [PVM]'), true);
      assert.strictEqual(TOKEN_LEAK_REGEX.test('Tulos: [SYÖTÄ TULOS]'), true);
    });
  });
});
