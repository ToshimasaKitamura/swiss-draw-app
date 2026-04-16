import './style.css';
import { load, state } from './state';
import { render } from './render';
import { APP } from './strings';
import { $ } from './dom';

// HTML側の文言を strings.ts と同期(単一ソース化)
document.title = APP.name;
const brand = $<HTMLElement>('.site-header h1');
if (brand) {
  brand.textContent = APP.name;
  brand.classList.add('brand-home');
  brand.setAttribute('role', 'button');
  brand.setAttribute('tabindex', '0');
  brand.title = '大会一覧に戻る';
  const goHome = (): void => { state.view = 'list'; render(); };
  brand.addEventListener('click', goHome);
  brand.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
      e.preventDefault();
      goHome();
    }
  });
}
const metaDesc = $<HTMLMetaElement>('meta[name="description"]');
if (metaDesc) metaDesc.content = APP.description;

load();
state.view = 'list';
render();
