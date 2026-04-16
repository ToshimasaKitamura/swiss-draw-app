import { el } from './dom';
import type {
  FirstRoundPairing, RematchPolicy, ByeRule, ByeLimit, ScoreMode, TiebreakProfile,
} from './types';

// ===== 共通ヘルパ =====
const chip = (text: string, extra = ''): HTMLElement =>
  el('span', { class: 'diag-chip ' + extra, text });
const arrow = (text = '→'): HTMLElement =>
  el('span', { class: 'diag-arrow', text });
const label = (text: string, extra = ''): HTMLElement =>
  el('span', { class: 'diag-label ' + extra, text });
const row = (children: (HTMLElement | string)[], cls = ''): HTMLElement =>
  el('div', { class: 'diag-row ' + cls }, children.map((c) => typeof c === 'string' ? document.createTextNode(c) as unknown as HTMLElement : c));
const wrap = (rows: HTMLElement[]): HTMLElement =>
  el('div', { class: 'diag' }, rows);

// ===== 初回ペアリング =====
export function firstRoundDiagram(v: FirstRoundPairing): HTMLElement {
  if (v === 'random') {
    return wrap([
      row([chip('A'), chip('B'), chip('C'), chip('D'), arrow('シャッフル'), chip('B'), chip('D'), chip('A'), chip('C')]),
      row([label('→ ペアリング: B-D, A-C')], 'small'),
    ]);
  }
  // seed (= 入力順)
  return wrap([
    row([chip('1番目'), chip('2番目'), chip('3番目'), chip('4番目'), arrow(), chip('1-2番'), chip('3-4番')]),
    row([label('入力リストの順に上から組む')], 'small'),
  ]);
}

// ===== 再戦ポリシー =====
export function rematchPolicyDiagram(v: RematchPolicy): HTMLElement {
  if (v === 'strict') {
    return wrap([
      row([label('R1:'), chip('A'), label('vs'), chip('B')]),
      row([label('R2:'), chip('A'), label('vs'), chip('B'), label('✗ 禁止', 'bad')]),
      row([label('R2:'), chip('A'), label('vs'), chip('C'), label('○ OK', 'good')]),
    ]);
  }
  if (v === 'avoid-if-possible') {
    return wrap([
      row([label('R1:'), chip('A'), label('vs'), chip('B')]),
      row([label('R2:'), chip('A'), label('vs'), chip('C'), label('優先', 'good')]),
      row([label('やむを得ない時のみ A-B 再戦を許可', 'small')]),
    ]);
  }
  // free
  return wrap([
    row([label('R1:'), chip('A'), label('vs'), chip('B')]),
    row([label('R2:'), chip('A'), label('vs'), chip('B'), label('○ 気にしない', 'good')]),
  ]);
}

// ===== Bye方式 =====
export function byeRuleDiagram(v: ByeRule): HTMLElement {
  if (v === 'lowest') {
    return wrap([
      row([label('奇数人(5人)の場合の順位:')]),
      row([chip('1位 9pt'), chip('2位 6pt'), chip('3位 6pt'), chip('4位 3pt'), chip('5位 0pt', 'bye')]),
      row([label('↑ 最下位がBye', 'small')]),
    ]);
  }
  // random
  return wrap([
    row([chip('A'), chip('B'), chip('C'), chip('D'), chip('E'), arrow('🎲'), chip('C', 'bye')]),
    row([label('全員からランダム抽選', 'small')]),
  ]);
}

// ===== Bye受取上限 =====
export function byeLimitDiagram(v: ByeLimit): HTMLElement {
  if (v === 'one') {
    return wrap([
      row([label('Aさん'), label('R1:'), chip('Bye', 'bye')]),
      row([label('　　'), label('R2:'), chip('試合'), label('(Bye 2回目はNG)', 'small')]),
    ]);
  }
  return wrap([
    row([label('Aさん'), label('R1:'), chip('Bye', 'bye')]),
    row([label('　　'), label('R2:'), chip('Bye', 'bye'), label('(再Byeも可)', 'small')]),
  ]);
}

// ===== スコア入力方式 =====
export function scoreModeDiagram(v: ScoreMode): HTMLElement {
  if (v === 'match') {
    return wrap([
      row([chip('Aの勝ち', 'btn'), chip('引分', 'btn'), chip('Bの勝ち', 'btn')]),
      row([label('3択ボタンで結果を入力', 'small')]),
    ]);
  }
  return wrap([
    row([label('A:'), chip('2', 'num'), label('B:'), chip('1', 'num'), label('引分:'), chip('0', 'num')]),
    row([label('ゲーム数を記録 → GW% 算出可能', 'small')]),
  ]);
}

// ===== タイブレーク プリセット =====
export function tiebreakProfileDiagram(v: TiebreakProfile): HTMLElement {
  const flow = (steps: string[]): HTMLElement => wrap([
    row(steps.flatMap((s, i) => i === 0 ? [chip(s, 'tb')] : [arrow(), chip(s, 'tb')])),
  ]);
  if (v === 'mtg-standard') return flow(['勝ち点', 'OMW%', 'GW%', 'OGW%']);
  if (v === 'simple') return flow(['勝ち点']);
  if (v === 'h2h-first') return flow(['勝ち点', '直対', 'OMW%']);
  return flow(['勝ち点', 'Buch', '中央Buch', 'SB']);
}
