// Four camera modes: drone, long, walk, orbit. Pure state + math, no Three.js.
import * as L from './layout.js';

export const PRESETS = {
  drone: { yaw: 0, pitch: 1.0, dist: 36, tx: 0, ty: 1, tz: 0, fov: 55 },
  long: { yaw: 0.45, pitch: 0.3, dist: 38, tx: 0, ty: 3.5, tz: 0, fov: 50 },
  orbit: { yaw: 0.8, pitch: 0.55, dist: 34, tx: 0, ty: 3, tz: 0, fov: 55 },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class CameraRig {
  constructor({ reducedMotion = false } = {}) {
    this.reducedMotion = reducedMotion;
    this.walker = { x: 0, y: 0, z: 10 };
    this.look = { yaw: 0, pitch: 0 };
    this.mode = 'long';
    this.view = { ...PRESETS.long };
    this.current = null;
    this.touring = false;
  }
  setMode(mode) {
    this.mode = mode;
    this.touring = false;
    if (PRESETS[mode]) this.view = { ...PRESETS[mode] };
  }
  reset() {
    if (this.mode === 'walk') { this.walker = { x: 0, y: 0, z: 10 }; this.look = { yaw: 0, pitch: 0 }; this.current = null; }
    else this.setMode(this.mode);
  }
  topDown() { this.setMode('drone'); this.view.pitch = 1.55; this.view.dist = 34; }
  rotate(dx, dy) {
    this.touring = false;
    if (this.mode === 'walk') {
      this.look.yaw -= dx * 0.004;
      this.look.pitch = clamp(this.look.pitch - dy * 0.004, -1.3, 1.3);
    } else {
      this.view.yaw -= dx * 0.005;
      this.view.pitch = clamp(this.view.pitch + dy * 0.005, 0.08, 1.55);
    }
  }
  pan(dx, dy) {
    if (this.mode === 'walk') return;
    this.touring = false;
    const v = this.view, k = v.dist * 0.0015;
    v.tx = clamp(v.tx - (Math.cos(v.yaw) * dx + Math.sin(v.yaw) * dy) * k, -14, 14);
    v.tz = clamp(v.tz - (-Math.sin(v.yaw) * dx + Math.cos(v.yaw) * dy) * k, -12, 12);
  }
  zoom(factor) {
    this.touring = false;
    if (this.mode !== 'walk') this.view.dist = clamp(this.view.dist * factor, 10, 60);
  }
  goTo(dept) {
    this.setMode('walk');
    this.walker = { x: dept.x, y: dept.floor * L.FLOOR_H, z: dept.z };
    this.look = { yaw: dept.yaw, pitch: 0 };
    this.current = null; // cut instead of flying through walls
  }
  move(forward, right, dt) {
    if (this.mode !== 'walk' || (!forward && !right)) return;
    const len = Math.max(1, Math.hypot(forward, right));
    const dist = 3.8 * Math.min(dt, 0.05) / len;
    const s = Math.sin(this.look.yaw), c = Math.cos(this.look.yaw);
    this.walker = L.step(this.walker, (-s * forward + c * right) * dist, (-c * forward - s * right) * dist);
  }
  // Cinematic tour is opt-in and never runs with reduced motion.
  startTour() {
    if (this.reducedMotion) return false;
    this.setMode('orbit'); this.touring = true; return true;
  }
  desired() {
    if (this.mode === 'walk') {
      const { x, y, z } = this.walker, { yaw, pitch } = this.look;
      const py = y + L.EYE;
      return { pos: [x, py, z], target: [x - Math.sin(yaw) * Math.cos(pitch), py + Math.sin(pitch), z - Math.cos(yaw) * Math.cos(pitch)], fov: 72 };
    }
    const v = this.view, h = Math.cos(v.pitch) * v.dist;
    return { pos: [v.tx + Math.sin(v.yaw) * h, v.ty + Math.sin(v.pitch) * v.dist, v.tz + Math.cos(v.yaw) * h], target: [v.tx, v.ty, v.tz], fov: v.fov };
  }
  update(dt) {
    if (this.touring) this.view.yaw += dt * 0.12;
    const d = this.desired();
    // Walking follows input directly; other views ease between positions.
    const k = this.reducedMotion || this.mode === 'walk' || !this.current ? 1 : 1 - Math.exp(-5 * dt);
    const mix = (a, b) => a + (b - a) * k;
    this.current = this.current
      ? { pos: this.current.pos.map((a, i) => mix(a, d.pos[i])), target: this.current.target.map((a, i) => mix(a, d.target[i])), fov: mix(this.current.fov, d.fov) }
      : d;
    return this.current;
  }
}
