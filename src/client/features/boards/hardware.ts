import type { GpuState, MachineState, StorageState } from '../../../shared/protocol';

const FONT = 'Nunito, ui-rounded, system-ui, sans-serif';
const MUTED = '#9aa0b8';
const GREEN = '#06d6a0';
const AMBER = '#ffd166';

export function metricBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return '—';
  const value = bytes / 2 ** 30;
  return `${value.toFixed(value < 10 ? 1 : 0)} GB`;
}

function text(g: CanvasRenderingContext2D, value: string, x: number, y: number, size = 28, color = MUTED, maxWidth?: number) {
  g.font = `800 ${size}px ${FONT}`; g.fillStyle = color; g.textAlign = 'left';
  if (maxWidth && g.measureText(value).width > maxWidth) {
    while (value.length && g.measureText(value + '…').width > maxWidth) value = value.slice(0, -1);
    value += '…';
  }
  g.fillText(value, x, y);
}

function bar(g: CanvasRenderingContext2D, x: number, y: number, width: number, pct: number | undefined) {
  g.fillStyle = '#3a3d55'; g.fillRect(x, y, width, 16);
  if (pct === undefined) return;
  g.fillStyle = pct >= 90 ? '#ef476f' : pct >= 70 ? AMBER : GREEN;
  g.fillRect(x, y, width * Math.max(0, Math.min(100, pct)) / 100, 16);
}

function card(g: CanvasRenderingContext2D, x: number, y: number, w: number, title: string) {
  g.fillStyle = '#25283d'; g.beginPath(); g.roundRect(x, y, w, 350, 18); g.fill();
  text(g, title, x + 24, y + 44, 28);
}

export function drawStorage(g: CanvasRenderingContext2D, x: number, y: number, w: number, disk?: StorageState) {
  card(g, x, y, w, 'Storage · project disk');
  if (!disk) { text(g, 'Disk data unavailable', x + 24, y + 136, 38); return; }
  const used = disk.total ? disk.used / disk.total * 100 : 0;
  text(g, `${metricBytes(disk.available)} free`, x + 24, y + 139, 64, GREEN);
  text(g, `${metricBytes(disk.used)} used of ${metricBytes(disk.total)}`, x + 24, y + 193, 30);
  bar(g, x + 24, y + 229, w - 48, used);
  text(g, 'Available to this user · refreshed every 30 s', x + 24, y + 302, 25);
}

export function drawGpu(g: CanvasRenderingContext2D, x: number, y: number, w: number, gpu: GpuState | undefined, status: MachineState['gpuStatus'], count: number) {
  card(g, x, y, w, gpu ? `GPU ${gpu.index}${count > 1 ? ` · ${count} devices (rotating)` : ''}` : 'GPU');
  if (!gpu) {
    text(g, 'GPU data unavailable', x + 24, y + 139, 38);
    text(g, 'NVIDIA driver / nvidia-smi required', x + 24, y + 193, 27);
    return;
  }
  const live = status === 'live';
  const reading = (value: number | undefined, unit: string) => value === undefined ? '—' : `${Math.round(value)}${unit}`;
  text(g, gpu.name.replace(/^NVIDIA\s+/, ''), x + 24, y + 90, 30, '#ffffff', w - 48);
  text(g, `${reading(gpu.utilization, '%')} GPU`, x + 24, y + 163, 54, live ? GREEN : AMBER);
  text(g, 'VRAM', x + 330, y + 129, 24);
  text(g, `${metricBytes(gpu.memoryUsed)} / ${metricBytes(gpu.memoryTotal)}`, x + 330, y + 166, 28, '#ffffff');
  const vram = gpu.memoryTotal && gpu.memoryUsed !== undefined ? gpu.memoryUsed / gpu.memoryTotal * 100 : undefined;
  bar(g, x + 330, y + 184, w - 354, vram);
  text(g, `${reading(gpu.temperature, ' °C')}  ·  ${reading(gpu.powerDraw, ' W')} / ${reading(gpu.powerLimit, ' W')}  ·  Fan ${reading(gpu.fan, '%')}`, x + 24, y + 243, 28);
  bar(g, x + 24, y + 269, w - 48, gpu.utilization);
  text(g, live ? 'Live · updated every 0.5 s' : 'Stale reading · waiting for GPU data', x + 24, y + 321, 25, live ? MUTED : AMBER);
}
