import type { Pad } from './state';

/**
 * Sunshine's Linux UHID Series controller advertises canonical X/Y/Z/RX/RY/RZ axes,
 * but Chromium's 045e:0b13 Bluetooth mapper assumes X/Y/RX/RY/RZ/Z. It labels the
 * result "standard" while leaving LT in right X and putting right Y in button 7.
 * Recover those values only for this virtual device on Linux Chromium, never for
 * physical Xbox controllers or other browsers. All values are already normalized.
 * https://chromium.googlesource.com/chromium/src/+/main/device/gamepad/gamepad_standard_mappings_linux.cc
 */
export function normalizeSunshine(pad: Pad, linuxChromium: boolean): Pad {
  if (!linuxChromium || pad.mapping !== 'standard' || pad.axes.length !== 4 || pad.buttons.length !== 18
    || !pad.id?.includes('Sunshine (libvirtualhid) X-Box Series Controller')
    || !/Vendor:\s*045e\s+Product:\s*0b13/i.test(pad.id)) return pad;
  const button = (value: number) => ({ value: Math.max(0, Math.min(1, value)), pressed: value > 0.5 });
  const buttons = [...pad.buttons];
  buttons[6] = button((pad.axes[2] + 1) / 2);
  buttons[7] = button(pad.buttons[6].value);
  return {
    id: pad.id, index: pad.index, connected: pad.connected, mapping: pad.mapping,
    axes: [pad.axes[0], pad.axes[1], pad.axes[3], pad.buttons[7].value * 2 - 1],
    buttons,
  };
}
