/**
 * Service for fetching brick and plate data with substitute information
 */

interface BrickSubstitute {
  brick_type: string;
  element_id: string;
  quantity: number;
}

interface BrickColor {
  color_name: string;
  element_id: string | null;
  rgb: string;
  price: number;
  is_substitute?: boolean;
  substitutes?: BrickSubstitute[];
}

interface BrickData {
  element_id: string;
  brick_type: string;
  num_colors: number;
  colors: BrickColor[];
}

interface BricksResponse {
  success: boolean;
  data: BrickData[];
  meta: {
    total_bricks: number;
    total_colors: number;
  };
}

let cachedBricks: BrickData[] | null = null;
let fetchPromise: Promise<BrickData[]> | null = null;

/**
 * Fetches all bricks with their color variants including substitutes
 */
export async function fetchAllBricks(): Promise<BrickData[]> {
  if (cachedBricks) {
    return cachedBricks;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch('/api/bricks');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bricks: ${response.statusText}`);
      }

      const data: BricksResponse = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from bricks API');
      }

      cachedBricks = data.data;
      return cachedBricks;
    } catch (error) {
      console.error('Error fetching bricks:', error);
      fetchPromise = null;
      throw error;
    }
  })();

  return fetchPromise;
}

/**
 * Gets a specific brick by type (e.g., "BRICK 1X4")
 */
export async function getBrickByType(brickType: string): Promise<BrickData | null> {
  const bricks = await fetchAllBricks();
  return bricks.find(b => b.brick_type === brickType) || null;
}

/**
 * Gets color information for a specific brick and color combination
 */
export async function getColorForBrick(brickType: string, colorName: string): Promise<BrickColor | null> {
  const brick = await getBrickByType(brickType);
  if (!brick) return null;
  
  return brick.colors.find(c => c.color_name === colorName) || null;
}

/**
 * Checks if a color requires substitutes for a given brick type
 */
export async function requiresSubstitute(brickType: string, colorName: string): Promise<boolean> {
  const colorInfo = await getColorForBrick(brickType, colorName);
  return colorInfo?.is_substitute === true;
}

/**
 * Gets substitute information for a brick/color combination
 */
export async function getSubstitutes(brickType: string, colorName: string): Promise<BrickSubstitute[] | null> {
  const colorInfo = await getColorForBrick(brickType, colorName);
  return colorInfo?.substitutes || null;
}

/**
 * Clears the cache (useful for testing or manual refresh)
 */
export function clearBricksCache(): void {
  cachedBricks = null;
  fetchPromise = null;
}

/**
 * Map of brick type + color combinations to availability status
 * Key format: "BRICK 2X4-Bright Green" or "PLATE 2X4-Bright Green"
 * Value: true if directly available, false if requires substitute
 */
export type BrickColorAvailabilityMap = Map<string, boolean>;

/**
 * Builds a map of brick type + color availability
 * Used by the optimizer to skip brick types that don't exist in certain colors
 * @param useBricks - If true, maps BRICK types; if false, maps PLATE types
 */
export async function buildBrickColorAvailabilityMap(useBricks: boolean = false): Promise<BrickColorAvailabilityMap> {
  const bricks = await fetchAllBricks();
  const availabilityMap: BrickColorAvailabilityMap = new Map();
  
  const prefix = useBricks ? 'BRICK' : 'PLATE';
  
  for (const brick of bricks) {
    // Only include bricks/plates matching our prefix
    if (!brick.brick_type.startsWith(prefix)) continue;
    
    for (const color of brick.colors) {
      const key = `${brick.brick_type}-${color.color_name}`;
      // Available if it's NOT a substitute (has a real element_id)
      const isAvailable = !color.is_substitute && color.element_id !== null;
      availabilityMap.set(key, isAvailable);
    }
  }
  
  return availabilityMap;
}

/**
 * Tracks colors that required smaller bricks due to availability
 * Used for UI messaging about optimization choices
 */
export interface ColorAvailabilityInfo {
  colorName: string;
  unavailableSizes: string[]; // e.g., ["2×4", "2×3"]
}

/**
 * Gets information about which colors had limited brick size availability
 * @param availabilityMap - The availability map from buildBrickColorAvailabilityMap
 * @param useBricks - Whether we're using bricks or plates
 */
export function getColorAvailabilityInfo(
  availabilityMap: BrickColorAvailabilityMap,
  useBricks: boolean = false
): Map<string, ColorAvailabilityInfo> {
  const prefix = useBricks ? 'BRICK' : 'PLATE';
  const colorInfo = new Map<string, ColorAvailabilityInfo>();
  
  for (const [key, isAvailable] of availabilityMap) {
    if (!isAvailable) {
      // Parse the key: "BRICK 2X4-Bright Green"
      const [brickType, colorName] = key.split('-');
      if (!brickType.startsWith(prefix)) continue;
      
      // Extract size from brick type (e.g., "BRICK 2X4" -> "2X4")
      const size = brickType.replace(`${prefix} `, '');
      
      if (!colorInfo.has(colorName)) {
        colorInfo.set(colorName, {
          colorName,
          unavailableSizes: [],
        });
      }
      
      const info = colorInfo.get(colorName)!;
      // Convert "2X4" to "2×4" for display
      const displaySize = size.replace('X', '×');
      if (!info.unavailableSizes.includes(displaySize)) {
        info.unavailableSizes.push(displaySize);
      }
    }
  }
  
  return colorInfo;
}






