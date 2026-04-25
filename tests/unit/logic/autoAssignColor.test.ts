import { describe, it, expect } from "vitest";
import { BASE_COLORS, ALL_COLORS } from "../../../server/rooms/GameRoom";

/**
 * Pure function replicating the server's getNextAvailableColor logic.
 */
function getNextAvailableColor(
  takenColors: Set<number>,
  maxPlayers: number
): number {
  const allowedColors = maxPlayers >= 20 ? ALL_COLORS : BASE_COLORS;
  for (const color of allowedColors) {
    if (!takenColors.has(color)) return color;
  }
  return -1;
}

describe("Auto-assign color logic", () => {
  it("first player gets the first palette color", () => {
    const takenColors = new Set<number>();
    const color = getNextAvailableColor(takenColors, 10);
    expect(color).toBe(BASE_COLORS[0]);
  });

  it("second player gets the second palette color", () => {
    const takenColors = new Set<number>([BASE_COLORS[0]]);
    const color = getNextAvailableColor(takenColors, 10);
    expect(color).toBe(BASE_COLORS[1]);
  });

  it("palette exhaustion returns -1", () => {
    const takenColors = new Set<number>(BASE_COLORS);
    const color = getNextAvailableColor(takenColors, 10);
    expect(color).toBe(-1);
  });

  it("manual selectColor still works (color can be changed after auto-assignment)", () => {
    // Simulate: player 1 auto-assigned color 0, player 2 auto-assigned color 1
    // Player 1 manually selects color 5 (swapping away from color 0)
    const takenColors = new Set<number>([BASE_COLORS[0], BASE_COLORS[1]]);

    // Simulate manual color change: remove old color, add new one
    takenColors.delete(BASE_COLORS[0]);
    takenColors.add(BASE_COLORS[5]);

    // Now the next auto-assign should give BASE_COLORS[0] (freed) since it's first in palette
    const nextColor = getNextAvailableColor(takenColors, 10);
    expect(nextColor).toBe(BASE_COLORS[0]);
  });

  it("20-player mode uses the full palette", () => {
    // Fill all base colors
    const takenColors = new Set<number>(BASE_COLORS);
    // In 20-player mode, extended colors should be available
    const color = getNextAvailableColor(takenColors, 20);
    expect(color).toBe(ALL_COLORS[10]); // first extended color
    expect(ALL_COLORS).toContain(color);
  });

  it("20-player mode palette exhaustion returns -1", () => {
    const takenColors = new Set<number>(ALL_COLORS);
    const color = getNextAvailableColor(takenColors, 20);
    expect(color).toBe(-1);
  });
});
