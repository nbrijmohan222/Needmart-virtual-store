// Builds the two-floor store. Returns groups so views can hide roof / walls / upper floor.
import * as L from './layout.js';
import { productForSlot, categoryMeta } from './catalog.js';

export function buildStore(THREE, scene, products) {
  const materials = new Map();
  const mat = color => materials.get(color) ||
    materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 })).get(color);
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const ground = new THREE.Group(), upper = new THREE.Group(), roof = new THREE.Group(), front = new THREE.Group();
  scene.add(ground, upper, roof, front);
  const hotspots = [], walls = [];
  // Separate material so upper floors can be see-through in outside views.
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xe7dccb, emissive: 0x4a4238, roughness: 0.8, transparent: true });

  function box(group, x, y, z, w, h, d, color) {
    const m = new THREE.Mesh(unit, mat(color));
    m.position.set(x, y, z); m.scale.set(w, h, d);
    group.add(m); return m;
  }
  // Canvas-texture signboard; bg = accent colour, fg = text colour, optional sub-line.
  function sign(group, text, x, y, z, w = 3, bg = '#082f49', fg = '#fbbf24', sub = '') {
    const c = document.createElement('canvas'); c.width = 512; c.height = sub ? 128 : 96;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, c.height);
    g.fillStyle = fg; g.font = 'bold 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 46, 490);
    if (sub) { g.font = '600 22px system-ui, sans-serif'; g.globalAlpha = 0.9; g.fillText(sub, 256, 100, 490); g.globalAlpha = 1; }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / 512),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.position.set(x, y, z); group.add(m); return m;
  }

  // Ground floor, outer walls, entrance
  box(ground, 0, -0.1, 0, 28, 0.2, 24, 0xe9dfcf);
  for (const [group, base] of [[ground, 0], [upper, L.FLOOR_H]]) {
    walls.push(
      { mesh: box(group, 0, base + 2.25, -12.1, 28, 4.5, 0.2, 0xe6edf0), axis: 'z', limit: -12 },
      { mesh: box(group, -14.1, base + 2.25, 0, 0.2, 4.5, 24, 0xdde7ec), axis: 'x', limit: -14 },
      { mesh: box(group, 14.1, base + 2.25, 0, 0.2, 4.5, 24, 0xdde7ec), axis: 'x', limit: 14 });
  }
  for (const x of [-8.5, 8.5]) box(front, x, 4.5, 12.1, 11, 9, 0.2, 0xcfdde4);
  box(front, 0, 6, 12.1, 6, 6, 0.2, 0xcfdde4);
  sign(front, 'NeedMart · Entrance', 0, 3.5, 11.95, 5);
  for (const [g, base] of [[ground, 0], [upper, L.FLOOR_H]])
    sign(g, 'Shop on Amazon / Flipkart via these links', 0, base + 3.3, -11.95, 7, '#b4532a', '#ffffff', 'NeedMart is a guide, not a seller · check price & buy on the retailer site');

  // Upper slab, leaving the stairwell open
  const y = L.FLOOR_H - 0.1, S = L.STAIR;
  box(upper, (-14 + S.minX) / 2, y, 0, S.minX + 14, 0.2, 24, 0xd5dde0).material = slabMat;
  box(upper, (S.minX + 14) / 2, y, (-12 + S.minZ) / 2, 14 - S.minX, 0.2, S.minZ + 12, 0xd5dde0).material = slabMat;
  box(upper, (S.minX + 14) / 2, y, (S.maxZ + 12) / 2, 14 - S.minX, 0.2, 12 - S.maxZ, 0xd5dde0).material = slabMat;
  // Railing along the open side of the stairwell
  box(upper, S.minX, L.FLOOR_H + 1, (S.minZ + S.maxZ) / 2, 0.08, 0.08, S.maxZ - S.minZ, 0x31566c);
  box(upper, 12.5, L.FLOOR_H + 1, S.maxZ, 3, 0.08, 0.08, 0x31566c);

  // Stairs
  const steps = 22, run = (S.maxZ - S.minZ) / steps;
  for (let i = 0; i < steps; i++) {
    const top = L.FLOOR_H * (i + 1) / steps;
    box(ground, 12.5, top - 0.1, S.maxZ - run * (i + 0.5), 2.9, 0.2, run, 0x8799a5);
  }
  sign(ground, '↑ First Floor', 12.5, 3, S.maxZ + 0.1, 2.6);

  // Shelves with clickable demo packages
  const colors = [0x35a66f, 0xe9b949, 0xd66a54, 0x5a91bd, 0xc27ab2, 0xf18b42];
  const packs = [[], []]; // per floor; drawn as one InstancedMesh each (was ~670 separate meshes)
  L.SHELVES.forEach((s, n) => {
    const group = s.floor ? upper : ground, base = s.floor * L.FLOOR_H;
    const meta = categoryMeta(s.category), accent = new THREE.Color(meta.color).getHex();
    box(group, s.x, base + 1.15, s.z, 3.3, 2.3, 0.2, 0xe6dccb);
    box(group, s.x, base + 2.33, s.z, 3.36, 0.1, 0.84, accent);   // aisle-colour top cap
    box(group, s.x, base + 0.02, s.z, 3.5, 0.04, 1.4, new THREE.Color(meta.color).lerp(new THREE.Color(0xe9dfcf), 0.6).getHex()); // floor accent
    for (let level = 0; level < 3; level++) {
      box(group, s.x, base + 0.62 + level * 0.68, s.z, 3.3, 0.06, 0.8, 0xf3ede2);
      for (const side of [1, -1]) box(group, s.x, base + 0.62 + level * 0.68, s.z + side * 0.41, 3.3, 0.07, 0.02, accent);
      for (const side of [1, -1]) for (let i = 0; i < 7; i++) {
        const slot = n + level + Math.floor(i / 3);
        const product = productForSlot(products, s.category, slot);
        packs[s.floor].push({ x: s.x - 1.35 + i * 0.45, y: base + 0.88 + level * 0.68, z: s.z + side * 0.25,
          color: product && slot % 3 === 0 ? accent : colors[(slot * 2) % colors.length], id: product?.id || null });
      }
    }
    sign(group, `${meta.icon} ${s.category}`, s.x, base + 3.35, s.z, 2.4, meta.color, '#ffffff');
  });
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  packs.forEach((list, floor) => {
    const im = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ roughness: 0.7 }), list.length);
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z); dummy.scale.set(0.27, 0.42, 0.28); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tint.setHex(p.color));
    });
    im.userData.productIds = list.map(p => p.id); // raycast hit.instanceId -> product id
    (floor ? upper : ground).add(im); hotspots.push(im);
  });

  // Help desks (no tills: NeedMart doesn't take payments)
  for (const c of L.HELP_DESKS) {
    box(ground, c.x, 0.55, c.z, 3.2, 1.1, 1.2, 0x9a7650);
    box(ground, c.x, 1.13, c.z, 3.3, 0.06, 1.3, 0xfbbf24);
    sign(ground, 'ℹ Help desk', c.x, 3.1, c.z, 1.9, '#0e5a43', '#ffffff', 'Questions · shopping-list help');
  }

  // Staff points: branded help kiosks (clickable) until licensed realistic human models are supplied.
  const kiosks = [];
  for (const k of L.KIOSKS) {
    const group = k.floor ? upper : ground, base = k.floor * L.FLOOR_H;
    const parts = [box(group, k.x, base + 0.55, k.z, 0.6, 1.1, 0.4, 0x082f49), box(group, k.x, base + 1.12, k.z, 0.7, 0.05, 0.5, 0xfbbf24),
      box(group, k.x, base + 0.02, k.z, 1.2, 0.03, 1.2, 0xfbbf24),
      sign(group, 'ℹ Help', k.x, base + 1.55, k.z, 0.9, '#0e5a43', '#ffffff', 'Tap for tips')];
    for (const p of parts) { p.userData.kioskId = k.id; kiosks.push(p); }
  }

  // Roof and lights
  box(roof, 0, L.FLOOR_H * 2 + 0.1, 0, 28, 0.2, 24, 0xf4f6f4);
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  for (const [group, h] of [[ground, 4.25], [roof, 8.95]])
    for (let x = -9; x <= 8; x += 4.25) for (const z of [-7, 0, 7]) {
      const m = new THREE.Mesh(unit, lamp); m.position.set(x, h, z); m.scale.set(1.8, 0.05, 0.25); group.add(m);
    }
  // Soft warm store lighting
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0xcdbba3, 1.9));
  const sun = new THREE.DirectionalLight(0xffe2bd, 1.3); sun.position.set(-5, 14, 7); scene.add(sun);

  return { ground, upper, roof, front, hotspots, kiosks, walls, slabMat };
}
