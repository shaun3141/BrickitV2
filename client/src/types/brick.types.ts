import type { LegoColor } from '@/utils/bricks/colors';

export interface BrickType {
  id: string;
  width: number;
  height: number;
  displayName: string;
  bricklinkPlateId: string; // BrickLink part number for plate (1/3 height)
  bricklinkBrickId: string; // BrickLink part number for brick (standard height)
  isRotated?: boolean; // True if this is a 90-degree rotated version
}

export interface BrickPlacement {
  id: string; // Unique identifier for this placement
  x: number; // Column position in grid
  y: number; // Row position in grid
  brickType: BrickType;
  color: LegoColor;
}

