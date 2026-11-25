import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as L from '../js/layout.js';
import * as C from '../js/catalog.js';
import { CameraRig, PRESETS } from '../js/cameras.js';

const { products } = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url)));
const walk = (s, dx, dz, n) => { for (let i = 0; i < n; i++) s = L.step(s, dx, dz); return s; };

test('stairs lead up to the first floor and back down', () => {
  let s = walk({ x: 12.5, y: 0, z: 7 }, 0, -0.1, 110);
  assert.equal(s.y, L.FLOOR_H); assert.ok(s.z < L.STAIR.minZ);
  s = walk(s, 0, 0.1, 110);
  assert.equal(s.y, 0); assert.ok(s.z > L.STAIR.maxZ);
});
test('cannot enter or leave stairs from the side, or fall into the stairwell', () => {
  assert.ok(walk({ x: 10, y: 0, z: 1 }, 0.1, 0, 30).x <= L.STAIR.minX);
  assert.ok(walk({ x: 10, y: L.FLOOR_H, z: 1 }, 0.1, 0, 30).x <= L.STAIR.minX);
  assert.ok(walk({ x: 12.5, y: 2.25, z: 1.5 }, -0.1, 0, 30).x > L.STAIR.minX);
});
test('shelves and outer walls block movement', () => {
  assert.ok(walk({ x: -2, y: 0, z: 0 }, 0, -0.1, 60).z > -3);
  assert.ok(walk({ x: 0, y: 0, z: 10 }, 0, 0.1, 60).z <= L.BOUNDS.maxZ);
});
test('every section is a free spot you can walk from', () => {
  for (const d of L.DEPARTMENTS) {
    const s = { x: d.x, y: d.floor * L.FLOOR_H, z: d.z };
    assert.notDeepEqual(L.step(s, 0.05, 0), s, d.name);
  }
});
test('camera modes, zoom limits, reset', () => {
  const rig = new CameraRig();
  for (const m of ['drone', 'long', 'orbit', 'walk']) { rig.setMode(m); assert.equal(rig.mode, m); }
  rig.setMode('drone'); for (let i = 0; i < 50; i++) rig.zoom(0.5);
  assert.equal(rig.view.dist, 10);
  rig.reset(); assert.equal(rig.view.dist, PRESETS.drone.dist);
  rig.goTo(L.DEPARTMENTS.find(d => d.floor === 1));
  assert.equal(rig.update(0.016).pos[1], L.FLOOR_H + L.EYE);
});
test('walking forward follows view direction', () => {
  const rig = new CameraRig(); rig.setMode('walk'); rig.move(1, 0, 0.05);
  assert.ok(rig.walker.z < 10);
});
test('reduced motion blocks the tour and camera easing', () => {
  const rig = new CameraRig({ reducedMotion: true }); rig.update(0.016);
  assert.equal(rig.startTour(), false);
  rig.setMode('drone');
  assert.deepEqual(rig.update(0.016).pos, rig.desired().pos);
});
test('catalogue filter and search', () => {
  assert.equal(C.filterProducts(products).length, 8);
  assert.ok(C.filterProducts(products, { category: 'Tech' }).every(p => p.category === 'Tech'));
  assert.equal(C.filterProducts(products, { query: 'cables' }).length, 1);
});
test('cart quantities and total', () => {
  let cart = C.addToCart(C.addToCart({}, 'demo-01'), 'demo-01');
  assert.equal(C.cartCount(cart), 2); assert.equal(C.cartTotal(cart, products), 998);
  cart = C.setQuantity(cart, 'demo-01', 0); assert.deepEqual(cart, {});
});
test('every shelf category has products', () => {
  for (const s of L.SHELVES) assert.ok(C.productForSlot(products, s.category, 3), s.category);
});
