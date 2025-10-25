export interface BrickType {
  id: string;
  width: number;
  height: number;
  displayName: string;
  bricklinkPlateId: string; // BrickLink part number for plate (1/3 height)
  bricklinkBrickId: string; // BrickLink part number for brick (standard height)
  isRotated?: boolean; // True if this is a 90-degree rotated version
}

// Standard LEGO plate types (base orientations)
const BASE_BRICK_TYPES: BrickType[] = [
  { id: '2x4', width: 4, height: 2, displayName: '2×4 Plate', bricklinkPlateId: '3020', bricklinkBrickId: '3001' },
  { id: '2x2', width: 2, height: 2, displayName: '2×2 Plate', bricklinkPlateId: '3022', bricklinkBrickId: '3003' },
  { id: '1x4', width: 4, height: 1, displayName: '1×4 Plate', bricklinkPlateId: '3710', bricklinkBrickId: '3010' },
  { id: '1x2', width: 2, height: 1, displayName: '1×2 Plate', bricklinkPlateId: '3023', bricklinkBrickId: '3004' },
  { id: '1x1', width: 1, height: 1, displayName: '1×1 Plate', bricklinkPlateId: '3024', bricklinkBrickId: '3005' },
];

/**
 * Generates all brick orientations, including rotated versions
 * For non-square bricks, adds a 90-degree rotated version
 * Ordered from largest to smallest for greedy optimization
 */
function generateBrickOrientations(): BrickType[] {
  const orientations: BrickType[] = [];
  
  for (const brick of BASE_BRICK_TYPES) {
    // Always add the original orientation
    orientations.push(brick);
    
    // Add rotated version if brick is non-square
    if (brick.width !== brick.height) {
      orientations.push({
        id: brick.id,
        width: brick.height,  // Swap width and height
        height: brick.width,
        displayName: brick.displayName,
        bricklinkPlateId: brick.bricklinkPlateId,
        bricklinkBrickId: brick.bricklinkBrickId,
        isRotated: true,
      });
    }
  }
  
  // Sort by area (largest first) for greedy optimization
  return orientations.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaB - areaA;
  });
}

// All brick types including rotations (ordered from largest to smallest for optimization)
export const BRICK_TYPES: BrickType[] = generateBrickOrientations();

// Helper to get brick type by ID
export function getBrickType(id: string): BrickType | undefined {
  return BRICK_TYPES.find(brick => brick.id === id);
}

