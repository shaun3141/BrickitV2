import type { MosaicData } from '@/types/mosaic.types';
import type { BrickPlacement } from '@/types/brick.types';
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
      if (mosaicData.pixels[row][col].id !== targetColor.id) {
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
 * Optimizes brick placement using a greedy algorithm
 * Tries to place the largest possible bricks first to minimize total piece count
 */
export function optimizeBrickPlacement(mosaicData: MosaicData): BrickPlacement[] {
  const placements: BrickPlacement[] = [];
  
  // Initialize coverage tracking grid
  const covered: boolean[][] = Array.from(
    { length: mosaicData.height },
    () => Array(mosaicData.width).fill(false)
  );

  let placementId = 0;

  // Iterate through the grid
  for (let row = 0; row < mosaicData.height; row++) {
    for (let col = 0; col < mosaicData.width; col++) {
      // Skip if already covered
      if (covered[row][col]) {
        continue;
      }

      // Try to place the largest brick possible at this position
      let placed = false;
      
      for (const brickType of BRICK_TYPES) {
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
          placed = true;
          break;
        }
      }

      // This should never happen, but just in case
      if (!placed) {
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
  colorId: number;
  color: LegoColor;
  brickType: string;
  count: number;
}

export function generatePieceSummary(placements: BrickPlacement[]): PieceSummary[] {
  const summaryMap = new Map<string, PieceSummary>();

  for (const placement of placements) {
    const key = `${placement.brickType.id}-${placement.color.id}`;
    
    const existing = summaryMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      summaryMap.set(key, {
        brickTypeId: placement.brickType.id,
        colorId: placement.color.id,
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

