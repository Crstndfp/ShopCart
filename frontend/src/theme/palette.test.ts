import { describe, it, expect } from 'vitest';
import { SHOPCART_PALETTE, applyThemeMode } from './palette.js';

describe('ShopCart Theme Palette (Tech Challenge 360 Cover)', () => {
  it('should contain the primary cover and document vector hex colors', () => {
    const hexCodes = SHOPCART_PALETTE.map((token) => token.hex);
    expect(hexCodes).toContain('#0B1220'); // Cover Navy 950
    expect(hexCodes).toContain('#121B2E'); // Cover Card Navy 900
    expect(hexCodes).toContain('#38BDF8'); // Tech Challenge 360 Cyan
    expect(hexCodes).toContain('#0284C7'); // Pentandra Blue
    expect(hexCodes).toContain('#0B3B5C'); // Don Arturo Deep Blue
    expect(hexCodes).toContain('#F6F8FB'); // Document Light Canvas
  });

  it('should define valid CSS custom property names and 6-digit hex formats', () => {
    for (const token of SHOPCART_PALETTE) {
      expect(token.cssVar).toMatch(/^--palette-[a-z0-9-]+$/);
      expect(token.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(token.tailwindClass.length).toBeGreaterThan(3);
    }
  });

  it('should apply and clear data-theme attribute via applyThemeMode', () => {
    let currentAttr: string | null = null;
    const fakeRoot = {
      setAttribute(_name: string, val: string) {
        currentAttr = val;
      },
      removeAttribute(_name: string) {
        currentAttr = null;
      },
    } as unknown as HTMLElement;

    applyThemeMode('dark', fakeRoot);
    expect(currentAttr).toBe('dark');

    applyThemeMode('light', fakeRoot);
    expect(currentAttr).toBe('light');

    applyThemeMode('system', fakeRoot);
    expect(currentAttr).toBeNull();
  });
});
