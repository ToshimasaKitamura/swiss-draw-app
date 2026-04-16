import { el, fmtDate } from '../dom';
import { state, openTournament, deleteTournament, importJSON } from '../state';
import { render } from '../render';
import { HEADING, LEAD, BTN, STATUS } from '../strings';

export function viewList(): HTMLElement {
  const wrap = el('div');

  if (state.tournaments.length === 0) {
    const empty = el('div', { class: 'panel hero' });
    empty.appendChild(el('div', { class: 'hero-title', text: HEADING.emptyList }));
    empty.appendChild(el('p', { class: 'hero-lead', text: LEAD.emptyList }));
    empty.appendChild(
      el('div', { class: 'hero-actions' }, [
        el('button', {
          class: 'primary hero-button',
          text: BTN.newTournament,
          onclick: () => { state.view = 'create'; render(); },
        }),
      ])
    );
    wrap.appendChild(empty);
  } else {
    const createBar = el('div', { class: 'create-bar' }, [
      el('button', {
        class: 'primary',
        text: BTN.newTournament,
        onclick: () => { state.view = 'create'; render(); },
      }),
    ]);
    wrap.appendChild(createBar);

    const listPanel = el('div', { class: 'panel' });
    listPanel.appendChild(el('h2', { text: HEADING.tournamentList }));
    for (const t of state.tournaments) {
      const isFinished = t.phase === 'finished';
      const isRegistration = t.phase === 'registration';
      const badge = el('span', {
        class:
          'badge ' +
          (isFinished ? 'finished' : isRegistration ? 'registration' : 'in-progress'),
        text: isFinished
          ? STATUS.finished
          : isRegistration
            ? STATUS.registration
            : `進行中 R${t.currentRound}/${t.rounds}`,
      });
      const card = el('div', { class: 'tournament-card' }, [
        el('div', {}, [
          el('div', { text: t.name }),
          el(
            'div',
            {
              class: 'tournament-meta',
              text: `作成: ${fmtDate(t.createdAt)} / 参加 ${t.players.length}人 `,
            },
            [badge]
          ),
        ]),
        el('div', { class: 'button-row' }, [
          el('button', {
            class: 'primary small',
            text: BTN.open,
            onclick: () => openTournament(t.id),
          }),
          el('button', {
            class: 'danger small',
            text: BTN.delete,
            onclick: () => deleteTournament(t.id),
          }),
        ]),
      ]);
      listPanel.appendChild(card);
    }
    wrap.appendChild(listPanel);
  }

  const importPanel = el('div', { class: 'panel' });
  importPanel.appendChild(el('h2', { text: HEADING.importJson }));
  const fileInput = el('input', {
    type: 'file',
    accept: 'application/json',
    onchange: (e: Event) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) importJSON(f);
    },
  });
  importPanel.appendChild(fileInput);
  wrap.appendChild(importPanel);

  return wrap;
}
