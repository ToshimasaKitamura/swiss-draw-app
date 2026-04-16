import type {
  Tournament, PlayerStats, PointSystem, TiebreakMethod, GameScore,
} from './types';

export const DEFAULT_POINTS: PointSystem = { win: 3, draw: 1, loss: 0, bye: 3 };
const MIN_MWP = 1 / 3;
const MIN_GWP = 1 / 3;

function getPoints(t: Tournament): PointSystem {
  return t.pointSystem ?? DEFAULT_POINTS;
}

// 試合のゲームスコアを取得。ゲームモードで未入力 or match モードなら result から仮想化。
function resolveGames(m: { result: unknown; games?: GameScore }, winPoints: number): GameScore {
  if (m.games) return m.games;
  // match モード互換: 勝ち=2-0, 引分=1-1, 負け=0-2(スコアモードの差を吸収)
  if (winPoints) {
    if (m.result === 'p1') return { p1Wins: 2, p2Wins: 0, draws: 0 };
    if (m.result === 'p2') return { p1Wins: 0, p2Wins: 2, draws: 0 };
    if (m.result === 'draw') return { p1Wins: 1, p2Wins: 1, draws: 1 };
  }
  return { p1Wins: 0, p2Wins: 0, draws: 0 };
}

export function computePlayerStats(t: Tournament): Record<string, PlayerStats> {
  const pts = getPoints(t);
  const stats: Record<string, PlayerStats> = {};
  for (const p of t.players) {
    stats[p.id] = {
      id: p.id, name: p.name, dropped: p.dropped,
      mp: 0, played: 0,
      wins: 0, losses: 0, draws: 0, byes: 0,
      opponents: [],
      omw: 0, gw: 0, ogw: 0,
      gamesPlayed: 0, gameWins: 0, gameDraws: 0, gameLosses: 0,
      sos: 0, buchholz: 0, medianBuchholz: 0, sonnebornBerger: 0,
    };
  }

  // ラウンドごとに集計
  for (const round of t.matches) {
    for (const m of round) {
      if (m.bye) {
        const s = stats[m.p1];
        if (!s) continue;
        s.mp += pts.bye;
        s.byes += 1;
        s.played += 1;
        // Byeはゲーム集計の分母に含めない(GW%が下がらないように)
        continue;
      }
      const s1 = stats[m.p1];
      const s2 = m.p2 ? stats[m.p2] : undefined;
      if (!s1 || !s2) continue;

      s1.opponents.push(m.p2 as string);
      s2.opponents.push(m.p1);

      if (m.result === 'p1') {
        s1.mp += pts.win; s1.wins += 1;
        s2.mp += pts.loss; s2.losses += 1;
      } else if (m.result === 'p2') {
        s2.mp += pts.win; s2.wins += 1;
        s1.mp += pts.loss; s1.losses += 1;
      } else if (m.result === 'draw') {
        s1.mp += pts.draw; s1.draws += 1;
        s2.mp += pts.draw; s2.draws += 1;
      } else {
        continue; // 未入力
      }
      s1.played += 1;
      s2.played += 1;

      // ゲーム集計(scoreMode='match' の場合は仮想化)
      const g = resolveGames(m, pts.win);
      const gamesTotal = g.p1Wins + g.p2Wins + g.draws;
      if (gamesTotal > 0) {
        s1.gamesPlayed += gamesTotal;
        s1.gameWins += g.p1Wins;
        s1.gameLosses += g.p2Wins;
        s1.gameDraws += g.draws;
        s2.gamesPlayed += gamesTotal;
        s2.gameWins += g.p2Wins;
        s2.gameLosses += g.p1Wins;
        s2.gameDraws += g.draws;
      }
    }
  }

  // Match-Win % / Game-Win %
  const mwp: Record<string, number> = {};
  const gwp: Record<string, number> = {};
  const winPts = pts.win;
  for (const id of Object.keys(stats)) {
    const s = stats[id];
    const matchPossible = s.played * winPts;
    const own = matchPossible > 0 ? s.mp / matchPossible : 0;
    mwp[id] = Math.max(own, MIN_MWP);
    const gt = s.gamesPlayed;
    const gwRatio = gt > 0 ? (s.gameWins + s.gameDraws * 0.5) / gt : 0;
    gwp[id] = Math.max(gwRatio, MIN_GWP);
  }

  // OMW% / OGW% / SoS / Buchholz / Median Buchholz / Sonneborn-Berger
  for (const id of Object.keys(stats)) {
    const s = stats[id];
    const opp = s.opponents;
    if (opp.length === 0) {
      s.omw = 0; s.ogw = 0; s.sos = 0; s.buchholz = 0;
      s.medianBuchholz = 0; s.sonnebornBerger = 0;
      s.gw = gwp[id];
      continue;
    }
    let omwSum = 0, ogwSum = 0;
    const oppScores: number[] = [];
    for (const oid of opp) {
      const o = stats[oid];
      omwSum += o ? mwp[oid] : MIN_MWP;
      ogwSum += o ? gwp[oid] : MIN_GWP;
      oppScores.push(o ? o.mp : 0);
    }
    s.omw = omwSum / opp.length;
    s.ogw = ogwSum / opp.length;
    s.gw = gwp[id];
    s.sos = oppScores.reduce((a, b) => a + b, 0);
    s.buchholz = s.sos;
    if (oppScores.length >= 3) {
      const sorted = [...oppScores].sort((a, b) => a - b);
      s.medianBuchholz = sorted.slice(1, -1).reduce((a, b) => a + b, 0);
    } else {
      s.medianBuchholz = s.sos;
    }
    // SB: 各対戦で (相手のMP × 自分のその対戦での結果係数)
    let sb = 0;
    let idx = 0;
    for (const round of t.matches) {
      for (const m of round) {
        if (m.bye) continue;
        if (m.p1 !== id && m.p2 !== id) continue;
        const isP1 = m.p1 === id;
        const oppId = isP1 ? (m.p2 as string) : m.p1;
        const oppMp = stats[oppId]?.mp ?? 0;
        let factor = 0;
        if (m.result === 'draw') factor = 0.5;
        else if (isP1 && m.result === 'p1') factor = 1;
        else if (!isP1 && m.result === 'p2') factor = 1;
        sb += oppMp * factor;
        idx++;
      }
    }
    s.sonnebornBerger = sb;
  }
  return stats;
}

export function headToHead(t: Tournament, aId: string, bId: string): number {
  for (const round of t.matches) {
    for (const m of round) {
      if (m.bye) continue;
      if (m.p1 === aId && m.p2 === bId) {
        if (m.result === 'p1') return -1;
        if (m.result === 'p2') return 1;
      }
      if (m.p1 === bId && m.p2 === aId) {
        if (m.result === 'p1') return 1;
        if (m.result === 'p2') return -1;
      }
    }
  }
  return 0;
}

type Ranker = (a: PlayerStats, b: PlayerStats) => number;

function byMethod(method: TiebreakMethod, t: Tournament): Ranker {
  switch (method) {
    case 'omw': return (a, b) => b.omw - a.omw;
    case 'gw': return (a, b) => b.gw - a.gw;
    case 'ogw': return (a, b) => b.ogw - a.ogw;
    case 'h2h': return (a, b) => headToHead(t, a.id, b.id);
    case 'sos':
    case 'buchholz': return (a, b) => b.buchholz - a.buchholz;
    case 'median-buchholz': return (a, b) => b.medianBuchholz - a.medianBuchholz;
    case 'sonneborn-berger': return (a, b) => b.sonnebornBerger - a.sonnebornBerger;
  }
}

function tiebreakOrderOf(t: Tournament): TiebreakMethod[] {
  return t.tiebreakOrder && t.tiebreakOrder.length > 0
    ? t.tiebreakOrder
    : (t.tiebreak === 'points' ? [] : t.tiebreak === 'h2h' ? ['h2h', 'omw'] : ['omw']);
}

export function areEffectivelyTied(
  t: Tournament, a: PlayerStats, b: PlayerStats,
): boolean {
  if (a.mp !== b.mp) return false;
  const order = tiebreakOrderOf(t);
  for (const m of order) {
    const cmp = byMethod(m, t)(a, b);
    if (cmp !== 0) return false;
  }
  return true;
}

export function sortedStandings(t: Tournament): PlayerStats[] {
  const stats = computePlayerStats(t);
  const arr = Object.values(stats);
  const order = tiebreakOrderOf(t);
  arr.sort((a, b) => {
    if (b.mp !== a.mp) return b.mp - a.mp;
    for (const m of order) {
      const cmp = byMethod(m, t)(a, b);
      if (cmp !== 0) return cmp;
    }
    return a.name.localeCompare(b.name, 'ja');
  });
  return arr;
}

export function recommendedRounds(n: number): number | null {
  if (n <= 1) return null;
  if (n <= 4) return 2;
  if (n <= 8) return 3;
  if (n <= 16) return 4;
  if (n <= 32) return 5;
  if (n <= 64) return 6;
  if (n <= 128) return 7;
  return 8;
}
