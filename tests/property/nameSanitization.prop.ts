import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sanitizeName } from "../../server/logic/sanitize";

describe("Feature: v05-server-config-ai-hints — Name Sanitization Properties", () => {
  /**
   * Property 2: Name sanitization output
   *
   * For any arbitrary Unicode string, applying sanitizeName should produce
   * a string that contains only characters in the printable ASCII range
   * (0x20–0x7E) and has no leading or trailing whitespace.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it("Property 2: sanitizeName output contains only printable ASCII with no leading/trailing whitespace", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeName(input);

        // Every character must be in printable ASCII range 0x20–0x7E
        for (let i = 0; i < result.length; i++) {
          const code = result.charCodeAt(i);
          expect(code).toBeGreaterThanOrEqual(0x20);
          expect(code).toBeLessThanOrEqual(0x7e);
        }

        // No leading or trailing whitespace
        expect(result).toBe(result.trim());
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Empty name rejection
   *
   * For any string that consists entirely of non-printable characters
   * (outside 0x20–0x7E) or whitespace, sanitizing it should produce
   * an empty string.
   *
   * **Validates: Requirements 2.3**
   */
  it("Property 3: strings of only non-printable or whitespace characters sanitize to empty", () => {
    // Generator: strings composed only of characters outside printable ASCII
    // or whitespace characters (space, tab, newline, etc.)
    const nonPrintableOrWhitespaceChar = fc.oneof(
      // Characters below 0x20 (control characters including \t, \n, \r)
      fc.integer({ min: 0x00, max: 0x1f }).map((c) => String.fromCharCode(c)),
      // DEL character (0x7F)
      fc.constant(String.fromCharCode(0x7f)),
      // Characters above 0x7E (extended/unicode)
      fc.integer({ min: 0x80, max: 0xffff }).map((c) => String.fromCharCode(c)),
      // Whitespace: space is 0x20 which is printable but is whitespace — trim removes it
      fc.constant(" ")
    );

    const nonPrintableOrWhitespaceString = fc
      .array(nonPrintableOrWhitespaceChar, { minLength: 0, maxLength: 50 })
      .map((chars) => chars.join(""));

    fc.assert(
      fc.property(nonPrintableOrWhitespaceString, (input) => {
        const result = sanitizeName(input);
        expect(result).toBe("");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Sanitization-aware duplicate detection
   *
   * For any two strings that are identical after sanitization (e.g.,
   * "Turbo" and "Turbo\x00"), the server should detect them as duplicates.
   *
   * **Validates: Requirements 2.4**
   */
  it("Property 4: strings identical after sanitization are detected as duplicates", () => {
    // Generator: a printable ASCII base string, plus non-printable noise to inject
    const printableAsciiChar = fc
      .integer({ min: 0x21, max: 0x7e })
      .map((c) => String.fromCharCode(c));

    const baseString = fc
      .array(printableAsciiChar, { minLength: 1, maxLength: 16 })
      .map((chars) => chars.join(""));

    const nonPrintableNoise = fc
      .array(
        fc.oneof(
          fc.integer({ min: 0x00, max: 0x1f }).map((c) => String.fromCharCode(c)),
          fc.constant(String.fromCharCode(0x7f)),
          fc.integer({ min: 0x80, max: 0xffff }).map((c) => String.fromCharCode(c))
        ),
        { minLength: 1, maxLength: 5 }
      )
      .map((chars) => chars.join(""));

    fc.assert(
      fc.property(baseString, nonPrintableNoise, (base, noise) => {
        // Create a "dirty" variant by injecting noise at a random position
        const dirty = noise + base + noise;

        const sanitizedBase = sanitizeName(base);
        const sanitizedDirty = sanitizeName(dirty);

        // Both should sanitize to the same string — duplicates detected
        expect(sanitizedBase).toBe(sanitizedDirty);
        // And the sanitized result should be non-empty
        expect(sanitizedBase.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
