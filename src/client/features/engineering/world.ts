import * as THREE from 'three';
import { DISCIPLINES, ENGINEERING_SITE as S, engineeringArrival } from '../../../shared/engineering';
import { Worker } from '../../world/character';
import { mesh, roundedBox, textPlane, toon } from '../../world/toon';
import type { Collider, Interactable } from '../../world/types';

/** A five-storey annex: one room per discipline, one shared project. */
export function buildEngineering() {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const interactables: Interactable[] = [];
  const guides: Worker[] = [];
  const plaques: THREE.Group[] = [];
  let plaqueText = '';
  const ink = toon('#2b2d42');
  function box(room: THREE.Group, x: number, y: number, z: number, w: number, h: number, depth: number, color: string) {
    const m = mesh(roundedBox(w, h, depth), toon(color), x, y, z);
    room.add(m);
    return m;
  }
  function sign(room: THREE.Group, title: string, x: number, y: number, z: number, scale = 0.35) {
    const label = textPlane(title, { bg: '#fffaf3', size: 44 });
    label.scale.multiplyScalar(scale);
    label.position.set(x, y, z);
    room.add(label);
    return label;
  }
  for (const [i, d] of DISCIPLINES.entries()) {
    const base = engineeringArrival(i).y;
    const room = new THREE.Group();
    room.position.set(S.x, base, S.z);
    group.add(room);
    const light = new THREE.PointLight('#fff0d9', 45, 19, 2);
    light.position.set(0, 3.8, 0); room.add(light);
    const plaque = new THREE.Group(); plaque.position.set(0, 3.05, -5.79);
    plaques.push(plaque); room.add(plaque);
    const addCollider = (x: number, z: number, w: number, depth: number, bottom: number, top: number) =>
      colliders.push({ minX: S.x + x - w / 2, maxX: S.x + x + w / 2, minZ: z - depth / 2, maxZ: z + depth / 2, bottom: base + bottom, top: base + top });
    box(room, 0, -0.18, 0, 16.4, 0.36, 12.4, '#e9c89a');
    addCollider(0, 0, 16.4, 12.4, -0.36, 0);
    // Wood planks and thick ink trim match the existing office's cartoon materials.
    for (let x = -7.5; x < 8; x += 1) box(room, x, 0.008, 0, 0.025, 0.015, 12, '#cda878');
    box(room, 0, 4.55, 0, 16.4, 0.2, 12.4, '#fff6ea');
    addCollider(0, 0, 16.4, 12.4, 4.45, 4.65);
    box(room, 0, 2.2, -6, 16.4, 4.4, 0.25, '#fff6ea');
    addCollider(0, -6, 16.4, 0.25, 0, 4.4);
    for (const x of [-8, 8]) {
      box(room, x, 2.2, 0, 0.25, 4.4, 12, '#fff6ea');
      addCollider(x, 0, 0.25, 12, 0, 4.4);
      box(room, x, 0.18, 0, 0.3, 0.36, 12, d.color);
    }
    // Open front for a dollhouse view, with a safe low railing.
    box(room, 0, 0.55, 6, 16.4, 1.1, 0.18, d.color);
    addCollider(0, 6, 16.4, 0.18, 0, 1.1);
    sign(room, `${i + 1} · ${d.name}`, 0, 3.65, -5.8, 0.8);

    // Two generous document tables, leaving a clear central arrival aisle.
    for (const x of [-4, 4]) {
      box(room, x, 0.86, -1.5, 4.3, 0.22, 2.2, '#c48d5b');
      for (const dx of [-1.7, 1.7]) for (const z of [-2.25, -0.75]) box(room, x + dx, 0.4, z, 0.14, 0.8, 0.14, '#2b2d42');
      addCollider(x, -1.5, 4.3, 2.2, 0, 0.97);
      for (let n = 0; n < 3; n++) {
        const paper = box(room, x - 0.9 + n * 0.7, 0.99 + n * 0.012, -1.15, 0.75, 0.025, 0.95, '#fffdf8');
        paper.rotation.y = (n - 1) * 0.15;
        for (let line = 0; line < 3; line++) box(room, x - 0.9 + n * 0.7, 1.04 + n * 0.012, -1.4 + line * 0.15, 0.45, 0.008, 0.025, d.color);
      }
    }
    const guide = new Worker(d.agent, d.color);
    guide.root.position.set(-4, 0.98, -2.1);
    guide.setStatus('idle', false);
    guide.update(1, 0);
    guides.push(guide);
    room.add(guide.root);
    // Hats are attached to the existing animated body, so they follow its idle motion.
    const body = guide.root.children[0];
    const cap = new THREE.Group();
    cap.position.y = 0.98;
    cap.add(mesh(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(d.color)));
    cap.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.035, 16), ink));
    if (d.id === 'validation') cap.add(mesh(roundedBox(0.045, 0.18, 0.58), toon('#fff1ad'), 0, 0.21, 0));
    if (d.id === 'architecture') cap.rotation.z = -0.2;
    body.add(cap);
    sign(room, d.role, -4, 2.4, -3.5, 0.4);
    sign(room, 'Guia visual · clique para preparar uma tarefa', -4, 1.95, -3.49, 0.3);
    // A themed diagram on each floor; illustrative until real artifacts are added.
    const board = new THREE.Group();
    board.position.set(4, 2, -5.7);
    room.add(board);
    box(board, 0, 0, 0, 5.4, 2.1, 0.12, '#2b2d42');
    box(board, 0, 0, 0.08, 5.15, 1.88, 0.04, '#fffcf5');
    for (let n = 0; n < 4; n++) {
      const x = -1.8 + n * 1.15;
      if (i === 4) box(board, x, -0.7 + (n + 1) * 0.16, 0.12, 0.6, (n + 1) * 0.32, 0.04, d.color);
      else {
        box(board, x, n % 2 ? -0.3 : 0.3, 0.12, 0.85, 0.5, 0.04, d.color);
        if (n < 3) box(board, x + 0.56, 0, 0.13, 0.25, 0.025, 0.02, '#2b2d42');
      }
    }
    sign(room, ['Stakeholders · exemplo', 'Componentes · exemplo', 'Backlog · exemplo', 'Evidências · exemplo', 'Custos · exemplo'][i], 4, 0.7, -5.55, 0.25);
    sign(room, 'Documentos e artefatos · E para abrir', 4, 1.5, -1.55, 0.25);
    // Elevator terminal: no compulsory travel animation or waiting.
    box(room, -6.7, 1.15, 3.8, 1, 2.3, 0.8, d.color);
    sign(room, '🛗 Andares', -6.7, 2.6, 3.9, 0.3);
    addCollider(-6.7, 3.8, 1, 0.8, 0, 2.3);
    for (const [x, z, label, id] of [[4, -1.5, d.name, d.id], [-4, -1.5, d.agent, d.id], [-6.7, 3.8, 'Elevador de disciplinas', 'elevator']] as const) {
      const it: Interactable = { kind: 'engineering', x: S.x + x, y: base, z, radius: 2, label, deskId: id };
      interactables.push(it);
      // Clickable transparent volumes also work when not directly aiming at a small paper.
      const hit = mesh(new THREE.BoxGeometry(2, 2.5, 1.8), new THREE.MeshBasicMaterial({ visible: false }), x, 1.2, z, false);
      hit.userData.interact = it;
      room.add(hit);
    }
  }
  group.visible = false;
  return { group, colliders, interactables,
    setPlaque(text: string) {
      if (text === plaqueText) return;
      plaqueText = text;
      for (const p of plaques) {
        for (const child of [...p.children]) {
          const m = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
          m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); p.remove(m);
        }
        sign(p, text, 0, 0, 0, 0.4);
      }
    },
    update(dt: number, t: number) { for (const g of guides) g.update(dt, t); } };
}
