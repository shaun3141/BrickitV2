export interface BrickType {
  id: string;
  width: number;
  height: number;
  displayName: string;
}

// Standard LEGO plate types (ordered from largest to smallest for optimization)
export const BRICK_TYPES: BrickType[] = [
  { id: '2x4', width: 4, height: 2, displayName: '2×4 Plate' },
  { id: '2x2', width: 2, height: 2, displayName: '2×2 Plate' },
  { id: '1x4', width: 4, height: 1, displayName: '1×4 Plate' },
  { id: '1x2', width: 2, height: 1, displayName: '1×2 Plate' },
  { id: '1x1', width: 1, height: 1, displayName: '1×1 Plate' },
];

// Helper to get brick type by ID
export function getBrickType(id: string): BrickType | undefined {
  return BRICK_TYPES.find(brick => brick.id === id);
}

