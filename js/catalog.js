// Pure catalogue and shopping-list logic (no DOM), unit tested in tests/.
// NeedMart is a guide, not a shop: there is a "shopping list", never a cart, bill or total.

// Aisle meta: floor, accent colour and emoji fallback per category.
export const CATEGORIES = {
  'Kitchen': { floor: 0, color: '#e07a3f', icon: '🍳' },
  'Home Utility': { floor: 0, color: '#2f9e8f', icon: '🧽' },
  'Personal Care': { floor: 0, color: '#d16ba5', icon: '🧴' },
  'Mobile Accessories': { floor: 1, color: '#4f7cff', icon: '📱' },
  'Travel': { floor: 1, color: '#d99a12', icon: '🧳' },
  'Office Productivity': { floor: 1, color: '#7a5af5', icon: '🗂️' },
};
export const categoryMeta = c => CATEGORIES[c] || { floor: 0, color: '#8a8f94', icon: '🛍️' };

// "Shop by Problem" quick filters: matched against name, problem, category and benefits.
export const PROBLEMS = [
  { id: 'kitchen', label: 'Messy kitchen', re: /pantry|kitchen|vegetable|chopp/i },
  { id: 'cables', label: 'Tangled cables', re: /cable|tangl/i },
  { id: 'desk', label: 'Cluttered desk', re: /desk/i },
  { id: 'cleaning', label: 'Cleaning chores', re: /clean|surface/i },
  { id: 'drawers', label: 'Messy drawers', re: /drawer|sort/i },
  { id: 'phone', label: 'Phone handling', re: /phone/i },
  { id: 'travel', label: 'Travel comfort', re: /travel|journey|neck/i },
];
const haystack = p => [p.name, p.category, p.problem_solved, p.target_customer, ...(p.key_benefits || [])].join(' ');
export const matchesProblem = (p, problemId) => {
  const pr = PROBLEMS.find(x => x.id === problemId);
  return !pr || pr.re.test(haystack(p));
};

export function filterProducts(products, { category = 'All', query = '', problem = '' } = {}) {
  const q = query.trim().toLowerCase();
  return products.filter(p => (category === 'All' || p.category === category) &&
    (!q || haystack(p).toLowerCase().includes(q)) && (!problem || matchesProblem(p, problem)));
}

// ---------- prices: shown only when present AND verified with a timestamp ----------
export const PRICE_DISCLAIMER = 'Prices and availability are accurate as of the date/time indicated and are subject to change.';
export const hasVerifiedPrice = p => typeof p?.price_inr === 'number' && p.price_inr > 0 &&
  typeof p.verified_at === 'string' && !Number.isNaN(Date.parse(p.verified_at));
export function formatIST(iso) {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' IST';
}
// { verified, text } — unverified (typed-in/demo) prices are never displayed.
export function priceLabel(p) {
  return hasVerifiedPrice(p)
    ? { verified: true, text: `₹${p.price_inr.toLocaleString('en-IN')} (as of ${formatIST(p.verified_at)})` }
    : { verified: false, text: 'Check price' };
}
// Sort modes: '' (as listed), 'name', 'price-asc', 'price-desc'. Items without a verified price always go last.
export function sortProducts(list, mode = '') {
  const out = [...list];
  if (mode === 'name') return out.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === 'price-asc' || mode === 'price-desc') {
    const dir = mode === 'price-asc' ? 1 : -1;
    out.sort((a, b) => {
      const va = hasVerifiedPrice(a), vb = hasVerifiedPrice(b);
      if (va !== vb) return va ? -1 : 1;
      return va ? dir * (a.price_inr - b.price_inr) : 0;
    });
  }
  return out;
}

// ---------- retailer links: plain direct affiliate URL, no redirects/cloaking ----------
export function buyLink(p) {
  const url = (p?.affiliate_url || '').trim();
  if (!/^https:\/\//i.test(url)) return null;
  return { href: url, target: '_blank', rel: 'sponsored noopener' };
}
// Images are hot-linked exactly as provided (never re-hosted); otherwise the emoji placeholder.
export const imageFor = p => (/^https:\/\//i.test(p?.image_url || '') ? p.image_url : null);

// ---------- shopping list (id -> qty) ----------
export function addToList(list, id) { return { ...list, [id]: Math.min(99, (list[id] || 0) + 1) }; }
export function setQuantity(list, id, qty) {
  const next = { ...list };
  if (!Number.isFinite(qty) || qty <= 0) delete next[id]; else next[id] = Math.min(99, Math.floor(qty));
  return next;
}
export const listCount = list => Object.values(list).reduce((a, b) => a + b, 0);
// Drop ids that no longer exist in the catalogue and invalid quantities.
export const cleanList = (list, products) => Object.fromEntries(Object.entries(list || {})
  .filter(([id, q]) => products.some(p => p.id === id) && Number.isFinite(q) && q > 0).map(([id, q]) => [id, Math.min(99, Math.floor(q))]));
export const LIST_KEY = 'needmart.shoppingList.v1';
export function loadList(storage) { try { const v = JSON.parse(storage.getItem(LIST_KEY)); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
export function saveList(storage, list) { try { storage.setItem(LIST_KEY, JSON.stringify(list)); } catch { /* private mode: keep in memory */ } }

// Same shelf slot always shows the same product (V1 picked one at random).
export function productForSlot(products, category, slot) {
  const list = products.filter(p => p.category === category);
  return list.length ? list[slot % list.length] : null;
}
