// Pure store geometry and movement rules (no Three.js), so it can be unit tested.
export const BOUNDS = { minX: -13.5, maxX: 13.5, minZ: -11.5, maxZ: 11.5 };
export const FLOOR_H = 4.5;
export const EYE = 1.7;
export const RADIUS = 0.3;
export const STAIR = { minX: 11, maxX: 14, minZ: -3, maxZ: 6 }; // bottom at maxZ, top at minZ

// Ground floor: Kitchen, Home Utility, Personal Care. First floor: Mobile Accessories, Travel, Office Productivity.
export const SHELVES = [
  ...[-7, -2, 3, 8].map(x => ({ x, z: -3, floor: 0, category: 'Kitchen' })),
  ...[-7, -2].map(x => ({ x, z: 3, floor: 0, category: 'Home Utility' })),
  ...[3, 8].map(x => ({ x, z: 3, floor: 0, category: 'Personal Care' })),
  ...[-7, -2].map(x => ({ x, z: -5, floor: 1, category: 'Mobile Accessories' })),
  ...[3, 8].map(x => ({ x, z: -5, floor: 1, category: 'Travel' })),
  ...[-7, -2, 3, 8].map(x => ({ x, z: 2, floor: 1, category: 'Office Productivity' })),
];
export const SHELF_SIZE = { w: 3.3, d: 0.8 };
// Former checkout counters: NeedMart sells nothing, so these are help desks.
export const HELP_DESKS = [{ x: -7, z: 7.5 }, { x: -2, z: 7.5 }];
// Staff points: branded help kiosks until licensed realistic human GLB models are supplied (no stylised people).
export const KIOSKS = [
  { id: 'entrance', floor: 0, x: 2.5, z: 9, tip: 'Welcome to NeedMart! Every aisle solves an everyday problem. Tap a product to see what it fixes, then buy it on the retailer\'s site.' },
  { id: 'ground', floor: 0, x: -10.5, z: 0, tip: 'Ground floor: Kitchen, Home Utility and Personal Care. Mobile, Travel and Office are upstairs — stairs on the right side of the store.' },
  { id: 'first', floor: 1, x: 9.5, z: -1, tip: 'First floor: Mobile Accessories, Travel and Office Productivity. The stairs down are right beside this kiosk.' },
];
export const KIOSK_SIZE = { w: 0.7, d: 0.5 };

export const DEPARTMENTS = [
  { id: 'entrance', name: 'Entrance', floor: 0, x: 0, z: 10, yaw: 0 },
  { id: 'kitchen', name: 'Kitchen', floor: 0, x: 0.5, z: -0.8, yaw: 0, category: 'Kitchen' },
  { id: 'home', name: 'Home Utility', floor: 0, x: -4.5, z: 5.2, yaw: 0, category: 'Home Utility' },
  { id: 'care', name: 'Personal Care', floor: 0, x: 5.5, z: 5.2, yaw: 0, category: 'Personal Care' },
  { id: 'help', name: 'Help desk', floor: 0, x: -4.5, z: 10, yaw: 0 },
  { id: 'mobile', name: 'Mobile Accessories', floor: 1, x: -4.5, z: -2.6, yaw: 0, category: 'Mobile Accessories' },
  { id: 'travel', name: 'Travel', floor: 1, x: 5.5, z: -2.6, yaw: 0, category: 'Travel' },
  { id: 'office', name: 'Office Productivity', floor: 1, x: 0.5, z: 4.5, yaw: 0, category: 'Office Productivity' },
];
// Nearest kiosk on the same floor within range (for "approach to get a tip").
export function nearbyKiosk(state, range = 2) {
  const floor = floorOf(state.y);
  return KIOSKS.find(k => k.floor === floor && Math.hypot(k.x - state.x, k.z - state.z) < range) || null;
}

const colliders = [
  ...SHELVES.map(s => ({ floor: s.floor, x: s.x, z: s.z, w: SHELF_SIZE.w, d: SHELF_SIZE.d })),
  ...HELP_DESKS.map(c => ({ floor: 0, x: c.x, z: c.z, w: 3.2, d: 1.2 })),
  ...KIOSKS.map(k => ({ floor: k.floor, x: k.x, z: k.z, w: KIOSK_SIZE.w, d: KIOSK_SIZE.d })),
];

export const inStair = (x, z) => x > STAIR.minX && z > STAIR.minZ && z < STAIR.maxZ;
export const stairHeight = z => FLOOR_H * Math.min(1, Math.max(0, (STAIR.maxZ - z) / (STAIR.maxZ - STAIR.minZ)));
export const floorOf = y => (y > FLOOR_H / 2 ? 1 : 0);

function hits(x, z, floor) {
  return colliders.some(c => c.floor === floor &&
    Math.abs(x - c.x) < c.w / 2 + RADIUS && Math.abs(z - c.z) < c.d / 2 + RADIUS);
}

// Returns the new foot height if (x,z) is reachable from state, otherwise null.
function heightIfAllowed(state, x, z) {
  if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) return null;
  const was = inStair(state.x, state.z), is = inStair(x, z);
  if (is) {
    const h = stairHeight(z);
    // Stairs can only be entered where their height matches yours (top or bottom).
    return was || Math.abs(h - state.y) < 0.35 ? h : null;
  }
  const floor = floorOf(state.y);
  const level = floor * FLOOR_H;
  if (was && Math.abs(state.y - level) > 0.35) return null; // no stepping off mid-flight
  return hits(x, z, floor) ? null : level;
}

// One movement step; axes are tried separately so the player slides along obstacles.
export function step(state, dx, dz) {
  const next = { ...state };
  for (const [ax, az] of [[dx, 0], [0, dz]]) {
    const y = heightIfAllowed(next, next.x + ax, next.z + az);
    if (y !== null) { next.x += ax; next.z += az; next.y = y; }
  }
  return next;
}
