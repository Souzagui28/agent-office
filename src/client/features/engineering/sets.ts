import * as THREE from 'three';
import { mesh, toon } from '../../world/toon';
import { bag, box, C, label, lamp, panel, rod, sheet, table, tool } from './props';

/** Each sector gets a different working surface and visual language, around existing desks. */
export function requirementsSet(g: THREE.Group) {
  const board = panel(g, 0, -3.7, 4.1, 2.1, '#d8a86a');
  label(board, 'QUEM · NECESSIDADE · ACEITAÇÃO', 0, 1.28, 0.08, 0.43);
  for (const [i, title] of ['Fabricante', 'Cliente', 'Operação'].entries()) {
    const x = -1.35 + i * 1.35;
    board.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), toon(['#ffbd9c', '#bde0fe', '#caffbf'][i]), x, 0.55, 0.15));
    label(board, title, x, 0.22, 0.13, 0.29);
    const sticky = box(board, x, -0.48, 0.12, 0.92, 0.65, 0.035, ['#fff0a6', '#ffd6a5', '#e1d6ff'][i]); sticky.rotation.z = (i - 1) * 0.07;
    rod(board, [x, 0.05, 0.15], [x, -0.15, 0.15], '#b85b57', 0.014);
    box(board, x, -0.48, 0.16, 0.65, 0.018, 0.01, '#977444');
  }
  // A conversation nook, beside the requirements pod, rather than another identical workbench.
  g.add(mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 24), toon('#d8a86a'), -4.2, 0.75, 0));
  rod(g, [-4.2, 0.1, 0], [-4.2, 0.7, 0], C.ink, 0.1);
  for (const z of [-0.95, 0.95]) {
    g.add(mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.12, 16), toon('#b8dac8'), -4.2, 0.43, z));
    rod(g, [-4.2, 0, z], [-4.2, 0.4, z], C.wood, 0.1);
  }
  sheet(g, -4.2, 0.83, 0); label(g, 'Escutar antes de especificar', 0, 3.48, -3.7, 0.42);
  return (_dt: number, _t: number) => {};
}
export function architectureSet(g: THREE.Group) {
  const board = panel(g, 0, -3.7, 4.2, 2.1, '#e8f3ff');
  label(board, 'ARQUITETURA · DECISÕES E CONSEQUÊNCIAS', 0, 1.28, 0.1, 0.4);
  for (const [i, text] of ['Entrada', 'Agente', 'Gerador'].entries()) {
    const x = -1.35 + i * 1.35;
    box(board, x, 0.3, 0.12, 1.1, 0.55, 0.04, '#8bb3e8'); label(board, text, x, 0.3, 0.15, 0.26);
    if (i < 2) rod(board, [x + 0.57, 0.3, 0.15], [x + 0.78, 0.3, 0.15]);
  }
  for (const [i, text] of ['Custo', 'Evolução', 'Confiabilidade'].entries()) label(board, text, -1.35 + i * 1.35, -0.52, 0.14, 0.25);
  table(g, 4, -3.6, 2.8, 1.4, '#497ba5');
  const drafting = box(g, 4, 0.95, -3.6, 2.45, 0.06, 1.15, '#c8e3fa'); drafting.rotation.x = -0.12;
  for (let i = 0; i < 6; i++) box(g, 3 + i * 0.4, 1, -3.6, 0.012, 0.01, 1, '#8bb3e8');
  for (let i = 0; i < 3; i++) box(g, 4, 1.005, -3.95 + i * 0.34, 2.3, 0.01, 0.012, '#8bb3e8');
  for (const [x, z, h] of [[3.5, -3.6, 0.3], [4, -3.75, 0.5], [4.5, -3.5, 0.25]]) box(g, x, 1.02 + h / 2, z, 0.3, h, 0.3, '#f3f8ff');
  const roll = mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 12), toon('#f8f0d9'), 5, 1, -3.6); roll.rotation.x = Math.PI / 2; g.add(roll);
  lamp(g, 2.9, -3.9, '#80b4e4');
  label(g, 'Drivers → alternativas → decisão', 0, 3.48, -3.7, 0.42);
  return (_dt: number, _t: number) => {};
}
export function implementationSet(g: THREE.Group) {
  const peg = panel(g, 0, -3.7, 4.1, 2.1, '#b78966');
  label(peg, 'OFICINA DE PROTÓTIPOS', 0, 1.28, 0.1, 0.48);
  for (let x = -1.8; x <= 1.8; x += 0.4) for (let y = -0.8; y < 0.9; y += 0.35) peg.add(mesh(new THREE.SphereGeometry(0.022, 6, 4), toon('#74503c'), x, y, 0.13, false));
  tool(peg, -1.25, -0.5, 0.2, 'hammer'); tool(peg, -0.55, -0.4, 0.2, 'driver');
  const gear = new THREE.Group(); gear.position.set(0.9, 0, 0.2); peg.add(gear);
  gear.add(mesh(new THREE.TorusGeometry(0.35, 0.1, 6, 16), toon('#8d99ae')));
  for (let i = 0; i < 8; i++) {
    const tooth = box(gear, Math.sin(i * Math.PI / 4) * 0.43, Math.cos(i * Math.PI / 4) * 0.43, 0, 0.16, 0.22, 0.18, '#8d99ae'); tooth.rotation.z = -i * Math.PI / 4;
  }
  table(g, 4.2, 0, 2, 1.55, '#9f7052');
  // A turning physical maquette, clearly presented as a prototype rather than a generated result.
  g.add(mesh(new THREE.CylinderGeometry(0.59, 0.65, 0.12, 24), toon(C.ink), 4.2, 0.96, 0));
  const prototype = bag(g, 4.2, 1.03, 0, 0.95);
  label(g, 'Maquete ilustrativa', 4.2, 1.95, -0.3, 0.3);
  sheet(g, 3.6, 0.91, 0.4); tool(g, 4.8, 0.9, -0.3, 'driver');
  lamp(g, 4.9, -0.55, '#f2ae61');
  label(g, 'Uma ideia pequena, executável', 0, 3.48, -3.7, 0.42);
  return (dt: number, _t: number) => { gear.rotation.z += dt * 0.25; prototype.rotation.y += dt * 0.3; };
}
export function validationSet(g: THREE.Group) {
  const board = panel(g, 0, -3.7, 4.1, 2.1, '#f8fcf5');
  label(board, 'LABORATÓRIO DE VERIFICAÇÃO', 0, 1.28, 0.1, 0.43);
  for (const [i, title] of ['Medidas', 'Arquivo', 'Aprovação'].entries()) {
    const y = 0.65 - i * 0.65;
    box(board, -1.5, y, 0.13, 0.26, 0.26, 0.025, '#f2d78d');
    label(board, title, -0.25, y, 0.15, 0.32);
    box(board, 1.2, y, 0.13, 0.8, 0.22, 0.025, '#d8e6d0');
  }
  table(g, -4.1, 0, 2.2, 1.5, '#e7dfc9');
  for (let i = 0; i < 14; i++) box(g, -5.05 + i * 0.14, 0.92, -0.5, 0.018, 0.01, i % 5 === 0 ? 0.17 : 0.09, C.ink);
  const specimen = bag(g, -4.1, 0.9, 0, 0.7);
  const scanner = new THREE.Group(); scanner.position.set(-4.1, 1.5, 0.3); g.add(scanner);
  scanner.add(mesh(new THREE.TorusGeometry(0.31, 0.035, 8, 20), toon('#508b9c')));
  const lens = mesh(new THREE.CircleGeometry(0.27, 20), new THREE.MeshBasicMaterial({ color: '#a8ecff', transparent: true, opacity: 0.3, side: THREE.DoubleSide })); scanner.add(lens);
  rod(scanner, [0.22, -0.22, 0], [0.5, -0.5, 0], C.ink, 0.035);
  label(g, 'Bancada de inspeção', -4.1, 2.15, -0.5, 0.32);
  label(g, 'Critério → teste → evidência', 0, 3.48, -3.7, 0.42);
  return (_dt: number, t: number) => { scanner.position.x = -4.1 + Math.sin(t * 0.7) * 0.18; specimen.rotation.y = Math.sin(t * 0.4) * 0.08; };
}
export function operationsSet(g: THREE.Group) {
  table(g, 0, 0, 2.8, 1.35, '#5d7484');
  const monitor = box(g, 0, 1.4, -0.2, 1.8, 0.95, 0.15, C.ink);
  box(g, 0, 1.4, -0.11, 1.6, 0.76, 0.02, '#17394b');
  for (let i = 0; i < 9; i++) box(g, -0.63 + i * 0.15, 1.2 + i % 3 * 0.08, -0.09, 0.07, 0.2 + i % 3 * 0.16, 0.02, '#8be1cb');
  rod(g, [0, 0.9, -0.2], [0, 1.1, -0.2], C.ink, 0.06);
  box(g, 0, 0.93, 0.3, 1.15, 0.04, 0.35, C.ink);
  const lights: THREE.Mesh[] = [];
  for (const x of [2.2, 3.2]) {
    box(g, x, 1.15, -2.1, 0.8, 2.3, 0.85, '#3b4a5a');
    for (let i = 0; i < 6; i++) {
      box(g, x, 0.3 + i * 0.32, -1.64, 0.65, 0.23, 0.06, '#718392');
      const light = box(g, x + 0.22, 0.3 + i * 0.32, -1.59, 0.06, 0.05, 0.02, '#93e7bd'); lights.push(light);
    }
  }
  label(g, 'OPERAÇÃO · PUBLICAR E RECUPERAR', 0.2, 3.3, -2.8, 0.48);
  label(g, 'Serviços e backups', 2.7, 2.7, -2.1, 0.33);
  const backup = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 18), toon('#8dbab8'), -0.9, 1.1, 0.2); g.add(backup);
  label(g, 'Esquema ilustrativo · métricas reais no monitor do escritório', 0.2, 2.65, -2.79, 0.29);
  return (_dt: number, t: number) => { lights.forEach((l, i) => l.visible = (Math.floor(t * 1.5) + i) % 7 !== 0); monitor.rotation.y = 0; };
}
export const SECTOR_SETS = [requirementsSet, architectureSet, implementationSet, validationSet, operationsSet] as const;
