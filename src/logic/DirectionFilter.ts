/**
 * Filters claimable tiles by cardinal direction relative to the player's territory centroid.
 *
 * @param claimableTiles - Neutral tiles adjacent to the player's territory
 * @param playerTiles - All tiles currently owned by the player
 * @param direction - Cardinal direction: "north", "south", "east", "west", or "" for no filter
 * @returns Subset of claimableTiles lying in the selected direction from the centroid
 */
export function filterByDirection(
  claimableTiles: { x: number; y: number }[],
  playerTiles: { x: number; y: number }[],
  direction: string
): { x: number; y: number }[] {
  if (direction === "" || playerTiles.length === 0) {
    return claimableTiles;
  }

  const centroidX =
    playerTiles.reduce((sum, t) => sum + t.x, 0) / playerTiles.length;
  const centroidY =
    playerTiles.reduce((sum, t) => sum + t.y, 0) / playerTiles.length;

  switch (direction) {
    case "north":
      return claimableTiles.filter((t) => t.y < centroidY);
    case "south":
      return claimableTiles.filter((t) => t.y > centroidY);
    case "east":
      return claimableTiles.filter((t) => t.x > centroidX);
    case "west":
      return claimableTiles.filter((t) => t.x < centroidX);
    default:
      return claimableTiles;
  }
}
