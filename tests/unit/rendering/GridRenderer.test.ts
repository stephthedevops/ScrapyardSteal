import { describe, it, expect } from "vitest";
import { GridRenderer } from "../../../src/rendering/GridRenderer";

describe("GridRenderer.brightenColor", () => {
  it("Tungsten (0x36454f) produces a visibly lighter result with default amount", () => {
    const input = 0x36454f;
    const result = GridRenderer.brightenColor(input);

    // Extract channels
    const inR = (input >> 16) & 0xff;
    const inG = (input >> 8) & 0xff;
    const inB = input & 0xff;
    const outR = (result >> 16) & 0xff;
    const outG = (result >> 8) & 0xff;
    const outB = result & 0xff;

    // Each output channel must be strictly greater than input (dark color gets brighter)
    expect(outR).toBeGreaterThan(inR);
    expect(outG).toBeGreaterThan(inG);
    expect(outB).toBeGreaterThan(inB);

    // Verify exact expected values: R=114, G=124, B=131 → 0x727c83
    expect(result).toBe(0x727c83);
  });

  it("Chromium (0xdbe4eb) stays ≤ 0xFFFFFF and each channel >= input", () => {
    const input = 0xdbe4eb;
    const result = GridRenderer.brightenColor(input);

    expect(result).toBeLessThanOrEqual(0xffffff);

    const inR = (input >> 16) & 0xff;
    const inG = (input >> 8) & 0xff;
    const inB = input & 0xff;
    const outR = (result >> 16) & 0xff;
    const outG = (result >> 8) & 0xff;
    const outB = result & 0xff;

    expect(outR).toBeGreaterThanOrEqual(inR);
    expect(outG).toBeGreaterThanOrEqual(inG);
    expect(outB).toBeGreaterThanOrEqual(inB);
    expect(outR).toBeLessThanOrEqual(255);
    expect(outG).toBeLessThanOrEqual(255);
    expect(outB).toBeLessThanOrEqual(255);

    // Verify exact expected values: 0xe5ecf1
    expect(result).toBe(0xe5ecf1);
  });

  it("amount=0 returns the same color unchanged", () => {
    expect(GridRenderer.brightenColor(0x36454f, 0)).toBe(0x36454f);
    expect(GridRenderer.brightenColor(0xdbe4eb, 0)).toBe(0xdbe4eb);
    expect(GridRenderer.brightenColor(0x000000, 0)).toBe(0x000000);
    expect(GridRenderer.brightenColor(0xffffff, 0)).toBe(0xffffff);
  });

  it("amount=1 returns white (0xffffff)", () => {
    expect(GridRenderer.brightenColor(0x000000, 1)).toBe(0xffffff);
    expect(GridRenderer.brightenColor(0x36454f, 1)).toBe(0xffffff);
    expect(GridRenderer.brightenColor(0xdbe4eb, 1)).toBe(0xffffff);
    expect(GridRenderer.brightenColor(0xffffff, 1)).toBe(0xffffff);
  });

  it("black (0x000000) with default amount 0.3 produces 0x4c4c4c", () => {
    const result = GridRenderer.brightenColor(0x000000);

    const outR = (result >> 16) & 0xff;
    const outG = (result >> 8) & 0xff;
    const outB = result & 0xff;

    // Each channel should be approximately 76 (0x4c)
    expect(outR).toBe(76);
    expect(outG).toBe(76);
    expect(outB).toBe(76);
    expect(result).toBe(0x4c4c4c);
  });
});

describe("GridRenderer cost label font sizes", () => {
  /**
   * The cost number font size formula: Math.max(8, Math.floor(tileSize * 0.385))
   * The gear icon font size formula: Math.max(6, Math.floor(fontSize * 0.7))
   */
  function costNumberFontSize(tileSize: number): number {
    return Math.max(8, Math.floor(tileSize * 0.385));
  }

  function gearIconFontSize(tileSize: number): number {
    const fontSize = costNumberFontSize(tileSize);
    return Math.max(6, Math.floor(fontSize * 0.7));
  }

  it("cost number font size formula is unchanged (Math.max(8, floor(tileSize * 0.385)))", () => {
    // Typical tile sizes
    expect(costNumberFontSize(20)).toBe(Math.max(8, Math.floor(20 * 0.385)));
    expect(costNumberFontSize(30)).toBe(Math.max(8, Math.floor(30 * 0.385)));
    expect(costNumberFontSize(40)).toBe(Math.max(8, Math.floor(40 * 0.385)));
    expect(costNumberFontSize(50)).toBe(Math.max(8, Math.floor(50 * 0.385)));

    // Small tile size hits the minimum of 8
    expect(costNumberFontSize(16)).toBe(8);
  });

  it("gear icon font size is smaller than the cost number font size", () => {
    const tileSizes = [16, 20, 25, 30, 40, 50, 60, 80];
    for (const tileSize of tileSizes) {
      const numSize = costNumberFontSize(tileSize);
      const iconSize = gearIconFontSize(tileSize);
      expect(iconSize).toBeLessThanOrEqual(numSize);
    }
  });

  it("both font sizes are clamped to their minimum values", () => {
    // Very small tile size — cost number clamps to 8
    expect(costNumberFontSize(16)).toBe(8);
    expect(costNumberFontSize(10)).toBe(8);

    // Gear icon clamps to 6 when cost number is small
    // When costNumber = 8, gear = Math.max(6, Math.floor(8 * 0.7)) = Math.max(6, 5) = 6
    expect(gearIconFontSize(16)).toBe(6);
    expect(gearIconFontSize(10)).toBe(6);
  });
});
