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



