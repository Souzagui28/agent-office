import * as THREE from 'three';
import { mesh, roundedBox, textPlane, toon } from '../../world/toon';

export const C = { ink: '#2b2d42', wood: '#c98b5a', paper: '#fffaf3', steel: '#8d99ae' };
export function box(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
  const m = mesh(roundedBox(w, h, d), toon(color), x, y, z); g.add(m); return m;
}
export function label(g: THREE.Object3D, text: string, x: number, y: number, z: number, scale = 0.55, bg = C.paper) {
  const m = textPlane(text, { bg, size: 44 }); m.scale.multiplyScalar(scale); m.position.set(x, y, z); g.add(m); return m;
}
export function rod(g: THREE.Object3D, from: number[], to: number[], color = C.ink, radius = 0.025) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const m = mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 6), toon(color));
  m.position.copy(a.add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m); return m;
}
export function table(g: THREE.Group, x: number, z: number, w: number, d: number, color = C.wood) {
  box(g, x, 0.82, z, w, 0.14, d, color);
  for (const dx of [-w / 2 + 0.12, w / 2 - 0.12]) for (const dz of [-d / 2 + 0.12, d / 2 - 0.12]) box(g, x + dx, 0.39, z + dz, 0.1, 0.78, 0.1, C.ink);
}
export function panel(g: THREE.Group, x: number, z: number, w: number, h: number, bg: string) {
  const board = new THREE.Group(); board.position.set(x, 1.9, z); g.add(board);
  box(board, 0, 0, 0, w + 0.18, h + 0.18, 0.12, C.wood);
  box(board, 0, 0, 0.075, w, h, 0.035, bg);
  for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) {
    rod(board, [dx, -h / 2, 0], [dx, -1.8, 0], C.steel, 0.045);
    box(board, dx, -1.84, 0, 0.5, 0.08, 0.75, C.ink);
  }
  return board;
}
export function sheet(g: THREE.Object3D, x: number, y: number, z: number, color = C.paper) {
  const page = box(g, x, y, z, 0.7, 0.025, 0.9, color);
  for (let i = 0; i < 4; i++) box(g, x, y + 0.02, z - 0.23 + i * 0.13, i === 3 ? 0.27 : 0.5, 0.01, 0.02, C.steel);
  return page;
}
export function tool(g: THREE.Object3D, x: number, y: number, z: number, kind: 'hammer' | 'driver') {
  const t = new THREE.Group(); t.position.set(x, y, z); g.add(t);
  rod(t, [0, 0, 0], [0, 0.48, 0], '#b47743', 0.04);
  if (kind === 'hammer') box(t, 0.03, 0.48, 0, 0.33, 0.13, 0.13, C.steel);
  else rod(t, [0, 0.44, 0], [0, 0.68, 0], C.steel, 0.018);
  return t;
}
export function bag(g: THREE.Object3D, x: number, y: number, z: number, scale = 1) {
  const b = new THREE.Group(); b.position.set(x, y, z); b.scale.setScalar(scale); g.add(b);
  box(b, 0, 0.3, 0, 0.7, 0.6, 0.27, '#d59060');
  box(b, 0, 0.38, 0.16, 0.6, 0.27, 0.035, '#ab694a');
  box(b, 0, 0.31, 0.19, 0.09, 0.09, 0.025, '#ffd166');
  b.add(mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 18, Math.PI), toon(C.ink), 0, 0.58, 0));
  return b;
}
export function lamp(g: THREE.Group, x: number, z: number, color: string) {
  rod(g, [x, 0.86, z], [x, 1.65, z], C.ink, 0.025);
  rod(g, [x, 1.65, z], [x + 0.25, 1.8, z], C.ink, 0.025);
  g.add(mesh(new THREE.ConeGeometry(0.19, 0.22, 12), toon(color), x + 0.25, 1.76, z));
  const light = new THREE.PointLight('#fff2d3', 5, 4, 2); light.position.set(x + 0.25, 1.5, z); g.add(light);
}
