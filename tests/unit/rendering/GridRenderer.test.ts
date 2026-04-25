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
