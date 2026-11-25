// Pure store geometry and movement rules (no Three.js), so it can be unit tested.
export const BOUNDS = { minX: -13.5, maxX: 13.5, minZ: -11.5, maxZ: 11.5 };
export const FLOOR_H = 4.5;
export const EYE = 1.7;
export const RADIUS = 0.3;
export const STAIR = { minX: 11, maxX: 14, minZ: -3, maxZ: 6 }; // bottom at maxZ, top at minZ

export const SHELVES = [
  ...[-7, -2, 3, 8].map(x => ({ x, z: -3, floor: 0, category: 'Kitchen' })),
  ...[-7, -2, 3, 8].map(x => ({ x, z: 3, floor: 0, category: 'Home' })),
  ...[-7, -2, 3, 8].map(x => ({ x, z: -5, floor: 1, category: 'Tech' })),
  ...[-7, -2].map(x => ({ x, z: 2, floor: 1, category: 'Office' })),
  ...[3, 8].map(x => ({ x, z: 2, floor: 1, category: 'Personal Care' })),
];
export const SHELF_SIZE = { w: 3.3, d: 0.8 };
export const CHECKOUTS = [{ x: -7, z: 7.5 }, { x: -2, z: 7.5 }];

export const DEPARTMENTS = [
  { id: 'entrance', name: 'Entrance', floor: 0, x: 0, z: 10, yaw: 0 },
  { id: 'kitchen', name: 'Kitchen', floor: 0, x: 0.5, z: -0.8, yaw: 0 },
  { id: 'home', name: 'Home', floor: 0, x: 0.5, z: 5.2, yaw: 0 },
  { id: 'checkout', name: 'Checkout', floor: 0, x: -4.5, z: 10, yaw: 0 },
  { id: 'tech', name: 'Tech', floor: 1, x: 0.5, z: -2.6, yaw: 0 },
  { id: 'office', name: 'Office', floor: 1, x: -4.5, z: 4.5, yaw: 0 },
  { id: 'care', name: 'Personal Care', floor: 1, x: 5.5, z: 4.5, yaw: 0 },
];

const colliders = [
  ...SHELVES.map(s => ({ floor: s.floor, x: s.x, z: s.z, w: SHELF_SIZE.w, d: SHELF_SIZE.d })),
  ...CHECKOUTS.map(c => ({ floor: 0, x: c.x, z: c.z, w: 3.2, d: 1.2 })),
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
