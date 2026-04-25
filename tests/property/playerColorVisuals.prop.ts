import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { GridRenderer } from "../../src/rendering/GridRenderer";

describe("Feature: player-color-visuals, Property 1: Channel-bounded brightening invariant", () => {
  /**
   * Property 1: For any valid hex color (0x000000 to 0xFFFFFF) and any
   * brightening amount in [0.0, 1.0], brightenColor(color, amount) SHALL
   * produce a result where each RGB channel satisfies:
   *   inputChannel ≤ outputChannel ≤ 255
   *
   * **Validates: Requirements 6.1, 6.2, 6.3**
   */
  it("each output RGB channel is between the input channel and 255", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0x000000, max: 0xffffff }),
        fc.double({ min: 0.0, max: 1.0, noNaN: true }),
        (color, amount) => {
          const result = GridRenderer.brightenColor(color, amount);

          const inR = (color >> 16) & 0xff;
          const inG = (color >> 8) & 0xff;
          const inB = color & 0xff;

          const outR = (result >> 16) & 0xff;
          const outG = (result >> 8) & 0xff;
          const outB = result & 0xff;

          // Each output channel must be >= the input channel (brightening never darkens)
          expect(outR).toBeGreaterThanOrEqual(inR);
          expect(outG).toBeGreaterThanOrEqual(inG);
          expect(outB).toBeGreaterThanOrEqual(inB);

          // Each output channel must be <= 255 (no overflow)
          expect(outR).toBeLessThanOrEqual(255);
          expect(outG).toBeLessThanOrEqual(255);
          expect(outB).toBeLessThanOrEqual(255);
        }
      ),
      { numRuns: 100 }
    );
  });
});
