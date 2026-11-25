// Pure catalogue and cart logic.
export function filterProducts(products, { category = 'All', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return products.filter(p => (category === 'All' || p.category === category) &&
    (!q || `${p.name} ${p.category} ${p.problem_solved}`.toLowerCase().includes(q)));
}
export function addToCart(cart, id) { return { ...cart, [id]: (cart[id] || 0) + 1 }; }
export function setQuantity(cart, id, qty) {
  const next = { ...cart };
  if (!Number.isFinite(qty) || qty <= 0) delete next[id]; else next[id] = Math.min(99, Math.floor(qty));
  return next;
}
export const cartCount = cart => Object.values(cart).reduce((a, b) => a + b, 0);
export const cartTotal = (cart, products) => Object.entries(cart)
  .reduce((sum, [id, q]) => sum + (products.find(p => p.id === id)?.price_inr || 0) * q, 0);
// Same shelf slot always shows the same product (V1 picked one at random).
export function productForSlot(products, category, slot) {
  const list = products.filter(p => p.category === category);
  return list.length ? list[slot % list.length] : null;
}
