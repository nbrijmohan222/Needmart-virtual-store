// Shared DOM UI for index.html and products.html: product detail, "My Shopping List" and "Buy from retailer".
// Logic lives in catalog.js (pure, tested); this file only renders.
import * as C from './catalog.js';

export const $ = s => document.querySelector(s);
export const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.filter(k => k != null)); return n; };
export const button = (text, onclick, cls = '', extra = {}) => el('button', { textContent: text, onclick, className: cls, type: 'button', ...extra });

let products = [], list = {};
const listeners = new Set();
export const getProducts = () => products;
export const getList = () => list;
export const onListChange = fn => listeners.add(fn);
function commit(next) { list = next; C.saveList(localStorage, list); listeners.forEach(f => f(list)); }

export async function loadCatalogue(url = 'data/products.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`products.json ${res.status}`);
  products = ((await res.json()).products || []).filter(p => p && p.id && p.name);
  list = C.cleanList(C.loadList(localStorage), products);
  // Keep tabs/pages in sync when the list changes elsewhere.
  addEventListener('storage', e => { if (e.key === C.LIST_KEY) { list = C.cleanList(C.loadList(localStorage), products); listeners.forEach(f => f(list)); } });
  return products;
}
export function addItem(p) { commit(C.addToList(list, p.id)); toast(`Added to My Shopping List: ${p.name}`); }
export const setQty = (id, q) => commit(C.setQuantity(list, id, q));

export function toast(text) {
  const t = $('#toast'); if (!t) return;
  t.textContent = text; t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 2400);
}

// ---------- small building blocks ----------
export function thumb(p, cls = 'pic') {
  const meta = C.categoryMeta(p.category), src = C.imageFor(p);
  const box = el('div', { className: cls }); box.style.background = meta.color + '22';
  if (src) {
    const img = el('img', { src, alt: p.name, loading: 'lazy', referrerPolicy: 'no-referrer' });
    img.onerror = () => img.replaceWith(p.icon || meta.icon);
    box.append(img);
  } else box.textContent = p.icon || meta.icon;
  return box;
}
export function priceNode(p) {
  const pl = C.priceLabel(p);
  return el('div', { className: pl.verified ? 'price' : 'price unverified', textContent: pl.text });
}
export function buyNode(p, label = 'Buy on retailer ↗') {
  const link = C.buyLink(p);
  return link ? el('a', { className: 'buy', textContent: label, ...link })
    : el('span', { className: 'buy off', textContent: 'Link coming soon', ariaDisabled: 'true', title: 'Retailer link not added yet' });
}
export const catBadge = p => { const b = el('span', { className: 'tag', textContent: p.category }); b.style.color = C.categoryMeta(p.category).color; b.style.background = C.categoryMeta(p.category).color + '1f'; return b; };
export const statusBadge = p => el('span', { className: 'tag ' + (p.status === 'verified' ? 'ok' : ''), textContent: p.status === 'verified' ? 'Verified' : 'Demo item' });

// ---------- product detail ----------
export function detailNodes(p, { onClose, extra } = {}) {
  const benefits = (p.key_benefits || []).length ? el('ul', { className: 'benefits' }, ...p.key_benefits.map(b => el('li', { textContent: b }))) : null;
  return [
    el('div', { className: 'detail-head' }, thumb(p, 'hero'), el('div', {}, el('h3', { textContent: p.name }), el('div', { className: 'tags' }, catBadge(p), statusBadge(p)))),
    el('p', {}, el('strong', { textContent: 'Solves: ' }), p.problem_solved),
    benefits,
    p.target_customer ? el('p', { className: 'muted', textContent: `Good for: ${p.target_customer}` }) : null,
    priceNode(p),
    C.hasVerifiedPrice(p) ? el('p', { className: 'fine', textContent: C.PRICE_DISCLAIMER }) : null,
    p.status !== 'verified' ? el('p', { className: 'note', textContent: 'Demo catalogue item — not yet linked to a retailer offer.' }) : null,
    el('div', { className: 'actions' }, button('+ Add to My Shopping List', () => addItem(p)), buyNode(p), extra || null, onClose ? button('Close', onClose, 'secondary') : null),
    el('p', { className: 'fine', textContent: "NeedMart doesn't sell this item or take payments; you buy on the retailer's site." }),
  ].filter(Boolean);
}

// ---------- shopping list + buy from retailer ----------
export function listNodes({ compact = false } = {}) {
  const lines = Object.entries(list).map(([id, q]) => [products.find(p => p.id === id), q]).filter(([p]) => p);
  if (!lines.length) return [el('p', { className: 'muted', textContent: 'Your shopping list is empty. Add products from the shelves or the list.' })];
  return [
    ...lines.map(([p, q]) => el('div', { className: 'listline' }, thumb(p),
      el('div', { className: 'grow' }, el('strong', { textContent: p.name }), priceNode(p),
        el('div', { className: 'row' },
          el('span', { className: 'qty' }, button('−', () => setQty(p.id, q - 1), 'secondary', { ariaLabel: `One fewer ${p.name}` }), el('b', { textContent: String(q) }), button('+', () => setQty(p.id, q + 1), 'secondary', { ariaLabel: `One more ${p.name}` })),
          button('Remove', () => setQty(p.id, 0), 'link'),
          compact ? null : buyNode(p))))),
    compact ? button('Buy from retailer →', openBuy, 'wide') : null,
    el('p', { className: 'fine', textContent: "Saved on this device only. NeedMart doesn't sell items or process payments — each item is bought on the retailer's own site." }),
  ].filter(Boolean);
}
function dialog() {
  let d = $('#buyDialog');
  if (!d) {
    d = el('dialog', { id: 'buyDialog', className: 'sheet' });
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    document.body.append(d);
    onListChange(() => d.open && fillBuy(d));
  }
  return d;
}
function fillBuy(d) {
  d.replaceChildren(el('div', { className: 'sheet-head' }, el('h2', { textContent: 'Buy from retailer' }), button('✕', () => d.close(), 'secondary', { ariaLabel: 'Close' })),
    el('p', { className: 'note', textContent: "Shop on Amazon / Flipkart via these links. NeedMart doesn't process payments: each button opens the retailer's site in a new tab, where you check the current price and buy." }),
    el('div', { className: 'sheet-body' }, ...listNodes()));
}
export function openBuy() { const d = dialog(); fillBuy(d); d.showModal?.() ?? d.setAttribute('open', ''); }
