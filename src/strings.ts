/**
 * UI文言の集約ファイル。
 * ここには「繰り返し使われる・将来変わりうるUIラベル」のみ置く。
 * 短文の alert/confirm や1箇所にしか現れない動的文言は各所に残す。
 */
import type {
  Tiebreak, ByeRule,
  ScoreMode, TiebreakProfile, RematchPolicy, FirstRoundPairing, ByeLimit,
  TiebreakMethod,
} from './types';

// ===== ブランド / メタ =====
export const APP = {
  name: 'スイスイドロー工房',
  tagline: '手書き風UIのスイスドロー大会マネージャー',
  description:
    'スイスイドロー工房 — 手書き風UIのスイスドロー大会管理アプリ。ブラウザだけで動作します。',
  welcome: 'ようこそ',
} as const;

// ===== セクション見出し / パネル =====
export const HEADING = {
  createTournament: '新しい大会を作成',
  tournamentList: '大会一覧',
  importJson: 'JSONから復元',
  emptyList: 'ようこそ、スイスドロー工房へ',
  history: 'ラウンド履歴',
  players: '参加者',
  standings: '順位表',
  tournamentFinished: '大会終了',
} as const;

// ===== フォームラベル =====
export const LABEL = {
  tournamentName: '大会名',
  rounds: 'ラウンド数',
  playersList: '参加者リスト (改行区切り)',
  tiebreak: '同率の場合 (タイブレーク)',
  byeRule: '奇数人数の場合 (Bye方式)',
} as const;

// ===== プレースホルダ =====
export const PLACEHOLDER = {
  tournamentName: '例: 如何月GP 2025',
  playersList: '改行区切りで参加者を入力\n例:\n新卒魔法使い\n見習い魔法使い\nベテラン魔法使い',
  playerName: '参加者名',
} as const;

// ===== 入力モード(大会作成ページ) =====
export const INPUT_MODE = {
  text: 'テキスト入力',
  cards: 'カード入力',
  addPlayer: '＋ 参加者を追加',
} as const;

// ===== ボタン =====
export const BTN = {
  createAndStart: '作成して開始',
  cancel: 'キャンセル',
  open: '開く',
  delete: '削除',
  deleteTournament: 'この大会を削除',
  exportJson: 'JSONエクスポート',
  regenPairings: 'ペアリング再生成',
  nextRound: '次のラウンドへ',
  endTournament: '大会を終了',
  extendRound: 'もう1ラウンド延長',
  endNow: 'ここで終了',
  resetAuto: '人数から算出',
  newTournament: '＋ 新しい大会を作成',
  showList: '大会一覧を見る',
  backToList: '← 大会一覧に戻る',
  start: '開始',
  editName: '✎ 編集',
  save: '保存',
} as const;

// ===== タブ(大会進行ページ) =====
export const TAB = {
  currentRound: '現ラウンド',
  lastRound: '最終ラウンド',
  standings: '順位表',
  history: '履歴',
  players: '参加者',
} as const;

// ===== ステータス表示 =====
export const STATUS = {
  finished: '終了済み',
  registration: '未開始',
  registrationLegacy: '未開始 (旧形式)',
  dropBadge: 'Drop',
  resultNotEntered: '未入力',
  resultDraw: '引き分け',
} as const;

// ===== リード文 / 説明文 =====
export const LEAD = {
  topHero: `${APP.name}\n${APP.tagline}`,
  emptyList: '新しい大会を作成しましょう。',
  finishedHint: '最終結果は「順位表」タブで確認できます。',
  noMatchesYet: 'まだマッチがありません。',
  legacyRegistration: 'この大会は旧形式です。現在の参加者でラウンド1を生成して開始します。',
  playersManageHint: 'チップをクリックで Drop / 復帰を切り替え。次ラウンドのペアリングに反映されます。',
} as const;

// ===== セレクト選択肢 =====
export const TIEBREAK_OPTIONS: readonly [Tiebreak, string][] = [
  ['omw', 'OMW% → 名前 (推奨)'],
  ['points', '勝ち点のみ'],
  ['h2h', '直接対決 → OMW% → 名前'],
] as const;

export const BYE_OPTIONS: readonly [ByeRule, string][] = [
  ['lowest', '最下位優先でBye (推奨)'],
  ['random', 'ランダムでBye'],
] as const;

// 順位表での表示用 (旧互換)
export const TIEBREAK_SHORT_LABEL: Record<Tiebreak, string> = {
  omw: 'OMW% → 名前',
  points: '勝ち点のみ',
  h2h: '直接対決 → OMW% → 名前',
};

// ===== 詳細設定 (高優先 + 中優先) =====
export const ADVANCED = {
  sectionTitle: '詳細設定',
  sectionHint: '通常はそのままでOK(標準設定)。競技向けに細かく設定できます。',
} as const;

// スコア入力方式
export const SCORE_MODE_OPTIONS: readonly [ScoreMode, string, string][] = [
  ['match', '勝敗のみ', '勝ち / 引き分け / 負け の3択。運営が簡単。'],
  ['games', 'ゲームスコア', '2-0 / 2-1 などゲーム数まで記録。GW% タイブレークに必要。'],
] as const;

// タイブレーク方式ラベル(1段分)
export const TIEBREAK_METHOD_LABEL: Record<TiebreakMethod, string> = {
  omw: 'OMW%(相手のマッチ勝率)',
  gw: 'GW%(自分のゲーム勝率)',
  ogw: 'OGW%(相手のゲーム勝率)',
  h2h: '直接対決',
  sos: 'SoS(相手の勝ち点合計)',
  buchholz: 'Buchholz(対戦相手の勝ち点合計)',
  'median-buchholz': '中央Buchholz(最高・最低の相手を除外した合計)',
  'sonneborn-berger': 'Sonneborn-Berger(倒した相手の勝ち点重み付き合計)',
};

// タイブレークのプリセット
export const TIEBREAK_PROFILE_OPTIONS: readonly [TiebreakProfile, string, string][] = [
  ['mtg-standard', '標準 (OMW% → GW% → OGW%)', '最も一般的。競技大会で広く使われているタイブレーク。'],
  ['simple', 'シンプル (勝ち点のみ)', '勝ち点だけで並べる。'],
  ['h2h-first', '直接対決優先', '同率時はまず直接対決の結果、次にOMW%。'],
  ['buchholz', 'Buchholz系 (チェス式)', '強い相手と当たった人を優遇。Buchholz=相手の勝ち点合計、中央Buch=極端な相手を除外、SB=倒した相手の重み付き評価。'],
] as const;

export const TIEBREAK_PROFILE_DEFAULT_ORDERS: Record<TiebreakProfile, TiebreakMethod[]> = {
  'mtg-standard': ['omw', 'gw', 'ogw'],
  simple: [],
  'h2h-first': ['h2h', 'omw'],
  buchholz: ['buchholz', 'median-buchholz', 'sonneborn-berger'],
};

// 初回ペアリング
export const FIRST_ROUND_OPTIONS: readonly [FirstRoundPairing, string, string][] = [
  ['random', 'ランダム', '第1ラウンドを抽選で組む(推奨)。'],
  ['seed', '入力順', '参加者リストに入力した順に上から組む。再現性を重視する場合に。'],
] as const;

// 再戦ポリシー
export const REMATCH_POLICY_OPTIONS: readonly [RematchPolicy, string, string][] = [
  ['strict', '厳密禁止', '一度当たった相手とは二度と組まない(組めないとエラー)。'],
  ['avoid-if-possible', '不可避時のみ許可', 'なるべく避ける。どうしても組めないときだけ再戦を許す(推奨)。'],
  ['free', '自由', '再戦を気にしない。勝ち点差のみで組む。'],
] as const;

// Bye受取上限
export const BYE_LIMIT_OPTIONS: readonly [ByeLimit, string, string][] = [
  ['one', '1回まで', '同じ人にByeを2回割り当てない(推奨)。'],
  ['unlimited', '無制限', 'Byeが何度でも付与されうる。参加者が極端に少ないとき用。'],
] as const;

// 詳細設定まわりの表示用ラベル
export const ADVANCED_LABEL = {
  scoreMode: 'スコア入力方式',
  tiebreakProfile: 'タイブレーク(同率の処理)',
  tiebreakOrder: 'タイブレーク順序',
  firstRoundPairing: '初回ペアリング',
  rematchPolicy: '再戦ポリシー',
  byeLimit: 'Bye受取上限',
  points: '勝ち点配分',
  pointWin: '勝ち',
  pointDraw: '引分',
  pointLoss: '負け',
  pointBye: 'Bye',
  dropBehavior: 'ドロップ時の挙動',
  dropRetain: 'ドロップしたプレイヤーの過去の結果も集計に含める',
  dropRejoin: 'ドロップ後の復帰を許可する',
} as const;
