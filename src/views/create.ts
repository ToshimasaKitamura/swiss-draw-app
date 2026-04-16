import { el } from '../dom';
import { state, createTournament } from '../state';
import { render } from '../render';
import { recommendedRounds, DEFAULT_POINTS } from '../scoring';
import type {
  Tiebreak, ByeRule, ScoreMode, TiebreakProfile, TiebreakMethod,
  RematchPolicy, FirstRoundPairing, ByeLimit, PointSystem, DropBehavior,
} from '../types';
import {
  HEADING, LABEL, PLACEHOLDER, BTN, INPUT_MODE,
  BYE_OPTIONS,
  ADVANCED, ADVANCED_LABEL,
  SCORE_MODE_OPTIONS, TIEBREAK_PROFILE_OPTIONS, TIEBREAK_PROFILE_DEFAULT_ORDERS,
  FIRST_ROUND_OPTIONS, REMATCH_POLICY_OPTIONS, BYE_LIMIT_OPTIONS,
  TIEBREAK_METHOD_LABEL,
} from '../strings';
import {
  scoreModeDiagram, tiebreakProfileDiagram, firstRoundDiagram,
  rematchPolicyDiagram, byeRuleDiagram, byeLimitDiagram,
} from '../diagrams';

type InputMode = 'text' | 'cards';

export function viewCreate(): HTMLElement {
  const wrap = el('div');
  wrap.appendChild(
    el('div', { class: 'back-row' }, [
      el('button', {
        class: 'small',
        text: BTN.backToList,
        onclick: () => { state.view = 'list'; render(); },
      }),
    ])
  );
  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h2', { text: HEADING.createTournament }));

  const nameInput = el('input', { type: 'text', placeholder: PLACEHOLDER.tournamentName });

  // ラウンド数(参加者数から自動追従)
  let autoRounds = true;
  const roundsInput = el('input', { type: 'number', min: 0, max: 20, value: 0 });
  const resetAutoBtn = el('button', {
    class: 'ghost small',
    text: BTN.resetAuto,
    style: 'display:none',
    onclick: () => {
      autoRounds = true;
      syncAutoRounds();
      resetAutoBtn.style.display = 'none';
    },
  });
  roundsInput.addEventListener('input', () => {
    autoRounds = false;
    resetAutoBtn.style.display = '';
  });
  function syncAutoRounds(): void {
    if (!autoRounds) return;
    const n = getNames().length;
    const rec = recommendedRounds(n);
    roundsInput.value = String(rec ?? 0);
  }

  // ===== 参加者入力 =====
  let mode: InputMode = 'text';
  const playersArea = el('textarea', { rows: 8, placeholder: PLACEHOLDER.playersList });
  playersArea.addEventListener('input', () => updateHint());
  const textWrap = el('div', {}, [playersArea]);

  const cardsContainer = el('div', { class: 'player-cards-input' });
  function addCard(name: string): HTMLInputElement {
    const input = el('input', {
      type: 'text', placeholder: PLACEHOLDER.playerName, value: name,
    }) as HTMLInputElement;
    input.value = name;
    input.addEventListener('input', () => updateHint());
    const card = el('div', { class: 'player-card-input' }, [
      input,
      el('button', {
        class: 'danger small', text: '×',
        onclick: () => { card.remove(); updateHint(); },
      }),
    ]);
    cardsContainer.appendChild(card);
    return input;
  }
  const addCardBtn = el('button', {
    text: INPUT_MODE.addPlayer,
    onclick: () => { addCard('').focus(); },
  });
  const cardsWrap = el('div', { style: 'display:none' }, [
    cardsContainer, el('div', { class: 'button-row' }, [addCardBtn]),
  ]);

  const getTextNames = (): string[] =>
    playersArea.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const getCardNames = (): string[] =>
    Array.from(cardsContainer.querySelectorAll<HTMLInputElement>('input'))
      .map((i) => i.value.trim()).filter(Boolean);
  const getNames = (): string[] => (mode === 'text' ? getTextNames() : getCardNames());

  const textTab = el('button', {
    class: 'tab active', text: INPUT_MODE.text,
    onclick: () => setMode('text'),
  });
  const cardsTab = el('button', {
    class: 'tab', text: INPUT_MODE.cards,
    onclick: () => setMode('cards'),
  });
  const modeTabs = el('div', { class: 'tabs tabs-inline' }, [textTab, cardsTab]);

  function setMode(next: InputMode): void {
    if (mode === next) return;
    if (next === 'cards') {
      const names = getTextNames();
      cardsContainer.innerHTML = '';
      if (names.length === 0) addCard('');
      else for (const n of names) addCard(n);
    } else {
      playersArea.value = getCardNames().join('\n');
    }
    mode = next;
    textWrap.style.display = mode === 'text' ? '' : 'none';
    cardsWrap.style.display = mode === 'cards' ? '' : 'none';
    textTab.classList.toggle('active', mode === 'text');
    cardsTab.classList.toggle('active', mode === 'cards');
    updateHint();
  }

  const hint = el('p', { class: 'muted' });
  function updateHint(): void {
    syncAutoRounds();
    const n = getNames().length;
    if (n < 2) { hint.textContent = ''; return; }
    const rec = recommendedRounds(n);
    hint.textContent = `参加者 ${n}人 → 推奨ラウンド数: ${rec}`;
  }

  // ===== 詳細設定 =====
  const adv = createAdvancedSection();

  // ===== 組み立て =====
  panel.append(
    el('div', { class: 'form-row' }, [el('label', { text: LABEL.tournamentName }), nameInput]),
    el('div', { class: 'form-row' }, [
      el('label', { text: LABEL.rounds }),
      el('div', { class: 'rounds-input-row' }, [roundsInput, resetAutoBtn]),
    ]),
    el('div', { class: 'form-row' }, [
      el('label', { text: LABEL.playersList }),
      modeTabs, textWrap, cardsWrap, hint,
    ]),
    adv.root,
  );

  panel.appendChild(
    el('div', { class: 'button-row' }, [
      el('button', {
        class: 'primary', text: BTN.createAndStart,
        onclick: () => {
          const name = nameInput.value.trim();
          const rounds = parseInt(roundsInput.value, 10) || 4;
          const names = getNames();
          if (names.length !== new Set(names).size) {
            alert('同じ名前のプレイヤーが重複しています。');
            return;
          }
          if (names.length < 2) {
            alert('参加者を2名以上入力してください。');
            return;
          }
          const a = adv.read();
          // レガシー tiebreak/byeRule も埋めておく(互換)
          const legacyTiebreak: Tiebreak =
            a.tiebreakProfile === 'simple' ? 'points'
              : a.tiebreakProfile === 'h2h-first' ? 'h2h' : 'omw';
          createTournament({
            name, rounds, playerNames: names,
            tiebreak: legacyTiebreak,
            byeRule: a.byeRule,
            scoreMode: a.scoreMode,
            pointSystem: a.pointSystem,
            tiebreakProfile: a.tiebreakProfile,
            tiebreakOrder: a.tiebreakOrder,
            byeLimit: a.byeLimit,
            dropBehavior: a.dropBehavior,
            rematchPolicy: a.rematchPolicy,
            firstRoundPairing: a.firstRoundPairing,
          });
        },
      }),
      el('button', {
        text: BTN.backToList,
        onclick: () => { state.view = 'list'; render(); },
      }),
    ])
  );
  setTimeout(() => nameInput.focus(), 0);
  wrap.appendChild(panel);
  return wrap;
}

// ===== 詳細設定セクション =====

interface AdvancedValues {
  scoreMode: ScoreMode;
  pointSystem: PointSystem;
  tiebreakProfile: TiebreakProfile;
  tiebreakOrder: TiebreakMethod[];
  byeRule: ByeRule;
  byeLimit: ByeLimit;
  dropBehavior: DropBehavior;
  rematchPolicy: RematchPolicy;
  firstRoundPairing: FirstRoundPairing;
}

function createAdvancedSection(): { root: HTMLElement; read: () => AdvancedValues } {
  const details = document.createElement('details');
  details.className = 'advanced-section';
  const summary = document.createElement('summary');
  summary.textContent = ADVANCED.sectionTitle;
  details.appendChild(summary);
  const body = el('div', { class: 'advanced-body' });
  body.appendChild(el('p', { class: 'muted', text: ADVANCED.sectionHint }));

  // スコア入力方式
  const scoreMode = mkRadioGroup<ScoreMode>(
    'scoreMode', SCORE_MODE_OPTIONS, 'match', scoreModeDiagram,
  );
  body.appendChild(wrapRow(ADVANCED_LABEL.scoreMode, scoreMode.root));

  // タイブレークプリセット
  const tbProfile = mkSelect<TiebreakProfile>(
    TIEBREAK_PROFILE_OPTIONS, 'mtg-standard', tiebreakProfileDiagram,
  );
  const tbOrderDisplay = el('p', { class: 'muted tb-order-display' });
  function updateTbOrder(): void {
    const p = tbProfile.select.value as TiebreakProfile;
    const order = TIEBREAK_PROFILE_DEFAULT_ORDERS[p];
    tbOrderDisplay.textContent =
      order.length === 0
        ? '適用順: 勝ち点'
        : '適用順: 勝ち点 → ' + order.map((m) => TIEBREAK_METHOD_LABEL[m]).join(' → ');
  }
  tbProfile.select.addEventListener('change', updateTbOrder);
  updateTbOrder();
  body.appendChild(wrapRow(ADVANCED_LABEL.tiebreakProfile, el('div', {}, [tbProfile.root, tbOrderDisplay])));

  // 初回ペアリング
  const firstRoundPairing = mkRadioGroup<FirstRoundPairing>(
    'firstRoundPairing', FIRST_ROUND_OPTIONS, 'random', firstRoundDiagram,
  );
  body.appendChild(wrapRow(ADVANCED_LABEL.firstRoundPairing, firstRoundPairing.root));

  // 再戦ポリシー
  const rematchPolicy = mkRadioGroup<RematchPolicy>(
    'rematchPolicy', REMATCH_POLICY_OPTIONS, 'avoid-if-possible', rematchPolicyDiagram,
  );
  body.appendChild(wrapRow(ADVANCED_LABEL.rematchPolicy, rematchPolicy.root));

  // Bye方式 + 上限
  const byeRule = mkSelect<ByeRule>(
    BYE_OPTIONS.map(([v, t]) => [v, t, '']), 'lowest', byeRuleDiagram,
  );
  body.appendChild(wrapRow(LABEL.byeRule, byeRule.root));
  const byeLimit = mkRadioGroup<ByeLimit>(
    'byeLimit', BYE_LIMIT_OPTIONS, 'one', byeLimitDiagram,
  );
  body.appendChild(wrapRow(ADVANCED_LABEL.byeLimit, byeLimit.root));

  // 勝ち点
  const pWin = mkNumber(DEFAULT_POINTS.win);
  const pDraw = mkNumber(DEFAULT_POINTS.draw);
  const pLoss = mkNumber(DEFAULT_POINTS.loss);
  const pBye = mkNumber(DEFAULT_POINTS.bye);
  const pointsRow = el('div', { class: 'points-grid' }, [
    wrapSmall(ADVANCED_LABEL.pointWin, pWin),
    wrapSmall(ADVANCED_LABEL.pointDraw, pDraw),
    wrapSmall(ADVANCED_LABEL.pointLoss, pLoss),
    wrapSmall(ADVANCED_LABEL.pointBye, pBye),
  ]);
  body.appendChild(wrapRow(ADVANCED_LABEL.points, pointsRow));

  // Drop挙動
  const dropRetain = mkCheckbox(ADVANCED_LABEL.dropRetain, true);
  const dropRejoin = mkCheckbox(ADVANCED_LABEL.dropRejoin, true);
  body.appendChild(wrapRow(ADVANCED_LABEL.dropBehavior, el('div', {}, [dropRetain.root, dropRejoin.root])));

  details.appendChild(body);

  return {
    root: details,
    read: (): AdvancedValues => ({
      scoreMode: scoreMode.get(),
      pointSystem: {
        win: parseInt(pWin.value, 10) || DEFAULT_POINTS.win,
        draw: parseInt(pDraw.value, 10) || 0,
        loss: parseInt(pLoss.value, 10) || 0,
        bye: parseInt(pBye.value, 10) || DEFAULT_POINTS.bye,
      },
      tiebreakProfile: tbProfile.select.value as TiebreakProfile,
      tiebreakOrder: [...TIEBREAK_PROFILE_DEFAULT_ORDERS[tbProfile.select.value as TiebreakProfile]],
      byeRule: byeRule.select.value as ByeRule,
      byeLimit: byeLimit.get(),
      dropBehavior: { retainResults: dropRetain.input.checked, canRejoin: dropRejoin.input.checked },
      rematchPolicy: rematchPolicy.get(),
      firstRoundPairing: firstRoundPairing.get(),
    }),
  };
}

// ===== 小さいヘルパ =====

function wrapRow(label: string, child: HTMLElement): HTMLElement {
  return el('div', { class: 'form-row' }, [el('label', { text: label }), child]);
}

function wrapSmall(label: string, input: HTMLInputElement): HTMLElement {
  return el('div', { class: 'points-cell' }, [el('label', { text: label }), input]);
}

function mkRadioGroup<T extends string>(
  name: string,
  options: readonly [T, string, string][],
  initial: T,
  getDiagram?: (v: T) => HTMLElement,
): { root: HTMLElement; get: () => T } {
  const group = el('div', { class: 'radio-group' });
  const inputs: HTMLInputElement[] = [];
  for (const [val, label, hint] of options) {
    const id = `${name}-${val}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = val;
    input.id = id;
    if (val === initial) input.checked = true;
    inputs.push(input);
    const body: (HTMLElement | null)[] = [
      el('div', { class: 'radio-label', text: label }),
      hint ? el('div', { class: 'radio-hint', text: hint }) : null,
    ];
    if (getDiagram) body.push(getDiagram(val));
    const lbl = el('label', { class: 'radio-option' }, [
      input,
      el('div', {}, body),
    ]);
    (lbl as HTMLLabelElement).htmlFor = id;
    group.appendChild(lbl);
  }
  return {
    root: group,
    get: () => (inputs.find((i) => i.checked)?.value as T) ?? initial,
  };
}

function mkSelect<T extends string>(
  options: readonly [T, string, string][],
  initial: T,
  getDiagram?: (v: T) => HTMLElement,
): { root: HTMLElement; select: HTMLSelectElement } {
  const select = document.createElement('select');
  for (const [v, label] of options) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    if (v === initial) o.selected = true;
    select.appendChild(o);
  }
  const hints = new Map(options.map(([v, , h]) => [v, h]));
  const hintEl = el('p', { class: 'muted' });
  const diagWrap = el('div');
  function updateHint(): void {
    hintEl.textContent = hints.get(select.value as T) ?? '';
    if (getDiagram) {
      diagWrap.innerHTML = '';
      diagWrap.appendChild(getDiagram(select.value as T));
    }
  }
  select.addEventListener('change', updateHint);
  updateHint();
  return { root: el('div', {}, [select, hintEl, diagWrap]), select };
}

function mkNumber(initial: number): HTMLInputElement {
  const i = document.createElement('input');
  i.type = 'number';
  i.value = String(initial);
  return i;
}

function mkCheckbox(label: string, initial: boolean): { root: HTMLElement; input: HTMLInputElement } {
  const i = document.createElement('input');
  i.type = 'checkbox';
  i.checked = initial;
  const lbl = el('label', { class: 'checkbox-row' }, [i, el('span', { text: label })]);
  return { root: lbl, input: i };
}
