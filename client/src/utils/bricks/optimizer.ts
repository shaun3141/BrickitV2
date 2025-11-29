import type { MosaicData } from '@/types/mosaic.types';
import type { BrickPlacement, BrickType } from '@/types/brick.types';
import { BRICK_TYPES } from '@/constants/brick.constants';
import type { LegoColor } from './colors';
import type { BrickColorAvailabilityMap } from '@/services/bricks.service';

/**
 * Options for brick placement optimization
 */
export interface OptimizationOptions {
  /** Map of brick type + color availability (if provided, unavailable combinations are skipped) */
  availabilityMap?: BrickColorAvailabilityMap;
  /** Whether we're optimizing for bricks (true) or plates (false) - affects availability key format */
  useBricks?: boolean;
}

/**
 * Result of optimization including stats about availability-based decisions
 */
export interface OptimizationResult {
  placements: BrickPlacement[];
  /** Colors that had some brick sizes skipped due to availability */
  colorsWithLimitedSizes: Set<string>;
  /** Total placements that used a smaller brick due to availability constraints */
  availabilityConstrainedCount: number;
}

/**
 * Converts brick dimensions to the service format key component
 * e.g., width=4, height=2 -> "2X4" (always smaller dimension first in LEGO naming)
 */
function getBrickSizeKey(width: number, height: number): string {
  const w = Math.min(width, height);
  const h = Math.max(width, height);
  return `${w}X${h}`;
}

/**
 * Checks if a brick type + color combination is available (not a substitute)
 */
function isBrickColorAvailable(
  brickType: BrickType,
  colorName: string,
  availabilityMap: BrickColorAvailabilityMap | undefined,
  useBricks: boolean
): boolean {
  if (!availabilityMap) {
    // No availability data - assume everything is available
    return true;
  }
  
  const prefix = useBricks ? 'BRICK' : 'PLATE';
  const sizeKey = getBrickSizeKey(brickType.width, brickType.height);
  const key = `${prefix} ${sizeKey}-${colorName}`;
  
  // If the key exists in the map, use its value; if not found, assume unavailable
  // (being conservative - if we don't have data, don't place unknown combinations)
  const isAvailable = availabilityMap.get(key);
  return isAvailable === true;
}

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
  height: number,
  brickType: BrickType,
  options?: OptimizationOptions
): { canPlace: boolean; color: LegoColor | null; skippedDueToAvailability: boolean } {
  // Check bounds
  if (x + width > mosaicData.width || y + height > mosaicData.height) {
    return { canPlace: false, color: null, skippedDueToAvailability: false };
  }

  // Get the color at the starting position
  const targetColor = mosaicData.pixels[y][x];

  // Check all cells within the brick bounds
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      // Check if already covered
      if (covered[row][col]) {
        return { canPlace: false, color: null, skippedDueToAvailability: false };
      }

      // Check if color matches
      if (mosaicData.pixels[row][col].name !== targetColor.name) {
        return { canPlace: false, color: null, skippedDueToAvailability: false };
      }
    }
  }

  // Check availability if map is provided
  if (options?.availabilityMap) {
    const isAvailable = isBrickColorAvailable(
      brickType,
      targetColor.name,
      options.availabilityMap,
      options.useBricks ?? false
    );
    if (!isAvailable) {
      return { canPlace: false, color: targetColor, skippedDueToAvailability: true };
    }
  }

  return { canPlace: true, color: targetColor, skippedDueToAvailability: false };
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
 * 
 * @param mosaicData - The mosaic to optimize
 * @param options - Optional settings including availability map to skip unavailable brick/color combinations
 * @returns Optimization result with placements and stats about availability constraints
 */
export function optimizeBrickPlacement(
  mosaicData: MosaicData,
  options?: OptimizationOptions
): OptimizationResult {
  const placements: BrickPlacement[] = [];
  const colorsWithLimitedSizes = new Set<string>();
  let availabilityConstrainedCount = 0;
  
  // Track which positions were skipped for larger bricks due to availability
  // Key: "row,col", Value: Set of brick size IDs that were skipped
  const skippedPositions = new Map<string, Set<string>>();
  
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
            const { canPlace, color, skippedDueToAvailability } = canPlaceBrick(
              mosaicData,
              covered,
              col,
              row,
              brickType.width,
              brickType.height,
              brickType,
              options
            );

            if (skippedDueToAvailability && color) {
              // Track that this position couldn't use this brick size due to color availability
              const posKey = `${row},${col}`;
              if (!skippedPositions.has(posKey)) {
                skippedPositions.set(posKey, new Set());
              }
              skippedPositions.get(posKey)!.add(baseId);
              colorsWithLimitedSizes.add(color.name);
            }

            if (canPlace && color) {
              // Check if this position had larger bricks skipped due to availability
              const posKey = `${row},${col}`;
              if (skippedPositions.has(posKey) && skippedPositions.get(posKey)!.size > 0) {
                availabilityConstrainedCount++;
              }
              
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

  return {
    placements,
    colorsWithLimitedSizes,
    availabilityConstrainedCount,
  };
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

