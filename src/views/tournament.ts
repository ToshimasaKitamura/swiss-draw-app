import { el, escapeHtml } from '../dom';
import {
  state, currentTournament,
  exportJSON, deleteTournament,
  setResult, setGameScore, finishRound, regeneratePairings,
  allRoundResultsEntered, toggleDrop,
  startLegacyTournament,
  extendByOneRound, endTournamentEarly,
  renameTournament,
} from '../state';
import { render } from '../render';
import { sortedStandings, areEffectivelyTied } from '../scoring';
import type { Tournament, Match, Tab } from '../types';
import {
  HEADING, BTN, TAB, STATUS, LEAD, TIEBREAK_METHOD_LABEL,
} from '../strings';
import type { TiebreakMethod } from '../types';

export function viewTournament(): HTMLElement {
  const t = currentTournament();
  const wrap = el('div');
  if (!t) return wrap;

  wrap.appendChild(
    el('div', { class: 'back-row' }, [
      el('button', {
        class: 'small',
        text: BTN.backToList,
        onclick: () => { state.view = 'list'; render(); },
      }),
    ])
  );

  const header = el('div', { class: 'panel' });
  header.appendChild(renderTitle(t));
  const phaseLabel =
    t.phase === 'finished'
      ? STATUS.finished
      : t.phase === 'registration'
        ? STATUS.registrationLegacy
        : `ラウンド ${t.currentRound} / ${t.rounds}(目標)進行中`;
  header.appendChild(el('p', { class: 'muted', text: phaseLabel }));

  // 目標到達バナー: 目標ラウンドに達し、かつ全試合入力済みのとき
  if (
    t.phase === 'inProgress' &&
    t.currentRound >= t.rounds &&
    allRoundResultsEntered(t)
  ) {
    header.appendChild(
      el('div', {
        class: 'target-reached',
        text: '🏁 目標ラウンドに到達。「大会を終了」または「もう1ラウンド延長」を選択してください。',
      })
    );
  }

  header.appendChild(
    el('div', { class: 'button-row' }, [
      el('button', { class: 'small', text: BTN.exportJson, onclick: exportJSON }),
      el('button', {
        class: 'danger small',
        text: BTN.deleteTournament,
        onclick: () => deleteTournament(t.id),
      }),
    ])
  );
  wrap.appendChild(header);

  if (t.phase === 'registration') {
    const note = el('div', { class: 'panel' });
    note.appendChild(el('p', { text: LEAD.legacyRegistration }));
    note.appendChild(
      el('div', { class: 'button-row' }, [
        el('button', { class: 'primary', text: BTN.start, onclick: startLegacyTournament }),
      ])
    );
    wrap.appendChild(note);
    return wrap;
  }

  const tabs = el('div', { class: 'tabs' });
  const mkTab = (id: Tab, label: string) =>
    el('button', {
      class: 'tab ' + (state.tab === id ? 'active' : ''),
      text: label,
      onclick: () => { state.tab = id; render(); },
    });
  tabs.appendChild(mkTab('current', t.phase === 'finished' ? TAB.lastRound : TAB.currentRound));
  tabs.appendChild(mkTab('standings', TAB.standings));
  tabs.appendChild(mkTab('history', TAB.history));
  tabs.appendChild(mkTab('players', TAB.players));
  wrap.appendChild(tabs);

  if (state.tab === 'current') wrap.appendChild(viewCurrentRound(t));
  else if (state.tab === 'standings') wrap.appendChild(viewStandingsPanel(t));
  else if (state.tab === 'history') wrap.appendChild(viewHistoryPanel(t));
  else if (state.tab === 'players') wrap.appendChild(viewPlayerManage(t));

  return wrap;
}

function renderTitle(t: Tournament): HTMLElement {
  const container = el('div');
  const showView = (): void => {
    container.innerHTML = '';
    const row = el('div', { class: 'title-row' }, [
      el('h2', { text: t.name }),
      el('button', {
        class: 'small edit-btn',
        text: BTN.editName,
        onclick: () => showEdit(),
      }),
    ]);
    container.appendChild(row);
  };
  const showEdit = (): void => {
    container.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = t.name;
    const save = (): void => {
      const v = input.value.trim();
      if (!v) { alert('大会名を入力してください。'); return; }
      if (v === t.name) { showView(); return; }
      renameTournament(t.id, v);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      else if (e.key === 'Escape') showView();
    });
    const edit = el('div', { class: 'title-edit' }, [
      input,
      el('button', { class: 'primary small', text: BTN.save, onclick: save }),
      el('button', { class: 'small', text: BTN.cancel, onclick: () => showView() }),
    ]);
    container.appendChild(edit);
    setTimeout(() => { input.focus(); input.select(); }, 0);
  };
  showView();
  return container;
}

function viewCurrentRound(t: Tournament): HTMLElement {
  const panel = el('div', { class: 'panel' });
  if (t.phase === 'finished') {
    panel.appendChild(el('h2', { text: HEADING.tournamentFinished }));
    panel.appendChild(el('p', { class: 'muted', text: LEAD.finishedHint }));
    const lastRound = t.matches[t.matches.length - 1] ?? [];
    if (lastRound.length > 0) {
      panel.appendChild(el('h3', { text: `${TAB.lastRound} (R${t.matches.length})` }));
      renderMatches(panel, t, lastRound, true);
    }
    return panel;
  }
  const round = t.matches[t.currentRound - 1] ?? [];
  panel.appendChild(
    el('h2', { text: `ラウンド ${t.currentRound} / ${t.rounds}(目標)` })
  );
  renderMatches(panel, t, round, false);

  const allEntered = allRoundResultsEntered(t);
  const atTarget = t.currentRound >= t.rounds;
  const buttons: HTMLElement[] = [
    el('button', { text: BTN.regenPairings, onclick: regeneratePairings }),
  ];
  if (atTarget && allEntered) {
    // 目標到達+全試合完了: 延長 or 終了
    buttons.push(el('button', { text: BTN.extendRound, onclick: extendByOneRound }));
    buttons.push(
      el('button', { class: 'primary', text: BTN.endTournament, onclick: finishRound })
    );
  } else {
    // 通常進行中: ここで終了(常時) + 次のラウンドへ
    buttons.push(el('button', { class: 'danger', text: BTN.endNow, onclick: endTournamentEarly }));
    buttons.push(
      el('button', {
        class: 'primary',
        text: BTN.nextRound,
        onclick: finishRound,
        disabled: !allEntered,
      })
    );
  }
  panel.appendChild(el('div', { class: 'button-row' }, buttons));
  return panel;
}

function renderMatches(
  parent: HTMLElement,
  t: Tournament,
  round: Match[],
  readOnly: boolean
): void {
  const pmap: Record<string, { name: string }> = Object.fromEntries(
    t.players.map((p) => [p.id, p])
  );
  for (const m of round) {
    const matchEl = el('div', { class: 'match' + (m.bye ? ' bye' : '') });
    if (m.bye) {
      matchEl.appendChild(el('div', { class: 'name winner', text: pmap[m.p1]?.name ?? '?' }));
      matchEl.appendChild(el('div', { class: 'vs', text: 'Bye' }));
      matchEl.appendChild(el('div', { class: 'name right', text: '—' }));
    } else {
      const p1Name = pmap[m.p1]?.name ?? '?';
      const p2Name = m.p2 ? pmap[m.p2]?.name ?? '?' : '?';
      const p1Class = m.result === 'p1' ? 'winner' : m.result === 'p2' ? 'loser' : m.result === 'draw' ? 'drawn' : '';
      const p2Class = m.result === 'p2' ? 'winner' : m.result === 'p1' ? 'loser' : m.result === 'draw' ? 'drawn' : '';
      matchEl.appendChild(el('div', { class: 'name ' + p1Class, text: p1Name }));
      matchEl.appendChild(el('div', { class: 'vs', text: 'vs' }));
      matchEl.appendChild(el('div', { class: 'name right ' + p2Class, text: p2Name }));
      if (!readOnly) {
        if (t.scoreMode === 'games') {
          matchEl.appendChild(renderGameScoreInput(t, m, p1Name, p2Name));
        } else {
          const btnRow = el('div', { class: 'result-buttons' });
          const mkBtn = (label: string, val: 'p1' | 'p2' | 'draw', extraClass = '') =>
            el('button', {
              class: 'small ' + (m.result === val ? 'selected ' : '') + extraClass,
              text: label,
              onclick: () => setResult(m.id, val),
            });
          btnRow.append(
            mkBtn(`${p1Name} の勝ち`, 'p1'),
            mkBtn('引き分け', 'draw', 'draw'),
            mkBtn(`${p2Name} の勝ち`, 'p2')
          );
          matchEl.appendChild(btnRow);
        }
      } else {
        let resultTxt: string = STATUS.resultNotEntered;
        if (m.result === 'p1') resultTxt = `${p1Name} 勝ち`;
        else if (m.result === 'p2') resultTxt = `${p2Name} 勝ち`;
        else if (m.result === 'draw') resultTxt = STATUS.resultDraw;
        if (m.games && (m.games.p1Wins || m.games.p2Wins || m.games.draws)) {
          const g = m.games;
          const scoreTxt = g.draws ? `${g.p1Wins}-${g.p2Wins}-${g.draws}` : `${g.p1Wins}-${g.p2Wins}`;
          resultTxt = `${resultTxt} (${scoreTxt})`;
        }
        matchEl.appendChild(
          el('div', { class: 'result-buttons muted', text: `[ ${resultTxt} ]` })
        );
      }
    }
    parent.appendChild(matchEl);
  }
}

function renderGameScoreInput(
  _t: Tournament, m: Match, p1Name: string, p2Name: string
): HTMLElement {
  const g = m.games ?? { p1Wins: 0, p2Wins: 0, draws: 0 };
  const wrap = el('div', { class: 'game-score-input' });
  const mkInput = (val: number): HTMLInputElement => {
    const i = document.createElement('input');
    i.type = 'number';
    i.min = '0';
    i.value = String(val);
    return i;
  };
  const p1 = mkInput(g.p1Wins);
  const p2 = mkInput(g.p2Wins);
  const dr = mkInput(g.draws);
  const commit = (): void => {
    const a = Math.max(0, parseInt(p1.value, 10) || 0);
    const b = Math.max(0, parseInt(p2.value, 10) || 0);
    const d = Math.max(0, parseInt(dr.value, 10) || 0);
    setGameScore(m.id, a, b, d);
  };
  [p1, p2, dr].forEach((i) => i.addEventListener('change', commit));
  wrap.append(
    el('div', { class: 'game-score-cell' }, [el('span', { class: 'muted', text: p1Name }), p1]),
    el('div', { class: 'game-score-sep', text: '-' }),
    el('div', { class: 'game-score-cell' }, [el('span', { class: 'muted', text: p2Name }), p2]),
    el('div', { class: 'game-score-sep', text: '引分' }),
    el('div', { class: 'game-score-cell' }, [el('span', { class: 'muted', text: '数' }), dr]),
  );
  if (m.result) {
    const label = m.result === 'p1' ? `${p1Name} 勝ち` : m.result === 'p2' ? `${p2Name} 勝ち` : '引き分け';
    wrap.appendChild(el('div', { class: 'game-score-result muted', text: `→ ${label}` }));
  }
  return wrap;
}

function viewStandingsPanel(t: Tournament): HTMLElement {
  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h2', { text: HEADING.standings }));
  const order: TiebreakMethod[] = t.tiebreakOrder && t.tiebreakOrder.length > 0
    ? t.tiebreakOrder
    : [];
  const orderText = order.length === 0
    ? '勝ち点'
    : '勝ち点 → ' + order.map((m) => TIEBREAK_METHOD_LABEL[m]).join(' → ');
  panel.appendChild(
    el('p', { class: 'muted', text: `タイブレーク: ${orderText}` })
  );
  const standings = sortedStandings(t);
  const tableWrap = el('div', { class: 'table-wrap' });
  const table = el('table');
  const extraHeaders = order.map((m) => `<th>${tiebreakColHeader(m)}</th>`).join('');
  table.innerHTML = `
    <thead>
      <tr>
        <th>順位</th><th>プレイヤー</th><th>勝-負-分</th>
        <th>勝ち点</th>${extraHeaders}<th>Bye</th><th>状態</th>
      </tr>
    </thead>
  `;
  const tbody = el('tbody');
  const ranks: number[] = [];
  standings.forEach((s, i) => {
    if (i === 0) ranks.push(1);
    else if (areEffectivelyTied(t, standings[i - 1], s)) ranks.push(ranks[i - 1]);
    else ranks.push(i + 1);
  });
  standings.forEach((s, i) => {
    const tr = el('tr');
    const extraCells = order.map((m) => `<td>${formatTiebreakValue(s, m)}</td>`).join('');
    tr.innerHTML = `
      <td>${ranks[i]}</td>
      <td>${escapeHtml(s.name)}</td>
      <td class="record"><span class="win">${s.wins}</span><span class="sep">-</span><span class="loss">${s.losses}</span><span class="sep">-</span>${s.draws}</td>
      <td>${s.mp}</td>${extraCells}
      <td>${s.byes}</td>
      <td>${s.dropped ? `<span class="badge">${STATUS.dropBadge}</span>` : ''}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  panel.appendChild(tableWrap);
  return panel;
}

function tiebreakColHeader(m: TiebreakMethod): string {
  switch (m) {
    case 'omw': return 'OMW%';
    case 'gw': return 'GW%';
    case 'ogw': return 'OGW%';
    case 'h2h': return '直対';
    case 'sos': return 'SoS';
    case 'buchholz': return 'Buch';
    case 'median-buchholz': return 'MedBuch';
    case 'sonneborn-berger': return 'SB';
  }
}

function formatTiebreakValue(
  s: { omw: number; gw: number; ogw: number; buchholz: number; medianBuchholz: number; sonnebornBerger: number },
  m: TiebreakMethod,
): string {
  switch (m) {
    case 'omw': return `${(s.omw * 100).toFixed(1)}%`;
    case 'gw': return `${(s.gw * 100).toFixed(1)}%`;
    case 'ogw': return `${(s.ogw * 100).toFixed(1)}%`;
    case 'h2h': return '—';
    case 'sos':
    case 'buchholz': return s.buchholz.toString();
    case 'median-buchholz': return s.medianBuchholz.toString();
    case 'sonneborn-berger': return s.sonnebornBerger.toFixed(1);
  }
}

function viewHistoryPanel(t: Tournament): HTMLElement {
  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h2', { text: HEADING.history }));
  if (t.matches.length === 0) {
    panel.appendChild(el('p', { class: 'muted', text: LEAD.noMatchesYet }));
    return panel;
  }
  t.matches.forEach((round, idx) => {
    panel.appendChild(el('h3', { text: `ラウンド ${idx + 1}` }));
    renderMatches(panel, t, round, true);
  });
  return panel;
}

function viewPlayerManage(t: Tournament): HTMLElement {
  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h2', { text: HEADING.players }));
  panel.appendChild(
    el('p', {
      class: 'muted',
      text: `全${t.players.length}名。${LEAD.playersManageHint}`,
    })
  );
  const list = el('div', { class: 'player-list' });
  for (const p of t.players) {
    const chip = el(
      'span',
      {
        class: 'player-chip' + (p.dropped ? ' dropped' : ''),
        title: p.dropped ? 'クリックで復帰' : 'クリックでDrop',
        onclick: () => toggleDrop(p.id),
      },
      [p.name + (p.dropped ? ` (${STATUS.dropBadge})` : '')]
    );
    chip.style.cursor = 'pointer';
    list.appendChild(chip);
  }
  panel.appendChild(list);
  return panel;
}
