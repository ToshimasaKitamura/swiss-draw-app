type EventHandler = (e: Event) => void;

type ElProps = Record<string, unknown> & {
  class?: string;
  text?: string;
  html?: string;
  onclick?: EventHandler;
  onchange?: EventHandler;
  oninput?: EventHandler;
  onsubmit?: EventHandler;
};

type ElChild = Node | string | null | false | undefined;

export function $<T extends Element = Element>(
  sel: string,
  root: ParentNode = document
): T | null {
  return root.querySelector<T>(sel);
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  children: ElChild | ElChild[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'onclick') node.addEventListener('click', v as EventHandler);
    else if (k === 'onchange') node.addEventListener('change', v as EventHandler);
    else if (k === 'oninput') node.addEventListener('input', v as EventHandler);
    else if (k === 'onsubmit') node.addEventListener('submit', v as EventHandler);
    else if (k === 'html') node.innerHTML = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k in node) (node as unknown as Record<string, unknown>)[k] = v;
    else node.setAttribute(k, String(v));
  }
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const escapeHtml = (s: string | number): string =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );

export const fmtDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
