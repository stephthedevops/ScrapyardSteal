/**
 * Strips all characters outside the printable ASCII range (0x20–0x7E)
 * and trims leading/trailing whitespace.
 */
export function sanitizeName(input: string): string {
  const stripped = input.replace(/[^\x20-\x7E]/g, "");
  return stripped.trim();
}
