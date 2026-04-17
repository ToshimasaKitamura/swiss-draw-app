import type {
  AppState, Tournament, Tiebreak, ByeRule,
  ScoreMode, TiebreakProfile, TiebreakMethod,
  RematchPolicy, FirstRoundPairing, ByeLimit,
  PointSystem, DropBehavior,
} from './types';
import { uid, fmtDate } from './dom';
import { generatePairings } from './pairing';
import { render } from './render';
import { DEFAULT_POINTS } from './scoring';
import { TIEBREAK_PROFILE_DEFAULT_ORDERS } from './strings';

const STORAGE_KEY = 'swissDrawTournaments_v1';
const CURRENT_KEY = 'swissDrawCurrent_v1';

export const state: AppState = {
  tournaments: [],
  currentId: null,
  view: 'list',
  tab: 'current',
};

function migrateTournament(t: Tournament): Tournament {
  if (!t.tiebreak) t.tiebreak = 'omw';
  if (!t.byeRule) t.byeRule = 'lowest';
  if (!t.scoreMode) t.scoreMode = 'match';
  if (!t.pointSystem) t.pointSystem = { ...DEFAULT_POINTS };
  if (!t.tiebreakProfile) {
    t.tiebreakProfile = t.tiebreak === 'points'
      ? 'simple'
      : t.tiebreak === 'h2h'
        ? 'h2h-first'
        : 'mtg-standard';
  }
  if (!t.tiebreakOrder) {
    t.tiebreakOrder = [...TIEBREAK_PROFILE_DEFAULT_ORDERS[t.tiebreakProfile]];
  }
  if (!t.byeLimit) t.byeLimit = 'one';
  if (!t.dropBehavior) t.dropBehavior = { retainResults: true, canRejoin: true };
  if (!t.rematchPolicy) t.rematchPolicy = 'avoid-if-possible';
  if (!t.firstRoundPairing) t.firstRoundPairing = 'random';
  return t;
}

export function load(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.tournaments = raw ? (JSON.parse(raw) as Tournament[]) : [];
  } catch (e) {
    console.error('読み込み失敗:', e);
    state.tournaments = [];
  }
  state.tournaments.forEach(migrateTournament);
  state.currentId = localStorage.getItem(CURRENT_KEY);
}

export function save(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tournaments));
  if (state.currentId) localStorage.setItem(CURRENT_KEY, state.currentId);
  else localStorage.removeItem(CURRENT_KEY);
}

export function currentTournament(): Tournament | null {
  return state.tournaments.find((t) => t.id === state.currentId) ?? null;
}

// ===== CRUD =====

interface CreateOptions {
  name: string;
  rounds: number;
  playerNames: string[];
  tiebreak: Tiebreak;
  byeRule: ByeRule;
  scoreMode: ScoreMode;
  pointSystem: PointSystem;
  tiebreakProfile: TiebreakProfile;
  tiebreakOrder: TiebreakMethod[];
  byeLimit: ByeLimit;
  dropBehavior: DropBehavior;
  rematchPolicy: RematchPolicy;
  firstRoundPairing: FirstRoundPairing;
}

export function createTournament(opts: CreateOptions): void {
  const active = opts.playerNames.filter(Boolean);
  const players = active.map((n, i) => ({
    id: uid(), name: n, dropped: false,
    seed: opts.firstRoundPairing === 'seed' ? i + 1 : undefined,
  }));
  const t: Tournament = {
    id: uid(),
    name: (opts.name || '').trim() || '無題の大会',
    rounds: Math.max(1, Math.min(20, opts.rounds | 0)),
    currentRound: 0,
    phase: 'inProgress',
    players,
    matches: [],
    byes: {},
    createdAt: Date.now(),
    tiebreak: opts.tiebreak,
    byeRule: opts.byeRule,
    scoreMode: opts.scoreMode,
    pointSystem: opts.pointSystem,
    tiebreakProfile: opts.tiebreakProfile,
    tiebreakOrder: opts.tiebreakOrder,
    byeLimit: opts.byeLimit,
    dropBehavior: opts.dropBehavior,
    rematchPolicy: opts.rematchPolicy,
    firstRoundPairing: opts.firstRoundPairing,
  };
  const firstRound = generatePairings(t);
  t.matches.push(firstRound);
  t.currentRound = 1;

  state.tournaments.unshift(t);
  state.currentId = t.id;
  state.view = 'tournament';
  state.tab = 'current';
  save();
  render();
}

export function deleteTournament(id: string): void {
  if (!confirm('この大会を削除します。よろしいですか?')) return;
  state.tournaments = state.tournaments.filter((t) => t.id !== id);
  if (state.currentId === id) state.currentId = null;
  if (state.view === 'tournament') state.view = 'list';
  save();
  render();
}

export function renameTournament(id: string, newName: string): void {
  const t = state.tournaments.find((x) => x.id === id);
  if (!t) return;
  const n = (newName || '').trim();
  if (!n) { alert('大会名を入力してください。'); return; }
  t.name = n;
  save();
  render();
}

export function openTournament(id: string): void {
  state.currentId = id;
  const t = state.tournaments.find((x) => x.id === id);
  state.view = 'tournament';
  state.tab = t && t.phase === 'finished' ? 'standings' : 'current';
  save();
  render();
}

export function toggleDrop(playerId: string): void {
  const t = currentTournament();
  if (!t) return;
  const p = t.players.find((x) => x.id === playerId);
  if (!p) return;
  // 復帰禁止設定を尊重
  if (p.dropped && !(t.dropBehavior?.canRejoin ?? true)) {
    alert('この大会は「Drop後の復帰」を許可していません。');
    return;
  }
  p.dropped = !p.dropped;
  save();
  render();
}

export function setResult(matchId: string, result: 'p1' | 'p2' | 'draw'): void {
  const t = currentTournament();
  if (!t) return;
  const round = t.matches[t.currentRound - 1];
  if (!round) return;
  const m = round.find((x) => x.id === matchId);
  if (!m || m.bye) return;
  m.result = result;
  // ゲームモードでない場合は games を仮想化しておく(後から切り替えたときに破綻しないように)
  if (t.scoreMode === 'match' && !m.games) {
    if (result === 'p1') m.games = { p1Wins: 2, p2Wins: 0, draws: 0 };
    else if (result === 'p2') m.games = { p1Wins: 0, p2Wins: 2, draws: 0 };
    else m.games = { p1Wins: 1, p2Wins: 1, draws: 1 };
  }
  save();
  render();
}

export function setGameScore(matchId: string, p1Wins: number, p2Wins: number, draws: number): void {
  const t = currentTournament();
  if (!t) return;
  const round = t.matches[t.currentRound - 1];
  if (!round) return;
  const m = round.find((x) => x.id === matchId);
  if (!m || m.bye) return;
  m.games = { p1Wins, p2Wins, draws };
  if (p1Wins > p2Wins) m.result = 'p1';
  else if (p2Wins > p1Wins) m.result = 'p2';
  else m.result = 'draw';
  save();
  render();
}

export function allRoundResultsEntered(t: Tournament): boolean {
  const round = t.matches[t.currentRound - 1];
  if (!round) return false;
  return round.every((m) => m.result != null);
}

export function finishRound(): void {
  const t = currentTournament();
  if (!t) return;
  if (!allRoundResultsEntered(t)) {
    alert('すべての試合結果を入力してください。');
    return;
  }
  if (t.currentRound >= t.rounds) {
    t.phase = 'finished';
    state.tab = 'standings';
    save();
    render();
    return;
  }
  const matches = generatePairings(t);
  t.matches.push(matches);
  t.currentRound += 1;
  save();
  render();
}

export function extendByOneRound(): void {
  const t = currentTournament();
  if (!t || t.phase !== 'inProgress') return;
  if (!allRoundResultsEntered(t)) {
    alert('すべての試合結果を入力してください。');
    return;
  }
  t.rounds += 1;
  const matches = generatePairings(t);
  t.matches.push(matches);
  t.currentRound += 1;
  save();
  render();
}

export function endTournamentEarly(): void {
  const t = currentTournament();
  if (!t || t.phase !== 'inProgress') return;
  const note = allRoundResultsEntered(t)
    ? ''
    : '\n※ 未入力の試合があります。それらは集計されません。';
  if (!confirm(`大会をここで終了します。よろしいですか?${note}`)) return;
  t.phase = 'finished';
  state.tab = 'standings';
  save();
  render();
}

export function regeneratePairings(): void {
  const t = currentTournament();
  if (!t || t.phase !== 'inProgress') return;
  const round = t.matches[t.currentRound - 1];
  if (round && round.some((m) => m.result != null && !m.bye)) {
    if (!confirm('結果が入力済みの試合があります。このラウンドのペアリングを作り直しますか?')) return;
  }
  t.matches[t.currentRound - 1] = generatePairings(t);
  save();
  render();
}

export function startLegacyTournament(): void {
  const t = currentTournament();
  if (!t) return;
  if (t.players.filter((p) => !p.dropped).length < 2) {
    alert('参加者が2名以上必要です。');
    return;
  }
  const matches = generatePairings(t);
  t.matches.push(matches);
  t.currentRound = 1;
  t.phase = 'inProgress';
  save();
  render();
}

export function exportJSON(): void {
  const t = currentTournament();
  if (!t) return;
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, JSON.stringify(t, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t.name}_${fmtDate(t.createdAt).replace(/[\/ :]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string) as Tournament;
      if (!data.id || !data.players) throw new Error('形式が正しくありません。');
      if (!data.tiebreak) data.tiebreak = 'omw';
      if (!data.byeRule) data.byeRule = 'lowest';
      data.id = uid();
      state.tournaments.unshift(data);
      state.currentId = data.id;
      state.view = 'tournament';
      state.tab = data.phase === 'finished' ? 'standings' : 'current';
      save();
      render();
    } catch (e) {
      alert('インポート失敗: ' + (e as Error).message);
    }
  };
  reader.readAsText(file);
}
