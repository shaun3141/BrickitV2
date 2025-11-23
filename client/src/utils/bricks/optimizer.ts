import type { MosaicData } from '@/types/mosaic.types';
import type { BrickPlacement, BrickType } from '@/types/brick.types';
import { BRICK_TYPES } from '@/constants/brick.constants';
import type { LegoColor } from './colors';

/**
 * Checks if a brick can be placed at the given position
 * Returns true if all cells within the brick bounds have the same color
 * and are not already covered by another brick
 */
function canPlaceBrick(
  mosaicData: MosaicData,
  covered: boolean[][],
  x: number,
  y: number,
  width: number,
  height: number
): { canPlace: boolean; color: LegoColor | null } {
  // Check bounds
  if (x + width > mosaicData.width || y + height > mosaicData.height) {
    return { canPlace: false, color: null };
  }

  // Get the color at the starting position
  const targetColor = mosaicData.pixels[y][x];

  // Check all cells within the brick bounds
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      // Check if already covered
      if (covered[row][col]) {
        return { canPlace: false, color: null };
      }

      // Check if color matches
      if (mosaicData.pixels[row][col].name !== targetColor.name) {
        return { canPlace: false, color: null };
      }
    }
  }

  return { canPlace: true, color: targetColor };
}

/**
 * Marks cells as covered by a placed brick
 */
function markCovered(
  covered: boolean[][],
  x: number,
  y: number,
  width: number,
  height: number
): void {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      covered[row][col] = true;
    }
  }
}

/**
 * Groups brick types by their base ID (ignoring rotations)
 * Returns a map of base ID to array of all orientations for that brick type
 */
function groupBrickTypesByBaseId(): Map<string, BrickType[]> {
  const groups = new Map<string, BrickType[]>();
  
  for (const brickType of BRICK_TYPES) {
    const baseId = brickType.id;
    if (!groups.has(baseId)) {
      groups.set(baseId, []);
    }
    groups.get(baseId)!.push(brickType);
  }
  
  return groups;
}

/**
 * Gets the area of a brick type group (using the largest orientation)
 */
function getGroupArea(brickTypes: BrickType[]): number {
  if (brickTypes.length === 0) return 0;
  const largest = brickTypes.reduce((max, bt) => {
    const area = bt.width * bt.height;
    return area > max ? area : max;
  }, 0);
  return largest;
}

/**
 * Optimizes brick placement using a greedy-by-type algorithm
 * Places all bricks of one type before moving to the next type
 * This ensures maximum use of larger bricks before smaller ones
 */
export function optimizeBrickPlacement(mosaicData: MosaicData): BrickPlacement[] {
  const placements: BrickPlacement[] = [];
  
  // Initialize coverage tracking grid
  const covered: boolean[][] = Array.from(
    { length: mosaicData.height },
    () => Array(mosaicData.width).fill(false)
  );

  let placementId = 0;

  // Group brick types by base ID (e.g., all 2x4 orientations together)
  const brickTypeGroups = groupBrickTypesByBaseId();
  
  // Sort groups by area (largest first)
  const sortedGroups = Array.from(brickTypeGroups.entries()).sort((a, b) => {
    const areaA = getGroupArea(a[1]);
    const areaB = getGroupArea(b[1]);
    return areaB - areaA;
  });

  // Process each brick type group
  for (const [baseId, brickTypes] of sortedGroups) {
    let placedAny = true;
    
    // Keep placing bricks of this type until no more can be placed
    while (placedAny) {
      placedAny = false;
      
      // Scan the entire grid for placements of this brick type
      for (let row = 0; row < mosaicData.height; row++) {
        for (let col = 0; col < mosaicData.width; col++) {
          // Skip if already covered
          if (covered[row][col]) {
            continue;
          }

          // Try each orientation of this brick type
          for (const brickType of brickTypes) {
            const { canPlace, color } = canPlaceBrick(
              mosaicData,
              covered,
              col,
              row,
              brickType.width,
              brickType.height
            );

            if (canPlace && color) {
              // Place the brick
              placements.push({
                id: `brick-${placementId++}`,
                x: col,
                y: row,
                brickType,
                color,
              });

              // Mark cells as covered
              markCovered(covered, col, row, brickType.width, brickType.height);
              placedAny = true;
              // Break to avoid trying other orientations at this position
              break;
            }
          }
        }
      }
    }
  }

  // Verify all cells are covered (should always be true, but check for debugging)
  for (let row = 0; row < mosaicData.height; row++) {
    for (let col = 0; col < mosaicData.width; col++) {
      if (!covered[row][col]) {
        console.error(`Failed to place brick at (${col}, ${row})`);
      }
    }
  }

  return placements;
}

/**
 * Counts the total number of cells covered by placements (for validation)
 */
export function countCoveredCells(placements: BrickPlacement[]): number {
  return placements.reduce((total, placement) => {
    return total + (placement.brickType.width * placement.brickType.height);
  }, 0);
}

/**
 * Generates a summary of piece counts by brick type and color
 */
export interface PieceSummary {
  brickTypeId: string;
  colorId: string;
  color: LegoColor;
  brickType: string;
  count: number;
}

export function generatePieceSummary(placements: BrickPlacement[]): PieceSummary[] {
  const summaryMap = new Map<string, PieceSummary>();

  for (const placement of placements) {
    const key = `${placement.brickType.id}-${placement.color.name}`;
    
    const existing = summaryMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      summaryMap.set(key, {
        brickTypeId: placement.brickType.id,
        colorId: placement.color.name,
        color: placement.color,
        brickType: placement.brickType.displayName,
        count: 1,
      });
    }
  }

  // Sort by brick type (largest first) and then by count (most first)
  return Array.from(summaryMap.values()).sort((a, b) => {
    // Sort by brick type order first
    const brickA = BRICK_TYPES.findIndex(bt => bt.id === a.brickTypeId);
    const brickB = BRICK_TYPES.findIndex(bt => bt.id === b.brickTypeId);
    if (brickA !== brickB) {
      return brickA - brickB;
    }
    // Then by count (descending)
    return b.count - a.count;
  });
}

