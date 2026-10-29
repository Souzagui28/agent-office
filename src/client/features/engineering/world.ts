import * as THREE from 'three';
import type { EngineeringFlow } from '../../../shared/engineering-flow';
import { DISCIPLINES, ENGINEERING_ZONES } from '../../../shared/engineering';
import { noOutline } from '../../core/outline';
import type { Collider, Interactable } from '../../world/types';
import { C, box, label } from './props';
import { specialist } from './characters';
import { SECTOR_SETS } from './sets';

/** Five open sectors decorate the existing full-size project floor. No annex or replacement room. */
export function buildEngineering() {
  const group = new THREE.Group(); group.name = 'engineering-studio';
  const colliders: Collider[] = [];
  const interactables: Interactable[] = [];
  const updates: ((dt: number, t: number) => void)[] = [];
  const plaques: THREE.Group[] = [];
  const progressPanels: THREE.Group[] = [];
  const anchors: THREE.Group[] = [];
  const placeholders: THREE.Object3D[] = [];
  let plaqueText = '';
  const guidePlaces = [[-3.2, -1.3], [-3.2, -1.3], [3.2, -1.6], [-3.2, -1.6], [-1.7, -1.5]];
  function solid(i: number, x: number, z: number, w: number, d: number, top: number) {
    const zone = ENGINEERING_ZONES[i], sign = i === 2 || i === 3 ? -1 : 1;
    const gx = zone.x + x * sign, gz = zone.z + z * sign;
    colliders.push({ minX: gx - w / 2, maxX: gx + w / 2, minZ: gz - d / 2, maxZ: gz + d / 2, bottom: 0, top });
  }
  for (const [i, d] of DISCIPLINES.entries()) {
    const zone = ENGINEERING_ZONES[i];
    const area = new THREE.Group(); area.name = `sector-${d.id}`;
    area.position.set(zone.x, 0, zone.z); area.rotation.y = zone.rotY;
    group.add(area);
    updates.push(SECTOR_SETS[i](area));
    const progressPanel = new THREE.Group(); progressPanel.position.set(0, i < 4 ? 2.95 : 2.1, i < 4 ? -3.55 : 0.1);
    area.add(progressPanel); progressPanels.push(progressPanel);
    if (i < 4) {
      // A narrow welcome runner defines the entrance while the original rug, desks and chairs stay.
      box(area, 0, 0.025, 2.15, 4, 0.015, 0.45, ['#f0d9ba', '#d5e5f4', '#e6d8c8', '#eee7cf'][i]);
      label(area, d.name, 0, 4.05, -3.7, 0.62);
      solid(i, 0, -3.7, 4.4, 0.8, 3);
    }
    // Colliders correspond only to added furnishings; no new walls, ceilings or floor slabs.
    if (i === 0) solid(i, -4.2, 0, 1.5, 1.5, 0.82);
    if (i === 1) solid(i, 4, -3.6, 2.8, 1.4, 1.05);
    if (i === 2) solid(i, 4.2, 0, 2, 1.55, 0.9);
    if (i === 3) solid(i, -4.1, 0, 2.2, 1.5, 0.9);
    if (i === 4) { solid(i, 0, 0, 2.8, 1.35, 0.9); solid(i, 2.7, -2.1, 1.8, 0.85, 2.3); }
    const [gx, gz] = guidePlaces[i];
    const anchor = new THREE.Group(); anchor.position.set(gx, 0, gz); area.add(anchor); anchors.push(anchor);
    const guide = specialist(i); anchor.add(guide.worker.root); placeholders.push(guide.worker.root); updates.push(guide.update);
    const greeting = ['Clara · escutar e esclarecer', 'Atlas · desenhar e ponderar', 'Pixel · experimentar e construir', 'Vera · inspecionar e comprovar', 'Nilo · acompanhar e recuperar'][i];
    label(area, greeting, gx, 3.05, gz - 0.25, 0.4);
    for (const [x, z, title] of [[gx, gz, `${d.agent} · ${d.role}`], [0, i < 4 ? -3.7 : 0, d.name]] as const) {
      const position = area.localToWorld(new THREE.Vector3(x, 0, z));
      const it: Interactable = { kind: 'engineering', x: position.x, y: 0, z: position.z, radius: 2, label: title, deskId: x === gx && z === gz ? `lead:${d.id}` : `flow:${d.id}` };
      interactables.push(it);
      if (x === 0) area.userData.interact = it;
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 1), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(x, 1.3, z); hit.userData.interact = it; area.add(hit);
    }
  }
  // One process plaque belongs to the project, next to its existing entrance/elevator.
  const projectPlaque = new THREE.Group(); projectPlaque.position.set(8, 2.5, -12.7);
  group.add(projectPlaque); plaques.push(projectPlaque);
  label(projectPlaque, 'PROCESSO DO PROJETO', 0, 0.5, 0, 0.45);
  const processLine = new THREE.Group(); projectPlaque.add(processLine);
  noOutline(group); group.visible = false;
  return { group, colliders, interactables, anchors, placeholders,
    setProgress(flow: EngineeringFlow) {
      for (const [i, d] of DISCIPLINES.entries()) {
        const panel = progressPanels[i], step = flow.stages[d.id];
        const text = `${step.steps.filter(s => s.done).length}/${step.steps.length} passos · ${{ todo: 'A fazer', doing: 'Em andamento', review: 'Em revisão', done: 'Aprovado' }[step.status]}`;
        if (panel.userData.text === text) continue;
        panel.userData.text = text;
        for (const child of [...panel.children]) {
          const m = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
          m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); panel.remove(m);
        }
        label(panel, text, 0, 0, 0, 0.35);
      }
    },
    setPlaque(text: string) {
      if (text === plaqueText) return; plaqueText = text;
      for (const child of [...processLine.children]) {
        const m = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
        m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); processLine.remove(m);
      }
      label(processLine, text, 0, 0, 0, 0.33, C.paper);
    },
    update(dt: number, t: number) { for (const update of updates) update(dt, t); },
  };
}
