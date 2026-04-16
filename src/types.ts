export type Phase = 'inProgress' | 'finished' | 'registration';
export type Tiebreak = 'omw' | 'points' | 'h2h'; // legacy
export type ByeRule = 'lowest' | 'random';
export type MatchResult = 'p1' | 'p2' | 'draw' | 'bye' | null;

// ===== 新規設定 =====
export type ScoreMode = 'match' | 'games';
export type TiebreakMethod =
  | 'omw' // Opponent Match-Win %
  | 'gw' // Game-Win %
  | 'ogw' // Opponent Game-Win %
  | 'h2h' // 直接対決
  | 'sos' // Sum of Opponents' Scores
  | 'buchholz' // Buchholz (= SoS)
  | 'median-buchholz' // 上下端を除外した Buchholz
  | 'sonneborn-berger'; // SB
export type TiebreakProfile = 'mtg-standard' | 'simple' | 'h2h-first' | 'buchholz';
export type RematchPolicy = 'strict' | 'avoid-if-possible' | 'free';
export type FirstRoundPairing = 'random' | 'seed';
export type ByeLimit = 'one' | 'unlimited';

export interface PointSystem {
  win: number;
  draw: number;
  loss: number;
  bye: number;
}

export interface DropBehavior {
  retainResults: boolean; // false なら集計から除外
  canRejoin: boolean; // Drop 後に復帰許可
}

export interface GameScore {
  p1Wins: number;
  p2Wins: number;
  draws: number;
}

export interface Player {
  id: string;
  name: string;
  dropped: boolean;
  seed?: number;
}

export interface Match {
  id: string;
  p1: string;
  p2: string | null;
  result: MatchResult;
  bye: boolean;
  games?: GameScore;
}

export interface Tournament {
  id: string;
  name: string;
  rounds: number;
  currentRound: number;
  phase: Phase;
  players: Player[];
  matches: Match[][];
  byes: Record<string, number[]>;
  createdAt: number;

  // レガシー(旧版の単一タイブレークとByeルール。新設定へ移行後も読み書き互換)
  tiebreak: Tiebreak;
  byeRule: ByeRule;

  // 新規設定(すべて必須になるが load() で旧データに default 補完)
  scoreMode: ScoreMode;
  pointSystem: PointSystem;
  tiebreakProfile: TiebreakProfile;
  tiebreakOrder: TiebreakMethod[];
  byeLimit: ByeLimit;
  dropBehavior: DropBehavior;
  rematchPolicy: RematchPolicy;
  firstRoundPairing: FirstRoundPairing;
}

export type View = 'create' | 'list' | 'tournament';
export type Tab = 'current' | 'standings' | 'history' | 'players';

export interface AppState {
  tournaments: Tournament[];
  currentId: string | null;
  view: View;
  tab: Tab;
}

export interface PlayerStats {
  id: string;
  name: string;
  dropped: boolean;
  mp: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  opponents: string[];
  // tiebreak metrics
  omw: number;
  gw: number;
  ogw: number;
  gamesPlayed: number;
  gameWins: number;
  gameDraws: number;
  gameLosses: number;
  sos: number;
  buchholz: number;
  medianBuchholz: number;
  sonnebornBerger: number;
}
