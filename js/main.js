import * as L from './layout.js';
import { CameraRig } from './cameras.js';
import { buildStore } from './store.js';
import { filterProducts, addToCart, setQuantity, cartCount, cartTotal } from './catalog.js';

const $ = s => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
let products = [], cart = {}, category = 'All';

function toast(text) {
  const t = $('#toast'); t.textContent = text; t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 2400);
}

/* ---------- catalogue and cart (works even without 3D) ---------- */
const button = (text, onclick, cls = '') => el('button', { textContent: text, onclick, className: cls, type: 'button' });
function add(p) { cart = addToCart(cart, p.id); renderCart(); toast(`Added: ${p.name}`); }
function showDetail(p) {
  document.exitPointerLock?.();
  const d = $('#detail'); d.hidden = false;
  d.replaceChildren(el('strong', { textContent: `${p.icon} ${p.name}` }), el('p', { textContent: p.problem_solved }),
    el('strong', { textContent: `₹${p.price_inr}` }), el('p', { className: 'muted', textContent: 'Demo item. Price and availability are not verified.' }),
    button('Add to cart', () => add(p)), button('Close', () => (d.hidden = true), 'secondary'));
  d.scrollIntoView({ block: 'nearest' });
}
function renderProducts() {
  const list = filterProducts(products, { category, query: $('#search').value });
  $('#products').replaceChildren(...(list.length ? list.map(p => el('div', { className: 'product' },
    el('div', { className: 'pic', textContent: p.icon }),
    el('div', {}, el('h3', { textContent: p.name }), el('div', { className: 'muted', textContent: p.category }),
      el('div', { className: 'price', textContent: `₹${p.price_inr}` }),
      button('Add', () => add(p)), button('Details', () => showDetail(p), 'secondary'))))
    : [el('p', { className: 'muted', textContent: 'No matching products.' })]));
}
function renderCart() {
  $('#cartCount').textContent = cartCount(cart);
  $('#total').textContent = `₹${cartTotal(cart, products)}`;
  const lines = Object.entries(cart).map(([id, q]) => {
    const p = products.find(x => x.id === id);
    const set = n => { cart = setQuantity(cart, id, n); renderCart(); };
    return el('div', { className: 'cartline' }, el('span', { textContent: p.name }),
      el('span', {}, button('−', () => set(q - 1), 'secondary'), ` ${q} `, button('+', () => set(q + 1), 'secondary')));
  });
  $('#cart').replaceChildren(...(lines.length ? lines : [el('p', { className: 'muted', textContent: 'Your cart is empty.' })]));
}
function initShop() {
  const cats = ['All', ...new Set(products.map(p => p.category))];
  $('#tabs').replaceChildren(...cats.map(c => {
    const b = button(c, () => { category = c; for (const x of $('#tabs').children) x.className = x === b ? '' : 'secondary'; renderProducts(); }, c === 'All' ? '' : 'secondary');
    return b;
  }));
  $('#search').oninput = renderProducts;
  $('#cartBtn').onclick = () => $('#cart').scrollIntoView({ behavior: 'smooth' });
  renderProducts(); renderCart();
}

/* ---------- 3D ---------- */
async function init3D() {
  const THREE = await import('three');
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xdce8ed);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 150);
  const store = buildStore(THREE, scene, products);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const rig = new CameraRig({ reducedMotion: motion.matches });
  const keys = new Set(), stick = { f: 0, r: 0 };
  let shownFloor = 'all';

  function syncUI() {
    for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', b.dataset.mode === rig.mode);
    $('#joystick').hidden = !(rig.mode === 'walk' && matchMedia('(pointer: coarse)').matches);
    $('#walkHint').hidden = rig.mode !== 'walk';
    $('#floor').value = rig.mode === 'walk' ? String(L.floorOf(rig.walker.y)) : shownFloor;
  }
  const setMode = m => { document.exitPointerLock?.(); keys.clear(); rig.setMode(m); syncUI(); };
  for (const b of document.querySelectorAll('[data-mode]')) b.onclick = () => setMode(b.dataset.mode);
  $('#reset').onclick = () => { rig.reset(); syncUI(); };
  $('#zoomIn').onclick = () => rig.zoom(0.85);
  $('#zoomOut').onclick = () => rig.zoom(1.18);
  $('#plan').onclick = () => { setMode('drone'); rig.topDown(); };
  $('#tour').onclick = () => { if (!rig.startTour()) toast('Tour is off while reduced motion is on'); syncUI(); };
  $('#reduce').checked = motion.matches;
  $('#reduce').onchange = e => { rig.reducedMotion = e.target.checked; if (rig.reducedMotion) rig.touring = false; };
  $('#floor').onchange = e => {
    const v = e.target.value;
    if (rig.mode === 'walk' && v !== 'all') rig.goTo(L.DEPARTMENTS.find(d => d.floor === Number(v)));
    else { if (rig.mode === 'walk') rig.setMode('drone'); shownFloor = v; }
    syncUI();
  };
  $('#dept').append(...L.DEPARTMENTS.map(d => el('option', { value: d.id, textContent: `${d.floor ? '1F' : 'GF'} · ${d.name}` })));
  $('#dept').onchange = e => { const d = L.DEPARTMENTS.find(x => x.id === e.target.value); if (d) { rig.goTo(d); syncUI(); } e.target.value = ''; };

  addEventListener('keydown', e => {
    if (e.target.matches('input, select')) return;
    if (rig.mode === 'walk' && e.key.startsWith('Arrow')) e.preventDefault();
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // Pointer: drag = rotate/look, right-drag or two fingers = pan, pinch/wheel = zoom, click = product
  const pointers = new Map(); let travelled = 0, multi = false;
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(x, y);
    if (document.pointerLockElement === canvas) ndc.set(0, 0);
    else ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const hit = raycaster.intersectObjects(scene.children, true).find(h => visible(h.object));
    const p = products.find(x => x.id === hit?.object.userData.productId);
    if (p) showDetail(p);
  }
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (!pointers.size) { travelled = 0; multi = false; } else multi = true;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (document.pointerLockElement !== canvas) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (document.pointerLockElement === canvas) return rig.rotate(e.movementX, e.movementY);
    const prev = pointers.get(e.pointerId); if (!prev) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    travelled += Math.abs(dx) + Math.abs(dy);
    if (pointers.size === 2) {
      const other = [...pointers].find(([id]) => id !== e.pointerId)[1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y), after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before && after) rig.zoom(before / after);
      rig.pan(dx / 2, dy / 2);
    } else if (e.buttons & 2) rig.pan(dx, dy); else rig.rotate(dx, dy);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  canvas.addEventListener('pointerup', e => { pointers.delete(e.pointerId); if (e.button === 0 && travelled < 8 && !multi) pick(e.clientX, e.clientY); });
  canvas.addEventListener('pointercancel', e => pointers.delete(e.pointerId));
  canvas.addEventListener('wheel', e => { e.preventDefault(); rig.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
  $('#lock').onclick = () => canvas.requestPointerLock?.();

  // Touch joystick
  const joy = $('#joystick'), knob = $('#knob'); let joyId = null;
  const joyMove = e => {
    if (e.pointerId !== joyId) return;
    const r = joy.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const len = Math.max(1, Math.hypot(x, y)); x /= len; y /= len;
    stick.r = x; stick.f = -y; knob.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
  };
  const joyEnd = () => { joyId = null; stick.f = stick.r = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
  joy.addEventListener('pointermove', joyMove);
  joy.addEventListener('pointerup', joyEnd);
  joy.addEventListener('pointercancel', joyEnd);

  // Minimap
  const map = $('#map'), g = map.getContext('2d');
  function drawMap(floor) {
    const sx = x => (x + 14) / 28 * map.width, sz = z => (z + 12) / 24 * map.height;
    const rect = (x, z, w, d, c) => { g.fillStyle = c; g.fillRect(sx(x - w / 2), sz(z - d / 2), w / 28 * map.width, d / 24 * map.height); };
    rect(0, 0, 28, 24, '#eef3f7');
    for (const s of L.SHELVES) if (s.floor === floor) rect(s.x, s.z, 3.3, 0.8, '#31566c');
    if (!floor) for (const c of L.CHECKOUTS) rect(c.x, c.z, 3.2, 1.2, '#087e9a');
    rect(12.5, 1.5, 3, 9, '#9fb0ba');
    g.fillStyle = '#082f49'; g.font = '11px system-ui'; g.fillText(floor ? 'First floor' : 'Ground floor', 5, 13);
    if (rig.mode === 'walk') {
      const { x, z } = rig.walker;
      g.fillStyle = '#e11d48'; g.beginPath(); g.arc(sx(x), sz(z), 4, 0, 7); g.fill();
      g.strokeStyle = '#e11d48'; g.beginPath(); g.moveTo(sx(x), sz(z));
      g.lineTo(sx(x - Math.sin(rig.look.yaw) * 2.5), sz(z - Math.cos(rig.look.yaw) * 2.5)); g.stroke();
    }
  }

  new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect(); if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }).observe(canvas);

  let last = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const k = (...codes) => (codes.some(c => keys.has(c)) ? 1 : 0);
    rig.move(k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown') + stick.f, k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft') + stick.r, dt);
    const view = rig.update(dt);
    // Long and wide views need to pull back on narrow (portrait) screens.
    const fit = rig.mode === 'walk' ? 1 : Math.max(1, 1.3 / camera.aspect);
    camera.position.set(...view.pos.map((p, i) => view.target[i] + (p - view.target[i]) * fit));
    camera.lookAt(...view.target);
    if (camera.fov !== view.fov) { camera.fov = view.fov; camera.updateProjectionMatrix(); }
    const walking = rig.mode === 'walk';
    store.upper.visible = walking || shownFloor !== '0';
    store.roof.visible = walking;
    store.front.visible = walking;
    // Dollhouse view: hide any wall standing between an outside camera and the store.
    for (const w of store.walls) {
      const at = camera.position[w.axis];
      w.mesh.visible = walking || (w.limit < 0 ? at > w.limit : at < w.limit);
    }
    store.slabMat.opacity = walking || shownFloor === '1' ? 1 : 0.3;
    const floor = walking ? L.floorOf(rig.walker.y) : shownFloor === '1' ? 1 : 0;
    if (walking && $('#floor').value !== String(floor)) $('#floor').value = String(floor);
    drawMap(floor);
    renderer.render(scene, camera);
  });
  syncUI();
  $('#loading').hidden = true;
}

async function start() {
  try {
    const res = await fetch('data/products.json');
    if (!res.ok) throw new Error(res.status);
    products = (await res.json()).products;
    initShop();
  } catch (err) {
    console.error(err); $('#loading').textContent = 'Could not load products. Serve this folder with a local server and reload.'; return;
  }
  try { await init3D(); }
  catch (err) {
    console.error(err);
    $('#loading').textContent = '3D store could not start (no WebGL or no network). You can still shop from the list.';
  }
}
start();
