import * as L from './layout.js';
import { CameraRig } from './cameras.js';
import { buildStore } from './store.js';
import { filterProducts, sortProducts, PROBLEMS, CATEGORIES, categoryMeta, listCount } from './catalog.js';
import { $, el, button, loadCatalogue, getProducts, getList, onListChange, addItem, toast, thumb, priceNode, detailNodes, listNodes, openBuy } from './shoplist.js';

let products = [], category = 'All', problem = '', goToAisle = null;
const progress = (pct, text) => { $('#bar').style.width = pct + '%'; if (text) $('#loadText').textContent = text; };

/* ---------- catalogue and shopping list (works even without 3D) ---------- */
function showDetail(p) {
  document.exitPointerLock?.();
  const d = $('#detail'); d.hidden = false; d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop');
  const dept = L.DEPARTMENTS.find(x => x.category === p.category);
  d.replaceChildren(...detailNodes(p, { onClose: () => (d.hidden = true), extra: goToAisle && dept ? button('📍 Go to aisle', () => goToAisle(dept), 'secondary') : null }));
  d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function renderProducts() {
  const list = sortProducts(filterProducts(products, { category, problem, query: $('#search').value }));
  $('#products').replaceChildren(...(list.length ? list.map(p => el('div', { className: 'product' },
    thumb(p),
    el('div', {}, el('h3', { textContent: p.name }), el('div', { className: 'muted', textContent: p.problem_solved }),
      priceNode(p),
      button('+ List', () => addItem(p)), button('Details', () => showDetail(p), 'secondary'))))
    : [el('p', { className: 'muted', textContent: 'No matching products.' })]));
}
function renderList() {
  $('#listCount').textContent = listCount(getList());
  $('#list').replaceChildren(...listNodes({ compact: true }));
}
function chips(container, items, isOn, onPick) {
  container.replaceChildren(...items.map(([value, label, color]) => {
    const b = button(label, () => { onPick(value); chips(container, items, isOn, onPick); }, 'chip' + (isOn(value) ? ' on' : ''));
    b.setAttribute('aria-pressed', isOn(value));
    if (color) b.prepend(el('i', { className: 'dot', style: `background:${color}` }));
    return b;
  }));
}
function initShop() {
  chips($('#tabs'), [['All', 'All'], ...Object.entries(CATEGORIES).map(([c, m]) => [c, c, m.color])], v => v === category, v => { category = v; renderProducts(); });
  chips($('#problems'), PROBLEMS.map(p => [p.id, p.label]), v => v === problem, v => { problem = problem === v ? '' : v; renderProducts(); });
  $('#search').oninput = renderProducts;
  $('#listBtn').onclick = openBuy;
  onListChange(renderList);
  renderProducts(); renderList();
}

/* ---------- 3D ---------- */
async function init3D() {
  progress(40, 'Loading 3D engine…');
  const THREE = await import('three');
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2 });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf1e6d6);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 150);
  progress(70, 'Building aisles…');
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
  // Quick jump: a short fade hides the cut (the rig cuts rather than flying through walls).
  const jump = d => {
    const f = $('#fade');
    const go = () => { rig.goTo(d); keys.clear(); syncUI(); toast(`${d.floor ? 'First floor' : 'Ground floor'} · ${d.name}`); };
    if (rig.reducedMotion) return go();
    f.classList.add('on'); setTimeout(() => { go(); f.classList.remove('on'); }, 220);
  };
  goToAisle = jump;
  $('#dept').onchange = e => { const d = L.DEPARTMENTS.find(x => x.id === e.target.value); if (d) jump(d); e.target.value = ''; };
  $('#jump').replaceChildren(...L.DEPARTMENTS.map(d => {
    const b = button(`${d.floor ? '1F' : 'GF'} · ${d.name}`, () => jump(d), 'chip');
    b.prepend(el('i', { className: 'dot', style: `background:${d.category ? categoryMeta(d.category).color : '#082f49'}` }));
    return b;
  }));

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
    const id = hit?.object.userData.productIds?.[hit.instanceId] ?? hit?.object.userData.productId;
    const p = products.find(x => x.id === id);
    if (p) showDetail(p);
    const k = L.KIOSKS.find(x => x.id === hit?.object.userData.kioskId);
    if (k) tip(k);
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
    for (const s of L.SHELVES) if (s.floor === floor) rect(s.x, s.z, 3.3, 0.8, categoryMeta(s.category).color);
    if (!floor) for (const c of L.HELP_DESKS) rect(c.x, c.z, 3.2, 1.2, '#0e5a43');
    for (const k of L.KIOSKS) if (k.floor === floor) rect(k.x, k.z, 0.9, 0.9, '#fbbf24');
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
    if (walking) { const k = L.nearbyKiosk(rig.walker); if (k && k !== lastKiosk) tip(k); lastKiosk = k || (lastKiosk && L.nearbyKiosk(rig.walker, 3.5)) || null; }
    renderer.render(scene, camera);
  });
  syncUI();
  progress(100, 'Store is open');
  const enter = $('#enter'); enter.disabled = false; enter.textContent = 'Enter Store';
  enter.onclick = () => {
    $('#welcome').classList.add('gone');
    const want = decodeURIComponent((location.hash.match(/aisle=([^&]+)/) || [])[1] || '');
    const d = L.DEPARTMENTS.find(x => x.category === want);
    if (d) jump(d); else setTimeout(() => tip(L.KIOSKS[0]), 600);
  };
  // Test/debug hook (used by the headless browser check)
  window.__needmart = {
    ready: true, rig, setMode, products,
    goTo: id => { const d = L.DEPARTMENTS.find(x => x.id === id); rig.goTo(d); rig.update(1); syncUI(); },
    get state() { return { mode: rig.mode, ...rig.walker, floor: L.floorOf(rig.walker.y) }; },
    info: () => renderer.info.render,
    // Screen point (client px) of a product package that a click there would really hit, for the browser check.
    productPoint() {
      const r = canvas.getBoundingClientRect(), m = new THREE.Matrix4(), v = new THREE.Vector3();
      for (const im of store.hotspots) {
        if (!im.parent.visible) continue;
        for (let i = 0; i < im.count; i++) {
          if (!im.userData.productIds[i]) continue;
          im.getMatrixAt(i, m); v.setFromMatrixPosition(m).project(camera);
          if (Math.abs(v.x) > 0.7 || Math.abs(v.y) > 0.7 || v.z > 1) continue;
          raycaster.setFromCamera(new THREE.Vector2(v.x, v.y), camera);
          const hit = raycaster.intersectObjects(scene.children, true).find(h => h.object.visible && h.object.parent.visible);
          if (hit?.object === im && hit.instanceId === i) return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, id: im.userData.productIds[i] };
        }
      }
      return null;
    },
  };
}
let lastKiosk = null, tipTimer;
function tip(k) {
  const b = $('#bubble'); b.replaceChildren(el('strong', { textContent: 'ℹ NeedMart help' }), el('span', { textContent: k.tip }));
  b.hidden = false; clearTimeout(tipTimer); tipTimer = setTimeout(() => (b.hidden = true), 6500);
}

async function start() {
  try {
    progress(20, 'Loading products…');
    products = await loadCatalogue();
    initShop();
  } catch (err) {
    console.error(err); progress(100, 'Could not load products. Serve this folder with a local server and reload.'); return;
  }
  try { await init3D(); }
  catch (err) {
    console.error(err);
    progress(100, '3D store could not start (no WebGL or no network). You can still browse the list.');
    const enter = $('#enter'); enter.disabled = false; enter.textContent = 'Browse products'; enter.onclick = () => (location.href = 'products.html');
  }
}
start();
