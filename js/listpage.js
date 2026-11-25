// products.html: responsive 2D listing (works without WebGL). Same products.json and shopping list as the 3D store.
import { filterProducts, sortProducts, PROBLEMS, CATEGORIES, listCount } from './catalog.js';
import { $, el, button, loadCatalogue, getList, onListChange, addItem, thumb, priceNode, buyNode, catBadge, detailNodes, openBuy } from './shoplist.js';

const params = new URLSearchParams(location.search);
const st = { category: CATEGORIES[params.get('cat')] ? params.get('cat') : 'All', problem: '', sort: '' };
let products = [];

function chips(container, items, isOn, onPick) {
  container.replaceChildren(...items.map(([value, label, color]) => {
    const b = button(label, () => { onPick(value); chips(container, items, isOn, onPick); render(); }, 'chip' + (isOn(value) ? ' on' : ''));
    b.setAttribute('aria-pressed', isOn(value));
    if (color) b.prepend(el('i', { className: 'dot', style: `background:${color}` }));
    return b;
  }));
}
function openDetail(p) {
  let d = $('#detailDialog');
  if (!d) { d = el('dialog', { id: 'detailDialog', className: 'sheet' }); d.addEventListener('click', e => { if (e.target === d) d.close(); }); document.body.append(d); }
  d.replaceChildren(el('div', { className: 'sheet-body' }, ...detailNodes(p, { onClose: () => d.close(), extra: el('a', { className: 'buy alt', href: `index.html#aisle=${encodeURIComponent(p.category)}`, textContent: '📍 See in 3D store' }) })));
  d.showModal?.() ?? d.setAttribute('open', '');
}
function render() {
  const list = sortProducts(filterProducts(products, { category: st.category, problem: st.problem, query: $('#search').value }), st.sort);
  $('#sortNote').hidden = !st.sort.startsWith('price');
  $('#grid').replaceChildren(...(list.length ? list.map((p, i) => {
    const card = el('article', { className: 'card' },
      el('button', { className: 'cardpic', type: 'button', ariaLabel: `Details: ${p.name}`, onclick: () => openDetail(p) }, thumb(p, 'hero')),
      catBadge(p), el('h3', {}, button(p.name, () => openDetail(p), 'link title')),
      el('p', { className: 'muted', textContent: `Solves: ${p.problem_solved}` }), priceNode(p),
      el('div', { className: 'actions' }, button('+ List', () => addItem(p)), buyNode(p)));
    card.style.animationDelay = `${i * 30}ms`; return card;
  }) : [el('p', { className: 'muted', textContent: 'No products match. Try another filter.' })]));
}
const sync = () => ($('#listCount').textContent = listCount(getList()));
try {
  products = await loadCatalogue();
  chips($('#tabs'), [['All', 'All'], ...Object.entries(CATEGORIES).map(([c, m]) => [c, c, m.color])], v => v === st.category, v => (st.category = v));
  chips($('#problems'), PROBLEMS.map(p => [p.id, p.label]), v => v === st.problem, v => (st.problem = st.problem === v ? '' : v));
  $('#search').oninput = render;
  $('#sort').onchange = e => { st.sort = e.target.value; render(); };
  $('#listBtn').onclick = openBuy;
  onListChange(sync); sync(); render();
} catch (err) {
  console.error(err);
  $('#grid').replaceChildren(el('p', { className: 'muted', textContent: 'Could not load products. Serve this folder over HTTP (see README) and reload.' }));
}
