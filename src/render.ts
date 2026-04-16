import { state, currentTournament } from './state';
import { $ } from './dom';
import { viewCreate } from './views/create';
import { viewList } from './views/list';
import { viewTournament } from './views/tournament';

export function render(): void {
  const main = $<HTMLElement>('#main');
  if (!main) return;
  main.innerHTML = '';
  const v = state.view;
  if (v === 'create') main.appendChild(viewCreate());
  else if (v === 'tournament') {
    if (!currentTournament()) { state.view = 'list'; main.appendChild(viewList()); }
    else main.appendChild(viewTournament());
  } else {
    main.appendChild(viewList());
  }
}
