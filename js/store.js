// Builds the two-floor store. Returns groups so views can hide roof / walls / upper floor.
import * as L from './layout.js';
import { productForSlot } from './catalog.js';

export function buildStore(THREE, scene, products) {
  const materials = new Map();
  const mat = color => materials.get(color) ||
    materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 })).get(color);
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const ground = new THREE.Group(), upper = new THREE.Group(), roof = new THREE.Group(), front = new THREE.Group();
  scene.add(ground, upper, roof, front);
  const hotspots = [], walls = [];
  // Separate material so upper floors can be see-through in outside views.
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xd5dde0, roughness: 0.8, transparent: true });

  function box(group, x, y, z, w, h, d, color) {
    const m = new THREE.Mesh(unit, mat(color));
    m.position.set(x, y, z); m.scale.set(w, h, d);
    group.add(m); return m;
  }
  function sign(group, text, x, y, z, w = 3) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#082f49'; g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#fbbf24'; g.font = 'bold 40px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 48, 490);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide }));
    m.position.set(x, y, z); group.add(m);
  }

  // Ground floor, outer walls, entrance
  box(ground, 0, -0.1, 0, 28, 0.2, 24, 0xe8e3d8);
  for (const [group, base] of [[ground, 0], [upper, L.FLOOR_H]]) {
    walls.push(
      { mesh: box(group, 0, base + 2.25, -12.1, 28, 4.5, 0.2, 0xe6edf0), axis: 'z', limit: -12 },
      { mesh: box(group, -14.1, base + 2.25, 0, 0.2, 4.5, 24, 0xdde7ec), axis: 'x', limit: -14 },
      { mesh: box(group, 14.1, base + 2.25, 0, 0.2, 4.5, 24, 0xdde7ec), axis: 'x', limit: 14 });
  }
  for (const x of [-8.5, 8.5]) box(front, x, 4.5, 12.1, 11, 9, 0.2, 0xcfdde4);
  box(front, 0, 6, 12.1, 6, 6, 0.2, 0xcfdde4);
  sign(front, 'NeedMart · Entrance', 0, 3.5, 11.95, 5);

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
  L.SHELVES.forEach((s, n) => {
    const group = s.floor ? upper : ground, base = s.floor * L.FLOOR_H;
    box(group, s.x, base + 1.15, s.z, 3.3, 2.3, 0.2, 0x8b9ba3);
    for (let level = 0; level < 3; level++) {
      box(group, s.x, base + 0.62 + level * 0.68, s.z, 3.3, 0.06, 0.8, 0xd4dce0);
      for (const side of [1, -1]) for (let i = 0; i < 7; i++) {
        const slot = n + level + Math.floor(i / 3);
        const product = productForSlot(products, s.category, slot);
        const p = box(group, s.x - 1.35 + i * 0.45, base + 0.88 + level * 0.68, s.z + side * 0.25,
          0.27, 0.42, 0.28, colors[(slot * 2) % colors.length]);
        if (product) { p.userData.productId = product.id; hotspots.push(p); }
      }
    }
    sign(group, s.category, s.x, base + 2.75, s.z, 2.4);
  });

  for (const c of L.CHECKOUTS) {
    box(ground, c.x, 0.55, c.z, 3.2, 1.1, 1.2, 0x087e9a);
    box(ground, c.x, 1.15, c.z, 1.1, 0.12, 1.25, 0xf4f7f8);
    sign(ground, 'Checkout', c.x, 2.4, c.z, 2);
  }

  // Staff positions: markers only until licensed realistic models are supplied.
  for (const [x, z] of [[2.5, 9], [-9.5, 0]]) {
    box(ground, x, 0.02, z, 0.8, 0.03, 0.8, 0xfbbf24);
    sign(ground, 'Staff point · human model pending', x, 1.7, z, 2.2);
  }

  // Roof and lights
  box(roof, 0, L.FLOOR_H * 2 + 0.1, 0, 28, 0.2, 24, 0xf4f6f4);
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [group, h] of [[ground, 4.25], [roof, 8.95]])
    for (let x = -9; x <= 8; x += 4.25) for (const z of [-7, 0, 7]) {
      const m = new THREE.Mesh(unit, lamp); m.position.set(x, h, z); m.scale.set(1.8, 0.05, 0.25); group.add(m);
    }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8799a5, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-5, 14, 7); scene.add(sun);

  return { ground, upper, roof, front, hotspots, walls, slabMat };
}
