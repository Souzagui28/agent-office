import * as THREE from 'three';
import { DISCIPLINES } from '../../../shared/engineering';
import { Worker } from '../../world/character';
import { mesh, toon } from '../../world/toon';
import { box, C, rod, tool } from './props';

/** Shared character animation, distinct silhouettes and role-specific gestures. Only Vera wears a hat. */
export function specialist(index: number) {
  const d = DISCIPLINES[index];
  const worker = new Worker(d.agent, d.color);
  worker.setStatus('idle', false); worker.update(1, 0);
  worker.root.scale.setScalar([1.35, 1.45, 1.3, 1.38, 1.4][index]);
  const body = worker.root.children[0];
  const antenna = body.children.filter(c => c instanceof THREE.Mesh && c.position.y > 1);
  const arms = body.children.filter(c => c instanceof THREE.Group && Math.abs(Math.abs(c.position.x) - 0.3) < 0.001 && c.position.y === 0.55);
  // Keep the original headset only for the operator. Hide the old antenna under head accessories.
  for (const child of body.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    if (child.position.y > 1 || (index !== 4 && (child.geometry instanceof THREE.TorusGeometry || (Math.abs(child.position.x) === 0.29 && child.position.y === 0.72)))) child.visible = false;
  }
  const accessories = new THREE.Group(); body.add(accessories);
  const prop = new THREE.Group(); body.add(prop);
  const spectacles = (y: number, color: string, radius = 0.115) => {
    for (const x of [-0.115, 0.115]) accessories.add(mesh(new THREE.TorusGeometry(radius, 0.018, 6, 18), toon(color), x, y, 0.31));
    rod(accessories, [-0.025, y, 0.32], [0.025, y, 0.32], color, 0.012);
  };
  if (index === 0) {
    spectacles(0.7, '#734f43');
    accessories.add(mesh(new THREE.SphereGeometry(0.14, 10, 8), toon('#5d3a32'), -0.17, 1, -0.03));
    box(accessories, 0, 0.32, 0.26, 0.38, 0.08, 0.06, '#e8a29b');
    const scarf = box(accessories, -0.14, 0.22, 0.27, 0.09, 0.23, 0.035, '#e8a29b'); scarf.rotation.z = -0.12;
    prop.position.set(-0.04, 0.33, 0.4); prop.rotation.x = -0.2;
    box(prop, 0, 0, 0, 0.34, 0.45, 0.035, '#9b7048'); box(prop, 0, 0, 0.025, 0.29, 0.38, 0.01, C.paper);
    box(prop, 0, 0.19, 0.04, 0.13, 0.045, 0.02, C.steel);
    for (let i = 0; i < 4; i++) box(prop, 0, 0.1 - i * 0.065, 0.04, 0.21, 0.01, 0.01, '#8b9a9d');
    rod(prop, [0.16, -0.1, 0.07], [0.22, 0.2, 0.07], '#f5bb51', 0.018);
  } else if (index === 1) {
    box(accessories, 0, 0.35, 0.26, 0.38, 0.3, 0.04, '#253e59');
    box(accessories, 0, 0.46, 0.29, 0.1, 0.12, 0.02, C.paper);
    const bow = box(accessories, 0, 0.46, 0.31, 0.15, 0.045, 0.025, '#d8ad61'); bow.rotation.z = 0.12;
    spectacles(0.71, '#293c54', 0.103);
    prop.position.set(0.04, 0.41, 0.4);
    box(prop, 0, 0, 0, 0.5, 0.3, 0.025, '#b2d8f3');
    for (let i = 0; i < 4; i++) box(prop, -0.18 + i * 0.12, 0, 0.02, 0.008, 0.25, 0.01, '#5085b5');
    const ruler = box(accessories, 0.34, 0.42, 0.16, 0.06, 0.6, 0.04, '#e8ca87'); ruler.rotation.z = -0.25;
  } else if (index === 2) {
    // Raised goggles, an apron, a pencil and a tool belt give Pixel an inventor silhouette.
    spectacles(0.92, '#625b78', 0.12);
    box(accessories, 0, 0.34, 0.26, 0.4, 0.33, 0.045, '#956342');
    box(accessories, 0, 0.29, 0.3, 0.21, 0.13, 0.025, '#b6885d');
    rod(accessories, [0.24, 0.8, 0], [0.3, 1.12, 0], '#ffd166', 0.02);
    prop.position.set(0.27, 0.39, 0.32); prop.rotation.z = -0.5;
    tool(prop, 0, 0, 0, 'driver').scale.setScalar(0.6);
  } else if (index === 3) {
    accessories.add(mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#f7bd31'), 0, 0.97, 0));
    accessories.add(mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.035, 16), toon('#d49b18'), 0, 0.97, 0));
    box(accessories, 0, 1.17, 0, 0.045, 0.16, 0.6, '#ffdc7b');
    box(accessories, 0, 0.35, 0.26, 0.43, 0.31, 0.04, '#ee8b3a');
    for (const x of [-0.12, 0.12]) box(accessories, x, 0.35, 0.29, 0.04, 0.28, 0.02, '#fff4bc');
    box(accessories, 0, 0.25, 0.3, 0.4, 0.035, 0.02, '#fff4bc');
    prop.position.set(0.27, 0.64, 0.37);
    prop.add(mesh(new THREE.TorusGeometry(0.14, 0.023, 8, 20), toon(C.ink)));
    prop.add(mesh(new THREE.CircleGeometry(0.115, 20), new THREE.MeshBasicMaterial({ color: '#92d7f3', transparent: true, opacity: 0.35, side: THREE.DoubleSide })));
    rod(prop, [-0.1, -0.1, 0], [-0.23, -0.25, 0], '#8f694c', 0.025);
  } else {
    // Headset and boom mic; no helmet, cap or generic shared costume.
    rod(accessories, [0.29, 0.71, 0], [0.28, 0.56, 0.33], C.ink, 0.018);
    accessories.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), toon(C.ink), 0.28, 0.56, 0.33));
    box(accessories, 0, 0.33, 0.26, 0.4, 0.31, 0.035, '#304b62');
    box(accessories, -0.11, 0.4, 0.29, 0.09, 0.09, 0.02, '#8ed5d1');
    prop.position.set(0.1, 0.48, 0.38);
    box(prop, 0, 0, 0, 0.3, 0.21, 0.035, '#243744'); box(prop, 0, 0, 0.025, 0.25, 0.16, 0.015, '#9de0d0');
  }
  const home = prop.position.clone();
  return { worker, update(dt: number, t: number) {
    worker.update(dt, t);
    for (const part of antenna) part.visible = false;
    const wave = Math.sin(t * [0.8, 0.45, 2.7, 0.7, 0.5][index]);
    if (index === 0) { prop.rotation.z = wave * 0.04; body.rotation.y += Math.sin(t * 0.3) * 0.06; }
    if (index === 1) { prop.rotation.y = wave * 0.12; body.rotation.x -= 0.05; }
    if (index === 2) { prop.position.y = home.y + wave * 0.04; prop.rotation.z = -0.5 + wave * 0.15; }
    if (index === 3) { prop.position.x = home.x + wave * 0.09; prop.position.y = home.y + Math.cos(t * 0.7) * 0.04; }
    if (index === 4) prop.rotation.x = -0.18 + wave * 0.04;
    // Hold the signature object while the other arm notes, points, tinkers, inspects or checks a tablet.
    if (arms[0]) arms[0].rotation.x = -0.8;
    if (arms[1]) arms[1].rotation.x = -0.95 + wave * (index === 2 ? 0.2 : 0.06);
  } };
}
