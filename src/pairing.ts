import type { Tournament, Match, Player } from './types';
import { computePlayerStats } from './scoring';
import { uid } from './dom';

export function hasPlayed(t: Tournament, p1: string, p2: string): boolean {
  for (const round of t.matches) {
    for (const m of round) {
      if (m.bye) continue;
      if ((m.p1 === p1 && m.p2 === p2) || (m.p1 === p2 && m.p2 === p1)) return true;
    }
  }
  return false;
}

export function hasHadBye(t: Tournament, pid: string): boolean {
  for (const round of t.matches) {
    for (const m of round) {
      if (m.bye && m.p1 === pid) return true;
    }
  }
  return false;
}

interface ActivePlayer extends Player {
  mp: number;
}

export function generatePairings(t: Tournament): Match[] {
  const stats = computePlayerStats(t);
  const active: ActivePlayer[] = t.players
    .filter((p) => !p.dropped)
    .map((p) => ({ ...p, mp: stats[p.id]?.mp ?? 0 }));

  // ラウンド1の初期並び
  if (t.currentRound === 0) {
    const mode = t.firstRoundPairing ?? 'random';
    if (mode === 'seed') {
      active.sort((a, b) => {
        const sa = a.seed ?? Number.POSITIVE_INFINITY;
        const sb = b.seed ?? Number.POSITIVE_INFINITY;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, 'ja');
      });
    } else {
      // random
      for (let i = active.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [active[i], active[j]] = [active[j], active[i]];
      }
    }
  } else {
    active.sort((a, b) => b.mp - a.mp);
  }

  // Bye処理
  let byePlayer: ActivePlayer | null = null;
  if (active.length % 2 === 1) {
    const rule = t.byeRule ?? 'lowest';
    const limitOne = (t.byeLimit ?? 'one') === 'one';
    const eligible = limitOne ? active.filter((p) => !hasHadBye(t, p.id)) : active;
    const pool = eligible.length > 0 ? eligible : active;
    if (rule === 'random') {
      byePlayer = pool[Math.floor(Math.random() * pool.length)];
    } else {
      const sorted = [...pool].sort((a, b) => a.mp - b.mp);
      byePlayer = sorted[0];
    }
    const idx = active.findIndex((p) => p.id === (byePlayer as ActivePlayer).id);
    active.splice(idx, 1);
  }

  const pairs = pairPlayers(active, t);
  const roundMatches: Match[] = pairs.map(([a, b]) => ({
    id: uid(), p1: a.id, p2: b.id, result: null, bye: false,
  }));
  if (byePlayer) {
    roundMatches.push({ id: uid(), p1: byePlayer.id, p2: null, result: 'bye', bye: true });
  }
  return roundMatches;
}

function pairPlayers(players: ActivePlayer[], t: Tournament): [ActivePlayer, ActivePlayer][] {
  const n = players.length;
  if (n === 0) return [];
  const policy = t.rematchPolicy ?? 'avoid-if-possible';
  const matched = new Array<boolean>(n).fill(false);
  const result: [ActivePlayer, ActivePlayer][] = [];

  function backtrack(): boolean {
    const i = matched.indexOf(false);
    if (i === -1) return true;
    matched[i] = true;
    const candidates: { j: number; played: boolean; diff: number }[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i || matched[j]) continue;
      const played = hasPlayed(t, players[i].id, players[j].id);
      if (policy === 'strict' && played) continue;
      const diff = Math.abs(players[i].mp - players[j].mp);
      candidates.push({ j, played, diff });
    }
    if (policy === 'free') {
      candidates.sort((a, b) => a.diff - b.diff);
    } else {
      // 'avoid-if-possible' と 'strict' は同じ比較(strict では played 候補は既に除外済み)
      candidates.sort((a, b) => {
        if (a.played !== b.played) return a.played ? 1 : -1;
        return a.diff - b.diff;
      });
    }
    for (const c of candidates) {
      matched[c.j] = true;
      result.push([players[i], players[c.j]]);
      if (backtrack()) return true;
      result.pop();
      matched[c.j] = false;
    }
    matched[i] = false;
    return false;
  }

  backtrack();
  return result;
}
