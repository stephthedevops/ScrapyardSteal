import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  ANIMALS,
  ADJECTIVES,
  generateName,
  formatName,
} from "../../src/utils/nameGenerator";

describe("Property-Based Tests — Bug Condition (Exploration)", () => {
  /**
   * **Validates: Requirements 2.1**
   * Property 1: All ANIMALS entries are valid strings —
   * verify every entry is typeof string and non-empty.
   */
  it("Property 1: All ANIMALS entries are valid strings", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: ANIMALS.length - 1 }),
        (index) => {
          const entry = ANIMALS[index];
          expect(typeof entry).toBe("string");
          expect(entry.length).toBeGreaterThan(0);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 2.2**
   * Property 2: No duplicate animals —
   * verify ANIMALS array length equals deduplicated Set size.
   */
  it("Property 2: No duplicate animals", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const unique = new Set(ANIMALS);
        expect(unique.size).toBe(ANIMALS.length);
      })
    );
  });

  /**
   * **Validates: Requirements 2.4**
   * Property 3: ANIMALS array has exactly 230 entries.
   */
  it("Property 3: ANIMALS array has exactly 230 entries", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(ANIMALS).toHaveLength(230);
      })
    );
  });

  /**
   * **Validates: Requirements 2.5**
   * Property 4: All ADJECTIVES entries are valid strings —
   * verify every entry is typeof string and non-empty.
   */
  it("Property 4: All ADJECTIVES entries are valid strings", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: ADJECTIVES.length - 1 }),
        (index) => {
          const entry = ADJECTIVES[index];
          expect(typeof entry).toBe("string");
          expect(entry.length).toBeGreaterThan(0);
        }
      )
    );
  });

  /**
   * **Validates: Requirements 2.6**
   * Property 5: No duplicate adjectives —
   * verify ADJECTIVES array length equals deduplicated Set size.
   */
  it("Property 5: No duplicate adjectives", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const unique = new Set(ADJECTIVES);
        expect(unique.size).toBe(ADJECTIVES.length);
      })
    );
  });

  /**
   * **Validates: Requirements 2.5**
   * Property 6: ADJECTIVES array has exactly 200 entries.
   */
  it("Property 6: ADJECTIVES array has exactly 200 entries", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(ADJECTIVES).toHaveLength(200);
      })
    );
  });
});

describe("Property-Based Tests — Preservation", () => {
  /**
   * **Validates: Requirements 3.1**
   * Property 7: generateName output shape —
   * for random takenAdjs/takenNouns subsets, generateName returns
   * { adj: string, noun: string } with noun ending in "bot".
   */
  it("Property 7: generateName output shape", () => {
    const adjArb = fc.subarray(ADJECTIVES, { minLength: 0 });
    const nounArb = fc.subarray(
      ANIMALS.map((a) => `${a}bot`),
      { minLength: 0 }
    );

    fc.assert(
      fc.property(adjArb, nounArb, (takenAdjs, takenNouns) => {
        const result = generateName(new Set(takenAdjs), new Set(takenNouns));
        expect(result).toHaveProperty("adj");
        expect(result).toHaveProperty("noun");
        expect(typeof result.adj).toBe("string");
        expect(typeof result.noun).toBe("string");
        expect(result.noun).toMatch(/bot$/);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * **Validates: Requirements 3.2**
   * Property 8: generateName avoids taken names —
   * for random takenAdjs/takenNouns subsets where alternatives exist,
   * returned values are not in the taken sets.
   */
  it("Property 8: generateName avoids taken names", () => {
    // Generate subsets that leave at least one alternative available
    const adjArb = fc
      .subarray(ADJECTIVES, { minLength: 0, maxLength: ADJECTIVES.length - 1 });
    const nounArb = fc.subarray(
      ANIMALS.map((a) => `${a}bot`),
      { minLength: 0, maxLength: ANIMALS.length - 1 }
    );

    fc.assert(
      fc.property(adjArb, nounArb, (takenAdjs, takenNouns) => {
        const takenAdjSet = new Set(takenAdjs);
        const takenNounSet = new Set(takenNouns);
        const result = generateName(takenAdjSet, takenNounSet);

        expect(takenAdjSet.has(result.adj)).toBe(false);
        expect(takenNounSet.has(result.noun)).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * **Validates: Requirements 3.3**
   * Property 9: formatName output format —
   * for random adj/noun strings, formatName returns them joined with a space.
   */
  it("Property 9: formatName output format", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (adj, noun) => {
          const result = formatName(adj, noun);
          expect(result).toBe(`${adj} ${noun}`);
        }
      )
    );
  });
});
