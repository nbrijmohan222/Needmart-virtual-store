// V3 additions: compliance rules (prices, links, images), shopping list, Shop by Problem, aisles and kiosks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../js/catalog.js';
import * as L from '../js/layout.js';

const { products } = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url)));
const verified = { id: 'v1', name: 'V', category: 'Kitchen', problem_solved: 'x', price_inr: 1299, verified_at: '2026-11-20T14:30:00+05:30' };

test('products.json follows the schema and keeps demo items unlinked', () => {
  const keys = ['id', 'name', 'category', 'problem_solved', 'key_benefits', 'target_customer', 'price_inr', 'image_url', 'affiliate_url', 'commission_info', 'source', 'verified_at', 'status'];
  for (const p of products) {
    for (const k of keys) assert.ok(k in p, `${p.id} missing ${k}`);
    assert.ok(['demo', 'verified'].includes(p.status), p.id);
    assert.ok(C.CATEGORIES[p.category], `${p.id} unknown category ${p.category}`);
    if (p.status === 'demo') assert.equal(p.affiliate_url, '', `${p.id} demo item must not carry a link`);
  }
  assert.equal(new Set(products.map(p => p.id)).size, products.length, 'ids unique');
});
test('unverified prices are never shown; verified ones carry an IST timestamp', () => {
  for (const p of products) assert.deepEqual(C.priceLabel(p), { verified: false, text: 'Check price' }, p.id);
  assert.equal(C.priceLabel({ ...verified, verified_at: '' }).text, 'Check price');
  assert.equal(C.priceLabel({ ...verified, price_inr: null }).text, 'Check price');
  const l = C.priceLabel(verified);
  assert.equal(l.verified, true);
  assert.match(l.text, /^₹1,299 \(as of 20 Nov 2026, 2:30\s?pm IST\)$/i);
  assert.match(C.PRICE_DISCLAIMER, /accurate as of the date\/time indicated/);
});
test('price sort puts items without a verified price last', () => {
  const list = [{ ...products[0] }, { ...verified, id: 'b', price_inr: 900 }, { ...verified, id: 'a', price_inr: 100 }];
  assert.deepEqual(C.sortProducts(list, 'price-asc').map(p => p.id), ['a', 'b', products[0].id]);
  assert.deepEqual(C.sortProducts(list, 'price-desc').map(p => p.id), ['b', 'a', products[0].id]);
  assert.deepEqual(C.sortProducts(list, '').map(p => p.id), list.map(p => p.id), 'default keeps order');
});
test('buy links are plain https affiliate URLs with sponsored rel, else disabled', () => {
  assert.equal(C.buyLink({ affiliate_url: '' }), null);
  assert.equal(C.buyLink({ affiliate_url: 'javascript:alert(1)' }), null);
  assert.deepEqual(C.buyLink({ affiliate_url: 'https://www.amazon.in/dp/X?tag=t-21' }),
    { href: 'https://www.amazon.in/dp/X?tag=t-21', target: '_blank', rel: 'sponsored noopener' });
  assert.equal(C.imageFor({ image_url: '' }), null);
  assert.equal(C.imageFor({ image_url: 'https://m.media-amazon.com/images/I/x.jpg' }), 'https://m.media-amazon.com/images/I/x.jpg');
});
test('shopping list persists through storage and drops unknown ids', () => {
  const mem = new Map(), storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(C.loadList(storage), {});
  C.saveList(storage, { 'demo-01': 2, ghost: 1, 'demo-02': -3 });
  assert.deepEqual(C.cleanList(C.loadList(storage), products), { 'demo-01': 2 });
  mem.set(C.LIST_KEY, '{broken'); assert.deepEqual(C.loadList(storage), {});
  let l = {}; for (let i = 0; i < 120; i++) l = C.addToList(l, 'demo-01');
  assert.equal(l['demo-01'], 99);
});
test('Shop by Problem filters match the intended products', () => {
  const ids = id => C.filterProducts(products, { problem: id }).map(p => p.id);
  assert.deepEqual(ids('cables'), ['demo-05']);
  assert.ok(ids('kitchen').includes('demo-01') && ids('kitchen').includes('demo-02'));
  for (const pr of C.PROBLEMS) assert.ok(ids(pr.id).length > 0, `${pr.label} has no products`);
});
test('every aisle has a coloured category, a shelf, a jump target and at least one product', () => {
  for (const [cat, meta] of Object.entries(C.CATEGORIES)) {
    assert.match(meta.color, /^#[0-9a-f]{6}$/i);
    assert.ok(L.SHELVES.some(s => s.category === cat && s.floor === meta.floor), `${cat} shelf on floor ${meta.floor}`);
    assert.ok(L.DEPARTMENTS.some(d => d.category === cat && d.floor === meta.floor), `${cat} jump target`);
    assert.ok(products.some(p => p.category === cat), `${cat} has products`);
  }
  assert.equal(new Set(Object.values(C.CATEGORIES).map(m => m.color)).size, 6, 'distinct aisle colours');
});
test('help kiosks: one per floor at least, reachable, and found when approached', () => {
  for (const f of [0, 1]) assert.ok(L.KIOSKS.some(k => k.floor === f));
  const k = L.KIOSKS[0];
  assert.equal(L.nearbyKiosk({ x: k.x, y: k.floor * L.FLOOR_H, z: k.z + 1 }).id, k.id);
  assert.equal(L.nearbyKiosk({ x: k.x, y: (1 - k.floor) * L.FLOOR_H, z: k.z + 1 }), null, 'other floor');
  // Kiosks are solid
  const s = { x: k.x, y: 0, z: k.z + 1.5 }; let t = s; for (let i = 0; i < 30; i++) t = L.step(t, 0, -0.05);
  assert.ok(t.z > k.z);
});
